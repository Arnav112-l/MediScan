"""Structured price rows persisted for analytics (optional; primary cache remains Redis + search_cache)."""
from __future__ import annotations

from datetime import datetime

from app.extensions import db


class Price(db.Model):
    __tablename__ = "prices"

    id = db.Column(db.Integer, primary_key=True)
    normalized_query = db.Column(db.String(512), nullable=False, index=True)
    pharmacy_name = db.Column(db.String(128), nullable=False)
    medicine_display = db.Column(db.String(512), nullable=True)
    pack_size = db.Column(db.String(64), nullable=True)
    price = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=True)
    discount = db.Column(db.String(64), nullable=True)
    availability = db.Column(db.String(128), nullable=True)
    url = db.Column(db.String(1024), nullable=True)
    scraped_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
