# api/testing/test_optimize.py

from api.data_loader import (
    load_roster_from_excel,
    save_optimized_roster_to_excel,
)
from api.metrics import compute_metrics
from api.optimizer import optimize_roster


# ----------------------------
# Load sample roster
# ----------------------------
roster = load_roster_from_excel(
    "api/data/rosters/sample_roster.xlsx"
)

print("=== BEFORE OPTIMIZATION ===")
before = compute_metrics(roster)
print("Total overtime:", before["total_overtime_hours"])
print("Burnout score:", before["burnout_risk_score"])
print("Skill match rate:", before["skill_match_rate"])


# ----------------------------
# Run optimizer
# ----------------------------
optimized = optimize_roster(roster)

changed = sum(
    1
    for a, b in zip(roster["assignments"], optimized["assignments"])
    if a["staff_id"] != b["staff_id"]
)

print("\nAssignments changed:", changed, "/", len(roster["assignments"]))


print("\n=== AFTER OPTIMIZATION ===")
after = compute_metrics(optimized)
print("Total overtime:", after["total_overtime_hours"])
print("Burnout score:", after["burnout_risk_score"])
print("Skill match rate:", after["skill_match_rate"])


# ----------------------------
# Save optimized roster with summary + changes sheet
# ----------------------------
save_optimized_roster_to_excel(
    original_roster=roster,
    optimized_roster=optimized,
    before_metrics=before,
    after_metrics=after,
    out_path="api/data/rosters/optimized_roster.xlsx",
)

print("\nSaved: api/data/rosters/optimized_roster.xlsx")
