"""
ORM factory helpers — build and persist test objects in the given session.

All factories flush (not commit) so objects are visible within the test
transaction but roll back automatically when the savepoint is rolled back.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appellation import Appellation
from app.models.cellar_entry import CellarEntry
from app.models.producer import Producer
from app.models.tasting_note import TastingNote
from app.models.user import User
from app.models.vintage_quality import VintageQuality
from app.models.wine import Wine


async def make_user(
    db: AsyncSession,
    user_id: str = "test_user_clerk_001",
    email: str = "test@example.com",
) -> User:
    user = User(id=user_id, email=email, display_name="Test User")
    db.add(user)
    await db.flush()
    return user


async def make_appellation(
    db: AsyncSession,
    name: str = "Gevrey-Chambertin",
    slug: str = "gevrey-chambertin",
    country: str = "France",
    country_code: str = "FR",
    region: str = "Burgundy",
    appellation_type: str = "village",
) -> Appellation:
    appellation = Appellation(
        id=uuid.uuid4(),
        name=name,
        slug=slug,
        country=country,
        country_code=country_code,
        region=region,
        appellation_type=appellation_type,
    )
    db.add(appellation)
    await db.flush()
    return appellation


async def make_producer(
    db: AsyncSession,
    name: str = "Domaine Rousseau",
    slug: str | None = None,
    country_code: str = "FR",
) -> Producer:
    producer = Producer(
        id=uuid.uuid4(),
        name=name,
        slug=slug or f"test-producer-{uuid.uuid4().hex[:8]}",
        country_code=country_code,
    )
    db.add(producer)
    await db.flush()
    return producer


async def make_wine(
    db: AsyncSession,
    name: str = "Chambertin Grand Cru",
    full_name: str = "Domaine Rousseau Chambertin Grand Cru",
    style: str = "Still",
    color: str = "red",
    slug: str | None = None,
    producer_id: uuid.UUID | None = None,
    appellation_id: uuid.UUID | None = None,
) -> Wine:
    wine = Wine(
        id=uuid.uuid4(),
        name=name,
        full_name=full_name,
        style=style,
        color=color,
        slug=slug or f"test-wine-{uuid.uuid4().hex[:8]}",
        producer_id=producer_id,
        appellation_id=appellation_id,
    )
    db.add(wine)
    await db.flush()
    return wine


async def make_cellar_entry(
    db: AsyncSession,
    user_id: str,
    wine_id: uuid.UUID,
    vintage: int = 2018,
    quantity: int = 6,
    purchase_price: float | None = 120.0,
    status: str = "in_cellar",
) -> CellarEntry:
    entry = CellarEntry(
        id=uuid.uuid4(),
        user_id=user_id,
        wine_id=wine_id,
        vintage=vintage,
        quantity=quantity,
        purchase_price=purchase_price,
        status=status,
    )
    db.add(entry)
    await db.flush()
    return entry


async def make_vintage_quality(
    db: AsyncSession,
    region_slug: str,
    vintage: int = 2015,
    score: int = 95,
    descriptor: str = "exceptional",
    appellation_id: uuid.UUID | None = None,
    drinking_from: int | None = None,
    drinking_to: int | None = None,
    notes: str | None = None,
    source: str = "curated",
) -> VintageQuality:
    vq = VintageQuality(
        id=uuid.uuid4(),
        region_slug=region_slug,
        vintage=vintage,
        score=score,
        descriptor=descriptor,
        appellation_id=appellation_id,
        drinking_from=drinking_from,
        drinking_to=drinking_to,
        notes=notes,
        source=source,
    )
    db.add(vq)
    await db.flush()
    return vq


async def make_tasting_note(
    db: AsyncSession,
    user_id: str,
    wine_id: uuid.UUID | None = None,
    vintage: int = 2018,
    tasted_at: datetime | None = None,
    personal_score: float | None = 94.0,
    created_at: datetime | None = None,
    is_blind: bool = False,
) -> TastingNote:
    note = TastingNote(
        id=uuid.uuid4(),
        user_id=user_id,
        wine_id=wine_id,
        vintage=vintage,
        tasted_at=tasted_at or datetime.now(timezone.utc),
        personal_score=personal_score,
        amendments=[],
        is_blind=is_blind,
    )
    db.add(note)
    await db.flush()
    # If caller wants a specific created_at, use raw SQL to bypass server_default
    if created_at is not None:
        from sqlalchemy import text
        await db.execute(
            text("UPDATE tasting_notes SET created_at = :ts WHERE id = :id"),
            {"ts": created_at, "id": note.id},
        )
        await db.flush()
        await db.refresh(note)
    return note
