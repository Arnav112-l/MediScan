"""Medicine / activity history with pagination."""
from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.prescription import Prescription
from app.models.search_history import SearchHistory
from app.utils.responses import ok

bp = Blueprint("history", __name__, url_prefix="/api")


@bp.get("/history")
@jwt_required()
def history():
    uid = int(get_jwt_identity())
    page = request.args.get("page", type=int, default=1)
    per_page = min(request.args.get("per_page", type=int, default=20), 100)
    offset = max(0, (page - 1) * per_page)

    sq = SearchHistory.query.filter_by(user_id=uid).order_by(SearchHistory.created_at.desc())
    total_searches = sq.count()
    searches = sq.offset(offset).limit(per_page).all()

    rx = (
        Prescription.query.filter_by(user_id=uid)
        .order_by(Prescription.uploaded_at.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )

    return ok(
        {
            "page": page,
            "per_page": per_page,
            "total_searches": total_searches,
            "searches": [
                {"id": s.id, "query": s.query, "summary": s.summary_json, "created_at": s.created_at.isoformat()}
                for s in searches
            ],
            "prescriptions": [
                {
                    "id": p.id,
                    "medicine_list": p.medicine_list,
                    "uploaded_at": p.uploaded_at.isoformat(),
                }
                for p in rx
            ],
        }
    )
