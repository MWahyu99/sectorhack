"""
api/routes.py
FastAPI endpoints untuk Zoohoots screener.

Endpoints:
  GET /screen/{ticker}     → UNP + L1 + combo verdict untuk satu saham
  GET /screen              → scan semua LQ45 (bisa lambat, gunakan dengan bijak)
  GET /tickers             → list LQ45 yang tersedia
  POST /refresh            → trigger pull data terbaru dari Sectors API
  GET /refresh/status      → cek apakah refresh sedang berjalan
  GET /prices              → harga close + chg% semua LQ45 (dari Sectors, cache 5 menit)
  GET /prices/{ticker}     → harga close + chg% satu ticker
  GET /health              → health check
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import logging
import sqlite3
from pathlib import Path as _Path

from data.pipeline  import get_features, get_tickers, refresh_all
from engine.zuhut   import run_combined
from api.prices     import get_prices, get_price
from api.flow       import get_flow_data
from api.fundamentals import get_fundamentals

log = logging.getLogger("routes")
router = APIRouter()

# ── Response models ────────────────────────────────────────────────────────────
class ScreenResult(BaseModel):
    ticker:          str
    unp_score:       float
    unp_label:       str
    l1_bias:         str
    l1_confidence:   float
    combo:           str
    pattern_matches: int
    total_windows:   int
    analog_index:    int
    error:           Optional[str] = None

class ScreenAllResult(BaseModel):
    results: list[ScreenResult]
    total:   int
    scanned: int

class RefreshResult(BaseModel):
    status:  str
    message: str

class PriceItem(BaseModel):
    ticker:   str
    price:    str        # "8.975" (format ribuan dengan titik)
    rawPrice: int
    chg:      str        # "+1.23" atau "-0.45"

class PricesResult(BaseModel):
    results: list[PriceItem]
    total:   int
    source:  str         # "sectors_api" atau "cache"

class BrokerItem(BaseModel):
    code: str
    flow: str   # "+Rp 312M"
    pct:  int   # 0–100 untuk bar width
    side: str   # "buy" | "sell"

class FlowResult(BaseModel):
    ticker:       str
    date:         Optional[str] = None
    foreignFlow:  Optional[str] = None   # "+Rp 312M"
    domesticFlow: Optional[str] = None
    foreignPct:   Optional[int] = None   # 0–100
    domesticPct:  Optional[int] = None
    topBrokers:   list[BrokerItem] = []
    source:       str = "sectors_api"

# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "ok", "service": "zoohoots-backend"}


@router.get("/tickers")
def tickers():
    return {"tickers": get_tickers()}


# ── PRICES ────────────────────────────────────────────────────────────────────

@router.get("/prices", response_model=PricesResult)
def prices_all(refresh: bool = False):
    """
    Return harga close + perubahan harian untuk semua LQ45.
    Data diambil dari Sectors API /v2/close/ dan di-cache 5 menit.

    Query params:
      refresh=true  → paksa refresh cache (gunakan hemat, ~4 API credit)
    """
    price_map = get_prices(force_refresh=refresh)

    if not price_map:
        raise HTTPException(
            status_code=503,
            detail="Price data tidak tersedia — Sectors API tidak terjangkau. Pastikan SECTORS_API_KEY valid."
        )

    items = [
        PriceItem(
            ticker   = ticker,
            price    = data["price"],
            rawPrice = data["rawPrice"],
            chg      = data["chg"],
        )
        for ticker, data in sorted(price_map.items())
    ]

    return PricesResult(
        results = items,
        total   = len(items),
        source  = "sectors_api",
    )


@router.get("/prices/{ticker}", response_model=PriceItem)
def price_one(ticker: str):
    """
    Return harga close + chg% untuk satu ticker.
    Contoh: GET /prices/BBCA
    """
    ticker = ticker.upper().strip().replace(".JK", "")

    data = get_price(ticker)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f"Harga untuk {ticker} tidak tersedia. Cek ticker atau coba lagi setelah market tutup."
        )

    return PriceItem(
        ticker   = ticker,
        price    = data["price"],
        rawPrice = data["rawPrice"],
        chg      = data["chg"],
    )


_DB_PATH = _Path(__file__).parent.parent / "data" / "zoohoots.db"

@router.get("/ohlcv/{ticker}")
def ohlcv_ticker(ticker: str):
    ticker = ticker.upper().strip().replace(".JK", "")
    if ticker not in get_tickers():
        raise HTTPException(status_code=404, detail=f"{ticker} tidak ada di LQ45.")
    
    conn = sqlite3.connect(str(_DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT date, open, high, low, close, volume
        FROM daily_price
        WHERE ticker = ? AND close IS NOT NULL AND close > 0
        ORDER BY date ASC
        LIMIT 90
    """, (ticker,)).fetchall()
    conn.close()
    
    return {"ticker": ticker, "candles": [dict(r) for r in rows]}

@router.get("/fundamentals/{ticker}")
def fundamentals_ticker(ticker: str):
    ticker = ticker.upper().strip().replace(".JK", "")
    if ticker not in get_tickers():
        raise HTTPException(status_code=404, detail=f"{ticker} tidak ada.")
    return get_fundamentals(ticker)

