from datetime import datetime

from app.extensions import db


class MedicineCatalog(db.Model):
    __tablename__ = "medicine_catalog"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(512), nullable=False, index=True)
    generic_name = db.Column(db.String(512), nullable=True)
    composition = db.Column(db.String(1024), nullable=True)
    strength = db.Column(db.String(128), nullable=True)
    form = db.Column(db.String(64), nullable=True)
    manufacturer = db.Column(db.String(255), nullable=True)


class PriceCache(db.Model):
    __tablename__ = "price_cache"

    id = db.Column(db.Integer, primary_key=True)
    medicine_id = db.Column(db.Integer, db.ForeignKey("medicine_catalog.id"), nullable=True)
    pharmacy_name = db.Column(db.String(128), nullable=False)
    price = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=True)
    pack_size = db.Column(db.String(64), nullable=True)
    discount = db.Column(db.String(64), nullable=True)
    availability = db.Column(db.String(64), nullable=True)
    url = db.Column(db.String(1024), nullable=True)
    scraped_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


class SearchCache(db.Model):
    """Daily bucket cache for medicine search payloads (PRD §8.2)."""

    __tablename__ = "search_cache"

    id = db.Column(db.Integer, primary_key=True)
    normalized_query = db.Column(db.String(512), nullable=False, index=True)
    date_bucket = db.Column(db.String(10), nullable=False, index=True)  # YYYY-MM-DD
    payload_json = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

