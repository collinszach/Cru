import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.appellation import Appellation
from app.models.producer import Producer
from app.models.tasting_note import TastingNote
from app.models.vintage_quality import VintageQuality
from app.models.wine import Wine
from app.schemas.common import PaginatedResponse
from app.schemas.wine import WineCreate, WineRead, WineSearch

router = APIRouter(prefix="/api/v1/wines", tags=["wines"])


class WineAutocomplete(BaseModel):
    id: uuid.UUID
    full_name: str
    producer_name: str | None
    appellation_name: str | None
    style: str
    color: str | None


@router.get("/autocomplete", response_model=list[WineAutocomplete])
async def autocomplete_wines(
    q: str = Query(..., min_length=1, description="Partial name to match"),
    limit: int = Query(10, le=25),
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WineAutocomplete]:
    """
    Lightweight autocomplete for wine name dropdowns.
    Matches on Wine.full_name, Wine.name, and the joined Producer.name.
    Returns minimal shape — never the full WineRead payload.
    """
    pattern = f"%{q}%"
    stmt = (
        select(Wine)
        .options(
            selectinload(Wine.producer),
            selectinload(Wine.appellation),
        )
        .where(
            or_(
                Wine.full_name.ilike(pattern),
                Wine.name.ilike(pattern),
            )
        )
        .order_by(Wine.full_name)
        .limit(limit)
    )
    result = await db.execute(stmt)
    wines = result.scalars().all()
    return [
        WineAutocomplete(
            id=w.id,
            full_name=w.full_name,
            producer_name=w.producer.name if w.producer else None,
            appellation_name=w.appellation.name if w.appellation else None,
            style=w.style,
            color=w.color,
        )
        for w in wines
    ]


@router.get("/search", response_model=list[WineRead])
async def search_wines_filtered(
    q: str | None = Query(None, description="Full-text search on name / full_name"),
    style: str | None = Query(None),
    appellation_slug: str | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WineRead]:
    """
    Full filtered wine search. Distinct from GET /wines which preserves the
    original broad query; this endpoint supports appellation_slug filtering
    via a join to appellations.
    """
    stmt = (
        select(Wine)
        .options(
            selectinload(Wine.producer),
            selectinload(Wine.appellation),
        )
        .order_by(Wine.full_name)
        .limit(limit)
        .offset(offset)
    )

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Wine.name.ilike(pattern),
                Wine.full_name.ilike(pattern),
            )
        )
    if style:
        stmt = stmt.where(Wine.style == style)
    if appellation_slug:
        stmt = stmt.join(Appellation, Wine.appellation_id == Appellation.id).where(
            Appellation.slug == appellation_slug
        )

    result = await db.execute(stmt)
    wines = result.scalars().all()
    return [WineRead.model_validate(w) for w in wines]


