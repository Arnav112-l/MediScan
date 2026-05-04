"""Lab report upload & analysis."""
from __future__ import annotations

import os
import uuid

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.report import LabReport
from app.services import ai_service, ocr_service
from app.services import report_analysis_service

bp = Blueprint("reports", __name__, url_prefix="/api/reports")

bp_lab = Blueprint("reports_lab", __name__, url_prefix="/api")


def _analyze_upload():
    uid = int(get_jwt_identity())
    if "file" not in request.files:
        return jsonify({"status": "error", "message": "file required"}), 400
    f = request.files["file"]
    raw = f.read()
    if not raw:
        return jsonify({"status": "error", "message": "empty file"}), 400

    fname = secure_filename(f.filename or "labs") or "labs"
    text, ocr_note = ocr_service.extract_document_text(raw, fname)
    if not text.strip():
        return jsonify({"status": "error", "message": "OCR produced no text", "data": {"detail": ocr_note or ""}}), 422

    rows = report_analysis_service.analyze_lab_text(text)
    enriched = report_analysis_service.enrich_rows(rows)

    if not rows:
        insights = (
            "No recognised biomarkers (e.g. Hemoglobin, fasting glucose, HbA1c, lipids) were parsed "
            "from this document."
        )
    else:
        insights = report_analysis_service.insights_plain_language(rows) or ai_service.lab_insights_plain_language(rows)

    folder = os.path.abspath(current_app.config["MEDSCAN_UPLOAD_FOLDER"])
    os.makedirs(folder, exist_ok=True)
    ext = os.path.splitext(fname)[1].lower()
    if not ext:
        ext = ".png" if raw[:5] != b"%PDF-" else ".pdf"
    store = os.path.join(folder, f"{uuid.uuid4().hex}{ext}")
    with open(store, "wb") as fp:
        fp.write(raw)

    lr = LabReport(user_id=uid, image_path=store, extracted_values=enriched, analysis_result=insights)
    db.session.add(lr)
    db.session.commit()

    return jsonify(
        {
            "status": "success",
            "data": {
                "report_id": lr.id,
                "extracted_rows": enriched,
                "insights": insights,
                "ocr_note": ocr_note,
            },
        }
    )


@bp.post("/upload")
@jwt_required()
def upload():
    return _analyze_upload()


@bp_lab.post("/report-analysis")
@jwt_required()
def report_analysis_alias():
    return _analyze_upload()
