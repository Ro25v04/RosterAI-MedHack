# api/test_metrics.py
from data_loader import load_roster_from_excel
from metrics import compute_metrics

roster = load_roster_from_excel("api/data/rosters/sample_roster.xlsx")
m = compute_metrics(roster)

print("\n=== METRICS ===")
print("staff_count:", m["staff_count"])
print("assignment_count:", m["assignment_count"])
print("total_overtime_hours:", m["total_overtime_hours"])
print("burnout_risk_score:", m["burnout_risk_score"])
print("skill_match_rate:", round(m["skill_match_rate"], 3))

# show top 5 overtime people
o_sorted = sorted(m["overtime_by_staff"].items(),
                  key=lambda x: x[1], reverse=True)[:5]
print("\nTop overtime (top 5):")
for sid, hrs in o_sorted:
    print(sid, hrs)
