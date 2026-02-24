# api/main.py

from api.export import export_roster_pdf_report, export_roster_csv, export_roster_json
from api.chat_session import ChatSession
from api.optimizer import optimize_roster
from api.metrics import compute_metrics
from api.data_loader import load_roster_from_excel, save_optimized_roster_to_excel
from dotenv import load_dotenv
load_dotenv()


def run_cli(
    input_xlsx: str,
    out_base: str = "api/data/rosters/output",
):
    """
    Full workflow:
    - load Excel
    - optimize
    - start continuous chat session
    - save exports on demand
    """
    print(f"\nLoading: {input_xlsx}")
    original = load_roster_from_excel(input_xlsx)

    print("Optimizing roster...")
    optimized = optimize_roster(original)

    before = compute_metrics(original)
    after = compute_metrics(optimized)

    print("\n=== OPTIMIZATION DONE ===")
    print(
        f"Overtime: {before['total_overtime_hours']:.2f} -> {after['total_overtime_hours']:.2f}")
    print(
        f"Burnout:  {before['burnout_risk_score']} -> {after['burnout_risk_score']}")
    print(
        f"Skill:    {before['skill_match_rate']:.3f} -> {after['skill_match_rate']:.3f}")
    print()

    # Chat session works on the optimized roster
    session = ChatSession(baseline_roster=optimized, roster=optimized)

    print("Continuous chat ready.")
    print("Commands: save / metrics / exit\n")

    while True:
        msg = input("YOU> ").strip()
        if not msg:
            continue
        if msg.lower() == "exit":
            break

        if msg.lower() == "metrics":
            m = compute_metrics(session.roster)
            print("METRICS>", {
                "total_overtime_hours": round(m["total_overtime_hours"], 2),
                "burnout_risk_score": int(m["burnout_risk_score"]),
                "skill_match_rate": round(m["skill_match_rate"], 4),
                "assignment_count": int(m["assignment_count"]),
            })
            continue

        if msg.lower() == "save":
            # Export paths
            xlsx_path = f"{out_base}.xlsx"
            pdf_path = f"{out_base}.pdf"
            asg_csv = f"{out_base}_assignments.csv"
            staff_csv = f"{out_base}_staff.csv"
            json_path = f"{out_base}.json"

            # Compute metrics for current state
            cur_metrics = compute_metrics(session.roster)

            # Save Excel (with summary + change log)
            save_optimized_roster_to_excel(
                original_roster=optimized,          # baseline for summary
                optimized_roster=session.roster,    # current edited roster
                before_metrics=after,               # baseline metrics
                after_metrics=cur_metrics,          # current metrics
                out_path=xlsx_path,
                change_log=session.change_log,
            )

            # Save PDF report
            export_roster_pdf_report(
                roster=session.roster,
                metrics=cur_metrics,
                change_log=session.change_log,
                out_path=pdf_path,
                max_days=14,
            )

            # Save CSV + JSON
            export_roster_csv(
                session.roster, out_assignments_csv=asg_csv, out_staff_csv=staff_csv)
            export_roster_json(session.roster, out_path=json_path)

            print(f"✅ Saved XLSX: {xlsx_path}")
            print(f"✅ Saved PDF : {pdf_path}")
            print(f"✅ Saved CSV : {asg_csv} and {staff_csv}")
            print(f"✅ Saved JSON: {json_path}")
            continue

        # normal chat
        reply, _ = session.send(msg)
        print("BOT>", reply)


if __name__ == "__main__":
    # Change this to any roster file you want
    run_cli("api/data/rosters/sample_roster.xlsx",
            out_base="api/data/rosters/final_output")
