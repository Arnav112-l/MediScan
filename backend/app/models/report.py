from datetime import datetime

from app.extensions import db


class LabReport(db.Model):
    __tablename__ = "lab_reports"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    image_path = db.Column(db.String(512), nullable=True)
    extracted_values = db.Column(db.JSON, default=list)
    analysis_result = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

