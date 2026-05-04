"""
Live Chromium (Playwright) scraping for pharmacy search pages — real prices/links only.
Failures are recorded per-pharmacy; callers decide whether empty aggregate is fatal.
Selectors may need tweaks when storefronts change layout.
"""
from __future__ import annotations

import asyncio
import logging
import random
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable
from urllib.parse import quote_plus, urljoin, urlparse

from playwright.async_api import BrowserContext, Page, async_playwright

logger = logging.getLogger(__name__)


def _parse_inr_near_token(blob: str) -> float | None:
    blob = (blob or "").replace("\xa0", " ")
    patterns = (
        r"₹\s*([1-9][0-9,]*(?:\.\d{1,2})?)",
        r"(?:Rs\.?|MRP|INR)\s*:?\s*₹?\s*([1-9][0-9,]*(?:\.\d{1,2})?)",
    )
    for pat in patterns:
        m = re.search(pat, blob, re.I)
        if m:
            try:
                p = float(m.group(1).replace(",", ""))
                if 3 <= p <= 800_000:
                    return p
            except (ValueError, IndexError):
                continue
    return None


def _first_inr_in_page_text(text: str) -> float | None:
    for line in (text or "").splitlines():
        px = _parse_inr_near_token(line)
        if px:
            return px
    return _parse_inr_near_token(text or "")


async def _cookies(page: Page) -> None:
    for sel in (
        "#onetrust-accept-btn-handler",
        "button:has-text('Accept')",
        "button:has-text('AGREE')",
    ):
        try:
            loc = page.locator(sel).first
            if await loc.is_visible(timeout=800):
                await loc.click(timeout=3000)
                await asyncio.sleep(0.2)
                return
        except Exception:
            continue


async def _goto(page: Page, url: str) -> None:
    await page.goto(url, wait_until="domcontentloaded", timeout=75000)
    try:
        await page.wait_for_load_state("networkidle", timeout=12_000)
    except Exception:
        pass
    try:
        await page.evaluate("window.scrollTo(0, Math.min(600, document.body.scrollHeight * 0.25))")
        await asyncio.sleep(0.35)
    except Exception:
        pass


def _label_matches_query(label: str, query: str) -> bool:
    """
    The product NAME must start with (or have very early) the searched term.
    Rejects generic alternatives where the query word only appears buried
    in parentheses or at the tail, e.g. "Paracetamol (alt for Dolo)".
    """
    label_clean = re.sub(r"[^\w\s]", " ", label.lower()).strip()
    label_words = label_clean.split()
    query_lower = query.lower().strip()
    q_words = [w for w in query_lower.split() if len(w) >= 2]
    if not q_words:
        return label_clean.startswith(query_lower)
    for w in q_words:
        found = False
        for idx, lw in enumerate(label_words):
            if lw.startswith(w) or w.startswith(lw):
                if idx <= 2:
                    found = True
                break
        if found:
            return True
    return False


async def _product_row_from_search(
    page: Page,
    fallback_url: str,
    _host_sub: str,
    href_ok: Callable[[str], bool],
    query: str = "",
) -> tuple[float, str, str]:
    """
    Walk product-like anchors; return (price, short label, href).
    Only returns a result when the product NAME matches the search query —
    generic alternatives or unrelated products are skipped.
    """
    base = page.url
    loc = page.locator("a[href]")
    n = await loc.count()
    for i in range(min(n, 200)):
        a = loc.nth(i)
        raw = (await a.get_attribute("href") or "").split("#")[0].strip()
        if not raw or raw.startswith(("#", "javascript", "mailto:", "tel:")):
            continue
        abs_href = urljoin(base, raw)
        if not href_ok(abs_href):
            continue
        label = (await a.inner_text()).strip().split("\n")[0][:220]
        if not label or len(label) < 2:
            continue
        if query and not _label_matches_query(label, query):
            continue
        try:
            txt = await a.evaluate(
                """el => {
                  const n = el.closest('article, li, [data-testid], [class*="card"], [class*="Card"], section, div');
                  return n ? n.innerText : el.innerText;
                }"""
            )
        except Exception:
            txt = label
        px = _parse_inr_near_token(txt) or _parse_inr_near_token(await a.inner_text())
        if px:
            return px, label, abs_href
    raise RuntimeError("No matching product found on search results")


