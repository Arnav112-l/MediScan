"""Medicine search, comparison, catalog."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.medicine import MedicineCatalog
from app.services.comparison_service import compare_medicine, search_medicine
from app.services.recommendation_service import suggest_alternatives
from app.utils.logger import get_logger
from app.utils.responses import err, ok

logger = get_logger(__name__)

bp = Blueprint("medicine", __name__, url_prefix="/api")


def _uid_optional():
    try:
        uid = get_jwt_identity()
        if uid is not None and str(uid).isdigit():
            return int(uid)
    except Exception:
        pass
    return None


@bp.get("/search-medicine")
@jwt_required(optional=True)
def search_medicine_route():
    q = request.args.get("query") or request.args.get("q") or ""
    uid = _uid_optional()
    force = request.args.get("refresh") == "1"
    try:
        payload, code, msg = search_medicine(q, user_id=uid, force_refresh=force)
    except Exception as exc:
        logger.exception("Unhandled error in search_medicine for query=%r", q)
        return err(f"Internal error: {exc}", status=500)
    if code == 400:
        return err(msg or "Bad request", status=400)
    if code == 502:
        logger.warning("search scrape failure: %s", msg)
        return err(msg or "Scrape failed", status=502, data=payload)
    return ok(payload)


@bp.get("/compare")
@jwt_required(optional=True)
def compare_route():
    medicine = request.args.get("medicine") or request.args.get("query") or request.args.get("q") or ""
    uid = _uid_optional()
    force = request.args.get("refresh") == "1"
    try:
        payload, code, msg = compare_medicine(medicine, user_id=uid, force_refresh=force)
    except Exception as exc:
        logger.exception("Unhandled error in compare_medicine for query=%r", medicine)
        return err(f"Internal error: {exc}", status=500)
    if code == 400:
        return err(msg or "Bad request", status=400)
    if code == 502:
        return err(msg or "Comparison unavailable", status=502, data=payload)
    return ok(payload)


@bp.get("/medicine/search")
@jwt_required(optional=True)
def search_legacy():
    """Backward-compatible flat JSON (no envelope)."""
    q = request.args.get("q") or ""
    uid = _uid_optional()
    force = request.args.get("refresh") == "1"
    payload, code, msg = search_medicine(q, user_id=uid, force_refresh=force)
    if code == 400:
        return jsonify({"error": msg}), 400
    if code == 502:
        return jsonify(payload if isinstance(payload, dict) else {"error": msg}), 502
    return jsonify(payload)


@bp.get("/medicine/<int:mid>")
def medicine_detail(mid: int):
    m = MedicineCatalog.query.get(mid)
    if not m:
        return jsonify(
            {
                "id": mid,
                "name": "Unknown",
                "generic_name": "",
                "composition": "",
                "strength": "",
                "form": "",
                "manufacturer": "",
            }
        )
    return jsonify(
        {
            "id": m.id,
            "name": m.name,
            "generic_name": m.generic_name,
            "composition": m.composition,
            "strength": m.strength,
            "form": m.form,
            "manufacturer": m.manufacturer,
        }
    )


@bp.get("/alternatives")
@jwt_required(optional=True)
def alternatives_alias():
    """Generic alternatives by medicine name. Returns catalog matches by composition / generic name."""
    name = (request.args.get("name") or request.args.get("query") or "").strip()
    if not name:
        return err("name required", status=400)
    seed = MedicineCatalog.query.filter(MedicineCatalog.name.ilike(f"%{name}%")).first()
    composition = seed.composition if seed else None
    generic = seed.generic_name if seed else None
    items: list[dict] = []
    if composition:
        rows = (
            MedicineCatalog.query.filter(MedicineCatalog.composition.ilike(f"%{composition}%"))
            .limit(10)
            .all()
        )
        for r in rows:
            if seed and r.id == seed.id:
                continue
            items.append(
                {
                    "id": r.id,
                    "name": r.name,
                    "generic_name": r.generic_name,
                    "composition": r.composition,
                    "manufacturer": r.manufacturer,
                    "match_basis": "composition",
                }
            )
    if not items and generic:
        rows = (
            MedicineCatalog.query.filter(MedicineCatalog.generic_name.ilike(f"%{generic}%"))
            .limit(10)
            .all()
        )
        for r in rows:
            if seed and r.id == seed.id:
                continue
            items.append(
                {
                    "id": r.id,
                    "name": r.name,
                    "generic_name": r.generic_name,
                    "composition": r.composition,
                    "manufacturer": r.manufacturer,
                    "match_basis": "generic_name",
                }
            )
    return ok(
        {
            "query": name,
            "seed": (
                {
                    "id": seed.id,
                    "name": seed.name,
                    "generic_name": seed.generic_name,
                    "composition": seed.composition,
                }
                if seed
                else None
            ),
            "alternatives": items,
        }
    )


@bp.get("/medicine/alternatives")
def alternatives():
    mid = request.args.get("id", type=int)
    name = request.args.get("name") or ""
    if not mid and not name:
        return jsonify({"error": "Provide id or name"}), 400
    nm = name
    comp = ""
    if mid:
        m = MedicineCatalog.query.get(mid)
        if m:
            nm = m.name
            comp = m.composition or ""
    return jsonify({"alternatives": suggest_alternatives(nm or "medicine", comp)})
