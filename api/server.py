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
from typing import Dict, Any
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


# ---- your project imports ----

app = FastAPI(title="MedHack Roster API", version="1.0")

# Allow frontend (Next.js) to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory hackathon store
STORE: Dict[str, Dict[str, Any]] = {}


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


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/roster/upload")
async def upload_roster(file: UploadFile = File(...)):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400, detail="Upload Excel (.xlsx/.xls)")

    suffix = Path(file.filename).suffix

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        tmp.write(await file.read())

    try:
        original = load_roster_from_excel(tmp_path)
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
        "preview": roster_preview(original),
        "metrics": compute_metrics(original),
    }


@app.post("/roster/{roster_id}/optimize")
def optimize(roster_id: str):
    if roster_id not in STORE:
        raise HTTPException(status_code=404, detail="Roster not found")

    original = STORE[roster_id]["original"]
    optimized = optimize_roster(original)

    STORE[roster_id]["current"] = optimized
    STORE[roster_id]["optimized_once"] = True
    STORE[roster_id]["change_log"] = []

    return {
        "roster_id": roster_id,
        "before_metrics": compute_metrics(original),
        "after_metrics": compute_metrics(optimized),
        "preview": roster_preview(optimized),
    }


@app.get("/roster/{roster_id}/preview")
def get_preview(roster_id: str, limit: int = Query(40, ge=10, le=500)):
    if roster_id not in STORE:
        raise HTTPException(status_code=404, detail="Roster not found")

    cur = STORE[roster_id]["current"]

    return {
        "roster_id": roster_id,
        "preview": roster_preview(cur, limit=limit),
        "metrics": compute_metrics(cur),
        "change_log": STORE[roster_id]["change_log"][-50:],
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
        }

    return {"type": "answer", "reply": reply}


@app.get("/")
def root():
    return {"message": "Roster API running. Go to /docs"}
