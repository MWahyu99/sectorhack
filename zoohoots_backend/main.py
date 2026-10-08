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
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import os

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

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Mount API router ───────────────────────────────────────────────────────────
app.include_router(router)

# ── Startup log ───────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    log.info("Zoohoots backend started.")
    log.info("Docs: http://localhost:8000/docs")

# ── Serve React frontend (production) ─────────────────────────────────────────
FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "..", "zoohoots_frontend", "dist")

if os.path.exists(FRONTEND_BUILD):
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_BUILD, "assets")), name="assets")

    # Catch-all: semua route non-API dikembalikan ke index.html (React Router)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        index = os.path.join(FRONTEND_BUILD, "index.html")
        return FileResponse(index)