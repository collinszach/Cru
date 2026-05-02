from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from minio import Minio
from minio.error import S3Error
from sqlalchemy import text

from app.config import get_settings
from app.database import engine
from app.routers import cellar, discover, pairings, photos, producers, regions, stats, tasting, users, wines, wineries, wishlist
from app.tasks.scheduler import start_scheduler, stop_scheduler

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure pgvector and postgis extensions exist, create MinIO buckets
    async with engine.connect() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.commit()

    _ensure_minio_buckets()
    start_scheduler()

    yield

    # Shutdown
    stop_scheduler()
    await engine.dispose()


def _ensure_minio_buckets() -> None:
    client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=settings.minio_secure,
    )
    for bucket in (settings.minio_bucket_labels, settings.minio_bucket_photos):
        try:
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
        except S3Error as exc:
            # Log but don't crash startup — MinIO may not be reachable in CI
            import logging
            logging.getLogger(__name__).warning(
                "MinIO bucket setup failed for '%s': %s", bucket, exc
            )


app = FastAPI(
    title="Cru API",
    description="Personal wine intelligence — cellar, journal, discovery.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(cellar.router)
app.include_router(wines.router)
app.include_router(producers.router)
app.include_router(regions.router)
app.include_router(tasting.router)
app.include_router(photos.router)
app.include_router(stats.router)
app.include_router(discover.router)
app.include_router(wineries.router)
app.include_router(pairings.router)
app.include_router(wishlist.router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "service": "cru-backend"}
