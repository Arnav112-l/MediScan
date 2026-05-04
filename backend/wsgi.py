"""WSGI entrypoint for Gunicorn, uWSGI, and other production servers."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Resolve .env relative to this file so imports work regardless of process cwd
_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")

from app import create_app

app = create_app()

# Many hosts (mod_wsgi, some PaaS templates) expect this name
application = app
