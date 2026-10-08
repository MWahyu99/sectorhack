"""
api/flow.py
Foreign flow + top broker data dari Sectors API per saham.

Endpoints yang dipakai:
  GET /v2/foreign-flow/{symbol}/         → net foreign inflow/outflow (1 credit)
  GET /v2/broker-summary/{symbol}/top/   → top buyers & sellers (2 credits)

Cache in-memory per ticker, TTL 10 menit.
"""

import os
import time
import logging
from datetime import date, timedelta

import requests
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("flow")

SECTORS_API_KEY = os.getenv("SECTORS_API_KEY", "")
SECTORS_BASE    = "https://api.sectors.app/v2"
CACHE_TTL       = 10 * 60  # 10 menit per ticker

# Cache: { ticker: { "flow": {...}, "brokers": {...}, "ts": float } }
_cache: dict = {}


def _headers() -> dict:
    return {"Authorization": SECTORS_API_KEY}


def _fmt_idr(val: float) -> str:
    """Format IDR ke string ringkas: 312000000 → '+Rp 312M', -87000000 → '-Rp 87M'"""
    if val is None:
        return "N/A"
    sign = "+" if val >= 0 else "-"
    abs_val = abs(val)
    if abs_val >= 1_000_000_000_000:
        return f"{sign}Rp {abs_val/1_000_000_000_000:.1f}T"
    elif abs_val >= 1_000_000_000:
        return f"{sign}Rp {abs_val/1_000_000_000:.1f}B"
    elif abs_val >= 1_000_000:
        return f"{sign}Rp {abs_val/1_000_000:.0f}M"
    else:
        return f"{sign}Rp {abs_val/1_000:.0f}K"


def _get_workday(offset_days: int = 0) -> str:
    """Kembalikan tanggal hari kerja — offset_days=0 → hari kerja terakhir (T-1, karena data intraday belum tersedia).

    Selalu mundur minimal 1 hari dari hari ini agar data sudah tersedia di Sectors API
    (IDX data biasanya tersedia setelah market close 16:00 WIB, kadang delayed 1 hari).
    """
    d = date.today() - timedelta(days=1)   # mulai dari kemarin
    while d.weekday() >= 5:                # skip weekend
        d -= timedelta(days=1)
    steps = abs(offset_days) if offset_days < 0 else 0
    while steps > 0:
        d -= timedelta(days=1)
        if d.weekday() < 5:
            steps -= 1
    return d.strftime("%Y-%m-%d")


def _fetch_foreign_flow(ticker: str) -> dict:
    """
    Fetch net foreign flow untuk satu ticker, 5 hari terakhir.
    Return dict siap pakai untuk frontend.
    """
    end   = _get_workday(0)
    start = _get_workday(-4)   # 5 hari kerja

    try:
        url  = f"{SECTORS_BASE}/foreign-flow/{ticker}/"
        resp = requests.get(url, headers=_headers(), params={"start": start, "end": end}, timeout=30)

        if resp.status_code != 200:
            log.warning(f"foreign-flow/{ticker} HTTP {resp.status_code}")
            return {}

        data  = resp.json()
        rows  = data.get("data", [])

        if not rows:
            return {}

        # Ambil hari terbaru
        latest = rows[-1]
        net    = latest.get("net_foreign_inflow", 0)
        f_buy  = latest.get("foreign_buy_idr", 0)
        f_sell = latest.get("foreign_sell_idr", 0)
        f_share = latest.get("foreign_share", 0)   # 0–1

        total_turnover = f_buy + f_sell
        dom_pct = max(0, round((1 - f_share) * 100)) if f_share else 50
        for_pct = min(100, round(f_share * 100)) if f_share else 50

        # Hitung domestic net: approximasi dari sisa turnover
        # (Sectors tidak expose domestic net secara langsung)
        dom_net = -(net) if net != 0 else 0  # jika asing net buy, domestik net sell

        return {
            "date":         latest.get("date", end),
            "foreignFlow":  _fmt_idr(net),
            "domesticFlow": _fmt_idr(dom_net),
            "foreignPct":   for_pct,
            "domesticPct":  dom_pct,
            "foreignBuyIdr":  f_buy,
            "foreignSellIdr": f_sell,
            "netForeignIdr":  net,
        }

    except Exception as e:
        log.error(f"_fetch_foreign_flow({ticker}): {e}")
        return {}


def _fetch_top_brokers(ticker: str, n: int = 3) -> list:
    """
    Fetch top buyers & sellers untuk satu ticker.
    Return list broker siap render: [{ code, flow, pct, side }]
    """
    end   = _get_workday(0)
    start = _get_workday(-4)

    try:
        url    = f"{SECTORS_BASE}/broker-summary/{ticker}/top/"
        params = {"start": start, "end": end, "n_brokers": n}
        resp   = requests.get(url, headers=_headers(), params=params, timeout=30)

        if resp.status_code != 200:
            log.warning(f"broker-summary/{ticker}/top HTTP {resp.status_code}")
            return []

        data = resp.json()
        buyers  = data.get("top_buyers",  [])
        sellers = data.get("top_sellers", [])

        # Gabungkan top 3 buyers + top 3 sellers, sorted by abs net
        combined = []

        max_abs = 1  # untuk normalisasi bar %
        for b in buyers[:n]:
            abs_net = abs(b.get("net_idr", 0))
            if abs_net > max_abs:
                max_abs = abs_net
        for s in sellers[:n]:
            abs_net = abs(s.get("net_idr", 0))
            if abs_net > max_abs:
                max_abs = abs_net

        for b in buyers[:n]:
            net = b.get("net_idr", 0)
            combined.append({
                "code": b.get("broker_code", "?"),
                "flow": _fmt_idr(net),
                "pct":  min(100, round(abs(net) / max_abs * 100)),
                "side": "buy",
            })

        for s in sellers[:n]:
            net = s.get("net_idr", 0)
            combined.append({
                "code": s.get("broker_code", "?"),
                "flow": _fmt_idr(net),
                "pct":  min(100, round(abs(net) / max_abs * 100)),
                "side": "sell",
            })

        return combined

    except Exception as e:
        log.error(f"_fetch_top_brokers({ticker}): {e}")
        return []


# ── Public API ────────────────────────────────────────────────────────────────

def get_flow_data(ticker: str, force_refresh: bool = False) -> dict:
    """
    Return { foreignFlow, domesticFlow, foreignPct, domesticPct, topBrokers, date }
    untuk satu ticker. Cache 10 menit per ticker.
    """
    ticker = ticker.upper()
    now    = time.time()
    cached = _cache.get(ticker)

    if not force_refresh and cached and (now - cached["ts"]) < CACHE_TTL:
        return cached["data"]

    flow    = _fetch_foreign_flow(ticker)
    brokers = _fetch_top_brokers(ticker)

    result = {
        **flow,
        "topBrokers": brokers,
        "source": "sectors_api",
    }

    _cache[ticker] = {"data": result, "ts": now}
    log.info(f"Flow data {ticker}: foreignFlow={result.get('foreignFlow')}, brokers={len(brokers)}")
    return result