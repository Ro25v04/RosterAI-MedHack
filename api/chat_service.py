# api/chat_service.py

import os
import json
from typing import Dict, Any, Optional, Tuple, List

from openai import OpenAI


def build_roster_context(
    roster: Dict[str, Any],
    metrics: Dict[str, Any],
    max_assignments: int = 300
) -> Dict[str, Any]:
    staff = roster["staff"]
    assignments = roster["assignments"][:max_assignments]

    staff_compact = {
        sid: {
            "name": info.get("name", ""),
            "fte": info.get("fte", 1.0),
            "specializations": info.get("specializations", []),
            "role": info.get("role", ""),
        }
        for sid, info in staff.items()
    }

    return {
        "date_range": {"start": roster.get("start_date"), "end": roster.get("end_date")},
        "metrics": {
            "total_overtime_hours": round(float(metrics["total_overtime_hours"]), 2),
            "burnout_risk_score": int(metrics["burnout_risk_score"]),
            "skill_match_rate": round(float(metrics["skill_match_rate"]), 4),
            "assignment_count": int(metrics["assignment_count"]),
        },
        "staff": staff_compact,
        "assignments": [
            {
                "date": a["date"],
                "shift": a["shift"],
                "slot": int(a.get("slot", 0)),
                "staff_id": a["staff_id"],
            }
            for a in assignments
        ],
        "notes": "Shifts are AM, PM, NIGHT. Answer only using this data. If missing, say you don't have enough info.",
    }


def chat_once(
    user_message: str,
    roster_context: Dict[str, Any],
) -> Tuple[str, Optional[Dict[str, Any]]]:
    """
    Returns (reply_text, action_dict_or_none)

    If the user requests an EDIT, model should output JSON action only:
      - swap: {"action":"swap","date":"YYYY-MM-DD","shift":"AM|PM|NIGHT","staff_a":"N###","staff_b":"N###"}
      - replace: {"action":"replace","date":"YYYY-MM-DD","shift":"AM|PM|NIGHT","slot":<int>,"new_staff_id":"N###"}
      - none: {"action":"none"}
    Otherwise it replies with normal text and action=None.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return ("ERROR: OPENAI_API_KEY is not set.", None)

    client = OpenAI(api_key=api_key)

    system = """
You are a nurse rostering assistant.

If the user asks a QUESTION: reply normally in plain text.

If the user asks to EDIT the roster: output ONLY ONE JSON object and NOTHING ELSE.

You MUST use exactly one of these actions:
- "replace"
- "swap"
- "none"

JSON schemas (must match exactly):

REPLACE:
{"action":"replace","date":"YYYY-MM-DD","shift":"AM|PM|NIGHT","slot":<int>,"new_staff_id":"N###"}

SWAP:
{"action":"swap","date":"YYYY-MM-DD","shift":"AM|PM|NIGHT","staff_a":"N###","staff_b":"N###"}

NONE:
{"action":"none"}

Rules:
- For edits, output JSON only (no extra text).
- Use only staff IDs that exist in roster_context.
- If the request is ambiguous, ask ONE short clarifying question (plain text).
""".strip()

    payload = {"user_message": user_message, "roster_context": roster_context}

    resp = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(payload)},
        ],
        temperature=0.2,
    )

    text = resp.choices[0].message.content.strip()

# Try parse JSON action
    if text.startswith("{") and text.endswith("}"):
        try:
            action = json.loads(text)

            # ---- FIX 2: normalize common model variants ----
            if isinstance(action, dict):

                # Normalize action names
                if action.get("action") in {"replace_assignment", "replaceStaff", "replace_staff"}:
                    action["action"] = "replace"

                if action.get("action") in {"swap_assignment", "swapStaff", "swap_staff"}:
                    action["action"] = "swap"

                # Normalize key names
                if "staff_id" in action and "new_staff_id" not in action:
                    action["new_staff_id"] = action["staff_id"]

                # Now validate
                if action.get("action") in {"swap", "replace", "none"}:
                    if action["action"] == "none":
                        return ("Okay.", None)

                    return ("Okay — applying that change now.", action)

        except Exception:
            pass

    return (text, None)


def chat_with_history(
    history: List[Dict[str, str]],
    roster_context: Dict[str, Any],
) -> Tuple[str, Optional[Dict[str, Any]]]:
    """
    Continuous chat: you pass in message history list and we append roster_context
    as the latest user payload for grounding.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return ("ERROR: OPENAI_API_KEY is not set.", None)

    client = OpenAI(api_key=api_key)

    system = """
You are a nurse rostering assistant.

Answer using only the roster_context JSON included in the latest user message.
If the user asks to EDIT the roster, output ONLY a JSON action.
""".strip()

    messages = [{"role": "system", "content": system}] + history

    # last message in history should already include roster_context in its content,
    # but if you want, you can enforce that at caller side.

    resp = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages,
        temperature=0.2,
    )

    text = resp.choices[0].message.content.strip()

    if text.startswith("{") and text.endswith("}"):
        try:
            action = json.loads(text)
            if isinstance(action, dict) and action.get("action") in {"swap", "replace", "none"}:
                if action["action"] == "none":
                    return ("Okay.", None)
                return ("Okay — applying that change now.", action)
        except Exception:
            pass

    return (text, None)