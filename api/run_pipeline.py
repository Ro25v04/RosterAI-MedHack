# api/run_pipeline.py
import sys
from pathlib import Path

from data_loader import load_roster_from_excel, save_roster_to_excel
from metrics import compute_metrics
from optimizer import optimize_roster


def main():
    if len(sys.argv) < 3:
        print("Usage:")
        print("  python api/run_pipeline.py metrics <input.xlsx>")
        print("  python api/run_pipeline.py optimize <input.xlsx> <output.xlsx>")
        sys.exit(1)

    mode = sys.argv[1].lower()
    in_path = Path(sys.argv[2])

    if not in_path.exists():
        print(f"Input file not found: {in_path}")
        sys.exit(1)

    roster = load_roster_from_excel(str(in_path))

    if mode == "metrics":
        m = compute_metrics(roster)
        print("\n=== METRICS ===")
        for k, v in m.items():
            print(f"{k}: {v}")

    elif mode == "optimize":
        if len(sys.argv) < 4:
            print("Usage: python api/run_pipeline.py optimize <input.xlsx> <output.xlsx>")
            sys.exit(1)

        out_path = Path(sys.argv[3])
        base_metrics = compute_metrics(roster)

        optimized = optimize_roster(roster)
        opt_metrics = compute_metrics(optimized)

        save_roster_to_excel(optimized, str(out_path))

        print("\n=== BEFORE ===")
        for k, v in base_metrics.items():
            print(f"{k}: {v}")

        print("\n=== AFTER ===")
        for k, v in opt_metrics.items():
            print(f"{k}: {v}")

        print(f"\nSaved optimized roster to: {out_path}")

    else:
        print(f"Unknown mode: {mode}")
        sys.exit(1)


if __name__ == "__main__":
    main()