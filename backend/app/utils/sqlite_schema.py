"""SQLite: add ORM columns that are missing on existing DBs (create_all() only creates new tables)."""
from __future__ import annotations

import logging

from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)

# Columns on User that may be missing on older medscan.db files
_USER_ALTER: list[tuple[str, str]] = [
    ("name", "VARCHAR(255)"),
    ("phone", "VARCHAR(32)"),
    ("date_of_birth", "VARCHAR(16)"),
    ("gender", "VARCHAR(16)"),
    ("preferences", "TEXT"),
    (
        "created_at",
        "DATETIME DEFAULT (datetime('now'))",  # backfill existing rows
    ),
]


def patch_sqlite_users_columns(db) -> None:
    if db.engine.dialect.name != "sqlite":
        return
    insp = inspect(db.engine)
    if not insp.has_table("users"):
        return
    for col, ddl in _USER_ALTER:
        cols = {c["name"] for c in insp.get_columns("users")}
        if col in cols:
            continue
        stmt = f"ALTER TABLE users ADD COLUMN {col} {ddl}"
        try:
            with db.engine.begin() as conn:
                conn.execute(text(stmt))
            logger.info("sqlite migrated users.%s", col)
        except Exception as exc:
            logger.warning("sqlite migrate users.%s failed: %s", col, exc)
