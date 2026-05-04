"""Alembic environment — uses Flask app config for database URL."""
from __future__ import annotations

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
import app.models  # noqa: F401, E402

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = db.metadata


def get_url() -> str:
    app = create_app()
    with app.app_context():
        return str(app.config["SQLALCHEMY_DATABASE_URI"])


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(get_url(), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
