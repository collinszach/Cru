#!/usr/bin/env python3
"""
Seed appellations from data/appellations.json.
Handles self-referential parent_id with a two-pass approach.

Usage: python -m scripts.seed_appellations
"""
import asyncio
import json
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text, update
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.config import get_settings
from app.models.appellation import Appellation
import uuid


async def seed_appellations() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    data_path = Path(__file__).parent.parent / "data" / "appellations.json"
    appellations_data = json.loads(data_path.read_text())

    slug_to_id: dict[str, str] = {}

    async with Session() as session:
        # Pass 1: insert all without parent_id
        for item in appellations_data:
            appellation_id = uuid.uuid4()
            slug_to_id[item["slug"]] = appellation_id
            obj = Appellation(
                id=appellation_id,
                slug=item["slug"],
                name=item["name"],
                appellation_type=item["appellation_type"],
                country_code=item["country_code"],
                country=item["country"],
                region=item.get("region"),
                sub_region=item.get("sub_region"),
                legal_classification=item.get("legal_classification"),
                climate=item.get("climate"),
                soil_types=item.get("soil_types", []),
                primary_grapes=item.get("primary_grapes", []),
                style_notes=item.get("style_notes"),
                vintage_notes=item.get("vintage_notes"),
                parent_id=None,  # set in pass 2
            )
            session.add(obj)
        await session.commit()
        print(f"Pass 1: inserted {len(appellations_data)} appellations")

        # Pass 2: set parent_id references
        updated = 0
        for item in appellations_data:
            parent_slug = item.get("parent_slug")
            if parent_slug and parent_slug in slug_to_id:
                await session.execute(
                    update(Appellation)
                    .where(Appellation.id == slug_to_id[item["slug"]])
                    .values(parent_id=slug_to_id[parent_slug])
                )
                updated += 1
        await session.commit()
        print(f"Pass 2: set {updated} parent relationships")

    await engine.dispose()
    print(f"Seeded {len(appellations_data)} appellations successfully.")


if __name__ == "__main__":
    asyncio.run(seed_appellations())
