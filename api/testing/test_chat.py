# api/testing/test_chat.py

from api.data_loader import load_roster_from_excel, save_optimized_roster_to_excel
from api.metrics import compute_metrics
from api.roster_ops import replace_staff, swap_staff
from api.chat_service import build_roster_context, chat_once
from datetime import datetime
import os
import pandas as pd
from dotenv import load_dotenv
load_dotenv()


def load_change_log(xlsx_path: str):
    if not os.path.exists(xlsx_path):
        return []
    try:
        df = pd.read_excel(xlsx_path, sheet_name="Change Log")
        return df.to_dict(orient="records")
    except Exception:
        return []


if __name__ == "__main__":
    # Treat this as the "baseline" optimized roster (before any AI edits)
    baseline_path = "api/data/rosters/optimized_roster.xlsx"
    out_path = "api/data/rosters/optimized_roster_AI_EDITED.xlsx"
    change_log = load_change_log(out_path)

    baseline_roster = load_roster_from_excel(baseline_path)
    baseline_metrics = compute_metrics(baseline_roster)

    # We'll edit a working copy (start from baseline)
    roster = load_roster_from_excel(baseline_path)
    metrics = compute_metrics(roster)
    context = build_roster_context(roster, metrics)

    # Ask for an edit (tests the JSON action path)
    msg = "Replace NIGHT slot 1 on 2024-03-05 with N001"
    reply, action = chat_once(msg, context)
    print("USER:", msg)
    print("BOT :", reply)
    print("ACTION:", action)

    if action:
        if action["action"] == "replace":
            ok, m = replace_staff(
                roster,
                action["date"],
                action["shift"],
                int(action["slot"]),
                action["new_staff_id"],
            )
            print("APPLY:", ok, m)
            if ok:
                change_log.append({
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                    "action": action["action"],
                    "date": action.get("date"),
                    "shift": action.get("shift"),
                    "details": m
                })

        elif action["action"] == "swap":
            ok, m = swap_staff(
                roster,
                action["date"],
                action["shift"],
                action["staff_a"],
                action["staff_b"],
            )
            print("APPLY:", ok, m)

        # Recompute metrics AFTER the edit
        after_metrics = compute_metrics(roster)

        # Regenerate the workbook with Summary + Changes
        save_optimized_roster_to_excel(
            original_roster=baseline_roster,
            optimized_roster=roster,
            before_metrics=baseline_metrics,
            after_metrics=after_metrics,
            out_path=out_path,
            change_log=change_log
        )

        print(f"Saved updated workbook with Summary + Changes: {out_path}")
        print("Updated metrics:", {
            "total_overtime_hours": after_metrics["total_overtime_hours"],
            "burnout_risk_score": after_metrics["burnout_risk_score"],
            "skill_match_rate": after_metrics["skill_match_rate"],
        })
    else:
        print("No edit action returned by AI. Nothing to apply.")
