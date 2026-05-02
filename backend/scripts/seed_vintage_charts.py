#!/usr/bin/env python3
"""
Seed vintage quality data from data/vintage_quality.json.
Requires appellations to be seeded first (needs appellation slugs → IDs).

Usage: python -m scripts.seed_vintage_charts
"""
import asyncio
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.config import get_settings
from app.models.appellation import Appellation
from app.models.vintage_quality import VintageQuality


async def seed_vintage_charts() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    data_path = Path(__file__).parent.parent / "data" / "vintage_quality.json"
    vintage_data = json.loads(data_path.read_text())

    async with Session() as session:
        # Build slug → id mapping
        result = await session.execute(select(Appellation.slug, Appellation.id))
        slug_to_id = {row.slug: str(row.id) for row in result}

        inserted = 0
        skipped = 0
        for item in vintage_data:
            region_slug = item["region_slug"]
            appellation_id = slug_to_id.get(region_slug)
            if not appellation_id:
                print(f"  Warning: no appellation found for slug '{region_slug}', skipping")
                skipped += 1
                continue

            obj = VintageQuality(
                id=str(uuid.uuid4()),
                appellation_id=appellation_id,
                region_slug=region_slug,
                vintage=item["vintage"],
                score=item["score"],
                descriptor=item["descriptor"],
                drinking_from=item.get("drinking_from"),
                drinking_to=item.get("drinking_to"),
                notes=item.get("notes"),
                source="curated",
            )
            session.add(obj)
            inserted += 1

        await session.commit()
        print(f"Seeded {inserted} vintage records ({skipped} skipped — appellation not in DB).")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_vintage_charts())
