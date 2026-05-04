"""APScheduler background jobs — reminders, cache housekeeping."""
from __future__ import annotations

import atexit
import logging
import os

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def reminder_tick_job():
    """Placeholder: enqueue email/SMS via configured providers."""
    logger.debug("reminder_tick_job: configure SMTP/SMS env to dispatch")


def cache_sweep_job():
    """Optional: trim old DB rows — Redis TTL handles hot cache."""
    logger.debug("cache_sweep_job: noop")


def scraper_retry_placeholder():
    logger.debug("scraper_retry_placeholder: wire failed scrape queue if needed")


def init_scheduler(app):
    global _scheduler
    if os.environ.get("MEDSCAN_DISABLE_SCHEDULER", "").lower() in ("1", "true", "yes"):
        return
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(reminder_tick_job, "interval", minutes=15, id="reminder_tick", replace_existing=True)
    _scheduler.add_job(cache_sweep_job, "interval", hours=6, id="cache_sweep", replace_existing=True)
    _scheduler.add_job(scraper_retry_placeholder, "interval", hours=1, id="scraper_retry", replace_existing=True)
    _scheduler.start()
    atexit.register(lambda: _scheduler.shutdown(wait=False) if _scheduler else None)
    logger.info("APScheduler started")
