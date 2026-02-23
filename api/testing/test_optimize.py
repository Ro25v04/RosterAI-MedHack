# api/test_optimize.py
from data_loader import load_roster_from_excel, save_roster_to_excel
from metrics import compute_metrics
from optimizer import optimize_overtime_only

in_path = "api/data/rosters/sample_roster.xlsx"
out_path = "api/data/rosters/optimized.xlsx"

roster = load_roster_from_excel(in_path)
before = compute_metrics(roster)

opt = optimize_overtime_only(roster, iterations=8000)
after = compute_metrics(opt)

print("\n=== BEFORE ===")
print("weeks:", before["weeks"])
print("total_overtime_hours:", before["total_overtime_hours"])

print("\n=== AFTER ===")
print("weeks:", after["weeks"])
print("total_overtime_hours:", after["total_overtime_hours"])

save_roster_to_excel(opt, out_path)
print("\n✅ Saved:", out_path)
