"""Medicine search and comparison — Redis, DB cache, Playwright scraping."""
from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

logger = logging.getLogger(__name__)

from app.extensions import db
from app.models.medicine import SearchCache
from app.models.search_history import SearchHistory
from app.models.price import Price
from app.services.recommendation_service import affordability_insights, rank_pharmacies_by_unit_price
from app.services.scraper_service import run_live_scrape
from app.utils.redis_cache import cache_key_search, delete_cache_key, get_cache, set_cache
from app.utils.validators import normalize_medicine_query


def _today_bucket() -> str:
    return date.today().isoformat()


def _payload_from_outcome(
    normalized: str,
    outcome,
    alternatives: list[dict[str, Any]],
    cache_hit: bool,
) -> dict[str, Any]:
    md = outcome.prices[0].get("medicine_display") if outcome.prices else normalized.title()
    return {
        "query": normalized,
        "medicine_display": md or normalized.title(),
        "prices": outcome.prices,
        "scrape_errors": outcome.errors,
        "alternatives": alternatives,
        "affordability": affordability_insights(outcome.prices),
        "scrape_timestamp": datetime.utcnow().isoformat() + "Z",
        "cache_hit": cache_hit,
    }


def _persist_price_snapshots(normalized: str, prices: list[dict[str, Any]]) -> None:
    for row in prices:
        p = Price(
            normalized_query=normalized,
            pharmacy_name=row.get("pharmacy_name") or "",
            medicine_display=row.get("medicine_display"),
            pack_size=row.get("pack_size"),
            price=float(row.get("price") or 0),
            unit_price=row.get("unit_price"),
            discount=row.get("discount"),
            availability=row.get("availability"),
            url=(row.get("url") or "")[:1024],
        )
        db.session.add(p)


def search_medicine(
    raw_query: str,
    *,
    user_id: int | None,
    persist_snapshots: bool = True,
    force_refresh: bool = False,
) -> tuple[dict[str, Any] | None, int | None, str | None]:
    """
    Returns (payload_dict, http_error_code_or_None, error_message_or_None).
    On failure with no prices: returns None, 502, message or scrape detail.
    """
    normalized = normalize_medicine_query(raw_query)
    if not normalized:
        return None, 400, "Missing or invalid query"

    bucket = _today_bucket()
    redis_key = cache_key_search(normalized, bucket)
    if force_refresh:
        delete_cache_key(redis_key)
        SearchCache.query.filter_by(normalized_query=normalized, date_bucket=bucket).delete(
            synchronize_session=False
        )
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
    cached = get_cache(redis_key)
    if cached:
        cached = dict(cached)
        cached["cache_hit"] = True
        return cached, None, None

    db_cached = SearchCache.query.filter_by(normalized_query=normalized, date_bucket=bucket).first()
    if db_cached:
        payload = dict(db_cached.payload_json)
        payload["cache_hit"] = True
        set_cache(redis_key, payload)
        return payload, None, None

    outcome = run_live_scrape(normalized)
    if not outcome.prices:
        return (
            {
                "failed_all": True,
                "query": normalized,
                "scrape_errors": outcome.errors,
            },
            502,
            "No live pharmacy prices could be extracted",
        )

    alt = rank_pharmacies_by_unit_price(outcome.prices)
    payload = _payload_from_outcome(normalized, outcome, alt, cache_hit=False)

    rec = SearchCache(
        normalized_query=normalized,
        date_bucket=bucket,
        payload_json={k: v for k, v in payload.items() if k != "cache_hit"},
    )
    db.session.add(rec)
    if persist_snapshots:
        _persist_price_snapshots(normalized, outcome.prices)
    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        logger.warning("Cache/price persist failed (non-fatal): %s", exc)

    set_cache(redis_key, payload)

    if user_id is not None:
        try:
            cheapest = outcome.prices[0] if outcome.prices else None
            summary = {"cheapest": cheapest, "pharmacies": len(outcome.prices)}
            db.session.add(SearchHistory(user_id=user_id, query=normalized, summary_json=summary))
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            logger.warning("SearchHistory persist failed (non-fatal): %s", exc)

    return payload, None, None


def compare_medicine(
    medicine_query: str,
    user_id: int | None,
    *,
    force_refresh: bool = False,
) -> tuple[dict[str, Any] | None, int | None, str | None]:
    """Same pipeline as search; response geared for comparison UI (ranking + savings)."""
    payload, err_code, err_msg = search_medicine(
        medicine_query, user_id=user_id, force_refresh=force_refresh
    )
    if err_code or not payload:
        return payload, err_code, err_msg
    prices = payload.get("prices") or []
    if not prices:
        return payload, 502, "No prices"
    sorted_prices = sorted(prices, key=lambda r: float(r.get("price") or 0))
    lowest = float(sorted_prices[0].get("price") or 0)
    enriched = []
    for row in sorted_prices:
        p = float(row.get("price") or 0)
        savings_pct = None
        if lowest > 0 and p > lowest:
            savings_pct = round(100.0 * (p - lowest) / p, 1)
        enriched.append({**row, "savings_percent_vs_lowest": savings_pct})
    out = {
        **payload,
        "prices": enriched,
        "lowest_price": lowest,
        "comparison_ranking": [r.get("pharmacy_name") for r in sorted_prices],
    }
    return out, None, None
