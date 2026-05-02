"""
Nightly Wine-Searcher price sync task.
Registered with APScheduler to run at 02:00 UTC daily.

RULE: This is the ONLY place Wine-Searcher API is called.
Never call price_tracker from a router.
"""
import logging

from app.services.price_tracker import sync_cellar_prices

logger = logging.getLogger(__name__)


async def run_price_sync(db_session_factory) -> None:
    """Run nightly price sync. Called by APScheduler."""
    logger.info("Starting nightly Wine-Searcher price sync")
    try:
        summary = await sync_cellar_prices(db_session_factory)
        logger.info(
            "Price sync complete: updated=%d failed=%d skipped=%d",
            summary["updated"],
            summary["failed"],
            summary["skipped"],
        )
    except Exception:
        logger.exception("Price sync failed")
