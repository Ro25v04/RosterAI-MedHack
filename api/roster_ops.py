# api/roster_ops.py
from typing import Dict, Any, Optional, Tuple


def _find_assignment_index(roster: Dict[str, Any], date: str, shift: str, slot: int) -> Optional[int]:
    for i, a in enumerate(roster["assignments"]):
        if a["date"] == date and a["shift"] == shift and int(a.get("slot", 0)) == int(slot):
            return i
    return None


def _staff_exists(roster: Dict[str, Any], staff_id: str) -> bool:
    return staff_id in roster.get("staff", {})


def _is_double_booked(roster: Dict[str, Any], staff_id: str, date: str, shift: str) -> bool:
    # same nurse already assigned to that same date+shift
    for a in roster["assignments"]:
        if a["staff_id"] == staff_id and a["date"] == date and a["shift"] == shift:
            return True
    return False


def replace_staff(roster: Dict[str, Any], date: str, shift: str, slot: int, new_staff_id: str) -> Tuple[bool, str]:
    """
    Replace the staff member assigned to (date, shift, slot) with new_staff_id.
    """
    if not _staff_exists(roster, new_staff_id):
        return False, f"Unknown staff_id: {new_staff_id}"

    idx = _find_assignment_index(roster, date, shift, slot)
    if idx is None:
        return False, f"No assignment found for {date} {shift} slot {slot}"

    # prevent double booking the target nurse on same shift
    if _is_double_booked(roster, new_staff_id, date, shift):
        return False, f"{new_staff_id} is already booked for {date} {shift}"

    old_staff_id = roster["assignments"][idx]["staff_id"]
    roster["assignments"][idx]["staff_id"] = new_staff_id
    return True, f"Replaced {old_staff_id} -> {new_staff_id} for {date} {shift} slot {slot}"


def swap_staff(roster: Dict[str, Any], date: str, shift: str, staff_a: str, staff_b: str) -> Tuple[bool, str]:
    """
    Swap staff_a and staff_b within the SAME date+shift.
    Useful for natural requests like "swap N001 and N002 on Mar 5 NIGHT".
    """
    if not _staff_exists(roster, staff_a):
        return False, f"Unknown staff_id: {staff_a}"
    if not _staff_exists(roster, staff_b):
        return False, f"Unknown staff_id: {staff_b}"

    # Find their assignment rows for that date+shift
    idx_a = None
    idx_b = None
    for i, a in enumerate(roster["assignments"]):
        if a["date"] == date and a["shift"] == shift:
            if a["staff_id"] == staff_a:
                idx_a = i
            elif a["staff_id"] == staff_b:
                idx_b = i

    if idx_a is None:
        return False, f"{staff_a} is not assigned on {date} {shift}"
    if idx_b is None:
        return False, f"{staff_b} is not assigned on {date} {shift}"

    roster["assignments"][idx_a]["staff_id"] = staff_b
    roster["assignments"][idx_b]["staff_id"] = staff_a
    return True, f"Swapped {staff_a} <-> {staff_b} for {date} {shift}"