@router.get("", response_model=PaginatedResponse[WineRead])
async def search_wines(
    query: str | None = Query(None, alias="query", description="Full-text search on name, full_name"),
    q: str | None = Query(None, description="Alias for query"),
    style: str | None = Query(None),
    color: str | None = Query(None),
    appellation_slug: str | None = Query(None),
    producer_slug: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    # Legacy limit/offset params — honoured when present
    limit: int | None = Query(None, le=100),
    offset: int | None = Query(None, ge=0),
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[WineRead]:
    # Support both `query` and `q` param names; `query` takes precedence
    search_term = query or q

    base = select(Wine)
    if search_term:
        pattern = f"%{search_term}%"
        base = base.where(
            or_(
                Wine.name.ilike(pattern),
                Wine.full_name.ilike(pattern),
            )
        )
    if style:
        base = base.where(Wine.style == style)
    if color:
        base = base.where(Wine.color == color)
    if appellation_slug:
        base = base.join(Appellation, Wine.appellation_id == Appellation.id).where(
            Appellation.slug == appellation_slug
        )
    if producer_slug:
        base = base.join(Producer, Wine.producer_id == Producer.id).where(
            Producer.slug == producer_slug
        )

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    # Legacy limit/offset takes precedence over page/per_page when provided
    if limit is not None:
        eff_limit = limit
        eff_offset = offset or 0
    else:
        eff_limit = per_page
        eff_offset = (page - 1) * per_page

    stmt = (
        base
        .options(
            selectinload(Wine.producer),
            selectinload(Wine.appellation),
        )
        .order_by(Wine.full_name)
        .limit(eff_limit)
        .offset(eff_offset)
    )

    result = await db.execute(stmt)
    wines = result.scalars().all()
    items = [WineRead.model_validate(w) for w in wines]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page if limit is None else (eff_offset // eff_limit + 1),
        per_page=eff_limit,
        has_more=(eff_offset + eff_limit) < total,
    )


class VintageChartEntry(BaseModel):
    vintage: int
    score: int | None
    descriptor: str | None
    drinking_from: int | None
    drinking_to: int | None
    notes: str | None
    source: str
    user_notes: int  # count of this user's tasting notes for this vintage


@router.get("/{wine_id}/vintages", response_model=list[VintageChartEntry])
async def get_wine_vintages(
    wine_id: uuid.UUID,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[VintageChartEntry]:
    """
    Return vintage quality chart entries for a wine's appellation, annotated with
    how many tasting notes the current user has for each vintage of this wine.

    Only returns vintages that appear in the vintage_quality table for the wine's
    appellation. If the wine has no appellation, returns an empty list.
    """
    # Look up the wine's appellation slug
    wine_result = await db.execute(
        select(Wine)
        .where(Wine.id == wine_id)
        .options(selectinload(Wine.appellation))
    )
    wine = wine_result.scalar_one_or_none()
    if wine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wine not found")

    if wine.appellation is None:
        return []

    region_slug = wine.appellation.slug

    # Fetch vintage quality rows for the appellation
    vq_result = await db.execute(
        select(VintageQuality)
        .where(VintageQuality.region_slug == region_slug)
        .order_by(VintageQuality.vintage.desc())
    )
    vq_rows = vq_result.scalars().all()

    if not vq_rows:
        return []

    # Count user's tasting notes per vintage for this wine
    note_counts_result = await db.execute(
        select(TastingNote.vintage, func.count(TastingNote.id))
        .where(TastingNote.wine_id == wine_id)
        .where(TastingNote.user_id == user_id)
        .group_by(TastingNote.vintage)
    )
    note_counts: dict[int, int] = {row[0]: row[1] for row in note_counts_result.all()}

    return [
        VintageChartEntry(
            vintage=vq.vintage,
            score=vq.score,
            descriptor=vq.descriptor,
            drinking_from=vq.drinking_from,
            drinking_to=vq.drinking_to,
            notes=vq.notes,
            source=vq.source,
            user_notes=note_counts.get(vq.vintage, 0),
        )
        for vq in vq_rows
    ]


@router.get("/{wine_id}", response_model=WineRead)
async def get_wine(
    wine_id: uuid.UUID,
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WineRead:
    stmt = (
        select(Wine)
        .where(Wine.id == wine_id)
        .options(
            selectinload(Wine.producer),
            selectinload(Wine.appellation),
        )
    )
    result = await db.execute(stmt)
    wine = result.scalar_one_or_none()
    if wine is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wine not found",
        )
    return WineRead.model_validate(wine)


@router.post("", response_model=WineRead, status_code=status.HTTP_201_CREATED)
async def create_wine(
    payload: WineCreate,
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WineRead:
    # Guard against duplicate slugs
    existing = await db.execute(select(Wine).where(Wine.slug == payload.slug))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Wine with slug '{payload.slug}' already exists",
        )

    wine = Wine(**payload.model_dump())
    db.add(wine)
    await db.flush()
    await db.refresh(wine)
    return WineRead.model_validate(wine)