async def _scrape_one(
    page: Page,
    pharmacy_label: str,
    search_url: str,
    host_sub: str,
    href_ok: Callable[[str], bool],
    q: str,
) -> dict[str, Any]:
    await _goto(page, search_url)
    await asyncio.sleep(random.uniform(0.35, 1.1))
    await _cookies(page)
    px, lab, href = await _product_row_from_search(page, search_url, host_sub, href_ok, query=q)
    return {
        "pharmacy_name": pharmacy_label,
        "medicine_display": lab or q.title(),
        "pack_size": "",
        "price": float(px),
        "unit_price": None,
        "discount": "",
        "availability": "See pharmacy site",
        "url": href[:1024],
        "scraped_at": datetime.utcnow().isoformat() + "Z",
    }


def _is_1mg(u: str) -> bool:
    try:
        p = urlparse(u)
        if "1mg.com" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if not path.strip("/") or path.startswith("/search"):
            return False
        return True
    except Exception:
        return False


def _is_pe(u: str) -> bool:
    try:
        p = urlparse(u)
        if "pharmeasy.in" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if "/search/all" in path or path.rstrip("/").endswith("/search"):
            return False
        if not path.strip("/"):
            return False
        return True
    except Exception:
        return False


def _is_nm(u: str) -> bool:
    try:
        p = urlparse(u)
        if "netmeds.com" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if "catalogsearch" in path:
            return False
        if not path.strip("/"):
            return False
        return True
    except Exception:
        return False


def _is_ap(u: str) -> bool:
    try:
        p = urlparse(u)
        if "apollopharmacy.in" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if "search-medicines" in path or not path.strip("/"):
            return False
        return True
    except Exception:
        return False


def _is_tm(u: str) -> bool:
    try:
        p = urlparse(u)
        if "truemeds.in" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if not path.strip("/") or path.rstrip("/").endswith("/search"):
            return False
        return True
    except Exception:
        return False


def _is_medplus(u: str) -> bool:
    try:
        p = urlparse(u)
        if "medplusmart.com" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if not path.strip("/") or path.startswith("/search"):
            return False
        return True
    except Exception:
        return False


def _is_flipkart_health(u: str) -> bool:
    try:
        p = urlparse(u)
        nl = p.netloc.lower()
        if "flipkart.com" not in nl and "flipkarthealth.com" not in nl:
            return False
        path = p.path.lower()
        if not path.strip("/"):
            return False
        if "/search" in path and "?" in u:
            return False
        return True
    except Exception:
        return False


def _is_amazon_pharmacy(u: str) -> bool:
    try:
        p = urlparse(u)
        if "amazon.in" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if "/dp/" in path or "/gp/" in path:
            return True
        if not path.strip("/") or path == "/s":
            return False
        return bool(path.strip("/"))
    except Exception:
        return False


def _is_sastasundar(u: str) -> bool:
    try:
        p = urlparse(u)
        if "sastasundar.com" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if not path.strip("/") or "search" in path:
            return False
        return True
    except Exception:
        return False


def _is_medkart(u: str) -> bool:
    try:
        p = urlparse(u)
        if "medkart.in" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if not path.strip("/") or path.rstrip("/").endswith("/search"):
            return False
        return True
    except Exception:
        return False


def _is_bajaj_health(u: str) -> bool:
    try:
        p = urlparse(u)
        nl = p.netloc.lower()
        if "bajajfinservhealth.in" not in nl and "bajajhealth.in" not in nl:
            return False
        path = p.path.lower()
        if not path.strip("/") or "/search" in path:
            return False
        return True
    except Exception:
        return False


def _is_mankind(u: str) -> bool:
    try:
        p = urlparse(u)
        if "mankindpharma.com" not in p.netloc.lower():
            return False
        path = p.path.lower()
        if not path.strip("/") or "/search" in path:
            return False
        return True
    except Exception:
        return False


# ────────────────────── scraper functions ──────────────────────

