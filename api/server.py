# api/server.py
from __future__ import annotations

from api.data_loader import (
    load_roster_from_excel,
    save_optimized_roster_to_excel,
)
from api.optimizer import optimize_roster
from api.metrics import compute_metrics
from api.roster_ops import replace_staff, swap_staff
from api.chat_service import build_roster_context, chat_once
from api.export import (
    export_roster_pdf_report,
    export_roster_csv,
    export_roster_json,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi import FastAPI, UploadFile, File, HTTPException, Query

from typing import Dict, Any, Optional, List, Tuple
import tempfile
import uuid
import io
import os

from pathlib import Path
from dotenv import load_dotenv


# --- FORCE LOAD api/.env ---
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

print("OPENAI_API_KEY loaded:", bool(os.getenv("OPENAI_API_KEY")))

app = FastAPI(title="MedHack Roster API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory hackathon store
STORE: Dict[str, Dict[str, Any]] = {}


# -------------------------
# Helpers
# -------------------------

def roster_preview(roster: Dict[str, Any], limit: int = 40) -> Dict[str, Any]:
    assignments = roster.get("assignments", [])[:limit]
    staff = roster.get("staff", {})

    staff_compact = {
        sid: {
            "name": info.get("name", ""),
            "role": info.get("role", ""),
            "specializations": info.get("specializations", []),
            "fte": info.get("fte", 1.0),
        }
        for sid, info in staff.items()
    }

    return {
        "start_date": roster.get("start_date"),
        "end_date": roster.get("end_date"),
        "staff": staff_compact,
        "assignments": assignments,
        "preview_limit": limit,
        "assignment_count": len(roster.get("assignments", [])),
        "staff_count": len(staff),
    }


def build_table_for_sheet(roster: Dict[str, Any], sheet: str, limit: int, change_log: list[Dict[str, Any]]):
    sheet = (sheet or "Assignments").strip()

    if sheet == "Assignments":
        rows = roster.get("assignments", [])[:limit]
        columns = ["date", "shift", "slot", "staff_id"]
        return {"sheet": sheet, "columns": columns, "rows": rows, "total_rows": len(roster.get("assignments", []))}

    if sheet == "Staff":
        staff = roster.get("staff", {})
        rows = [
            {
                "staff_id": sid,
                "name": info.get("name", ""),
                "role": info.get("role", ""),
                "specializations": ";".join(info.get("specializations", [])),
                "fte": info.get("fte", 1.0),
            }
            for sid, info in staff.items()
        ][:limit]
        columns = ["staff_id", "name", "role", "specializations", "fte"]
        return {"sheet": sheet, "columns": columns, "rows": rows, "total_rows": len(staff)}

    if sheet == "Optimization Summary":
        # If you stored before/after metrics somewhere, use those.
        # For now, just show current metrics as a placeholder.
        m = compute_metrics(roster)
        rows = [
            {"Metric": "Total Overtime Hours", "Value": round(
                m.get("total_overtime_hours", 0), 2)},
            {"Metric": "Burnout Score", "Value": int(
                m.get("burnout_risk_score", 0))},
            {"Metric": "Skill Match Rate", "Value": round(
                m.get("skill_match_rate", 0), 4)},
            {"Metric": "Edit Actions Applied", "Value": len(change_log)},
        ]
        columns = ["Metric", "Value"]
        return {"sheet": sheet, "columns": columns, "rows": rows, "total_rows": len(rows)}

    if sheet == "Change Log":
        rows = (change_log or [])[:limit]
        # columns depend on your action format; keep it generic:
        columns = sorted({k for r in rows for k in r.keys()}) if rows else [
            "action", "date", "shift", "slot", "staff_a", "staff_b", "new_staff_id"]
        return {"sheet": sheet, "columns": columns, "rows": rows, "total_rows": len(change_log or [])}

    # default
    return {"sheet": sheet, "columns": [], "rows": [], "total_rows": 0}


def available_preview_sheets(store_item: Dict[str, Any]) -> List[str]:
    sheets = ["Assignments", "Staff"]
    if store_item.get("optimized_once"):
        sheets += ["Optimization Summary", "Change Log"]
    return sheets


def sheet_table_for(store_item: Dict[str, Any], sheet: str, limit: int) -> Dict[str, Any]:
    """
    Returns a generic table payload:
      { "sheet": str, "columns": [...], "rows": [ {...}, {...} ], "row_count": int, "limit": int }
    """

    sheet = (sheet or "").strip()

    # Default
    if sheet == "" or sheet.lower() == "assignments":
        roster = store_item["current"]
        rows = roster.get("assignments", [])[:limit]
        columns = ["date", "shift", "slot", "staff_id"]
        return {
            "sheet": "Assignments",
            "columns": columns,
            "rows": rows,
            "row_count": len(roster.get("assignments", [])),
            "limit": limit,
        }

    if sheet.lower() == "staff":
        roster = store_item["current"]
        staff = roster.get("staff", {})
        rows = []
        for sid, info in staff.items():
            rows.append({
                "staff_id": sid,
                "name": info.get("name", ""),
                "role": info.get("role", ""),
                "specializations": ";".join(info.get("specializations", []) or []),
                "fte": info.get("fte", 1.0),
            })
        rows = rows[:limit]
        columns = ["staff_id", "name", "role", "specializations", "fte"]
        return {
            "sheet": "Staff",
            "columns": columns,
            "rows": rows,
            "row_count": len(staff),
            "limit": limit,
        }

    if sheet.lower() in ["optimization summary", "optimization_summary", "summary"]:
        if not store_item.get("optimized_once"):
            raise HTTPException(
                status_code=400, detail="Optimization Summary is only available after optimizing.")
        before = store_item.get("before_metrics") or {}
        after = store_item.get("after_metrics") or {}
        change_log = store_item.get("change_log") or []

        def pct_change(b, a):
            try:
                b = float(b)
                a = float(a)
            except Exception:
                return ""
            if b == 0:
                return "—" if a == 0 else "↑"
            return f"{((a - b) / b) * 100:.1f}%"

        rows = [
            {
                "Metric": "Total Overtime Hours",
                "Before": round(float(before.get("total_overtime_hours", 0.0)), 2),
                "After": round(float(after.get("total_overtime_hours", 0.0)), 2),
                "Change": pct_change(before.get("total_overtime_hours", 0.0), after.get("total_overtime_hours", 0.0)),
            },
            {
                "Metric": "Burnout Score",
                "Before": int(before.get("burnout_risk_score", 0)),
                "After": int(after.get("burnout_risk_score", 0)),
                "Change": pct_change(before.get("burnout_risk_score", 0), after.get("burnout_risk_score", 0)),
            },
            {
                "Metric": "Skill Match Rate",
                "Before": round(float(before.get("skill_match_rate", 0.0)), 4),
                "After": round(float(after.get("skill_match_rate", 0.0)), 4),
                "Change": pct_change(before.get("skill_match_rate", 0.0), after.get("skill_match_rate", 0.0)),
            },
            {
                "Metric": "Edit Actions Applied",
                "Before": "",
                "After": len(change_log),
                "Change": "",
            },
        ]

        columns = ["Metric", "Before", "After", "Change"]
        return {
            "sheet": "Optimization Summary",
            "columns": columns,
            "rows": rows[:limit],
            "row_count": len(rows),
            "limit": limit,
        }

    if sheet.lower() in ["change log", "change_log", "changelog"]:
        if not store_item.get("optimized_once"):
            # you can still show edits pre-optimize if you want, but you said it appears post-opt
            pass
        rows = (store_item.get("change_log") or [])[:limit]
        # columns depend on your action dicts; keep dynamic:
        columns = sorted({k for r in rows for k in (
            r.keys() if isinstance(r, dict) else [])}) if rows else []
        return {
            "sheet": "Change Log",
            "columns": columns,
            "rows": rows,
            "row_count": len(store_item.get("change_log") or []),
            "limit": limit,
        }

    raise HTTPException(
        status_code=400,
        detail=f"Unknown sheet '{sheet}'. Valid: {available_preview_sheets(store_item)}"
    )


# -------------------------
# Routes
# -------------------------

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/roster/upload")
async def upload_roster(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400, detail="Please upload an Excel file (.xlsx/.xls)")

    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        tmp.write(await file.read())

    try:
        # This reads ONLY the required sheets: Staff + Assignments
        original = load_roster_from_excel(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=500, detail="Failed to read Excel file")
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass

    roster_id = str(uuid.uuid4())
    STORE[roster_id] = {
        "original": original,
        "current": original,
        "change_log": [],
        "optimized_once": False,
    }

    return {
        "roster_id": roster_id,
        "preview": roster_preview(original, limit=200),
        "metrics": compute_metrics(original),
        # Frontend will use these as tabs:
        "sheet_names": ["Assignments", "Staff"],
        "active_sheet": "Assignments",
        # IMPORTANT: send current table data for the active tab
        "table": build_table_for_sheet(original, "Assignments", limit=200, change_log=[]),
    }


@app.post("/roster/{roster_id}/optimize")
def optimize(roster_id: str):
    if roster_id not in STORE:
        raise HTTPException(status_code=404, detail="Roster not found")

    original = STORE[roster_id]["original"]
    optimized = optimize_roster(original)

    before = compute_metrics(original)
    after = compute_metrics(optimized)

    STORE[roster_id]["current"] = optimized
    STORE[roster_id]["optimized_once"] = True
    STORE[roster_id]["before_metrics"] = before
    STORE[roster_id]["after_metrics"] = after
    STORE[roster_id]["change_log"] = []  # reset on optimize

    return {
        "roster_id": roster_id,
        "before_metrics": before,
        "after_metrics": after,
        "sheet_names": available_preview_sheets(STORE[roster_id]),
        "active_sheet": "Assignments",
        "preview": roster_preview(optimized),
    }


@app.get("/roster/{roster_id}/preview")
def get_preview(
    roster_id: str,
    limit: int = Query(40, ge=10, le=500),
    sheet: str = Query("Assignments"),
):
    if roster_id not in STORE:
        raise HTTPException(status_code=404, detail="Roster not found")

    store_item = STORE[roster_id]
    cur = store_item["current"]

    # Backward-compatible preview object (your current UI uses this)
    preview_obj = roster_preview(cur, limit=limit)

    # New: table payload for sheet dropdown
    table = sheet_table_for(store_item, sheet=sheet, limit=limit)

    return {
        "roster_id": roster_id,
        "sheet_names": available_preview_sheets(store_item),
        "active_sheet": table["sheet"],
        "table": table,  # ✅ use this for multi-sheet preview UI
        "preview": preview_obj,  # ✅ old UI still works
        "metrics": compute_metrics(cur),
        "change_log": store_item["change_log"][-50:],
    }


@app.post("/roster/{roster_id}/chat")
def chat(roster_id: str, body: Dict[str, Any]):
    if roster_id not in STORE:
        raise HTTPException(status_code=404, detail="Roster not found")

    msg = (body.get("message") or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Message required")

    cur = STORE[roster_id]["current"]
    metrics = compute_metrics(cur)
    ctx = build_roster_context(cur, metrics)

    reply, action = chat_once(msg, ctx)

    if action:
        if action.get("action") == "replace":
            ok, info = replace_staff(
                cur,
                date=action["date"],
                shift=action["shift"],
                slot=int(action["slot"]),
                new_staff_id=action["new_staff_id"],
            )
        elif action.get("action") == "swap":
            ok, info = swap_staff(
                cur,
                date=action["date"],
                shift=action["shift"],
                staff_a=action["staff_a"],
                staff_b=action["staff_b"],
            )
        else:
            ok, info = False, "Unknown action"

        if not ok:
            return {"type": "error", "reply": info}

        STORE[roster_id]["change_log"].append(action)

        return {
            "type": "edit_applied",
            "reply": reply,
            "preview": roster_preview(cur, limit=200),
            "metrics": compute_metrics(cur),
            "sheet_names": available_preview_sheets(STORE[roster_id]),
        }

    return {"type": "answer", "reply": reply}


@app.get("/")
def root():
    return {"message": "Roster API running. Go to /docs"}


@app.get("/roster/{roster_id}/sheet_preview")
def sheet_preview(
    roster_id: str,
    sheet: str = Query("Assignments"),
    limit: int = Query(200, ge=10, le=500),
):
    if roster_id not in STORE:
        raise HTTPException(status_code=404, detail="Roster not found")

    cur = STORE[roster_id]["current"]
    change_log = STORE[roster_id]["change_log"]

    # If optimized once, expose extra tabs
    sheet_names = ["Assignments", "Staff"]
    if STORE[roster_id].get("optimized_once"):
        sheet_names += ["Optimization Summary", "Change Log"]

    return {
        "roster_id": roster_id,
        "sheet_names": sheet_names,
        "active_sheet": sheet,
        "preview": roster_preview(cur, limit=limit),
        "metrics": compute_metrics(cur),
        "table": build_table_for_sheet(cur, sheet, limit=limit, change_log=change_log),
    }
