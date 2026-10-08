"""
api/prices.py
Ambil harga close + perubahan harian dari SQLite (zoohoots.db)
yang sudah di-populate oleh data/pipeline.py via /daily/{ticker}/.

Tidak pakai /v2/close/ — data sudah ada lokal, lebih cepat, tidak boros kredit.
Cache in-memory 5 menit.
"""

import time
import logging
import sqlite3
from pathlib import Path

log = logging.getLogger("prices")

DB_PATH   = Path(__file__).parent.parent / "data" / "zoohoots.db"
CACHE_TTL = 5 * 60  # 5 menit

_cache:    dict  = {}
_cache_ts: float = 0.0


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _build_price_map() -> dict:
    """
    Baca 2 hari terakhir dari daily_price untuk setiap ticker,
    hitung chg% = (close_today - close_prev) / close_prev * 100.
    """
    conn = _get_conn()
    try:
        # Ambil 2 baris terbaru per ticker (date DESC)
        rows = conn.execute("""
            SELECT ticker, date, close
            FROM (
                SELECT ticker, date, close,
                       ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY date DESC) AS rn
                FROM daily_price
                WHERE close IS NOT NULL AND close > 0
            )
            WHERE rn <= 2
            ORDER BY ticker, date DESC
        """).fetchall()
    finally:
        conn.close()

    # Kelompokkan per ticker: [hari_ini, hari_sebelumnya]
    ticker_rows: dict[str, list] = {}
    for row in rows:
        t = row["ticker"]
        if t not in ticker_rows:
            ticker_rows[t] = []
        ticker_rows[t].append((row["date"], row["close"]))

    price_map = {}
    for ticker, entries in ticker_rows.items():
        if not entries:
            continue

        close_latest = entries[0][1]   # hari terbaru
        close_prev   = entries[1][1] if len(entries) > 1 else None

        # Hitung chg%
        if close_prev and close_prev > 0:
            chg_pct = (close_latest - close_prev) / close_prev * 100
        else:
            chg_pct = 0.0

        # Format price IDX: titik sebagai pemisah ribuan
        price_str = f"{close_latest:,.0f}".replace(",", ".")

        sign    = "+" if chg_pct >= 0 else ""
        chg_str = f"{sign}{chg_pct:.2f}"

        price_map[ticker] = {
            "ticker":   ticker,
            "price":    price_str,
            "rawPrice": int(close_latest),
            "chg":      chg_str,
        }

    log.info(f"Price map dari DB: {len(price_map)} tickers")
    return price_map


# ── Public API ────────────────────────────────────────────────────────────────

def get_prices(force_refresh: bool = False) -> dict:
    global _cache, _cache_ts

    now = time.time()
    if force_refresh or not _cache or (now - _cache_ts) > CACHE_TTL:
        try:
            fresh = _build_price_map()
            if fresh:
                _cache    = fresh
                _cache_ts = now
            elif not _cache:
                log.warning("DB kosong atau belum di-populate, return empty")
        except Exception as e:
            log.error(f"get_prices dari DB gagal: {e}")
            if not _cache:
                return {}

    return _cache


def get_price(ticker: str) -> dict | None:
    prices = get_prices()
    return prices.get(ticker.upper())