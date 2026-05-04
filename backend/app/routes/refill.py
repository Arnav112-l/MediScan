"""Refill alerts — derived from active reminders + duration_days."""
from __future__ import annotations

from datetime import datetime, timedelta

from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.reminder import Reminder
from app.utils.responses import ok

bp = Blueprint("refill", __name__, url_prefix="/api")


def _bucket(days_left: int) -> str:
    if days_left <= 0:
        return "overdue"
    if days_left <= 3:
        return "urgent"
    if days_left <= 7:
        return "soon"
    return "ok"


@bp.get("/refill/alerts")
@jwt_required()
def refill_alerts():
    uid = int(get_jwt_identity())
    rows = Reminder.query.filter_by(user_id=uid, status="active").all()
    now = datetime.utcnow()
    out = []
    for r in rows:
        if not r.duration_days or not r.created_at:
            continue
        end = r.created_at + timedelta(days=int(r.duration_days))
        days_left = (end.date() - now.date()).days
        if days_left > 14:
            continue
        out.append(
            {
                "reminder_id": r.id,
                "medicine_name": r.medicine_name,
                "dose": r.dose or "",
                "started_at": r.created_at.isoformat(),
                "ends_at": end.isoformat(),
                "days_left": days_left,
                "bucket": _bucket(days_left),
            }
        )
    out.sort(key=lambda x: x["days_left"])
    summary = {
        "overdue": sum(1 for x in out if x["bucket"] == "overdue"),
        "urgent": sum(1 for x in out if x["bucket"] == "urgent"),
        "soon": sum(1 for x in out if x["bucket"] == "soon"),
    }
    return ok({"alerts": out, "summary": summary})
