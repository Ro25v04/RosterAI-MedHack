# api/metrics.py
from collections import defaultdict
from datetime import datetime
from typing import Dict, Any
from api.config import BASE_HOURS_PER_WEEK, SHIFT_HOURS, MAX_CONSECUTIVE_NIGHTS

# (keep for later, not used in overtime-only optimization)
SHIFT_SKILL_PREF = {
    "AM": {"ED", "GEN"},
    "PM": {"GEN", "SURG"},
    "NIGHT": {"ICU", "ED"},
}


def _roster_weeks(roster: Dict[str, Any]) -> float:
    start = datetime.fromisoformat(roster["start_date"])
    end = datetime.fromisoformat(roster["end_date"])
    days = (end - start).days + 1
    return days / 7.0


def compute_metrics(roster: Dict[str, Any]) -> Dict[str, Any]:
    staff = roster["staff"]
    assignments = roster["assignments"]

    weeks = _roster_weeks(roster)

    # 1) Hours worked
    hours_worked = defaultdict(float)
    for a in assignments:
        sid = a["staff_id"]
        shift = a["shift"]
        hours_worked[sid] += float(SHIFT_HOURS[shift])

    # 2) Overtime (NOW correct for roster length)
    contracted_by_staff = {}
    overtime_by_staff = {}
    for sid, info in staff.items():
        contracted = float(BASE_HOURS_PER_WEEK) * \
            float(info.get("fte", 1.0)) * weeks
        worked = float(hours_worked.get(sid, 0.0))
        contracted_by_staff[sid] = contracted
        overtime_by_staff[sid] = max(0.0, worked - contracted)

    total_overtime = sum(overtime_by_staff.values())

    # 3) Burnout proxy (we’ll optimize later)
    by_nurse = defaultdict(list)
    for a in assignments:
        by_nurse[a["staff_id"]].append((a["date"], a["shift"]))

    max_night_streak = {}
    night_streak_violation = {}
    for sid in staff.keys():
        shifts = sorted(by_nurse.get(sid, []), key=lambda x: x[0])
        streak = 0
        max_streak = 0
        for _, sh in shifts:
            if sh == "NIGHT":
                streak += 1
                max_streak = max(max_streak, streak)
            else:
                streak = 0
        max_night_streak[sid] = max_streak
        night_streak_violation[sid] = max(
            0, max_streak - int(MAX_CONSECUTIVE_NIGHTS))

    burnout_risk_score = sum(night_streak_violation.values())

    # 4) Skill match (we’ll optimize later)
    matched = 0
    total = 0
    for a in assignments:
        sid = a["staff_id"]
        shift = a["shift"]
        prefs = SHIFT_SKILL_PREF.get(shift, set())
        nurse_skills = set(staff[sid].get("specializations", []))
        if not prefs or nurse_skills.intersection(prefs):
            matched += 1
        total += 1
    skill_match_rate = matched / total if total else 0.0

    return {
        "weeks": weeks,
        "hours_worked_by_staff": dict(hours_worked),
        "contracted_hours_by_staff": contracted_by_staff,
        "overtime_by_staff": overtime_by_staff,
        "total_overtime_hours": total_overtime,
        "max_night_streak_by_staff": max_night_streak,
        "night_streak_violation_by_staff": night_streak_violation,
        "burnout_risk_score": burnout_risk_score,
        "skill_match_rate": skill_match_rate,
        "assignment_count": len(assignments),
        "staff_count": len(staff),
    }
