"""Reminder CRUD."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.reminder import Reminder
from app.services.reminder_service import compute_next_trigger, update_reminder_fields
from app.utils.logger import get_logger
from app.utils.responses import err, ok

logger = get_logger(__name__)

bp = Blueprint("reminder", __name__, url_prefix="/api")


def serialize_reminder(r: Reminder):
    return {
        "id": r.id,
        "medicine_name": r.medicine_name,
        "dose": r.dose,
        "schedule": r.schedule or {},
        "frequency": r.frequency,
        "duration_days": r.duration_days,
        "status": r.status,
        "enabled": r.status == "active",
        "next_trigger": r.next_trigger.isoformat() if r.next_trigger else None,
    }


@bp.get("/reminders")
@jwt_required()
def list_reminders():
    uid = int(get_jwt_identity())
    rows = Reminder.query.filter_by(user_id=uid).order_by(Reminder.created_at.desc()).all()
    return ok({"reminders": [serialize_reminder(r) for r in rows]})


@bp.post("/reminders/create")
@jwt_required()
def create_reminder():
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    sch = data.get("schedule") or {}
    if isinstance(data.get("times"), list):
        sch = {"times": data.get("times")}
    times_list = data.get("times")
    if isinstance(times_list, str):
        times_list = [times_list]
    if isinstance(times_list, list):
        sch = {"times": times_list}

    r = Reminder(
        user_id=uid,
        medicine_name=(data.get("medicine_name") or "").strip() or "Medicine",
        dose=data.get("dose"),
        schedule=sch if isinstance(sch, dict) else {},
        frequency=data.get("frequency"),
        duration_days=data.get("duration_days"),
        status="active",
        next_trigger=compute_next_trigger(
            sch.get("times") if isinstance(sch, dict) else None,
            data.get("frequency"),
            data.get("duration_days"),
        ),
    )
    db.session.add(r)
    db.session.commit()
    return ok(serialize_reminder(r), status=201)


@bp.post("/reminders")
@jwt_required()
def create_reminder_legacy():
    """Backward-compatible: same as create."""
    return create_reminder()


@bp.patch("/reminders/update")
@jwt_required()
def patch_reminder():
    uid = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    rid = data.get("id") or data.get("reminder_id")
    try:
        rid = int(rid)
    except (TypeError, ValueError):
        return err("id required", status=400)
    r = Reminder.query.filter_by(id=rid, user_id=uid).first()
    if not r:
        return err("not found", status=404)
    update_reminder_fields(r, data)
    db.session.commit()
    return ok(serialize_reminder(r))


@bp.delete("/reminders/delete")
@jwt_required()
def delete_reminder_query():
    uid = int(get_jwt_identity())
    rid = request.args.get("id", type=int)
    if not rid:
        return err("id required", status=400)
    r = Reminder.query.filter_by(id=rid, user_id=uid).first()
    if not r:
        return err("not found", status=404)
    db.session.delete(r)
    db.session.commit()
    return ok({"deleted": rid})


@bp.delete("/reminders/<int:rid>")
@jwt_required()
def reminders_delete(rid: int):
    uid = int(get_jwt_identity())
    r = Reminder.query.filter_by(id=rid, user_id=uid).first()
    if not r:
        return jsonify({"error": "not found"}), 404
    db.session.delete(r)
    db.session.commit()
    return jsonify({"ok": True})
