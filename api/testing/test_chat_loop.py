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

            save_optimized_roster_to_excel(
                original_roster=session.baseline_roster,
                optimized_roster=session.roster,
                before_metrics=before,
                after_metrics=after,
                out_path=out_path,
                change_log=session.change_log,
            )
            print(f"✅ Saved: {out_path}")
            continue

        reply, _ = session.send(msg)
        print("BOT>", reply)
