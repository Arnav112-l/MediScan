"""Authentication (JWT + optional Google OAuth)."""
from __future__ import annotations

import os

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.user import User
from app.utils.logger import get_logger

logger = get_logger(__name__)

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or len(password) < 8:
        return jsonify({"error": "Valid email and password (8+ chars) required"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409
    u = User(email=email, password_hash=generate_password_hash(password), role="user")
    db.session.add(u)
    db.session.commit()
    return jsonify({"user": {"id": u.id, "email": u.email}}), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    u = User.query.filter_by(email=email).first()
    if not u or not u.password_hash or not check_password_hash(u.password_hash, password):
        return jsonify({"error": "Invalid credentials"}), 401
    uid = str(u.id)
    return jsonify(
        {
            "access_token": create_access_token(identity=uid),
            "refresh_token": create_refresh_token(identity=uid),
            "user": {"id": u.id, "email": u.email, "name": u.name or ""},
        }
    )


def _google_token_flow():
    """Google OAuth: verify ID token when GOOGLE_OAUTH_CLIENT_ID is set."""
    data = request.get_json(silent=True) or {}
    credential = data.get("credential") or data.get("id_token") or ""

    cid = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "")
    if cid and credential:
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests

            info = google_id_token.verify_oauth2_token(
                credential, google_requests.Request(), cid
            )
            email = (info.get("email") or "").lower()
            sub = info.get("sub") or ""
        except Exception:  # noqa: BLE001
            return jsonify({"error": "Invalid Google token"}), 401
    else:
        email = (data.get("email") or "").strip().lower()
        sub = (data.get("google_id") or "").strip()
        if not email or not sub:
            return jsonify(
                {
                    "error": "Send verified Google credential, or set GOOGLE_OAUTH_CLIENT_ID and use real ID token",
                }
            ), 400

    u = User.query.filter_by(google_id=sub).first() if sub else None
    if not u:
        u = User.query.filter_by(email=email).first()
    if not u:
        u = User(email=email, google_id=sub or None, role="user")
        db.session.add(u)
        db.session.commit()
    elif sub and not u.google_id:
        u.google_id = sub
        db.session.commit()
    uid = str(u.id)
    return jsonify(
        {
            "access_token": create_access_token(identity=uid),
            "refresh_token": create_refresh_token(identity=uid),
            "user": {"id": u.id, "email": u.email, "name": u.name or ""},
        }
    )


@bp.post("/google")
def google():
    return _google_token_flow()


@bp.post("/google-login")
def google_login():
    """Alias for SPA Google Sign-In flow."""
    try:
        return _google_token_flow()
    except Exception as e:  # noqa: BLE001
        logger.exception("google login failed: %s", e)
        return jsonify({"status": "error", "message": "Google authentication failed"}), 401


@bp.post("/logout")
@jwt_required()
def logout():
    return jsonify({"ok": True, "detail": "Client should discard tokens"})


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    uid = get_jwt_identity()
    return jsonify({"access_token": create_access_token(identity=uid)})

