"""Redis cache helpers — 24h TTL; no-op when REDIS_URL unset."""
from __future__ import annotations

import json
import os
from typing import Any

_CACHE_TTL_SECONDS = int(os.environ.get("MEDSCAN_CACHE_TTL_SECONDS", str(24 * 3600)))

_client = None


def _redis():
    global _client
    if _client is False:
        return None
    url = (os.environ.get("REDIS_URL") or "").strip()
    if not url:
        _client = False
        return None
    if _client is None:
        try:
            import redis

            _client = redis.Redis.from_url(url, decode_responses=True)
            _client.ping()
        except Exception:
            _client = False
            return None
    return _client


def get_cache(key: str) -> Any | None:
    r = _redis()
    if not r:
        return None
    try:
        raw = r.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        return None


def delete_cache_key(key: str) -> bool:
    """Delete a single cache key. No-op when Redis is unavailable."""
    r = _redis()
    if not r:
        return False
    try:
        return bool(r.delete(key))
    except Exception:
        return False


def set_cache(key: str, value: Any, ttl_seconds: int | None = None) -> bool:
    r = _redis()
    if not r:
        return False
    ttl = ttl_seconds if ttl_seconds is not None else _CACHE_TTL_SECONDS
    try:
        r.setex(key, ttl, json.dumps(value, default=str))
        return True
    except Exception:
        return False


def invalidate_cache(key_prefix: str) -> int:
    """Delete keys matching prefix. Returns count deleted (best-effort)."""
    r = _redis()
    if not r:
        return 0
    n = 0
    try:
        for k in r.scan_iter(match=key_prefix + "*"):
            r.delete(k)
            n += 1
    except Exception:
        pass
    return n


def cache_key_search(normalized_query: str, date_bucket: str) -> str:
    return f"medscan:search:{normalized_query}:{date_bucket}"


def cache_key_dashboard(user_id: int) -> str:
    return f"medscan:dashboard:{user_id}"


def cache_key_ocr(file_hash: str) -> str:
    return f"medscan:ocr:{file_hash}"
