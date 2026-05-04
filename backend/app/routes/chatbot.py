"""AI assistant — OpenAI-compatible / OmniDimension endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.chatbot_service import complete_chat

bp = Blueprint("chatbot", __name__, url_prefix="/api")

_sessions: dict[str, list] = {}


def _handle_chat(envelope: bool):
    data = request.get_json(silent=True) or {}
    message = (data.get("query") or data.get("message") or "").strip()
    if not message:
        if envelope:
            return jsonify({"status": "error", "message": "Missing query/message"}), 400
        return jsonify({"error": "Missing query/message"}), 400

    uid = get_jwt_identity()
    if uid is not None:
        key = str(uid)
        ctx = f"Authenticated MedScan user id {key}; India medicine price comparison context."
        hist = _sessions.setdefault(key, [])
        hist.append({"role": "user", "content": message})
        reply, from_llm = complete_chat(hist.copy(), ctx)
        hist.append({"role": "assistant", "content": reply})
        del hist[:-24:]
        if envelope:
            return jsonify(
                {
                    "status": "success",
                    "data": {"reply": reply, "from_llm": from_llm, "history_persisted": True},
                }
            )
        return jsonify({"reply": reply, "history_persisted": True, "from_llm": from_llm})

    reply, from_llm = complete_chat([{"role": "user", "content": message}])
    if envelope:
        return jsonify(
            {"status": "success", "data": {"reply": reply, "from_llm": from_llm, "history_persisted": False}}
        )
    return jsonify({"reply": reply, "history_persisted": False, "from_llm": from_llm})


@bp.post("/chatbot")
@jwt_required(optional=True)
def chat_root():
    return _handle_chat(envelope=True)


@bp.post("/chatbot/query")
@jwt_required(optional=True)
def chat_query():
    return _handle_chat(envelope=False)
