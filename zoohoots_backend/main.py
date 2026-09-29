"""
main.py
Entry point FastAPI untuk Zoohoots backend.

Jalankan dev:
  uvicorn main:app --reload --port 8000

Jalankan production:
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from api.routes import router

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("main")

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title       = "Zoohoots API",
    description = "Phase Intelligence Screener untuk IDX LQ45 — Sectors Hackathon 2026",
    version     = "0.1.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

# ── CORS (izinkan React frontend dari mana saja saat dev) ─────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],   # ganti ke domain prod sebelum deploy
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Mount router ───────────────────────────────────────────────────────────────
app.include_router(router)

# ── Startup log ───────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    log.info("Zoohoots backend started.")
    log.info("Docs: http://localhost:8000/docs")