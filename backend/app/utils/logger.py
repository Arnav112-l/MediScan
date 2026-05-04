"""Structured logging for MedScan API."""
from __future__ import annotations

import logging
import sys


def configure_logging(level: str | None = None) -> None:
    lvl = getattr(logging, (level or "INFO").upper(), logging.INFO)
    root = logging.getLogger()
    if root.handlers:
        root.setLevel(lvl)
        return
    logging.basicConfig(
        level=lvl,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
