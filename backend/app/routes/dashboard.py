"""Dashboard API — Redis-cached summary."""
from __future__ import annotations

from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.prescription import Prescription
from app.models.reminder import AdherenceLog, Reminder
from app.models.search_history import SearchHistory
from app.services.comparison_service import search_medicine
from app.utils.redis_cache import cache_key_dashboard, get_cache, set_cache
from app.utils.responses import ok

bp = Blueprint("dashboard", __name__, url_prefix="/api")



def _build_dashboard(uid: int):
    upcoming = Reminder.query.filter_by(user_id=uid, status="active").order_by(Reminder.next_trigger.asc()).limit(8).all()
    total_rx = Prescription.query.filter_by(user_id=uid).count()
    tracked = Reminder.query.filter_by(user_id=uid, status="active").count()
    day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    doses_today = (
        AdherenceLog.query.filter_by(user_id=uid).filter(AdherenceLog.taken_at >= day_start).count()
    )
    logs_all = AdherenceLog.query.filter_by(user_id=uid).limit(400).all()
    taken = sum(1 for x in logs_all if x.status == "taken")
    missed = sum(1 for x in logs_all if x.status == "missed")
    denom = taken + missed
    adherence_pct = round(100.0 * taken / denom, 1) if denom else 0.0

    recent = (
        SearchHistory.query.filter_by(user_id=uid).order_by(SearchHistory.created_at.desc()).limit(8).all()
    )

    # Monthly savings estimate from recent search summaries (best-effort)
    savings_hint = 0.0
    for s in recent:
        summ = s.summary_json or {}
        ch = summ.get("cheapest") or {}
        try:
            savings_hint += float(ch.get("price") or 0) * 0.05
        except (TypeError, ValueError):
            continue

    return {
        "reminders_preview": [
            {
                "id": r.id,
                "medicine_name": r.medicine_name,
                "next_trigger": r.next_trigger.isoformat() if r.next_trigger else None,
                "dose": r.dose,
            }
            for r in upcoming
        ],
        "stats": {
            "prescriptions_saved": total_rx,
            "doses_logged_today": doses_today,
            "medicines_tracked": tracked,
            "adherence_score_percent": adherence_pct,
            "monthly_savings_estimate_inr": round(savings_hint, 2),
        },
        "recent_searches": [{"query": x.query, "created_at": x.created_at.isoformat()} for x in recent],
        "medicines_today": [],
        "adherence_preview": {"taken": taken, "missed": missed},
    }


@bp.get("/dashboard")
@jwt_required()
def dashboard():
    uid = int(get_jwt_identity())
    key = cache_key_dashboard(uid)
    bypass = request.args.get("refresh") == "1"
    if not bypass:
        cached = get_cache(key)
        if cached:
            return ok(cached)
    payload = _build_dashboard(uid)
    set_cache(key, payload)
    return ok(payload)


@bp.get("/dashboard/compare-preview")
@jwt_required()
def dashboard_compare_preview():
    """Optional: run live compare for last search query (heavy)."""
    uid = int(get_jwt_identity())
    recent = SearchHistory.query.filter_by(user_id=uid).order_by(SearchHistory.created_at.desc()).first()
    if not recent:
        return ok(None)
    payload, code, _msg = search_medicine(recent.query, user_id=None)
    if code:
        return ok({"error": "compare_failed", "detail": payload})
    return ok(payload)
