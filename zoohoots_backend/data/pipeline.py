"""
data/pipeline.py
Pull data dari Sectors API untuk semua saham LQ45 IDX.
Simpan ke SQLite (zoohoots.db).

Sumber data: broker-summary (21 bulan) + daily OHLCV (90 hari)
Foreign flow TIDAK digunakan — hemat API credit, broker data sudah cukup.

Ekspos fungsi:
  - refresh_all()      → pull semua LQ45, simpan/update DB
  - get_features(t)    → np.ndarray (n_days, 6) siap pakai untuk zuhut engine
  - get_tickers()      → list ticker LQ45 aktif
"""

import os
import sqlite3
import time
import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import requests
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
API_KEY  = os.getenv("SECTORS_API_KEY", "")
BASE_URL = "https://api.sectors.app/v2"
HEADERS  = {"Authorization": API_KEY}
DB_PATH  = Path(__file__).parent / "zoohoots.db"
RATE_DELAY = 0.35  # detik antar request (~3 req/s)

log = logging.getLogger("pipeline")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ── LQ45 tickers ──────────────────────────────────────────────────────────────
LQ45_TICKERS = [
    "AALI", "ADRO", "AKRA", "AMRT", "ANTM",
    "ASII", "BBCA", "BBNI", "BBRI", "BBTN",
    "BMRI", "BRIS", "BRPT", "BUKA", "CPIN",
    "EMTK", "ERAA", "ESSA", "EXCL", "GGRM",
    "GOTO", "HRUM", "ICBP", "INCO", "INDF",
    "INKP", "INTP", "ITMG", "JPFA", "KLBF",
    "MAPI", "MBMA", "MDKA", "MEDC", "MIKA",
    "MLPL", "MNCN", "PGAS", "PGEO", "PTBA",
    "SMGR", "TBIG", "TLKM", "TOWR", "UNTR",
]

# ── SQLite schema ──────────────────────────────────────────────────────────────
SCHEMA = """
CREATE TABLE IF NOT EXISTS daily_price (
    ticker     TEXT NOT NULL,
    date       TEXT NOT NULL,
    open       REAL, high REAL, low REAL, close REAL,
    volume     REAL, market_cap REAL,
    PRIMARY KEY (ticker, date)
);
CREATE TABLE IF NOT EXISTS broker_flow (
    ticker    TEXT NOT NULL,
    date      TEXT NOT NULL,
    broker_id TEXT NOT NULL,
    buy_lot   REAL, sell_lot REAL, net_lot  REAL,
    buy_idr   REAL, sell_idr REAL, avg_price REAL,
    PRIMARY KEY (ticker, date, broker_id)
);
CREATE TABLE IF NOT EXISTS pull_log (
    ticker    TEXT NOT NULL,
    endpoint  TEXT NOT NULL,
    pulled_at TEXT NOT NULL,
    status    TEXT,
    PRIMARY KEY (ticker, endpoint)
);
"""

def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA)
    return conn

# ── HTTP helper ────────────────────────────────────────────────────────────────
def _get(path: str, params: dict = None, retries: int = 3):
    url = f"{BASE_URL}{path}"
    for attempt in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, params=params, timeout=15)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 429:
                wait = 2 ** attempt
                log.warning(f"Rate limit {url}, retry {wait}s")
                time.sleep(wait)
            else:
                log.error(f"HTTP {r.status_code} → {url}: {r.text[:200]}")
                return None
        except requests.RequestException as e:
            log.warning(f"Request error {url}: {e}, attempt {attempt+1}")
            time.sleep(1)
    return None

# ── Pull: daily OHLCV ──────────────────────────────────────────────────────────
def pull_daily(ticker: str, conn: sqlite3.Connection):
    data = _get(f"/daily/{ticker}/")
    time.sleep(RATE_DELAY)
    if not data:
        return

    rows = []
    for item in data:
        d = (item.get("date") or item.get("Date") or "")[:10]
        if not d:
            continue
        rows.append((
            ticker, d,
            item.get("open")   or item.get("Open"),
            item.get("high")   or item.get("High"),
            item.get("low")    or item.get("Low"),
            item.get("close")  or item.get("Close"),
            item.get("volume") or item.get("Volume"),
            item.get("market_cap") or item.get("marketcap"),
        ))

    if rows:
        conn.executemany(
            "INSERT OR REPLACE INTO daily_price VALUES (?,?,?,?,?,?,?,?)", rows
        )
        conn.commit()
        log.info(f"  daily {ticker}: {len(rows)} rows")

    conn.execute(
        "INSERT OR REPLACE INTO pull_log VALUES (?,?,?,?)",
        (ticker, "daily", datetime.now().isoformat(), "ok" if rows else "empty")
    )
    conn.commit()

