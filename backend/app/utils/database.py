"""Database helpers (SQLAlchemy session via Flask-SQLAlchemy)."""
from __future__ import annotations

from app.extensions import db


def commit():
    db.session.commit()


def rollback():
    db.session.rollback()
