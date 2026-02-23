from api.data_loader import load_roster_from_excel
from api.metrics import compute_metrics
from api.optimizer import optimize_roster
import sys
import os
from api.data_loader import save_roster_to_excel

# Add parent folder (api/) to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


# Load sample roster
roster = load_roster_from_excel("api/data/rosters/sample_roster.xlsx")

print("=== BEFORE OPTIMIZATION ===")
before = compute_metrics(roster)
print("Total overtime:", before["total_overtime_hours"])
print("Burnout score:", before["burnout_risk_score"])
print("Skill match rate:", before["skill_match_rate"])

# Run optimizer
optimized = optimize_roster(roster)

print("\n=== AFTER OPTIMIZATION ===")
after = compute_metrics(optimized)
print("Total overtime:", after["total_overtime_hours"])
print("Burnout score:", after["burnout_risk_score"])
print("Skill match rate:", after["skill_match_rate"])


# Save optimized roster to file
save_roster_to_excel(
    optimized,
    "api/data/rosters/optimized_roster.xlsx"
)

print("Optimized roster saved to api/data/rosters/optimized_roster.xlsx")