# ── Pull: broker summary ───────────────────────────────────────────────────────
def pull_broker(ticker: str, conn: sqlite3.Connection):
    """Pull broker summary Jan 2025 – hari ini, incremental per 30 hari."""
    start = date(2025, 1, 1)
    end   = date.today()

    cur = conn.execute(
        "SELECT MAX(date) FROM broker_flow WHERE ticker=?", (ticker,)
    )
    row = cur.fetchone()
    if row[0]:
        try:
            start = datetime.strptime(row[0], "%Y-%m-%d").date() + timedelta(days=1)
        except ValueError:
            pass

    if start > end:
        log.info(f"  broker {ticker}: up-to-date")
        return

    cur_start  = start
    total_rows = 0
    while cur_start <= end:
        cur_end = min(cur_start + timedelta(days=29), end)
        params  = {
            "start": cur_start.strftime("%Y-%m-%d"),
            "end":   cur_end.strftime("%Y-%m-%d"),
        }
        data = _get(f"/broker-summary/{ticker}/", params=params)
        time.sleep(RATE_DELAY)

        if data and isinstance(data, dict):
            rows = []
            for item in (data.get("data") or []):
                d = (item.get("date") or "")[:10]
                if not d:
                    continue
                for b in (item.get("summary") or []):
                    r = _broker_row(ticker, d, b)
                    if r:
                        rows.append(r)

            if rows:
                conn.executemany(
                    """INSERT OR REPLACE INTO broker_flow
                       (ticker, date, broker_id, buy_lot, sell_lot, net_lot,
                        buy_idr, sell_idr, avg_price)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    rows
                )
                conn.commit()
                total_rows += len(rows)

        cur_start = cur_end + timedelta(days=1)

    log.info(f"  broker {ticker}: {total_rows} rows total")
    conn.execute(
        "INSERT OR REPLACE INTO pull_log VALUES (?,?,?,?)",
        (ticker, "broker", datetime.now().isoformat(), f"ok:{total_rows}")
    )
    conn.commit()

def _broker_row(ticker: str, d: str, b: dict):
    broker_id = b.get("broker_code") or b.get("broker_id") or b.get("code") or ""
    if not broker_id:
        return None
    return (
        ticker, d, str(broker_id),
        b.get("blot") or b.get("buy_lot")  or 0,
        b.get("slot") or b.get("sell_lot") or 0,
        b.get("nlot") or b.get("net_lot")  or 0,
        b.get("bval") or b.get("buy_idr")  or 0,
        b.get("sval") or b.get("sell_idr") or 0,
        b.get("navg_per_share") or b.get("bavg_per_share") or b.get("avg_price") or 0,
    )

# ── Feature Engineering ────────────────────────────────────────────────────────
def get_features(ticker: str, lookback_days: int = 400) -> Optional[np.ndarray]:
    """
    Bentuk feature matrix dari DB untuk satu ticker.

    Feature vector per hari (6 dimensi):
      0  close          — harga close (z-score)
      1  volume         — volume total (z-score)
      2  top5_net_lot   — net lot akumulasi 5 broker paling aktif
      3  max_abs_net    — lot terbesar broker dominan (proxy tekanan satu arah)
      4  hhi            — Herfindahl-Hirschman Index konsentrasi broker (0–1)
      5  top_share      — porsi buy dari 1 broker terbesar / total buy (0–1)

    Return: np.ndarray shape (n_days, 6), baris terakhir = hari terbaru.
    None jika data < 20 hari.
    """
    conn = get_conn()

    rows_daily = conn.execute(
        """SELECT date, close, volume FROM daily_price
           WHERE ticker=? ORDER BY date DESC LIMIT 90""",
        (ticker,)
    ).fetchall()

    rows_broker = conn.execute(
        """SELECT date,
               MAX(ABS(net_lot))          AS max_abs_net,
               SUM(ABS(buy_lot))          AS total_buy,
               SUM(ABS(sell_lot))         AS total_sell,
               SUM(buy_lot * buy_lot)     AS sum_sq_buy,
               MAX(ABS(buy_lot))          AS max_buy_lot
           FROM broker_flow WHERE ticker=?
           GROUP BY date ORDER BY date DESC LIMIT ?""",
        (ticker, lookback_days)
    ).fetchall()

    rows_top5 = conn.execute(
        """SELECT date, SUM(net_lot) AS net_lot_top5
           FROM (
               SELECT date, net_lot,
                      ROW_NUMBER() OVER (PARTITION BY date ORDER BY ABS(net_lot) DESC) as rn
               FROM broker_flow WHERE ticker=?
           ) WHERE rn <= 5
           GROUP BY date ORDER BY date DESC LIMIT ?""",
        (ticker, lookback_days)
    ).fetchall()

    conn.close()

    daily_map  = {r[0]: (r[1] or 0.0, r[2] or 0.0) for r in rows_daily}
    broker_map = {r[0]: {
        "max_abs_net": r[1] or 0.0,
        "total_buy":   r[2] or 0.0,
        "total_sell":  r[3] or 0.0,
        "sum_sq_buy":  r[4] or 0.0,
        "max_buy_lot": r[5] or 0.0,
    } for r in rows_broker}
    top5_map   = {r[0]: r[1] or 0.0 for r in rows_top5}

    all_dates = sorted(broker_map.keys())[-lookback_days:]
    if len(all_dates) < 20:
        log.warning(f"{ticker}: data terlalu sedikit ({len(all_dates)} hari)")
        return None

    rows_out = []
    for d in all_dates:
        bk    = broker_map[d]
        close, volume = daily_map.get(d, (0.0, 0.0))
        t5    = top5_map.get(d, 0.0)

        total_buy   = bk["total_buy"]  or 1.0
        max_buy_lot = bk["max_buy_lot"] or 0.0

        # top_broker_buy_share: porsi buy dari 1 broker terbesar (0–1)
        # Makin tinggi = makin terkonsentrasi pada satu broker → sinyal kuat
        top_share = max_buy_lot / total_buy if total_buy > 0 else 0.0

        hhi = bk["sum_sq_buy"] / (total_buy ** 2) if total_buy > 0 else 0.0

        rows_out.append([
            close,
            volume,
            t5,
            bk["max_abs_net"],
            hhi,
            top_share,          # ganti buy_dominance (konstan) → top broker share (bervariasi)
        ])

    arr = np.array(rows_out, dtype=np.float64)

    # Z-score per kolom
    means = arr.mean(axis=0)
    stds  = arr.std(axis=0)
    stds[stds == 0] = 1.0
    arr = (arr - means) / stds

    # Clip ±4 sigma
    arr = np.clip(arr, -4.0, 4.0)
    return arr   # shape (n_days, 6)

# ── Refresh semua LQ45 ────────────────────────────────────────────────────────
def refresh_all(tickers: list = None, force: bool = False):
    if tickers is None:
        tickers = LQ45_TICKERS

    conn  = get_conn()
    today = date.today().isoformat()

    for i, ticker in enumerate(tickers):
        log.info(f"[{i+1}/{len(tickers)}] {ticker}...")

        if not force:
            row = conn.execute(
                "SELECT pulled_at FROM pull_log WHERE ticker=? AND endpoint='broker'",
                (ticker,)
            ).fetchone()
            if row and row[0][:10] == today:
                log.info(f"  {ticker}: sudah pull hari ini, skip")
                continue

        pull_daily(ticker, conn)
        pull_broker(ticker, conn)

    conn.close()
    log.info("refresh_all selesai.")

def get_tickers() -> list:
    return list(LQ45_TICKERS)

# ── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    ticker = sys.argv[2] if len(sys.argv) > 2 else "BBCA"

    if len(sys.argv) > 1 and sys.argv[1] == "test":
        log.info(f"Test pull + feature untuk {ticker}...")
        conn = get_conn()
        pull_daily(ticker, conn)
        pull_broker(ticker, conn)
        conn.close()

        feat = get_features(ticker)
        if feat is not None:
            print(f"\nFeature matrix {ticker}: shape={feat.shape}")
            print(f"Baris terakhir: {feat[-1].round(4)}")
            print(f"Min per kolom:  {feat.min(axis=0).round(3)}")
            print(f"Max per kolom:  {feat.max(axis=0).round(3)}")
            nonzero = (feat != 0).sum(axis=0)
            print(f"Non-zero count: {nonzero}")
        else:
            print(f"Gagal buat feature untuk {ticker}")

    elif len(sys.argv) > 1 and sys.argv[1] == "refresh":
        refresh_all()
    else:
        print("Usage: python -m data.pipeline test [TICKER]")
        print("       python -m data.pipeline refresh")