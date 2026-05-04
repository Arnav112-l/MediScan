"""Chatbot — OmniDimension / OpenAI-compatible API with deterministic FAQ fallback."""
from __future__ import annotations

from typing import Any

from app.services.ai_service import LLMConfigurationError, chat_completion, llm_is_configured

_FAQ_KEYWORDS: list[tuple[tuple[str, ...], str]] = (
    (
        ("price", "compare", "pharmacy"),
        "Use Search Medicine to compare live prices across pharmacies. Results come from real storefront pages at query time.",
    ),
    (
        ("reminder", "adherence"),
        "Add reminders under Reminders; log doses to track adherence on your dashboard.",
    ),
    (
        ("prescription", "ocr"),
        "Upload a prescription image or PDF under Upload Prescription — OCR extracts medicine lines without inventing drugs.",
    ),
    (
        ("lab", "report"),
        "Lab Report Analysis parses biomarkers from uploads and compares them to reference intervals stored in MedScan.",
    ),
)


def faq_fallback(message: str) -> str | None:
    low = message.lower()
    for keys, text in _FAQ_KEYWORDS:
        if any(k in low for k in keys):
            return text
    return None


def complete_chat(messages: list[dict[str, str]], user_context: str | None = None) -> tuple[str, bool]:
    """
    Returns (reply_text, from_llm).
    """
    if llm_is_configured():
        try:
            return chat_completion(messages, user_context=user_context), True
        except LLMConfigurationError:
            pass
    last_user = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user = m.get("content") or ""
            break
    fb = faq_fallback(last_user)
    if fb:
        return fb + "\n\n(LLM API unavailable — configure OMNIDIMENSION_API_BASE and OMNIDIMENSION_API_KEY for full answers.)", False
    return (
        "MedScan assistant requires a configured OpenAI-compatible API (OMNIDIMENSION_*). "
        "Until then, try Search Medicine or Upload Prescription for structured flows.",
        False,
    )
