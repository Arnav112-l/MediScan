from datetime import datetime

from app.extensions import db


class Prescription(db.Model):
    __tablename__ = "prescriptions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    image_path = db.Column(db.String(512), nullable=True)
    extracted_text = db.Column(db.Text, nullable=True)
    medicine_list = db.Column(db.JSON, default=list)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

