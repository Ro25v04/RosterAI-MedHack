# api/testing/test_chat_loop.py

from api.metrics import compute_metrics
from api.chat_session import ChatSession
from api.data_loader import load_roster_from_excel, save_optimized_roster_to_excel
from dotenv import load_dotenv
load_dotenv()


if __name__ == "__main__":
    baseline_path = "api/data/rosters/optimized_roster.xlsx"
    out_path = "api/data/rosters/optimized_roster_AI_EDITED.xlsx"

    baseline = load_roster_from_excel(baseline_path)
    working = load_roster_from_excel(baseline_path)

    session = ChatSession(baseline_roster=baseline, roster=working)

    print("\nContinuous chat ready.")
    print("Type messages. Commands: save / exit\n")

    while True:
        msg = input("YOU> ").strip()
        if not msg:
            continue
        if msg.lower() == "exit":
            break

        if msg.lower() == "save":
            before = compute_metrics(session.baseline_roster)
            after = compute_metrics(session.roster)

            xlsx_path = "api/data/rosters/optimized_roster_AI_EDITED.xlsx"
            pdf_path = "api/data/rosters/optimized_roster_AI_EDITED.pdf"
            asg_csv = "api/data/rosters/assignments_AI_EDITED.csv"
            staff_csv = "api/data/rosters/staff_AI_EDITED.csv"
            json_path = "api/data/rosters/roster_AI_EDITED.json"

            # Excel workbook (Staff + Assignments + Summary + Change Log)
            save_optimized_roster_to_excel(
                original_roster=session.baseline_roster,
                optimized_roster=session.roster,
                before_metrics=before,
                after_metrics=after,
                out_path=xlsx_path,
                change_log=session.change_log,
            )

            # Extra exports
            from api.export import (
                export_roster_pdf_report,
                export_roster_csv,
                export_roster_json,
            )

            export_roster_pdf_report(
                roster=session.roster,
                metrics=after,
                change_log=session.change_log,
                out_path=pdf_path,
                max_days=14,
            )

            export_roster_csv(
                session.roster, out_assignments_csv=asg_csv, out_staff_csv=staff_csv)
            export_roster_json(session.roster, out_path=json_path)

            print(f"✅ Saved XLSX: {xlsx_path}")
            print(f"✅ Saved PDF : {pdf_path}")
            print(f"✅ Saved CSV : {asg_csv} and {staff_csv}")
            print(f"✅ Saved JSON: {json_path}")
            continue

        reply, _ = session.send(msg)
        print("BOT>", reply)
