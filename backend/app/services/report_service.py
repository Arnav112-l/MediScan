"""Lab report parsing and reference-range comparison."""
from __future__ import annotations

import re
from typing import Any

REFERENCE: dict[str, tuple[float | None, float | None, str]] = {
    "hemoglobin": (13.5, 17.5, "g/dL"),
    "hba1c": (4.0, 5.6, "%"),
    "glucose fasting": (70, 100, "mg/dL"),
    "glucose random": (70, 140, "mg/dL"),
    "cholesterol total": (0.0, 200.0, "mg/dL"),
    "triglycerides": (0.0, 150.0, "mg/dL"),
}


LINE_RE = re.compile(
    r"(?i)(hemoglobin|hba1c|glucose\s*\(?fasting\)?|glucose\s*random|cholesterol\s*total|triglycerides)\s*[:\-]?\s*([\d.]+)",
)


def _match_ref(name_key: str) -> tuple[float | None, float | None, str]:
    nk = name_key.lower().strip()
    for key, tup in REFERENCE.items():
        if key in nk.replace("(", "").replace(")", ""):
            return tup[0], tup[1], tup[2]
    return None, None, ""


def analyze_lab_text(raw: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for m in LINE_RE.finditer(raw or ""):
        name_disp = m.group(1).strip()
        nk = name_disp.lower().strip()
        try:
            val = float(m.group(2))
        except ValueError:
            continue
        lo, hi, unit = _match_ref(nk)
        flag = "normal"
        if lo is not None and hi is not None:
            if val < lo:
                flag = "low"
            elif val > hi:
                flag = "high"
        rows.append(
            {
                "name": name_disp,
                "value": val,
                "unit": unit,
                "ref_low": lo,
                "ref_high": hi,
                "flag": flag,
            }
        )
    return rows

