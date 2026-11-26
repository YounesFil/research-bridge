"""ResearchBridge API application."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import fetch_one
from app.routers import bridge, collections, insights, notes, papers

app = FastAPI(
    title="ResearchBridge API",
    version="0.1.0",
    description="Explore citation connections between scientific papers.",
)

# Open CORS for local development; restrict allow_origins before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(papers.router)
app.include_router(bridge.router)
app.include_router(collections.router)
app.include_router(notes.router)
app.include_router(insights.router)


@app.get("/", tags=["meta"])
def root():
    return {"name": "ResearchBridge API", "docs": "/docs", "health": "/health"}


@app.get("/health", tags=["meta"])
def health():
    try:
        fetch_one("SELECT 1 AS ok")
        database = "connected"
    except Exception:
        database = "unavailable"
    return {"status": "ok", "database": database}