# ── FLOW ─────────────────────────────────────────────────────────────────────

@router.get("/flow/{ticker}", response_model=FlowResult)
def flow_ticker(ticker: str, refresh: bool = False):
    """
    Return foreign flow + top broker activity untuk satu ticker.
    Data dari Sectors API, cache 10 menit per ticker.

    Cost: 3 API credits per request (1 foreign-flow + 2 broker-summary).
    Query params:
      refresh=true → paksa refresh cache
    """
    ticker = ticker.upper().strip().replace(".JK", "")

    if ticker not in get_tickers():
        raise HTTPException(
            status_code=404,
            detail=f"Ticker {ticker} tidak ada di daftar LQ45."
        )

    data = get_flow_data(ticker, force_refresh=refresh)

    brokers = [
        BrokerItem(
            code=b["code"],
            flow=b["flow"],
            pct=b["pct"],
            side=b["side"],
        )
        for b in data.get("topBrokers", [])
    ]

    return FlowResult(
        ticker       = ticker,
        date         = data.get("date"),
        foreignFlow  = data.get("foreignFlow"),
        domesticFlow = data.get("domesticFlow"),
        foreignPct   = data.get("foreignPct"),
        domesticPct  = data.get("domesticPct"),
        topBrokers   = brokers,
        source       = data.get("source", "sectors_api"),
    )


# ── SCREENER ──────────────────────────────────────────────────────────────────

@router.get("/screen/{ticker}", response_model=ScreenResult)
def screen_ticker(ticker: str):
    """
    Jalankan UNP + L1 untuk satu ticker.
    Ticker harus huruf besar, contoh: BBCA, BMRI, TLKM
    """
    ticker = ticker.upper().strip()

    if ticker not in get_tickers():
        raise HTTPException(
            status_code=404,
            detail=f"Ticker {ticker} tidak ada di daftar LQ45."
        )

    features = get_features(ticker)
    if features is None:
        raise HTTPException(
            status_code=503,
            detail=f"Data belum tersedia untuk {ticker}. Coba /refresh dulu."
        )

    try:
        result = run_combined(features)
    except Exception as e:
        log.error(f"Engine error untuk {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Engine error: {str(e)}")

    return ScreenResult(
        ticker          = ticker,
        unp_score       = result["unp_score"],
        unp_label       = result["unp_label"],
        l1_bias         = result["l1_bias"],
        l1_confidence   = result["l1_confidence"],
        combo           = result["combo"],
        pattern_matches = result["pattern_matches"],
        total_windows   = result["total_windows"],
        analog_index    = result["analog_index"],
    )


@router.get("/screen", response_model=ScreenAllResult)
def screen_all(
    min_unp:   float = 0.0,
    combo:     Optional[str] = None,
    limit:     int = 45,
):
    """
    Scan semua LQ45 dan return hasil terurut by UNP score (descending).

    Query params:
      min_unp  — filter minimum UNP score (default 0 = semua)
      combo    — filter combo: strong | caution | watch | normal | skip
      limit    — max hasil yang dikembalikan (default 45)
    """
    all_tickers = get_tickers()
    results     = []
    scanned     = 0

    for t in all_tickers:
        features = get_features(t)
        if features is None:
            continue

        scanned += 1
        try:
            r = run_combined(features)
        except Exception as e:
            log.warning(f"Skip {t}: {e}")
            continue

        item = ScreenResult(
            ticker          = t,
            unp_score       = r["unp_score"],
            unp_label       = r["unp_label"],
            l1_bias         = r["l1_bias"],
            l1_confidence   = r["l1_confidence"],
            combo           = r["combo"],
            pattern_matches = r["pattern_matches"],
            total_windows   = r["total_windows"],
            analog_index    = r["analog_index"],
        )

        if item.unp_score < min_unp:
            continue
        if combo and item.combo != combo.lower():
            continue

        results.append(item)

    results.sort(key=lambda x: x.unp_score, reverse=True)
    results = results[:limit]

    return ScreenAllResult(
        results = results,
        total   = len(results),
        scanned = scanned,
    )


# ── REFRESH ───────────────────────────────────────────────────────────────────

_refresh_running = False

@router.post("/refresh", response_model=RefreshResult)
def trigger_refresh(background_tasks: BackgroundTasks):
    """
    Trigger pull data terbaru dari Sectors API untuk semua LQ45.
    Berjalan di background (~2–5 menit untuk 45 saham).
    Gunakan hemat — setiap refresh = ~135 API credit.
    """
    global _refresh_running
    if _refresh_running:
        return RefreshResult(
            status  = "running",
            message = "Refresh sedang berjalan, tunggu selesai."
        )

    def _run():
        global _refresh_running
        _refresh_running = True
        try:
            refresh_all()
        finally:
            _refresh_running = False

    background_tasks.add_task(_run)
    return RefreshResult(
        status  = "started",
        message = "Refresh dimulai di background. Data akan tersedia dalam beberapa menit."
    )


@router.get("/refresh/status")
def refresh_status():
    return {"running": _refresh_running}