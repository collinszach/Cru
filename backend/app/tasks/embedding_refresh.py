"""
Scheduled task: refresh wine embeddings for wines that have received new tasting
notes since their most recent global embedding was generated.

Scheduled: every 6 hours via APScheduler (registered in scheduler.py).

Design (Raj + Sofia):
- Only global embeddings (user_id IS NULL) are refreshed here.
  Personalized embeddings are built on-demand in the recommendations path.
- IMMUTABILITY: always INSERTs a new wine_embeddings row — never UPDATEs.
- A wine qualifies for refresh when its latest tasting note post-dates its
  latest global embedding (or when it has no global embedding at all).
- Rate-limited to 5 concurrent OpenAI calls to stay within tier limits.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.tasting_note import TastingNote
from app.models.wine import Wine
from app.models.wine_embedding import WineEmbedding
from app.services.embedding import generate_wine_embedding

logger = logging.getLogger(__name__)

# Maximum number of concurrent OpenAI embedding calls
_CONCURRENCY = 5


async def _get_stale_wine_ids(db: AsyncSession) -> list[str]:
    """
    Return IDs of wines where:
    - The wine has at least one tasting note, AND
    - The latest note was created AFTER the latest global embedding (or no embedding exists).
    """
    result = await db.execute(
        text(
            """
            SELECT w.id::text
            FROM wines w
            INNER JOIN tasting_notes tn ON tn.wine_id = w.id
            LEFT JOIN (
                SELECT wine_id, MAX(created_at) AS latest_embedded_at
                FROM wine_embeddings
                WHERE user_id IS NULL
                GROUP BY wine_id
            ) latest_emb ON latest_emb.wine_id = w.id
            GROUP BY w.id, latest_emb.latest_embedded_at
            HAVING MAX(tn.created_at) > COALESCE(latest_emb.latest_embedded_at, '1970-01-01')
            """
        )
    )
    return [row[0] for row in result.fetchall()]


async def _refresh_wine(wine_id: str, semaphore: asyncio.Semaphore) -> None:
    """
    Fetch a wine with its notes and producer/appellation joins, then generate
    a fresh global embedding. Uses its own DB session per wine to avoid long
    transactions across the full refresh batch.
    """
    async with semaphore:
        async with AsyncSessionLocal() as db:
            try:
                # Load the wine with all relationships needed for embedding text
                wine_result = await db.execute(
                    select(Wine)
                    .where(Wine.id == wine_id)
                    .options(
                        *_wine_load_options(),
                    )
                )
                wine = wine_result.scalar_one_or_none()
                if wine is None:
                    logger.warning("Wine %s not found during embedding refresh", wine_id)
                    return

                # Load all tasting notes for this wine (for descriptor aggregation)
                notes_result = await db.execute(
                    select(TastingNote).where(TastingNote.wine_id == wine_id)
                )
                notes = list(notes_result.scalars().all())

                # Fetch vintage descriptor from vintage_quality if available
                # (uses the appellation slug + a representative vintage)
                vintage_descriptor: str | None = await _get_vintage_descriptor(
                    wine, notes, db
                )

                await generate_wine_embedding(
                    wine=wine,
                    db=db,
                    user_id=None,  # global embedding
                    notes=notes,
                    vintage_descriptor=vintage_descriptor,
                )
                logger.info(
                    "Refreshed global embedding for wine %s (%s)",
                    wine_id,
                    wine.full_name,
                )
            except Exception:
                logger.exception(
                    "Failed to refresh embedding for wine %s", wine_id
                )


def _wine_load_options() -> list[Any]:
    """SQLAlchemy load options for Wine with producer and appellation."""
    from sqlalchemy.orm import selectinload

    return [
        selectinload(Wine.producer),
        selectinload(Wine.appellation),
    ]


async def _get_vintage_descriptor(
    wine: Wine,
    notes: list[TastingNote],
    db: AsyncSession,
) -> str | None:
    """
    Look up the vintage quality descriptor for the most common vintage in the notes.
    Returns None if the wine has no notes or no matching vintage_quality row.
    """
    if not notes or not wine.appellation:
        return None

    from collections import Counter

    vintages = [n.vintage for n in notes if n.vintage]
    if not vintages:
        return None

    most_common_vintage = Counter(vintages).most_common(1)[0][0]

    result = await db.execute(
        text(
            """
            SELECT descriptor
            FROM vintage_quality
            WHERE region_slug = :slug
              AND vintage = :vintage
            LIMIT 1
            """
        ),
        {"slug": wine.appellation.slug, "vintage": most_common_vintage},
    )
    row = result.fetchone()
    return row[0] if row else None


async def refresh_stale_embeddings(db_factory: Any = None) -> None:
    """
    Entry point called by APScheduler every 6 hours.

    `db_factory` is unused — each wine gets its own session via AsyncSessionLocal.
    The parameter exists for APScheduler job compatibility.
    """
    logger.info("Starting stale embedding refresh scan")

    async with AsyncSessionLocal() as db:
        stale_ids = await _get_stale_wine_ids(db)

    if not stale_ids:
        logger.info("No stale embeddings found")
        return

    logger.info("Found %d wines needing embedding refresh", len(stale_ids))

    semaphore = asyncio.Semaphore(_CONCURRENCY)
    tasks = [_refresh_wine(wine_id, semaphore) for wine_id in stale_ids]
    await asyncio.gather(*tasks, return_exceptions=True)

    logger.info("Embedding refresh complete — processed %d wines", len(stale_ids))
