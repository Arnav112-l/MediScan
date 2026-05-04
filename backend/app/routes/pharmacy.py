"""Nearby pharmacy locator (OpenStreetMap Overpass API — no API key)."""
from __future__ import annotations

from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.utils.logger import get_logger
from app.utils.responses import err, ok

logger = get_logger(__name__)

bp = Blueprint("pharmacy", __name__, url_prefix="/api")


_OVERPASS_URL = "https://overpass-api.de/api/interpreter"


def _haversine_m(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    from math import asin, cos, radians, sin, sqrt

    r = 6371000.0
    dlat = radians(b_lat - a_lat)
    dlng = radians(b_lng - a_lng)
    h = sin(dlat / 2) ** 2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(dlng / 2) ** 2
    return 2 * r * asin(sqrt(h))


@bp.get("/pharmacies/nearby")
@jwt_required(optional=True)
def nearby():
    """Query: ?lat=..&lng=..&radius=2000 (meters, default 2km, max 10km)."""
    try:
        lat = float(request.args.get("lat", ""))
        lng = float(request.args.get("lng", ""))
    except ValueError:
        return err("lat and lng query params required", status=400)
    radius = max(200, min(int(request.args.get("radius", 2000)), 10_000))

    import requests

    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="pharmacy"](around:{radius},{lat},{lng});
      way["amenity"="pharmacy"](around:{radius},{lat},{lng});
    );
    out center 30;
    """
    try:
        r = requests.post(_OVERPASS_URL, data={"data": query}, timeout=20)
        r.raise_for_status()
        payload = r.json()
    except Exception as exc:
        logger.warning("overpass query failed: %s", exc)
        return err("Pharmacy lookup unavailable. Try again in a minute.", status=502)

    items: list[dict] = []
    for el in payload.get("elements", [])[:30]:
        plat = el.get("lat") or (el.get("center") or {}).get("lat")
        plng = el.get("lon") or (el.get("center") or {}).get("lon")
        if plat is None or plng is None:
            continue
        tags = el.get("tags") or {}
        name = tags.get("name") or "Pharmacy"
        distance_m = round(_haversine_m(lat, lng, float(plat), float(plng)))
        items.append(
            {
                "id": el.get("id"),
                "name": name,
                "lat": float(plat),
                "lng": float(plng),
                "distance_m": distance_m,
                "phone": tags.get("phone") or tags.get("contact:phone") or "",
                "address": ", ".join(
                    filter(
                        None,
                        [
                            tags.get("addr:housenumber"),
                            tags.get("addr:street"),
                            tags.get("addr:suburb"),
                            tags.get("addr:city"),
                        ],
                    )
                ),
                "opening_hours": tags.get("opening_hours") or "",
                "wheelchair": tags.get("wheelchair") or "",
                "osm_url": f"https://www.openstreetmap.org/{el.get('type','node')}/{el.get('id')}",
                "directions_url": f"https://www.google.com/maps/dir/?api=1&destination={plat},{plng}",
            }
        )
    items.sort(key=lambda r: r["distance_m"])
    return ok({"center": {"lat": lat, "lng": lng}, "radius_m": radius, "results": items})
