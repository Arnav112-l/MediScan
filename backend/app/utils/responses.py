"""Consistent JSON envelopes for API responses."""
from __future__ import annotations

from typing import Any

from flask import jsonify


def ok(data: Any = None, message: str | None = None, status: int = 200):
    """Success envelope: { status, message?, data }."""
    body: dict[str, Any] = {"status": "success", "data": data}
    if message:
        body["message"] = message
    return jsonify(body), status


def err(message: str, *, code: str | None = None, status: int = 400, data: Any = None):
    """Error envelope: { status, message, code?, data? }."""
    body: dict[str, Any] = {"status": "error", "message": message}
    if code:
        body["code"] = code
    if data is not None:
        body["data"] = data
    return jsonify(body), status
