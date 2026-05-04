from datetime import datetime

from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    role = db.Column(db.String(32), default="user", nullable=False)
    name = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(32), nullable=True)
    date_of_birth = db.Column(db.String(16), nullable=True)
    gender = db.Column(db.String(16), nullable=True)
    preferences = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

