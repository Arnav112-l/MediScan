"""Lab report analysis — wraps OCR + rule-based markers + optional LLM."""
from __future__ import annotations

from typing import Any

from app.services import ai_service, report_service


def analyze_lab_text(raw: str) -> list[dict[str, Any]]:
    return report_service.analyze_lab_text(raw)


def deviation_summary(row: dict[str, Any]) -> str:
    """Human-readable deviation line for UI tables."""
    nm = str(row.get("name", "")).strip()
    val = row.get("value")
    unit = str(row.get("unit", "") or "").strip()
    flag = str(row.get("flag", "")).strip()
    lo, hi = row.get("ref_low"), row.get("ref_high")
    if flag == "normal":
        return f"{nm} within reference."
    if flag == "low" and lo is not None:
        try:
            delta = float(lo) - float(val)
            return f"{nm} low by ~{delta:.1f} {unit}".strip()
        except (TypeError, ValueError):
            return f"{nm} below reference range."
    if flag == "high" and hi is not None:
        try:
            delta = float(val) - float(hi)
            return f"{nm} high by ~{delta:.1f} {unit}".strip()
        except (TypeError, ValueError):
            return f"{nm} above reference range."
    return f"{nm}: status {flag}."


def enrich_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out = []
    for r in rows:
        copy = dict(r)
        copy["deviation"] = deviation_summary(r)
        out.append(copy)
    return out


def insights_plain_language(rows: list[dict[str, Any]]) -> str:
    return ai_service.lab_insights_plain_language(rows)
