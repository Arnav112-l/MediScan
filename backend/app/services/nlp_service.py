"""Parse OCR output into structured medicine mentions (regex; spaCy optional extension point)."""
from __future__ import annotations

import re
from typing import Any


DOSAGE_RE = re.compile(
    r"(?i)([A-Za-z][A-Za-z0-9\s\-/+]*(?:tablet|capsule|syrup|injection)?)\s*[–-]?\s*([\d.]+\s*(?:mg|ml|gm|mcg)?)"
)
FREQ_RE = re.compile(r"(?i)(\d+)\s*(?:times?|x)\s*(?:a\s*)?(day|daily|week|od|bd|tds|hs)")
DURATION_RE = re.compile(r"(?i)(\d+)\s*(day|days|week|weeks|month|months)")


def parse_medicines_from_text(text: str) -> list[dict[str, Any]]:
    if not text or not text.strip():
        return []
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    out = []
    for ln in lines:
        if len(out) >= 24:
            break
        if re.match(r"(?i)^signature|doctor|patient|prescription|^tab\.?\s|^rx", ln):
            continue
        m = DOSAGE_RE.search(ln) or None
        fm = FREQ_RE.search(ln)
        dm = DURATION_RE.search(ln)
        freq = None
        duration = None
        if fm:
            freq = f"{fm.group(1)} times {fm.group(2)}"
        if dm:
            duration = f"{dm.group(1)} {dm.group(2)}"
        if m:
            out.append(
                {
                    "name": m.group(1).strip(),
                    "dosage": (m.group(2) or "").strip(),
                    "strength_hint": (m.group(2) or "").strip(),
                    "frequency": freq,
                    "duration": duration,
                }
            )
        elif re.match(r"(?i)^[a-z]", ln) and len(ln) < 140:
            name = re.sub(r"^\d+[\).\s]", "", ln).strip()
            out.append(
                {
                    "name": name,
                    "dosage": "",
                    "strength_hint": "",
                    "frequency": freq,
                    "duration": duration,
                }
            )
    if not out and text.strip():
        out.append({"name": text.strip()[:64], "dosage": "", "strength_hint": "", "frequency": None, "duration": None})
    return out

