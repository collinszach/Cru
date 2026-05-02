"""
Cellar router — all endpoints are scoped strictly to the authenticated user.
CRITICAL: Every DB query MUST include a user_id filter. Never expose one user's
          data to another user. This is enforced at the ORM layer, not just trust.
"""
import uuid
from datetime import date, datetime, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.dependencies import get_redis_or_none
from app.models.appellation import Appellation
from app.models.cellar_entry import CellarEntry
from app.models.wine import Wine
from app.schemas.cellar import (
    CellarEntryCreate,
    CellarEntryRead,
    CellarEntryUpdate,
    ConsumeRequest,
    ConsumeResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/cellar", tags=["cellar"])


@router.get("", response_model=PaginatedResponse[CellarEntryRead])
async def list_cellar(
    status: str | None = Query(None, description="Filter by status: in_cellar|consumed|gifted|lost|sold"),
    region_slug: str | None = Query(None),
    style: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, le=200),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CellarEntryRead]:
    base = select(CellarEntry).where(CellarEntry.user_id == user_id)
    if status and status != "all":
        base = base.where(CellarEntry.status == status)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    stmt = (
        base
        .options(
            selectinload(CellarEntry.wine).selectinload(Wine.producer),
            selectinload(CellarEntry.wine).selectinload(Wine.appellation),
        )
        .order_by(CellarEntry.created_at.desc())
        .limit(per_page)
        .offset((page - 1) * per_page)
    )

    from app.services.drinking_window import calculate_drinking_window

    result = await db.execute(stmt)
    entries = result.scalars().all()
    items = []
    for e in entries:
        read = CellarEntryRead.model_validate(e)
        if e.status == "in_cellar" and e.wine and e.wine.appellation:
            try:
                window = calculate_drinking_window(e.wine.appellation.slug, e.vintage)
                read.drinking_window_status = window["status"]
                read.drink_recommendation = window["recommendation"]
            except Exception:
                pass
        items.append(read)
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(page * per_page) < total,
    )


