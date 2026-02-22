# api/metrics.py
from collections import defaultdict
from typing import Dict, Any, List, Tuple
from config import BASE_HOURS_PER_WEEK, SHIFT_HOURS, MAX_CONSECUTIVE_NIGHTS

# Simple skill preferences (edit anytime)
SHIFT_SKILL_PREF = {
    "AM": {"ED", "GEN"},
    "PM": {"GEN", "SURG"},
    "NIGHT": {"ICU", "ED"},
}


def compute_metrics(roster: Dict[str, Any]) -> Dict[str, Any]:
    staff = roster["staff"]
    assignments = roster["assignments"]

    # -----------------------
    # 1) Hours worked
    # -----------------------
    hours_worked = defaultdict(float)
    for a in assignments:
        sid = a["staff_id"]
        shift = a["shift"]
        hours_worked[sid] += float(SHIFT_HOURS[shift])

    # -----------------------
    # 2) Overtime
    # -----------------------
    overtime_by_staff = {}
    for sid, info in staff.items():
        contracted = float(BASE_HOURS_PER_WEEK) * float(info.get("fte", 1.0))
        worked = float(hours_worked.get(sid, 0.0))
        overtime_by_staff[sid] = max(0.0, worked - contracted)

    total_overtime = sum(overtime_by_staff.values())

    # -----------------------
    # 3) Burnout proxy: consecutive NIGHT streak
    # -----------------------
    # Build: nurse -> list of (date, shift)
    by_nurse = defaultdict(list)
    for a in assignments:
        by_nurse[a["staff_id"]].append((a["date"], a["shift"]))

    max_night_streak = {}
    night_streak_violation = {}
    for sid in staff.keys():
        shifts = sorted(by_nurse.get(sid, []), key=lambda x: x[0])

        streak = 0
        max_streak = 0
        for date, shift in shifts:
            if shift == "NIGHT":
                streak += 1
                max_streak = max(max_streak, streak)
            else:
                streak = 0

        max_night_streak[sid] = max_streak
        night_streak_violation[sid] = max(
            0, max_streak - int(MAX_CONSECUTIVE_NIGHTS))

    burnout_risk_score = sum(night_streak_violation.values())

    # -----------------------
    # 4) Skill match score
    # -----------------------
    matched = 0
    total = 0
    for a in assignments:
        sid = a["staff_id"]
        shift = a["shift"]
        prefs = SHIFT_SKILL_PREF.get(shift, set())
        nurse_skills = set(staff[sid].get("specializations", []))

        # If no prefs defined, consider it neutral (count as matched)
        if not prefs:
            matched += 1
        else:
            if nurse_skills.intersection(prefs):
                matched += 1
        total += 1

    skill_match_rate = (matched / total) if total else 0.0

    # -----------------------
    # Return everything
    # -----------------------
    return {
        "hours_worked_by_staff": dict(hours_worked),
        "overtime_by_staff": overtime_by_staff,
        "total_overtime_hours": total_overtime,
        "max_night_streak_by_staff": max_night_streak,
        "night_streak_violation_by_staff": night_streak_violation,
        "burnout_risk_score": burnout_risk_score,
        "skill_match_rate": skill_match_rate,
        "assignment_count": len(assignments),
        "staff_count": len(staff),
    }
