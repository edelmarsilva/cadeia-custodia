"""FastAPI Application — entry point."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db.database import dispose_engine
from app.db.seed import run_seed

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────
app.include_router(api_router)


# ── Lifecycle ────────────────────────────────────────────────
@app.on_event("startup")
async def startup() -> None:
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} iniciando...")
    await run_seed()
    logger.info("✅ Banco de dados pronto.")


@app.on_event("shutdown")
async def shutdown() -> None:
    await dispose_engine()
    logger.info("🔒 Engines encerrados.")


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}
