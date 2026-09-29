"""
api/routes.py
FastAPI endpoints untuk Zoohoots screener.

Endpoints:
  GET /screen/{ticker}     → UNP + L1 + combo verdict untuk satu saham
  GET /screen/all          → scan semua LQ45 (bisa lambat, gunakan dengan bijak)
  GET /tickers             → list LQ45 yang tersedia
  POST /refresh            → trigger pull data terbaru dari Sectors API
  GET /health              → health check
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import logging

from data.pipeline import get_features, get_tickers, refresh_all
from engine.zuhut   import run_combined

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

# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    return {"status": "ok", "service": "zoohoots-backend"}


@router.get("/tickers")
def tickers():
    return {"tickers": get_tickers()}


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

        # Filter
        if item.unp_score < min_unp:
            continue
        if combo and item.combo != combo.lower():
            continue

        results.append(item)

    # Sort by UNP score descending
    results.sort(key=lambda x: x.unp_score, reverse=True)
    results = results[:limit]

    return ScreenAllResult(
        results = results,
        total   = len(results),
        scanned = scanned,
    )


# Refresh berjalan di background agar endpoint tidak timeout
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