@router.post("", response_model=CellarEntryRead, status_code=status.HTTP_201_CREATED)
async def add_bottle(
    payload: CellarEntryCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis | None = Depends(get_redis_or_none),
) -> CellarEntryRead:
    entry = CellarEntry(
        user_id=user_id,
        **payload.model_dump(),
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    if redis_client is not None:
        await redis_client.delete(f"geojson:{user_id}")

    return CellarEntryRead.model_validate(entry)


@router.put("/{entry_id}", response_model=CellarEntryRead)
async def update_bottle(
    entry_id: uuid.UUID,
    payload: CellarEntryUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CellarEntryRead:
    entry = await _get_entry_or_404(entry_id, user_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.flush()
    await db.refresh(entry)
    return CellarEntryRead.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_bottle(
    entry_id: uuid.UUID,
    final_status: str = Query(
        "consumed",
        description="How to mark the bottle: consumed|gifted|lost|sold",
    ),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis | None = Depends(get_redis_or_none),
) -> None:
    allowed = {"consumed", "gifted", "lost", "sold"}
    if final_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"final_status must be one of {allowed}",
        )

    entry = await _get_entry_or_404(entry_id, user_id, db)
    entry.status = final_status
    if final_status == "consumed":
        entry.consumed_at = datetime.now(timezone.utc)
    await db.flush()

    if redis_client is not None:
        await redis_client.delete(f"geojson:{user_id}")


@router.post("/{entry_id}/consume", response_model=ConsumeResponse)
async def consume_bottle(
    entry_id: uuid.UUID,
    payload: ConsumeRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConsumeResponse:
    """
    Decrement inventory. When quantity reaches 0, marks entry as consumed.
    """
    entry = await _get_entry_or_404(entry_id, user_id, db)

    if entry.status != "in_cellar":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot consume a bottle with status '{entry.status}'",
        )
    if payload.quantity > entry.quantity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot consume {payload.quantity} bottles; only {entry.quantity} in cellar",
        )

    consumed_at = payload.consumed_at or datetime.now(timezone.utc)
    entry.quantity -= payload.quantity

    if entry.quantity == 0:
        entry.status = "consumed"
        entry.consumed_at = consumed_at

    await db.flush()
    await db.refresh(entry)

    return ConsumeResponse(
        cellar_entry_id=entry.id,
        quantity_remaining=entry.quantity,
        status=entry.status,
        consumed_at=consumed_at,
    )


@router.get("/value")
async def portfolio_value(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Portfolio value summary based on purchase_price.
    Breakdowns by region and style reflect what you paid, not market value.
    """
    result = await db.execute(
        select(CellarEntry, Wine, Appellation)
        .join(Wine, Wine.id == CellarEntry.wine_id)
        .outerjoin(Appellation, Appellation.id == Wine.appellation_id)
        .where(CellarEntry.user_id == user_id)
        .where(CellarEntry.status == "in_cellar")
    )
    rows = result.all()

    if not rows:
        return {
            "total_value": 0.0,
            "bottle_count": 0,
            "by_region": [],
            "by_style": [],
            "top_bottles": [],
            "currency": "USD",
        }

    total = 0.0
    bottle_count = 0
    region_buckets: dict[str, float] = {}
    style_buckets: dict[str, float] = {}
    top_candidates: list[dict] = []

    for entry, wine, appellation in rows:
        qty = entry.quantity or 1
        cost = float(entry.purchase_price or 0) * qty

        total += cost
        bottle_count += qty

        region_label = (
            appellation.region or appellation.name
            if appellation
            else "Unknown"
        )
        region_buckets[region_label] = region_buckets.get(region_label, 0.0) + cost
        style_buckets[wine.style] = style_buckets.get(wine.style, 0.0) + cost

        if entry.purchase_price:
            top_candidates.append({
                "wine": wine.full_name,
                "vintage": entry.vintage,
                "value_per_bottle": float(entry.purchase_price),
                "quantity": qty,
                "total_value": float(entry.purchase_price) * qty,
            })

    by_region = [
        {"region": r, "value": round(v, 2), "pct": round(v / total * 100, 1) if total else 0.0}
        for r, v in sorted(region_buckets.items(), key=lambda x: x[1], reverse=True)
    ]
    by_style = [
        {"style": s, "value": round(v, 2), "pct": round(v / total * 100, 1) if total else 0.0}
        for s, v in sorted(style_buckets.items(), key=lambda x: x[1], reverse=True)
    ]
    top_bottles = sorted(top_candidates, key=lambda x: x["total_value"], reverse=True)[:10]

    return {
        "total_value": round(total, 2),
        "bottle_count": bottle_count,
        "by_region": by_region,
        "by_style": by_style,
        "top_bottles": top_bottles,
        "currency": "USD",
    }


@router.get("/optimize")
async def cellar_optimize(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis | None = Depends(get_redis_or_none),
) -> dict:
    """
    Claude-powered cellar optimization advice. Cached 24h per user.
    Uses the CELLAR_OPTIMIZER_PROMPT from CLAUDE.md verbatim.
    """
    from app.services.cellar_optimizer import get_cellar_optimization

    return await get_cellar_optimization(user_id, db, redis_client)


@router.get("/calendar", response_model=list[CellarEntryRead])
async def drinking_calendar(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CellarEntryRead]:
    """
    Flat list of in-cellar entries with drinking_window_status and
    drink_recommendation computed and injected. The frontend groups
    entries into buckets (urgent / this_year / approaching / hold) by
    filtering on drinking_window_status.
    """
    from app.services.drinking_window import calculate_drinking_window

    result = await db.execute(
        select(CellarEntry)
        .options(
            selectinload(CellarEntry.wine).selectinload(Wine.producer),
            selectinload(CellarEntry.wine).selectinload(Wine.appellation),
        )
        .where(CellarEntry.user_id == user_id)
        .where(CellarEntry.status == "in_cellar")
        .order_by(CellarEntry.vintage.asc())
    )
    entries = result.scalars().all()

    current_year = date.today().year
    output: list[CellarEntryRead] = []
    for entry in entries:
        wine = entry.wine
        appellation_slug = wine.appellation.slug if (wine and wine.appellation) else "default"
        window = calculate_drinking_window(
            appellation_slug=appellation_slug,
            vintage=entry.vintage,
            current_year=current_year,
        )
        read = CellarEntryRead.model_validate(entry)
        read.drinking_window_status = window["status"]
        read.drink_recommendation = window["recommendation"]
        # Preserve window years even if entry doesn't have them stored
        if read.drink_from is None:
            read.drink_from = window.get("drink_from")
        if read.drink_by is None:
            read.drink_by = window.get("drink_by")
        output.append(read)

    return output


async def _get_entry_or_404(
    entry_id: uuid.UUID,
    user_id: str,
    db: AsyncSession,
) -> CellarEntry:
    """
    Fetch a cellar entry belonging to user_id.
    Raises 404 if not found OR if it belongs to a different user — never leak existence.
    """
    stmt = select(CellarEntry).where(
        CellarEntry.id == entry_id,
        CellarEntry.user_id == user_id,  # CRITICAL: user isolation
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cellar entry not found",
        )
    return entry
