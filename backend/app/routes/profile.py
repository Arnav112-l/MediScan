"""User profile and preferences."""
from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.prescription import Prescription
from app.models.report import LabReport
from app.models.reminder import AdherenceLog, Reminder
from app.models.search_history import SearchHistory
from app.models.user import User
from app.utils.redis_cache import cache_key_dashboard, delete_cache_key
from app.utils.responses import err, ok

bp = Blueprint("profile", __name__, url_prefix="/api")


@bp.get("/profile")
@jwt_required()
def get_profile():
    uid = int(get_jwt_identity())
    u = User.query.get(uid)
    if not u:
        return err("User not found", status=404)
    prefs = u.preferences if isinstance(u.preferences, dict) else {}
    return ok(
        {
            "id": u.id,
            "email": u.email,
            "name": u.name or "",
            "phone": u.phone or "",
            "date_of_birth": u.date_of_birth or "",
            "gender": u.gender or "",
            "role": u.role,
            "preferences": prefs,
            "notifications_enabled": prefs.get("notifications_enabled", True),
            "email_digest": prefs.get("email_digest", False),
            "sms_alerts": prefs.get("sms_alerts", False),
        }
    )


@bp.patch("/profile/update")
@jwt_required()
def update_profile():
    uid = int(get_jwt_identity())
    u = User.query.get(uid)
    if not u:
        return err("User not found", status=404)
    data = request.get_json(silent=True) or {}

    for field in ("name", "phone", "date_of_birth", "gender"):
        if field in data:
            setattr(u, field, (data[field] or "").strip())

    prefs = dict(u.preferences) if isinstance(u.preferences, dict) else {}
    for key in ("notifications_enabled", "email_digest", "sms_alerts", "theme"):
        if key in data:
            prefs[key] = data[key]
    u.preferences = prefs
    db.session.commit()
    return ok(
        {
            "name": u.name or "",
            "phone": u.phone or "",
            "date_of_birth": u.date_of_birth or "",
            "gender": u.gender or "",
            "preferences": prefs,
        },
        message="Profile updated",
    )


@bp.post("/profile/reset-data")
@jwt_required()
def reset_user_activity():
    """Delete all activity data for the current user (searches, prescriptions, reminders, logs, lab uploads)."""
    uid = int(get_jwt_identity())
    if not User.query.get(uid):
        return err("User not found", status=404)

    # Order: adherence logs reference reminders
    AdherenceLog.query.filter_by(user_id=uid).delete(synchronize_session=False)
    Reminder.query.filter_by(user_id=uid).delete(synchronize_session=False)
    SearchHistory.query.filter_by(user_id=uid).delete(synchronize_session=False)
    LabReport.query.filter_by(user_id=uid).delete(synchronize_session=False)
    Prescription.query.filter_by(user_id=uid).delete(synchronize_session=False)
    db.session.commit()
    delete_cache_key(cache_key_dashboard(uid))
    return ok({"reset": True}, message="All activity data cleared.")
