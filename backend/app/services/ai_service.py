"""OmniDimension / OpenAI-compatible chat completions."""
from __future__ import annotations

import os
from typing import Any

import requests


class LLMConfigurationError(Exception):
    """Raised when OMNIDIMENSION_* (or compatible) endpoints are missing."""


def _llm_endpoint() -> tuple[str, str]:
    base = os.environ.get("OMNIDIMENSION_API_BASE", "").strip().rstrip("/")
    key = os.environ.get("OMNIDIMENSION_API_KEY", "").strip()
    return base, key


def llm_is_configured() -> bool:
    b, k = _llm_endpoint()
    return bool(b and k)


def chat_completion(messages: list[dict[str, str]], user_context: str | None = None) -> str:
    base, key = _llm_endpoint()
    if not base or not key:
        raise LLMConfigurationError("Configure OMNIDIMENSION_API_BASE and OMNIDIMENSION_API_KEY")

    combined = ""
    if user_context:
        combined = "[User profile context]\n" + user_context + "\n\n"
    msgs = [
        {
            "role": "system",
            "content": combined
            + "You are MedScan Health Assistant — informational only, not medical advice. India context.",
        }
    ] + messages[-12:]

    url = base + "/v1/chat/completions"
    model = os.environ.get("OMNIDIMENSION_MODEL", "gpt-4o-mini")
    r = requests.post(
        url,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={"model": model, "messages": msgs, "temperature": 0.3},
        timeout=90,
    )
    r.raise_for_status()
    data: dict[str, Any] = r.json()
    choices = data.get("choices") or []
    if not choices:
        return ""
    msg = choices[0].get("message") or {}
    return (msg.get("content") or "").strip()


def _deterministic_lab_commentary(rows: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for r in rows:
        nm = str(r.get("name", "")).strip()
        val = r.get("value")
        flag = str(r.get("flag", "")).strip()
        rl, rh = r.get("ref_low"), r.get("ref_high")
        unit = str(r.get("unit", "") or "").strip()
        if flag == "normal":
            lines.append(f"{nm}: {val} {unit} is within stated reference {(rl)}–{(rh)} {unit}.".strip())
        elif flag == "high":
            lines.append(f"{nm}: {val} {unit} is above reference {(rl)}–{(rh)} {unit}.".strip())
        elif flag == "low":
            lines.append(f"{nm}: {val} {unit} is below reference {(rl)}–{(rh)} {unit}.".strip())
    if not lines:
        return ""
    disclaimer = (
        "This is extracted data compared to reference intervals stored in MedScan—not a diagnosis."
    )
    return "\n".join(lines) + "\n\n" + disclaimer


def lab_insights_plain_language(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""

    fallback = _deterministic_lab_commentary(rows)
    if llm_is_configured():
        flagged = [r for r in rows if r.get("flag") != "normal"]
        if flagged:
            parts = []
            for r in flagged[:14]:
                parts.append(f'{r.get("name")}: {r.get("value")} ({r.get("flag")}).')
            msgs = [{"role": "user", "content": f"Brief neutral patient wording for labs: {'; '.join(parts)}"}]
            try:
                return chat_completion(msgs) or fallback
            except Exception:  # noqa: BLE001
                return fallback
        try:
            return chat_completion(
                [{"role": "user", "content": "Summarize that all listed markers are within reference (brief)."}]
            ) or fallback
        except Exception:  # noqa: BLE001
            return fallback
    return fallback
