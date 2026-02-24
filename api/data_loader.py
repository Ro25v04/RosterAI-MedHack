# Functionality to read excel rosters

from typing import Dict, Any, List
import pandas as pd
from api.config import COVERAGE_REQUIREMENTS

ALLOWED_SHIFTS = {"AM", "PM", "NIGHT"}


def _split_specs(x) -> List[str]:
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return []
    s = str(x).strip()
    if not s:
        return []
    return [p.strip() for p in s.split(";") if p.strip()]


def load_roster_from_excel(path: str) -> Dict[str, Any]:
    xl = pd.ExcelFile(path)

    if "Staff" not in xl.sheet_names or "Assignments" not in xl.sheet_names:
        raise ValueError(
            "Excel must have sheets named exactly: Staff and Assignments")

    staff_df = pd.read_excel(xl, sheet_name="Staff")
    asg_df = pd.read_excel(xl, sheet_name="Assignments")

    # ---- Validate Staff ----
    staff_required = {"staff_id", "name", "role", "specializations", "fte"}
    missing_staff = staff_required - set(staff_df.columns)
    if missing_staff:
        raise ValueError(
            f"Staff sheet missing columns: {sorted(missing_staff)}")

    staff: Dict[str, Dict[str, Any]] = {}
    for _, r in staff_df.iterrows():
        sid = str(r["staff_id"]).strip()
        if not sid or sid.lower() == "nan":
            continue
        if sid in staff:
            raise ValueError(f"Duplicate staff_id: {sid}")

        fte_val = r.get("fte", 1.0)
        fte = float(fte_val) if pd.notna(fte_val) else 1.0
        if fte <= 0:
            fte = 1.0

        staff[sid] = {
            "name": str(r.get("name", "")).strip(),
            "role": str(r.get("role", "")).strip(),
            "specializations": _split_specs(r.get("specializations")),
            "fte": fte,
        }

    if not staff:
        raise ValueError("Staff sheet is empty (no valid staff_id rows).")

    # ---- Validate Assignments ----
    asg_required = {"date", "shift", "slot", "staff_id"}
    missing_asg = asg_required - set(asg_df.columns)
    if missing_asg:
        raise ValueError(
            f"Assignments sheet missing columns: {sorted(missing_asg)}")

    assignments: List[Dict[str, Any]] = []
    for _, r in asg_df.iterrows():
        date_str = pd.to_datetime(r["date"]).date().isoformat()
        shift = str(r["shift"]).strip().upper()
        slot = int(r["slot"])
        sid = str(r["staff_id"]).strip()

        if shift not in ALLOWED_SHIFTS:
            raise ValueError(f"Invalid shift '{shift}'. Use AM/PM/NIGHT.")

        max_slot = COVERAGE_REQUIREMENTS[shift] - 1
        if slot < 0 or slot > max_slot:
            raise ValueError(
                f"Invalid slot {slot} for {shift}. Must be 0..{max_slot}")

        if sid not in staff:
            raise ValueError(
                f"Unknown staff_id '{sid}' in Assignments (not in Staff sheet).")

        assignments.append({
            "date": date_str,
            "shift": shift,
            "slot": slot,
            "staff_id": sid
        })

    if not assignments:
        raise ValueError("Assignments sheet is empty.")

    dates = sorted({a["date"] for a in assignments})
    return {
        "staff": staff,
        "assignments": assignments,
        "start_date": dates[0],
        "end_date": dates[-1],
    }


def save_roster_to_excel(roster, out_path):

    staff_rows = []
    for sid, info in roster["staff"].items():
        staff_rows.append({
            "staff_id": sid,
            "name": info.get("name", ""),
            "role": info.get("role", ""),
            "specializations": ";".join(info.get("specializations", [])),
            "fte": info.get("fte", 1.0),
        })

    staff_df = pd.DataFrame(staff_rows)
    assignments_df = pd.DataFrame(roster["assignments"])

    with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
        staff_df.to_excel(writer, sheet_name="Staff", index=False)
        assignments_df.to_excel(writer, sheet_name="Assignments", index=False)


def save_optimized_roster_to_excel(
    original_roster: Dict[str, Any],
    optimized_roster: Dict[str, Any],
    before_metrics: Dict[str, Any],
    after_metrics: Dict[str, Any],
    out_path: str,
    change_log: List[Dict[str, Any]] | None = None,
):
    """
    Saves optimized roster to Excel with:
    - Staff
    - Assignments
    - Optimization Summary (before vs after)
    - Changes (which rows changed)
    """

    # ----- Build Staff + Assignments -----
    staff_rows = []
    for sid, info in optimized_roster["staff"].items():
        staff_rows.append({
            "staff_id": sid,
            "name": info.get("name", ""),
            "role": info.get("role", ""),
            "specializations": ";".join(info.get("specializations", [])),
            "fte": info.get("fte", 1.0),
        })

    staff_df = pd.DataFrame(staff_rows)
    optimized_assignments_df = pd.DataFrame(optimized_roster["assignments"])

    # ----- Build Summary -----
    def pct_change(before, after):
        if before == 0:
            return "—" if after == 0 else "↑"
        return f"{((after - before) / before) * 100:.1f}%"

    summary_rows = [
        {
            "Metric": "Total Overtime Hours",
            "Before": round(before_metrics["total_overtime_hours"], 2),
            "After": round(after_metrics["total_overtime_hours"], 2),
            "Change": pct_change(before_metrics["total_overtime_hours"], after_metrics["total_overtime_hours"]),
        },
        {
            "Metric": "Burnout Score",
            "Before": int(before_metrics["burnout_risk_score"]),
            "After": int(after_metrics["burnout_risk_score"]),
            "Change": pct_change(before_metrics["burnout_risk_score"], after_metrics["burnout_risk_score"]),
        },
        {
            "Metric": "Skill Match Rate",
            "Before": round(before_metrics["skill_match_rate"], 4),
            "After": round(after_metrics["skill_match_rate"], 4),
            "Change": pct_change(before_metrics["skill_match_rate"], after_metrics["skill_match_rate"]),
        },
        {
            "Metric": "Edit Actions Applied",
            "Before": "",
            "After": len(change_log or []),
            "Change": "",
        },
    ]

    # fill in assignments changed count in summary
    summary_rows[-1]["Before"] = ""
    summary_df = pd.DataFrame(summary_rows)

    change_log_df = pd.DataFrame(change_log or [])

    # ----- Write Excel -----
    with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
        staff_df.to_excel(writer, sheet_name="Staff", index=False)
        optimized_assignments_df.to_excel(
            writer, sheet_name="Assignments", index=False)
        summary_df.to_excel(
            writer, sheet_name="Optimization Summary", index=False)
        change_log_df.to_excel(writer, sheet_name="Change Log", index=False)
