# api/optimizer.py
import copy
import random
from typing import Dict, Any, Tuple, Optional

from metrics import compute_metrics


def _is_double_booked(roster: Dict[str, Any], staff_id: str, date: str, shift: str) -> bool:
    # nurse cannot work two slots in the same date+shift
    for a in roster["assignments"]:
        if a["staff_id"] == staff_id and a["date"] == date and a["shift"] == shift:
            return True
    return False


def optimize_overtime_only(
    roster: Dict[str, Any],
    iterations: int = 5000,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Overtime-only optimizer:
    - picks an assignment from a high-overtime nurse
    - reassigns it to a low-hours nurse (if not double-booked)
    - accepts the move if total overtime decreases
    """
    random.seed(seed)

    best = copy.deepcopy(roster)
    best_m = compute_metrics(best)
    best_total_ot = float(best_m["total_overtime_hours"])

    if best_total_ot <= 0:
        return best

    for _ in range(iterations):
        m = compute_metrics(best)
        overtime = m["overtime_by_staff"]
        hours = m["hours_worked_by_staff"]

        # pick a nurse with highest overtime
        high = max(overtime.items(), key=lambda x: x[1])[0]
        if overtime[high] <= 0:
            break

        # find underloaded nurses (lowest hours worked)
        low_candidates = sorted(hours.items(), key=lambda x: x[1])[: max(5, len(hours)//4)]
        low_ids = [sid for sid, _ in low_candidates if sid != high]
        if not low_ids:
            break

        # pick one assignment from high nurse
        high_asg_idxs = [i for i, a in enumerate(best["assignments"]) if a["staff_id"] == high]
        if not high_asg_idxs:
            continue

        idx = random.choice(high_asg_idxs)
        a = best["assignments"][idx]
        date, shift = a["date"], a["shift"]

        # try a few low candidates to find a valid move
        tried = 0
        moved = False
        for target in random.sample(low_ids, k=min(10, len(low_ids))):
            tried += 1

            # must not be double booked
            if _is_double_booked(best, target, date, shift):
                continue

            candidate = copy.deepcopy(best)
            candidate["assignments"][idx]["staff_id"] = target

            cand_m = compute_metrics(candidate)
            cand_total_ot = float(cand_m["total_overtime_hours"])

            # accept only if overtime improves
            if cand_total_ot < best_total_ot:
                best = candidate
                best_m = cand_m
                best_total_ot = cand_total_ot
                moved = True
                break

        # if we couldn't move anything, keep looping (randomness may find other shifts)
        # no else needed

    return best