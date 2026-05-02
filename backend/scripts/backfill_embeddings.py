#!/usr/bin/env python3
"""
Generate global embeddings for all wines that don't have one yet.

Run after seeding the wines table or after switching embedding model versions.
Safe to re-run: skips wines that already have a global embedding at the current
model version (EMBEDDING_MODEL). Always inserts new rows — never updates.

Usage:
    python -m scripts.backfill_embeddings
    python -m scripts.backfill_embeddings --dry-run
    python -m scripts.backfill_embeddings --force   # re-embed even if current version exists

Rate limited: max 10 concurrent OpenAI calls with 100ms inter-batch delay.
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from collections import Counter

from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

# Make sure the app package is importable when running as a script
sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from app.models.tasting_note import TastingNote
from app.models.wine import Wine
from app.services.embedding import EMBEDDING_MODEL, generate_wine_embedding

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("backfill_embeddings")

_CONCURRENCY = 10
_INTER_BATCH_DELAY_S = 0.1


async def _fetch_wine_ids_needing_embedding(force: bool) -> list[str]:
    """
    Return IDs of wines that need a global embedding.

    If force=False: wines with no global embedding at the current model version.
    If force=True:  all wines (re-embed everything).
    """
    async with AsyncSessionLocal() as db:
        if force:
            result = await db.execute(select(Wine.id))
            return [str(row[0]) for row in result.fetchall()]

        result = await db.execute(
            text(
                """
                SELECT w.id::text
                FROM wines w
                WHERE NOT EXISTS (
                    SELECT 1 FROM wine_embeddings we
                    WHERE we.wine_id = w.id
                      AND we.user_id IS NULL
                      AND we.model_version = :model_version
                )
                ORDER BY w.created_at ASC
                """
            ),
            {"model_version": EMBEDDING_MODEL},
        )
        return [row[0] for row in result.fetchall()]


async def _embed_one(
    wine_id: str,
    semaphore: asyncio.Semaphore,
    dry_run: bool,
    stats: Counter,
) -> None:
    """
    Load a wine with its notes and appellation, build and store its global embedding.
    Uses an independent DB session per wine.
    """
    async with semaphore:
        async with AsyncSessionLocal() as db:
            try:
                wine_result = await db.execute(
                    select(Wine)
                    .where(Wine.id == wine_id)
                    .options(
                        selectinload(Wine.producer),
                        selectinload(Wine.appellation),
                    )
                )
                wine = wine_result.scalar_one_or_none()
                if wine is None:
                    logger.warning("Wine %s not found — skipping", wine_id)
                    stats["skipped"] += 1
                    return

                notes_result = await db.execute(
                    select(TastingNote).where(TastingNote.wine_id == wine_id)
                )
                notes = list(notes_result.scalars().all())

                # Fetch vintage descriptor if available
                vintage_descriptor: str | None = None
                if notes and wine.appellation:
                    vintages = [n.vintage for n in notes if n.vintage]
                    if vintages:
                        most_common = Counter(vintages).most_common(1)[0][0]
                        desc_result = await db.execute(
                            text(
                                """
                                SELECT descriptor
                                FROM vintage_quality
                                WHERE region_slug = :slug AND vintage = :vintage
                                LIMIT 1
                                """
                            ),
                            {"slug": wine.appellation.slug, "vintage": most_common},
                        )
                        row = desc_result.fetchone()
                        vintage_descriptor = row[0] if row else None

                if dry_run:
                    logger.info(
                        "[dry-run] Would embed: %s (notes=%d)",
                        wine.full_name,
                        len(notes),
                    )
                    stats["dry_run"] += 1
                    return

                await generate_wine_embedding(
                    wine=wine,
                    db=db,
                    user_id=None,
                    notes=notes if notes else None,
                    vintage_descriptor=vintage_descriptor,
                )
                logger.info("Embedded: %s (notes=%d)", wine.full_name, len(notes))
                stats["embedded"] += 1

            except Exception:
                logger.exception("Failed to embed wine %s", wine_id)
                stats["failed"] += 1


async def main(dry_run: bool, force: bool) -> None:
    logger.info(
        "Backfill starting — model=%s dry_run=%s force=%s",
        EMBEDDING_MODEL,
        dry_run,
        force,
    )

    wine_ids = await _fetch_wine_ids_needing_embedding(force=force)
    total = len(wine_ids)

    if total == 0:
        logger.info("All wines already have embeddings at model=%s", EMBEDDING_MODEL)
        return

    logger.info("%d wines to embed", total)

    stats: Counter = Counter()
    semaphore = asyncio.Semaphore(_CONCURRENCY)

    # Process in batches so we can insert the inter-batch delay
    batch_size = _CONCURRENCY
    for batch_start in range(0, total, batch_size):
        batch = wine_ids[batch_start : batch_start + batch_size]
        tasks = [_embed_one(wid, semaphore, dry_run, stats) for wid in batch]
        await asyncio.gather(*tasks, return_exceptions=True)

        completed = min(batch_start + batch_size, total)
        logger.info("Progress: %d / %d", completed, total)

        if batch_start + batch_size < total:
            await asyncio.sleep(_INTER_BATCH_DELAY_S)

    logger.info(
        "Backfill complete — embedded=%d skipped=%d failed=%d dry_run=%d",
        stats["embedded"],
        stats["skipped"],
        stats["failed"],
        stats["dry_run"],
    )

    if stats["failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill global wine embeddings")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be embedded without calling OpenAI or writing to DB",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-embed all wines even if they already have a current-model embedding",
    )
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run, force=args.force))
