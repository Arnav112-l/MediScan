"""Reminder scheduling helpers."""
from __future__ import annotations

from datetime import datetime, timedelta

from app.extensions import db
from app.models.reminder import Reminder


def compute_next_trigger(times: list[str] | None, frequency: str | None, duration_days: int | None) -> datetime | None:
    if not times:
        return datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)
    # Minimal MVP: next calendar day at first HH:MM
    now = datetime.utcnow()
    return now.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)


def update_reminder_fields(r: Reminder, data: dict) -> None:
    if "medicine_name" in data:
        r.medicine_name = (data.get("medicine_name") or "").strip() or r.medicine_name
    if "dose" in data:
        r.dose = data.get("dose")
    if "frequency" in data:
        r.frequency = data.get("frequency")
    if "schedule" in data:
        r.schedule = data.get("schedule") if isinstance(data.get("schedule"), dict) else r.schedule
    if "duration_days" in data:
        r.duration_days = data.get("duration_days")
    if "status" in data:
        r.status = data.get("status") or r.status
    times = None
    sch = r.schedule or {}
    if isinstance(sch, dict) and sch.get("times"):
        times = sch.get("times")
    r.next_trigger = compute_next_trigger(times, r.frequency, r.duration_days)
