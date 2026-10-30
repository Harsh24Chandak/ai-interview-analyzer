"""FastAPI Main Application Entry Point for AI Interview Analyzer."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.connection import init_db
from app.api import auth, resume, jobs, interviews, analytics

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Full-Stack AI Interview Preparation Platform powered by FastAPI, SQLite/PostgreSQL, "
        "Pydantic, and Google Gemini AI with transparent deterministic fallback support."
    ),
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


# Ensure DB is initialized even if imported directly by TestClient without startup lifecycle
init_db()

app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(resume.router, prefix=settings.API_PREFIX)
app.include_router(jobs.router, prefix=settings.API_PREFIX)
app.include_router(interviews.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)


@app.get("/api/health", tags=["System Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_provider_mode": "gemini_live" if settings.is_live_ai_configured else "deterministic_fallback_engine",
        "gemini_configured": settings.is_live_ai_configured,
        "database": "sqlite_initialized",
    }
