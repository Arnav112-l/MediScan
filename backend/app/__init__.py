"""MedScan Flask application factory."""
from __future__ import annotations

import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from app.config import get_config
from app.extensions import db, jwt
from app.utils.logger import configure_logging
from app.utils.sqlite_schema import patch_sqlite_users_columns

_log = logging.getLogger(__name__)


def _cors_origins():
    """
    Comma-separated list, or * for all.
    Empty env var must not mean "allow nothing" — that breaks browsers when VITE_API_URL
    points the SPA at the API host (cross-origin).
    """
    raw = os.environ.get("CORS_ORIGINS")
    if raw is None:
        return "*"
    s = raw.strip()
    if not s or s == "*":
        return "*"
    parts = [p.strip() for p in s.split(",") if p.strip()]
    if not parts:
        return "*"
    return parts if len(parts) > 1 else parts[0]


def create_app(config_name: str | None = None):
    configure_logging(os.environ.get("LOG_LEVEL"))
    app = Flask(__name__)
    cfg = get_config()
    app.config.from_object(cfg)
    if config_name == "production" or os.environ.get("FLASK_ENV") == "production":
        uri = os.environ.get("DATABASE_URL", "")
        if uri:
            # SQLAlchemy 2 / Heroku-style postgres URL
            if uri.startswith("postgres://"):
                uri = uri.replace("postgres://", "postgresql://", 1)
            app.config["SQLALCHEMY_DATABASE_URI"] = uri

    os.makedirs(app.config["MEDSCAN_UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    CORS(
        app,
        origins=_cors_origins(),
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    @jwt.unauthorized_loader
    def _jwt_unauthorized(reason):
        return jsonify({"status": "error", "message": "Unauthorized", "detail": reason}), 401

    @jwt.invalid_token_loader
    def _jwt_invalid(reason):
        return jsonify({"status": "error", "message": "Invalid token", "detail": reason}), 422

    @app.errorhandler(500)
    def _handle_500(exc):
        _log.exception("Unhandled 500 error")
        return jsonify({"status": "error", "message": f"Internal server error: {exc}"}), 500

    @app.errorhandler(Exception)
    def _handle_exception(exc):
        if isinstance(exc, HTTPException):
            return jsonify({"status": "error", "message": exc.description}), exc.code
        _log.exception("Unhandled exception: %s", exc)
        return jsonify({"status": "error", "message": f"Internal server error: {exc}"}), 500

    @app.get("/")
    def root():
        """JSON-only API — no HTML shell at /. Use the React app (e.g. :5173) for the UI."""
        return jsonify(
            {
                "service": "medscan-api",
                "status": "ok",
                "docs": "REST APIs live under /api/* — try GET /api/health. Replace the query value with any medicine name.",
                "examples": [
                    "GET /health",
                    "GET /api/health",
                    "GET /api/search-medicine?query=paracetamol",
                    "GET /api/search-medicine?query=vitamin+d3",
                ],
            }
        )

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "service": "medscan-api"})

    @app.get("/api/health")
    def api_health():
        """Same as /health; frontend and clients call /api/* only."""
        return jsonify({"status": "ok", "service": "medscan-api"})

    from app.routes import (
        adherence,
        auth,
        chatbot,
        dashboard,
        history,
        medicine,
        pharmacy,
        prescription,
        profile,
        refill,
        reminder,
        reports,
    )

    app.register_blueprint(auth.bp)
    app.register_blueprint(medicine.bp)
    app.register_blueprint(prescription.bp)
    app.register_blueprint(prescription.bp_public)
    app.register_blueprint(dashboard.bp)
    app.register_blueprint(reminder.bp)
    app.register_blueprint(reports.bp)
    app.register_blueprint(reports.bp_lab)
    app.register_blueprint(chatbot.bp)
    app.register_blueprint(adherence.bp)
    app.register_blueprint(history.bp)
    app.register_blueprint(profile.bp)
    app.register_blueprint(pharmacy.bp)
    app.register_blueprint(refill.bp)

    with app.app_context():
        db.create_all()
        patch_sqlite_users_columns(db)

    try:
        from app.scheduler import init_scheduler

        init_scheduler(app)
    except Exception:
        pass

    return app
