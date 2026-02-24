# api/chat_session.py

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from api.metrics import compute_metrics
from api.chat_service import build_roster_context, chat_with_history
from api.roster_ops import replace_staff, swap_staff


@dataclass
class ChatSession:
    baseline_roster: Dict[str, Any]
    roster: Dict[str, Any]
    change_log: List[Dict[str, Any]] = field(default_factory=list)
    history: List[Dict[str, str]] = field(default_factory=list)

    def _context(self) -> Dict[str, Any]:
        metrics = compute_metrics(self.roster)
        return build_roster_context(self.roster, metrics)

    def _log(self, action: Dict[str, Any], msg: str) -> None:
        self.change_log.append({
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "action": action.get("action"),
            "date": action.get("date"),
            "shift": action.get("shift"),
            "details": msg,
        })

    def apply_action(self, action: Dict[str, Any]) -> Tuple[bool, str]:
        if action.get("action") == "replace":
            ok, msg = replace_staff(
                self.roster,
                date=action["date"],
                shift=action["shift"],
                slot=int(action["slot"]),
                new_staff_id=action["new_staff_id"],
            )
            if ok:
                self._log(action, msg)
            return ok, msg

        if action.get("action") == "swap":
            ok, msg = swap_staff(
                self.roster,
                date=action["date"],
                shift=action["shift"],
                staff_a=action["staff_a"],
                staff_b=action["staff_b"],
            )
            if ok:
                self._log(action, msg)
            return ok, msg

        return False, f"Unknown action: {action}"

    def send(self, user_message: str) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        Adds the message to history, calls the model with history, applies edits if returned.
        """
        ctx = self._context()

        # Include roster context in the user message (so model can answer)
        payload = {
            "user_message": user_message,
            "roster_context": ctx,
        }

        self.history.append({"role": "user", "content": str(payload)})

        reply, action = chat_with_history(self.history, roster_context=ctx)

        # store assistant reply in history for continuity
        self.history.append({"role": "assistant", "content": reply})

        if action:
            ok, msg = self.apply_action(action)
            if ok:
                return f"{reply}\n✅ {msg}", action
            return f"Could not apply change: {msg}", action

        return reply, None
