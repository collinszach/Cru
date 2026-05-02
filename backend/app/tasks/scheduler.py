"""
Background task scheduler using APScheduler.
Active jobs: embedding refresh (every 6h).
Price sync removed — portfolio values use purchase_price, no external pricing API.
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    """Start the scheduler. Called from FastAPI lifespan."""
    if not scheduler.running:
        _register_jobs()
        scheduler.start()


def stop_scheduler() -> None:
    """Graceful shutdown. Called from FastAPI lifespan."""
    if scheduler.running:
        scheduler.shutdown(wait=False)


def _register_jobs() -> None:
    """Register all APScheduler jobs. Called once at startup."""
    from app.tasks.embedding_refresh import refresh_stale_embeddings

    # Refresh global wine embeddings for wines with new notes.
    # Runs every 6 hours: 00:00, 06:00, 12:00, 18:00
    scheduler.add_job(
        refresh_stale_embeddings,
        trigger=CronTrigger(hour="0,6,12,18", minute=0),
        id="embedding_refresh",
        name="Refresh stale wine embeddings",
        replace_existing=True,
        misfire_grace_time=300,
    )
