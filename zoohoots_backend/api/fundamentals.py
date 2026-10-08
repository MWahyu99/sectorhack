"""
api/fundamentals.py
Fundamental data (PE, PBV, market cap, dividend yield) dari Sectors API per saham.

Endpoint:
  GET /v2/company/report/{ticker}/?sections=overview,valuation,dividend  (3 credits)

Fields yang dipakai:
  overview.market_cap
  valuation.forward_pe
  valuation.historical_valuation[-1].pb   ← PBV tahun terbaru
  dividend.yield_ttm

Cache in-memory per ticker, TTL 60 menit.
"""

import os
import time
import logging

import requests
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("fundamentals")

SECTORS_API_KEY = os.getenv("SECTORS_API_KEY", "")
SECTORS_BASE    = "https://api.sectors.app/v2"
CACHE_TTL       = 60 * 60  # 60 menit

_cache: dict = {}


def _headers() -> dict:
    return {"Authorization": SECTORS_API_KEY}


def _fmt_mktcap(val) -> str:
    if val is None:
        return "N/A"
    try:
        v = float(val)
    except (TypeError, ValueError):
        return "N/A"
    if v >= 1_000_000_000_000:
        return f"Rp {v/1_000_000_000_000:.1f}T"
    elif v >= 1_000_000_000:
        return f"Rp {v/1_000_000_000:.0f}B"
    else:
        return f"Rp {v/1_000_000:.0f}M"


def _fmt_pe(val) -> str:
    if val is None:
        return "N/A"
    try:
        return f"{float(val):.1f}x"
    except (TypeError, ValueError):
        return "N/A"


def _fmt_pbv(val) -> str:
    if val is None:
        return "N/A"
    try:
        return f"{float(val):.2f}x"
    except (TypeError, ValueError):
        return "N/A"


def _fmt_div_yield(val) -> str:
    """val dari API adalah desimal: 0.0625 = 6.25%"""
    if val is None:
        return "N/A"
    try:
        v = float(val)
        if v < 1:          # sudah dalam bentuk desimal
            v = v * 100
        return f"{v:.2f}%"
    except (TypeError, ValueError):
        return "N/A"


def _fetch_fundamentals(ticker: str) -> dict:
    try:
        url    = f"{SECTORS_BASE}/company/report/{ticker}/"
        params = {"sections": "overview,valuation,dividend"}
        resp   = requests.get(url, headers=_headers(), params=params, timeout=30)

        if resp.status_code != 200:
            log.warning(f"company/report/{ticker} HTTP {resp.status_code}: {resp.text[:200]}")
            return {}

        data = resp.json()

        # ── Market Cap ────────────────────────────────────────────────────────
        overview   = data.get("overview", {})
        market_cap = overview.get("market_cap")

        # ── PE (forward) & PBV (pb dari historical_valuation terbaru) ─────────
        valuation  = data.get("valuation", {})
        forward_pe = valuation.get("forward_pe")

        pb = None
        hist_val = valuation.get("historical_valuation", [])
        if isinstance(hist_val, list) and hist_val:
            # Ambil entry dengan year terbesar
            latest = max(hist_val, key=lambda x: x.get("year", 0))
            pb = latest.get("pb")

        # ── Dividend Yield (TTM) ──────────────────────────────────────────────
        dividend  = data.get("dividend", {})
        div_yield = dividend.get("yield_ttm")

        return {
            "pe":       _fmt_pe(forward_pe),
            "pbv":      _fmt_pbv(pb),
            "divYield": _fmt_div_yield(div_yield),
            "mktCap":   _fmt_mktcap(market_cap),
        }

    except Exception as e:
        log.error(f"_fetch_fundamentals({ticker}): {e}")
        return {}


# ── Public API ────────────────────────────────────────────────────────────────

def get_fundamentals(ticker: str, force_refresh: bool = False) -> dict:
    """
    Return { pe, pbv, divYield, mktCap } untuk satu ticker.
    Cache 60 menit per ticker.
    """
    ticker = ticker.upper()
    now    = time.time()
    cached = _cache.get(ticker)

    if not force_refresh and cached and (now - cached["ts"]) < CACHE_TTL:
        return cached["data"]

    result = _fetch_fundamentals(ticker)

    _cache[ticker] = {"data": result, "ts": now}
    log.info(f"Fundamentals {ticker}: {result}")
    return result
