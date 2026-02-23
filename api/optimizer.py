import copy
import random
from typing import Dict, Any

from api.metrics import compute_metrics
from api.config import WEIGHTS


def _is_double_booked(roster: Dict[str, Any], staff_id: str, date: str, shift: str) -> bool:
    for a in roster["assignments"]:
        if a["staff_id"] == staff_id and a["date"] == date and a["shift"] == shift:
            return True
    return False


def _calculate_score(metrics: Dict[str, Any]) -> float:
    """
    Lower score = better roster
    """

    total_overtime = metrics["total_overtime_hours"]
    burnout = metrics["burnout_risk_score"]
    skill = metrics["skill_match_rate"]
    assignments = metrics["assignment_count"]

    # Normalize overtime so it doesn't dominate everything
    normalized_overtime = total_overtime / max(assignments, 1)

    return (
        WEIGHTS["overtime"] * normalized_overtime
        + WEIGHTS["burnout"] * burnout
        - WEIGHTS["skill"] * skill
    )


def optimize_roster(
    roster: Dict[str, Any],
    iterations: int = 4000,
    seed: int = 42,
) -> Dict[str, Any]:

    random.seed(seed)

    best = copy.deepcopy(roster)
    best_metrics = compute_metrics(best)
    best_score = _calculate_score(best_metrics)

    for _ in range(iterations):

        current_metrics = compute_metrics(best)
        overtime = current_metrics["overtime_by_staff"]
        hours = current_metrics["hours_worked_by_staff"]

        # Pick nurse with highest overtime
        high = max(overtime.items(), key=lambda x: x[1])[0]

        # Find lowest-hour nurses
        low_candidates = sorted(hours.items(), key=lambda x: x[1])[
            : max(5, len(hours)//4)]
        low_ids = [sid for sid, _ in low_candidates if sid != high]

        if not low_ids:
            continue

        # Pick random assignment of high-overtime nurse
        high_asg_idxs = [
            i for i, a in enumerate(best["assignments"])
            if a["staff_id"] == high
        ]

        if not high_asg_idxs:
            continue

        idx = random.choice(high_asg_idxs)
        a = best["assignments"][idx]
        date, shift = a["date"], a["shift"]

        # Try reassigning to underloaded nurses
        for target in random.sample(low_ids, k=min(10, len(low_ids))):

            # Cannot double book
            if _is_double_booked(best, target, date, shift):
                continue

            candidate = copy.deepcopy(best)
            candidate["assignments"][idx]["staff_id"] = target

            cand_metrics = compute_metrics(candidate)
            cand_score = _calculate_score(cand_metrics)

            if cand_score < best_score:
                best = candidate
                best_metrics = cand_metrics
                best_score = cand_score
                break

    return best
