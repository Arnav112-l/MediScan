"""Adherence tracking APIs."""
from __future__ import annotations

from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.reminder import AdherenceLog, Reminder
from app.utils.responses import err, ok

bp = Blueprint("adherence", __name__, url_prefix="/api")


@bp.post("/adherence/mark-dose")
@jwt_required()
def mark_dose():
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    try:
        rid = int(data.get("reminder_id"))
    except (TypeError, ValueError):
        return err("reminder_id required", status=400)
    status = (data.get("status") or "taken").strip()
    if status not in ("taken", "missed"):
        return err("status must be taken or missed", status=400)
    log = AdherenceLog(user_id=uid, reminder_id=rid, status=status)
    db.session.add(log)
    db.session.commit()
    return ok({"id": log.id, "status": status})


@bp.get("/adherence")
@jwt_required()
def adherence_summary():
    uid = int(get_jwt_identity())
    logs = (
        AdherenceLog.query.filter_by(user_id=uid)
        .order_by(AdherenceLog.taken_at.desc())
        .limit(500)
        .all()
    )
    taken = sum(1 for x in logs if x.status == "taken")
    missed = sum(1 for x in logs if x.status == "missed")
    total = taken + missed
    pct = round(100.0 * taken / total, 1) if total else 0.0

    # Weekly buckets for charts (last 7 days)
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)
    recent = [x for x in logs if x.taken_at >= week_start]
    by_day: dict[str, dict[str, int]] = {}
    for x in recent:
        d = x.taken_at.date().isoformat()
        by_day.setdefault(d, {"taken": 0, "missed": 0})
        by_day[d][x.status] = by_day[d].get(x.status, 0) + 1

    weekly_series = sorted(
        [{"date": d, "taken": v["taken"], "missed": v["missed"]} for d, v in by_day.items()],
        key=lambda r: r["date"],
    )

    reminders_count = Reminder.query.filter_by(user_id=uid, status="active").count()

    payload = {
            "completion_percent": pct,
            "taken_doses": taken,
            "missed_doses": missed,
            "total_logged": total,
            "active_reminders": reminders_count,
            "weekly_series": weekly_series,
            "logs": [
                {
                    "id": x.id,
                    "reminder_id": x.reminder_id,
                    "status": x.status,
                    "taken_at": x.taken_at.isoformat(),
                }
                for x in logs[:100]
            ],
        }
    return ok(payload)


@bp.get("/adherence/report")
@jwt_required()
def adherence_report_legacy():
    """Legacy flat JSON for older clients (`logs` only)."""
    uid = int(get_jwt_identity())
    logs = (
        AdherenceLog.query.filter_by(user_id=uid)
        .order_by(AdherenceLog.taken_at.desc())
        .limit(400)
        .all()
    )
    return jsonify(
        {
            "logs": [
                {
                    "id": x.id,
                    "reminder_id": x.reminder_id,
                    "status": x.status,
                    "taken_at": x.taken_at.isoformat(),
                }
                for x in logs
            ]
        }
    )


# Legacy alias
@bp.post("/adherence/log")
@jwt_required()
def adherence_log_legacy():
    return mark_dose()
