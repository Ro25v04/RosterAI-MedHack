# api/test_load.py
import sys
from data_loader import load_roster_from_excel

if len(sys.argv) < 2:
    print("Usage: python api/test_load.py <roster.xlsx>")
    raise SystemExit(1)

path = sys.argv[1]
roster = load_roster_from_excel(path)

print("✅ Loaded roster")
print("Staff count:", len(roster["staff"]))
print("Assignments:", len(roster["assignments"]))
print("Date range:", roster["start_date"], "to", roster["end_date"])