"""
Wine-Searcher price tracker.

RULE: This service is ONLY called from scheduled background tasks.
NEVER import and call this from a router or request handler.
Rate limit: Wine-Searcher API has strict limits — use exponential backoff.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def sync_cellar_prices(db_session_factory) -> dict:
    """
    Fetch current market prices for all wines in all users' cellars.
    Uses Wine-Searcher API (key from settings).

    Returns summary: {updated: N, failed: N, skipped: N}

    Rate limiting: max 1 req/sec, exponential backoff on 429.
    Only updates entries where value_updated is None or >7 days old.
    """
    from app.config import get_settings
    from app.models.cellar_entry import CellarEntry
    from app.models.wine import Wine

    settings = get_settings()
    if not settings.wine_searcher_api_key:
        logger.warning("Wine-Searcher API key not configured — skipping price sync")
        return {"updated": 0, "failed": 0, "skipped": 0, "reason": "no_api_key"}

    cutoff = datetime.now(timezone.utc) - timedelta(days=7)

    async with db_session_factory() as db:
        result = await db.execute(
            select(CellarEntry, Wine)
            .join(Wine, Wine.id == CellarEntry.wine_id)
            .where(CellarEntry.status == "in_cellar")
            .where(
                or_(
                    CellarEntry.value_updated.is_(None),
                    CellarEntry.value_updated < cutoff,
                )
            )
        )
        rows = result.all()

    if not rows:
        return {"updated": 0, "failed": 0, "skipped": 0}

    logger.info("Price sync: %d entries to update", len(rows))
    updated, failed, skipped = 0, 0, 0

    async with httpx.AsyncClient(timeout=10.0) as client:
        for entry, wine in rows:
            try:
                await asyncio.sleep(1.0)  # 1 req/sec rate limit

                response = await client.get(
                    "https://api.wine-searcher.com/api/v1/search",
                    params={
                        "api_key": settings.wine_searcher_api_key,
                        "name": wine.full_name,
                        "vintage": entry.vintage,
                        "format": "json",
                    },
                )

                if response.status_code == 429:
                    logger.warning(
                        "Wine-Searcher rate limit hit for %s %d — backing off 60s",
                        wine.full_name,
                        entry.vintage,
                    )
                    await asyncio.sleep(60)
                    failed += 1
                    continue

                if response.status_code != 200:
                    logger.warning(
                        "Wine-Searcher returned %d for %s %d",
                        response.status_code,
                        wine.full_name,
                        entry.vintage,
                    )
                    failed += 1
                    continue

                price = _extract_price(response.json())

                if price is not None:
                    async with db_session_factory() as db:
                        fresh_result = await db.execute(
                            select(CellarEntry).where(CellarEntry.id == entry.id)
                        )
                        fresh_entry = fresh_result.scalar_one_or_none()
                        if fresh_entry:
                            fresh_entry.current_value = price
                            fresh_entry.value_updated = datetime.now(timezone.utc)
                            await db.commit()
                    updated += 1
                else:
                    skipped += 1

            except Exception:
                logger.exception(
                    "Price sync failed for %s %d", wine.full_name, entry.vintage
                )
                failed += 1

    return {"updated": updated, "failed": failed, "skipped": skipped}


def _extract_price(data: dict) -> float | None:
    """Extract median price from Wine-Searcher response."""
    try:
        prices = data.get("results", [])
        if not prices:
            return None
        vals = sorted(
            p["price"] for p in prices if "price" in p and p["price"] > 0
        )
        if not vals:
            return None
        return float(vals[len(vals) // 2])
    except Exception:
        return None