async def scrape_1mg(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.1mg.com/search/all?name={quote_plus(q)}"
    return await _scrape_one(page, "Tata 1mg", su, "1mg.com", _is_1mg, q)


async def scrape_pharmeasy(page: Page, q: str) -> dict[str, Any]:
    su = f"https://pharmeasy.in/search/all?name={quote_plus(q)}"
    return await _scrape_one(page, "PharmEasy", su, "pharmeasy.in", _is_pe, q)


async def scrape_netmeds(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.netmeds.com/catalogsearch/result?q={quote_plus(q)}"
    return await _scrape_one(page, "Netmeds", su, "netmeds.com", _is_nm, q)


async def scrape_apollo(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.apollopharmacy.in/search-medicines?keyword={quote_plus(q)}"
    return await _scrape_one(page, "Apollo Pharmacy", su, "apollopharmacy.in", _is_ap, q)


async def scrape_truemeds(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.truemeds.in/search?q={quote_plus(q)}"
    return await _scrape_one(page, "TrueMeds", su, "truemeds.in", _is_tm, q)


async def scrape_medplus(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.medplusmart.com/searchProduct.mart?searchKey={quote_plus(q)}"
    return await _scrape_one(page, "MedPlus", su, "medplusmart.com", _is_medplus, q)


async def scrape_flipkart_health(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.flipkart.com/search?q={quote_plus(q)}+medicine&otracker=search&as-show=on"
    return await _scrape_one(page, "Flipkart Health+", su, "flipkart.com", _is_flipkart_health, q)


async def scrape_amazon_pharmacy(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.amazon.in/s?k={quote_plus(q)}&i=hpc"
    return await _scrape_one(page, "Amazon Pharmacy", su, "amazon.in", _is_amazon_pharmacy, q)


async def scrape_sastasundar(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.sastasundar.com/search?q={quote_plus(q)}"
    return await _scrape_one(page, "SastaSundar", su, "sastasundar.com", _is_sastasundar, q)


async def scrape_medkart(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.medkart.in/search?q={quote_plus(q)}"
    return await _scrape_one(page, "Medkart", su, "medkart.in", _is_medkart, q)


async def scrape_bajaj_health(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.bajajfinservhealth.in/medicine/search?query={quote_plus(q)}"
    return await _scrape_one(page, "Bajaj Health", su, "bajajfinservhealth.in", _is_bajaj_health, q)


async def scrape_mankind(page: Page, q: str) -> dict[str, Any]:
    su = f"https://www.mankindpharma.com/search?q={quote_plus(q)}"
    return await _scrape_one(page, "Mankind Pharma", su, "mankindpharma.com", _is_mankind, q)


SCRAPERS: list[tuple[str, Any]] = [
    ("Tata 1mg", scrape_1mg),
    ("PharmEasy", scrape_pharmeasy),
    ("Netmeds", scrape_netmeds),
    ("Apollo Pharmacy", scrape_apollo),
    ("TrueMeds", scrape_truemeds),
    ("MedPlus", scrape_medplus),
    ("Flipkart Health+", scrape_flipkart_health),
    ("Amazon Pharmacy", scrape_amazon_pharmacy),
    ("SastaSundar", scrape_sastasundar),
    ("Medkart", scrape_medkart),
    ("Bajaj Health", scrape_bajaj_health),
    ("Mankind Pharma", scrape_mankind),
]


@dataclass
class ScrapeOutcome:
    prices: list[dict[str, Any]]
    errors: list[dict[str, str]]


async def scrape_all_live_async(normalized_query: str, headless: bool = True) -> ScrapeOutcome:
    prices_out: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    async def run_one(label: str, fn, context: BrowserContext) -> None:
        page = await context.new_page()
        page.set_default_timeout(60000)
        try:
            row = await fn(page, normalized_query)
            prices_out.append(row)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("%s: %s", label, exc)
            errors.append({"pharmacy": label, "error": str(exc)})
        finally:
            try:
                await page.close()
            except Exception:
                pass

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
            ),
            locale="en-IN",
            viewport={"width": 1366, "height": 896},
            extra_http_headers={"Accept-Language": "en-IN,en;q=0.9"},
        )
        try:
            tasks = [asyncio.create_task(run_one(label, fn, context)) for label, fn in SCRAPERS]
            await asyncio.gather(*tasks)
            prices_out.sort(key=lambda r: r.get("price", 0))
        finally:
            await context.close()
            await browser.close()

    return ScrapeOutcome(prices=prices_out, errors=errors)


def run_live_scrape(normalized_query: str, *, headless: bool | None = None) -> ScrapeOutcome:
    import os

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
