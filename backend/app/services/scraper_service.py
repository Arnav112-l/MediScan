"""
Hybrid pharmacy scraper — httpx for PharmEasy, Netmeds, TrueMeds, MedPlus;
Playwright only for 1mg & Apollo (which need full browser rendering).

TrueMeds/MedPlus use a DDG→product-page pipeline: DuckDuckGo discovers the
product URL, then httpx fetches the server-rendered page for structured data.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable
from urllib.parse import quote_plus, unquote, urljoin, urlparse

import httpx
from playwright.async_api import BrowserContext, Page, async_playwright
from playwright_stealth import Stealth

logger = logging.getLogger(__name__)

_STEALTH = Stealth(navigator_languages_override=("en-IN", "en"))

_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
]

MAX_CONCURRENT = int(os.environ.get("SCRAPER_CONCURRENCY", "6"))
TOTAL_SCRAPE_TIMEOUT = int(os.environ.get("SCRAPER_TIMEOUT_SECS", "120"))
_PROXY_URL = os.environ.get("SCRAPER_PROXY_URL", "").strip()


# ═══════════════════════════════════════════════════════════════
#  Shared helpers
# ═══════════════════════════════════════════════════════════════

def _make_result(pharmacy: str, name: str, price: float, url: str, pack: str = "") -> dict[str, Any]:
    return {
        "pharmacy_name": pharmacy,
        "medicine_display": name,
        "pack_size": pack,
        "price": price,
        "unit_price": None,
        "discount": "",
        "availability": "See pharmacy site",
        "url": url[:1024],
        "scraped_at": datetime.utcnow().isoformat() + "Z",
    }


def _label_matches_query(label: str, query: str) -> bool:
    label_clean = re.sub(r"[^\w\s]", " ", label.lower()).strip()
    label_words = label_clean.split()
    q_words = [w for w in query.lower().strip().split() if len(w) >= 2]
    if not q_words:
        return label_clean.startswith(query.lower().strip())
    for w in q_words:
        for idx, lw in enumerate(label_words):
            if lw.startswith(w) or w.startswith(lw):
                return idx <= 6
    return False


def _parse_inr(blob: str) -> float | None:
    blob = (blob or "").replace("\xa0", " ")
    for pat in (
        r"₹\s*([1-9][0-9,]*(?:\.\d{1,2})?)",
        r"(?:Rs\.?|MRP|INR)\s*:?\s*₹?\s*([1-9][0-9,]*(?:\.\d{1,2})?)",
    ):
        m = re.search(pat, blob, re.I)
        if m:
            try:
                p = float(m.group(1).replace(",", ""))
                if 3 <= p <= 800_000:
                    return p
            except (ValueError, IndexError):
                continue
    return None


def _httpx_headers() -> dict[str, str]:
    return {
        "User-Agent": random.choice(_USER_AGENTS),
        "Accept": "text/html,application/json",
        "Accept-Language": "en-IN,en;q=0.9",
    }


# ═══════════════════════════════════════════════════════════════
#  DuckDuckGo product-URL discovery (used by TrueMeds & MedPlus)
# ═══════════════════════════════════════════════════════════════

def _load_seed_cache() -> dict[str, str]:
    """Load prebuilt product URL cache from disk."""
    cache_path = os.path.join(os.path.dirname(__file__), "..", "data", "product_url_cache.json")
    try:
        with open(cache_path) as f:
            data = json.load(f)
        logger.info("Loaded %d seed product URLs from cache", len(data))
        return data
    except Exception:
        return {}


_URL_CACHE: dict[str, str] = _load_seed_cache()
_URL_CACHE_MAX = 2000


def _extract_real_url(url: str) -> str:
    """Strip Google/DDG redirect wrappers to get the actual destination URL."""
    if "google.com/url" in url:
        from urllib.parse import parse_qs
        qs = parse_qs(urlparse(url).query)
        return qs.get("q", [url])[0]
    return url


async def _find_product_url(query: str, site_domain: str, path_hints: tuple[str, ...] = ()) -> str | None:
    """Find a product URL on site_domain matching query.

    Strategy chain:
      0. In-memory / seed cache (instant, no network)
      1. Google "I'm Feeling Lucky" redirect (fastest live lookup)
      2. DuckDuckGo HTML search
      3. DuckDuckGo Lite search
    Results are cached in-memory to avoid repeated calls.
    """
    cache_key = f"{query.lower().strip()}|{site_domain}"
    if cache_key in _URL_CACHE:
        return _URL_CACHE[cache_key]

    def _cache_and_return(url: str) -> str:
        url = _extract_real_url(url)
        if len(_URL_CACHE) >= _URL_CACHE_MAX:
            _URL_CACHE.pop(next(iter(_URL_CACHE)), None)
        _URL_CACHE[cache_key] = url
        return url

    q_for_search = query + " tablet site:" + site_domain
    q_encoded = quote_plus(q_for_search)

    # Strategy 1: Google "I'm Feeling Lucky" (single redirect)
    try:
        lucky_url = f"https://www.google.com/search?q={q_encoded}&btnI=1"
        async with httpx.AsyncClient(
            headers=_httpx_headers(), follow_redirects=True, timeout=12,
        ) as c:
            r = await c.get(lucky_url)
        final_url = _extract_real_url(str(r.url))
        if site_domain in final_url and "google.com" not in final_url:
            logger.info("Google Lucky → %s", final_url[:80])
            return _cache_and_return(final_url)
    except Exception as exc:
        logger.debug("Google Lucky failed for %s: %s", site_domain, exc)

    # Strategy 2-3: DuckDuckGo (HTML + Lite)
    ddg_endpoints = [
        f"https://html.duckduckgo.com/html/?q={q_encoded}",
        f"https://lite.duckduckgo.com/lite/?q={q_encoded}",
    ]
    for ddg_url in ddg_endpoints:
        try:
            await asyncio.sleep(random.uniform(0.3, 0.8))
            async with httpx.AsyncClient(
                headers={**_httpx_headers(), "Referer": "https://duckduckgo.com/"},
                follow_redirects=True, timeout=15,
            ) as c:
                r = await c.get(ddg_url)
            if r.status_code not in (200,):
                continue
            raw_urls = [unquote(u) for u in re.findall(r'uddg=(https?[^&"]+)', r.text)]
            candidates: list[str] = []
            for url in raw_urls:
                if site_domain not in url:
                    continue
                if path_hints and any(h in url.lower() for h in path_hints):
                    candidates.insert(0, url)
                else:
                    candidates.append(url)
            if candidates:
                logger.info("DDG found %d candidates for %s", len(candidates), site_domain)
                return _cache_and_return(candidates[0])
        except Exception as exc:
            logger.debug("DDG failed for %s: %s", site_domain, exc)

    return None


# ═══════════════════════════════════════════════════════════════
#  1) PharmEasy — httpx + __NEXT_DATA__
# ═══════════════════════════════════════════════════════════════

async def scrape_pharmeasy_httpx(q: str) -> dict[str, Any]:
    url = f"https://pharmeasy.in/search/all?name={quote_plus(q)}"
    proxy = _PROXY_URL or None
    async with httpx.AsyncClient(
        headers=_httpx_headers(), follow_redirects=True, timeout=25, proxy=proxy,
    ) as c:
        r = await c.get(url)
    r.raise_for_status()
    m = re.search(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.S)
    if not m:
        raise RuntimeError("PharmEasy: __NEXT_DATA__ not found")
    data = json.loads(m.group(1))
    products = data.get("props", {}).get("pageProps", {}).get("searchResults", [])
    for p in products:
        name = p.get("name", "")
        if not _label_matches_query(name, q):
            continue
        mrp = float(p.get("mrpDecimal") or p.get("salePriceDecimal") or 0)
        if mrp <= 0:
            continue
        slug = p.get("slug", "")
        link = f"https://pharmeasy.in/online-medicine-order/{slug}" if slug else url
        pack = p.get("subtitleText", "")
        logger.info("PharmEasy httpx: %s ₹%.2f", name, mrp)
        return _make_result("PharmEasy", name, mrp, link, pack)
    raise RuntimeError("PharmEasy: no matching product in __NEXT_DATA__")


# ═══════════════════════════════════════════════════════════════
#  2) Netmeds — httpx + internal JSON search API
# ═══════════════════════════════════════════════════════════════

async def scrape_netmeds_httpx(q: str) -> dict[str, Any]:
    api_url = f"https://www.netmeds.com/ext/search/application/api/v1.0/products?q={quote_plus(q)}"
    headers = {
        **_httpx_headers(),
        "Accept": "application/json",
        "Referer": "https://www.netmeds.com/",
        "Origin": "https://www.netmeds.com",
    }
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=25) as c:
        r = await c.get(api_url)
    r.raise_for_status()
    data = r.json()
    items = data.get("items", [])
    for item in items:
        name = item.get("name", "")
        if not _label_matches_query(name, q):
            continue
        price_info = item.get("price", {})
        price = price_info.get("effective", {}).get("min", 0)
        if not price:
            price = price_info.get("marked", {}).get("min", 0)
        if price <= 0:
            continue
        slug = item.get("slug", "")
        link = f"https://www.netmeds.com/product/{slug}" if slug else api_url
        pack = ""
        sizes = item.get("sizes", [])
        if sizes:
            pack = str(sizes[0].get("size", "")) if isinstance(sizes[0], dict) else str(sizes[0])
        logger.info("Netmeds httpx: %s ₹%.2f", name, price)
        return _make_result("Netmeds", name, price, link, pack)
    raise RuntimeError("Netmeds: no matching product in search API")


# ═══════════════════════════════════════════════════════════════
#  3) TrueMeds — DDG discovery + product page __NEXT_DATA__
# ═══════════════════════════════════════════════════════════════

_TM_BUILD_ID: str | None = None


async def _get_truemeds_build_id() -> str | None:
    """Fetch the Next.js buildId from TrueMeds — needed for JSON data route."""
    global _TM_BUILD_ID  # noqa: PLW0603
    if _TM_BUILD_ID:
        return _TM_BUILD_ID
    try:
        async with httpx.AsyncClient(
            headers=_httpx_headers(), follow_redirects=True, timeout=12,
        ) as c:
            r = await c.get("https://www.truemeds.in")
        m = re.search(r'"buildId"\s*:\s*"([^"]+)"', r.text)
        if m:
            _TM_BUILD_ID = m.group(1)
            logger.info("TrueMeds buildId: %s", _TM_BUILD_ID)
            return _TM_BUILD_ID
    except Exception as exc:
        logger.debug("Failed to get TrueMeds buildId: %s", exc)
    return None


def _extract_truemeds_data(pp: dict, product_url: str) -> dict[str, Any] | None:
    """Extract product data from TrueMeds pageProps dict."""
    for key in ("currentMed", "originalMedicineDetails"):
        med = pp.get(key, {})
        prod = med.get("product", {}) if isinstance(med, dict) else {}
        name = prod.get("skuName", "")
        if not name:
            continue
        price = prod.get("sellingPrice") or prod.get("mrp") or 0
        if price <= 0:
            continue
        pack = prod.get("packForm", "")
        logger.info("TrueMeds: %s ₹%.2f", name, price)
        return _make_result("TrueMeds", name, price, product_url, pack)
    return None


async def scrape_truemeds_httpx(q: str) -> dict[str, Any]:
    product_url = await _find_product_url(q, "truemeds.in", path_hints=("/otc/", "/medicine/"))
    if not product_url:
        raise RuntimeError("TrueMeds: could not find product URL via search")

    # Strategy 1: _next/data JSON endpoint (bypasses HTML rendering / bot walls)
    build_id = await _get_truemeds_build_id()
    if build_id:
        try:
            parsed = urlparse(product_url)
            slug = parsed.path.strip("/")
            data_url = f"https://www.truemeds.in/_next/data/{build_id}/{slug}.json"
            async with httpx.AsyncClient(
                headers=_httpx_headers(), follow_redirects=True, timeout=20,
            ) as c:
                r = await c.get(data_url)
            if r.status_code == 200 and "json" in r.headers.get("content-type", ""):
                pp = r.json().get("pageProps", {})
                result = _extract_truemeds_data(pp, product_url)
                if result:
                    return result
        except Exception as exc:
            logger.debug("TrueMeds _next/data failed: %s", exc)

    # Strategy 2: fetch full HTML page and parse __NEXT_DATA__ / JSON-LD
    async with httpx.AsyncClient(
        headers=_httpx_headers(), follow_redirects=True, timeout=25,
    ) as c:
        r = await c.get(product_url)
    if r.status_code != 200:
        raise RuntimeError(f"TrueMeds: product page returned {r.status_code}")

    m = re.search(r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.S)
    if m:
        nd = json.loads(m.group(1))
        pp = nd.get("props", {}).get("pageProps", {})
        result = _extract_truemeds_data(pp, product_url)
        if result:
            return result

    ld_matches = re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', r.text, re.S
    )
    for ld_str in ld_matches:
        try:
            ld = json.loads(ld_str)
            if isinstance(ld, dict) and ld.get("@type") == "Product":
                name = ld.get("name", "")
                offers = ld.get("offers", {})
                price = float(offers.get("price", 0))
                if name and price > 0:
                    logger.info("TrueMeds JSON-LD: %s ₹%.2f", name, price)
                    return _make_result("TrueMeds", name, price, product_url)
        except (json.JSONDecodeError, ValueError):
            continue

    title_m = re.search(r'<title>(.*?)</title>', r.text, re.I)
    title = (title_m.group(1) if title_m else "").split("|")[0].split("-")[0].strip()
    price = _parse_inr(r.text[:15000])
    if title and price:
        logger.info("TrueMeds HTML fallback: %s ₹%.2f", title, price)
        return _make_result("TrueMeds", title, price, product_url)

    raise RuntimeError("TrueMeds: no price data found on product page")


# ═══════════════════════════════════════════════════════════════
#  4) MedPlus — DDG discovery + product page JSON-LD
# ═══════════════════════════════════════════════════════════════

async def scrape_medplus_httpx(q: str) -> dict[str, Any]:
    product_url = await _find_product_url(q, "medplusmart.com", path_hints=("/product/",))
    if not product_url:
        raise RuntimeError("MedPlus: could not find product URL via search")

    async with httpx.AsyncClient(
        headers=_httpx_headers(), follow_redirects=True, timeout=25,
    ) as c:
        r = await c.get(product_url)
    if r.status_code != 200:
        raise RuntimeError(f"MedPlus: product page returned {r.status_code}")

    # Strategy 1: JSON-LD (preferred — structured data with price)
    ld_matches = re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', r.text, re.S
    )
    for ld_str in ld_matches:
        try:
            ld = json.loads(ld_str)
            items = ld if isinstance(ld, list) else [ld]
            for item in items:
                if not isinstance(item, dict) or item.get("@type") != "Product":
                    continue
                name = item.get("name", "")
                if not name:
                    continue
                offers = item.get("offers", {})
                price = float(offers.get("price", 0))
                if price <= 0:
                    lp = offers.get("lowPrice", 0)
                    price = float(lp) if lp else 0
                if price > 0:
                    url = offers.get("url", product_url)
                    logger.info("MedPlus JSON-LD: %s ₹%.2f", name, price)
                    return _make_result("MedPlus", name, price, url)
        except (json.JSONDecodeError, ValueError):
            continue

    # Strategy 2: extract price from HTML
    title_m = re.search(r'<title>(.*?)</title>', r.text, re.I)
    title = (title_m.group(1) if title_m else "").split("|")[0].split("-")[0].strip()
    price = _parse_inr(r.text[:15000])
    if title and price:
        logger.info("MedPlus HTML fallback: %s ₹%.2f", title, price)
        return _make_result("MedPlus", title, price, product_url)

    raise RuntimeError("MedPlus: no price data in JSON-LD or HTML")


# ═══════════════════════════════════════════════════════════════
#  Playwright helpers (only for 1mg & Apollo)
# ═══════════════════════════════════════════════════════════════

async def _goto(page: Page, url: str) -> None:
    await page.goto(url, wait_until="domcontentloaded", timeout=75000)
    try:
        await page.wait_for_load_state("networkidle", timeout=20_000)
    except Exception:
        pass
    try:
        await page.evaluate("window.scrollTo(0, Math.min(600, document.body.scrollHeight * 0.25))")
        await asyncio.sleep(1.5)
        await page.evaluate("window.scrollTo(0, Math.min(1200, document.body.scrollHeight * 0.5))")
        await asyncio.sleep(0.5)
    except Exception:
        pass


async def _cookies(page: Page) -> None:
    for sel in ("#onetrust-accept-btn-handler", "button:has-text('Accept')", "button:has-text('AGREE')"):
        try:
            loc = page.locator(sel).first
            if await loc.is_visible(timeout=800):
                await loc.click(timeout=3000)
                return
        except Exception:
            continue


async def _text_search_fallback(page: Page, query: str) -> tuple[float, str, str] | None:
    try:
        cards = page.locator(
            '[class*="card"], [class*="Card"], [class*="product"], [class*="Product"], '
            '[class*="item"], [class*="Item"], [data-testid], article, li'
        )
        for i in range(min(await cards.count(), 60)):
            card = cards.nth(i)
            try:
                txt = (await card.inner_text(timeout=3000)).strip()
            except Exception:
                continue
            if not txt or len(txt) < 5:
                continue
            first_line = txt.split("\n")[0].strip()
            if not _label_matches_query(first_line, query):
                continue
            px = _parse_inr(txt)
            if not px:
                continue
            link = page.url
            try:
                a = card.locator("a[href]").first
                href_raw = await a.get_attribute("href", timeout=2000)
                if href_raw:
                    link = urljoin(page.url, href_raw.split("#")[0])
            except Exception:
                pass
            return px, first_line[:220], link
    except Exception:
        pass
    return None


def _is_1mg(u: str) -> bool:
    try:
        p = urlparse(u)
        return "1mg.com" in p.netloc.lower() and bool(p.path.strip("/")) and not p.path.startswith("/search")
    except Exception:
        return False


def _is_ap(u: str) -> bool:
    try:
        p = urlparse(u)
        return "apollopharmacy.in" in p.netloc.lower() and bool(p.path.strip("/")) and "search-medicines" not in p.path.lower()
    except Exception:
        return False


async def _anchor_walk(page: Page, host_sub: str, href_ok: Callable[[str], bool], query: str) -> tuple[float, str, str]:
    base = page.url
    loc = page.locator("a[href]")
    n = await loc.count()
    for i in range(min(n, 250)):
        a = loc.nth(i)
        raw = (await a.get_attribute("href") or "").split("#")[0].strip()
        if not raw or raw.startswith(("#", "javascript", "mailto:", "tel:")):
            continue
        abs_href = urljoin(base, raw)
        if not href_ok(abs_href):
            continue
        anchor_text = (await a.inner_text()).strip()
        label = anchor_text.split("\n")[0][:220]
        try:
            container_text = await a.evaluate(
                """el => {
                  const n = el.closest('article, li, [data-testid], [class*="card"], [class*="Card"], [class*="product"], section, div');
                  return n ? n.innerText : el.innerText;
                }"""
            )
        except Exception:
            container_text = anchor_text
        container_first = (container_text or "").strip().split("\n")[0][:220]
        best = label
        if _label_matches_query(label, query) or _label_matches_query(container_first, query):
            if not _label_matches_query(label, query):
                best = container_first
            px = _parse_inr(container_text) or _parse_inr(anchor_text)
            if px:
                return px, best, abs_href
    raise RuntimeError(f"No matching product on {host_sub}")


# ═══════════════════════════════════════════════════════════════
#  5-6) Playwright scrapers for 1mg & Apollo
# ═══════════════════════════════════════════════════════════════

async def _pw_with_intercept(page: Page, url: str, pharmacy: str, host_sub: str,
                             href_ok: Callable[[str], bool] | None, q: str) -> dict[str, Any]:
    captured: list[dict] = []

    async def _on_response(response):
        try:
            if response.status == 200 and "json" in response.headers.get("content-type", ""):
                body = await response.json()
                captured.append({"url": response.url, "body": body})
        except Exception:
            pass

    page.on("response", _on_response)
    await _goto(page, url)
    await asyncio.sleep(random.uniform(0.5, 1.5))
    await _cookies(page)

    if href_ok:
        try:
            px, lab, href = await _anchor_walk(page, host_sub, href_ok, q)
            return _make_result(pharmacy, lab, px, href)
        except RuntimeError:
            pass

    result = await _text_search_fallback(page, q)
    if result:
        return _make_result(pharmacy, result[1], result[0], result[2])

    await asyncio.sleep(3)

    for cap in captured:
        products = _extract_products(cap["body"])
        for p in products:
            name = p.get("name", p.get("productName", p.get("medicineName",
                   p.get("medicine_name", p.get("description", "")))))
            if not name or not _label_matches_query(name, q):
                continue
            price = float(p.get("price", p.get("mrp", p.get("selling_price",
                    p.get("sellingPrice", p.get("final_price", p.get("offeredPrice", 0)))))))
            if price > 0:
                slug = p.get("slug", p.get("url", p.get("url_key", p.get("productUrl", ""))))
                link = f"https://{host_sub}/{slug}" if slug and not slug.startswith("http") else page.url
                logger.info("%s API intercept: %s ₹%.2f", pharmacy, name, price)
                return _make_result(pharmacy, name, price, link)

    raise RuntimeError(f"{pharmacy}: no product found")


def _extract_products(body: Any) -> list[dict]:
    if isinstance(body, list) and body and isinstance(body[0], dict):
        return body
    if isinstance(body, dict):
        for key in ("products", "data", "result", "results", "items", "medicines", "payload", "productlists"):
            val = body.get(key)
            if isinstance(val, list) and val and isinstance(val[0], dict):
                return val
            if isinstance(val, dict):
                inner = _extract_products(val)
                if inner:
                    return inner
    return []


async def scrape_1mg_pw(page: Page, q: str) -> dict[str, Any]:
    return await _pw_with_intercept(
        page, f"https://www.1mg.com/search/all?name={quote_plus(q)}",
        "Tata 1mg", "1mg.com", _is_1mg, q)


async def scrape_apollo_pw(page: Page, q: str) -> dict[str, Any]:
    return await _pw_with_intercept(
        page, f"https://www.apollopharmacy.in/search-medicines?keyword={quote_plus(q)}",
        "Apollo Pharmacy", "apollopharmacy.in", _is_ap, q)


async def scrape_truemeds_pw(page: Page, q: str) -> dict[str, Any]:
    """Playwright scraper for TrueMeds — navigates to product page via cache/search."""
    cache_key = f"{q.lower().strip()}|truemeds.in"
    product_url = _URL_CACHE.get(cache_key)
    logger.info("TrueMeds PW: cache_key=%s, cached_url=%s, cache_size=%d",
                cache_key, product_url[:60] if product_url else "MISS", len(_URL_CACHE))

    if product_url:
        await _goto(page, product_url)
        await _cookies(page)

        page_title = await page.title()
        final_url = page.url
        logger.info("TrueMeds PW: title=%s, final_url=%s", page_title[:80], final_url[:80])

        nd_handle = await page.evaluate("""() => {
            const el = document.getElementById('__NEXT_DATA__');
            return el ? el.textContent : null;
        }""")
        if nd_handle:
            logger.info("TrueMeds PW: __NEXT_DATA__ found, len=%d", len(nd_handle))
            try:
                nd = json.loads(nd_handle)
                pp = nd.get("props", {}).get("pageProps", {})
                logger.info("TrueMeds PW: pageProps keys=%s", list(pp.keys())[:10])
                result = _extract_truemeds_data(pp, product_url)
                if result:
                    return result
                logger.warning("TrueMeds PW: __NEXT_DATA__ present but no price extracted")
            except json.JSONDecodeError as exc:
                logger.warning("TrueMeds PW: __NEXT_DATA__ JSON parse error: %s", exc)
        else:
            logger.warning("TrueMeds PW: no __NEXT_DATA__ element on page")

        ld_matches = await page.evaluate("""() => {
            return Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                        .map(el => el.textContent);
        }""")
        logger.info("TrueMeds PW: JSON-LD blocks=%d", len(ld_matches or []))
        for ld_str in (ld_matches or []):
            try:
                ld = json.loads(ld_str)
                if isinstance(ld, dict) and ld.get("@type") == "Product":
                    name = ld.get("name", "")
                    offers = ld.get("offers", {})
                    price = float(offers.get("price", 0))
                    if name and price > 0:
                        logger.info("TrueMeds PW JSON-LD: %s ₹%.2f", name, price)
                        return _make_result("TrueMeds", name, price, product_url)
            except (json.JSONDecodeError, ValueError):
                continue

        price_on_page = await page.evaluate("""() => {
            const el = document.querySelector('[class*="price"], [class*="Price"], [data-testid*="price"]');
            return el ? el.textContent : null;
        }""")
        logger.info("TrueMeds PW: visible price element=%s", price_on_page)

    search_url = f"https://www.truemeds.in/search?q={quote_plus(q)}"
    return await _pw_with_intercept(page, search_url, "TrueMeds", "truemeds.in",
                                    lambda u: "truemeds.in" in u and ("/otc/" in u or "/medicine/" in u),
                                    q)


# ═══════════════════════════════════════════════════════════════
#  Orchestrator
# ═══════════════════════════════════════════════════════════════

HTTPX_SCRAPERS: list[tuple[str, Any]] = [
    ("PharmEasy", scrape_pharmeasy_httpx),
    ("Netmeds", scrape_netmeds_httpx),
    ("TrueMeds", scrape_truemeds_httpx),
    ("MedPlus", scrape_medplus_httpx),
]

PW_SCRAPERS: list[tuple[str, Any]] = [
    ("Tata 1mg", scrape_1mg_pw),
    ("Apollo Pharmacy", scrape_apollo_pw),
]


@dataclass
class ScrapeOutcome:
    prices: list[dict[str, Any]]
    errors: list[dict[str, str]]


async def _run_httpx_scrapers(query: str, prices: list, errors: list) -> None:
    async def run(label: str, fn):
        try:
            row = await fn(query)
            prices.append(row)
        except Exception as exc:
            logger.warning("%s: %s", label, exc)
            errors.append({"pharmacy": label, "error": str(exc)})

    await asyncio.gather(*(run(l, f) for l, f in HTTPX_SCRAPERS))


async def scrape_all_live_async(normalized_query: str, headless: bool = True) -> ScrapeOutcome:
    prices_out: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    httpx_task = asyncio.create_task(_run_httpx_scrapers(normalized_query, prices_out, errors))

    sem = asyncio.Semaphore(MAX_CONCURRENT)

    async def run_pw(label: str, fn, context: BrowserContext) -> None:
        async with sem:
            await asyncio.sleep(random.uniform(0.2, 0.8))
            page = await context.new_page()
            page.set_default_timeout(60000)
            try:
                row = await fn(page, normalized_query)
                prices_out.append(row)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("%s: %s", label, exc)
                errors.append({"pharmacy": label, "error": str(exc)})
            finally:
                try:
                    await page.close()
                except Exception:
                    pass

    proxy_cfg = None
    if _PROXY_URL:
        parsed = urlparse(_PROXY_URL)
        proxy_cfg = {"server": f"{parsed.scheme}://{parsed.hostname}:{parsed.port}"}
        if parsed.username:
            proxy_cfg["username"] = parsed.username
        if parsed.password:
            proxy_cfg["password"] = parsed.password

    stealth_pw = _STEALTH.use_async(async_playwright())
    async with stealth_pw as pw:
        browser = await pw.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox",
                  "--disable-dev-shm-usage", "--disable-gpu"],
            proxy=proxy_cfg,
        )
        context = await browser.new_context(
            user_agent=random.choice(_USER_AGENTS),
            locale="en-IN",
            viewport={"width": 1366, "height": 896},
            extra_http_headers={
                "Accept-Language": "en-IN,en;q=0.9",
                "sec-ch-ua": '"Chromium";v="147", "Google Chrome";v="147", "Not=A?Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
            },
        )
        try:
            label_for_task: dict[asyncio.Task, str] = {}
            for label, fn in PW_SCRAPERS:
                t = asyncio.create_task(run_pw(label, fn, context))
                label_for_task[t] = label
            done, pending = await asyncio.wait(label_for_task.keys(), timeout=TOTAL_SCRAPE_TIMEOUT)
            for t in pending:
                t.cancel()
                errors.append({"pharmacy": label_for_task.get(t, "?"), "error": f"Timed out ({TOTAL_SCRAPE_TIMEOUT}s)"})
            if pending:
                logger.info("PW timeout: %d done, %d cancelled", len(done), len(pending))
                await asyncio.gather(*pending, return_exceptions=True)
        finally:
            await context.close()
            await browser.close()

    await httpx_task
    prices_out.sort(key=lambda r: r.get("price", 0))
    return ScrapeOutcome(prices=prices_out, errors=errors)


def run_live_scrape(normalized_query: str, *, headless: bool | None = None) -> ScrapeOutcome:
    gh = True if headless is None else bool(headless)
    if os.environ.get("PLAYWRIGHT_HEADED", "").lower() in ("1", "true", "yes"):
        gh = False
    try:
        return asyncio.run(scrape_all_live_async(normalized_query, headless=gh))
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(scrape_all_live_async(normalized_query, headless=gh))
        finally:
            loop.close()
