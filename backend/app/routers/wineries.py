import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.functions import ST_MakePoint, ST_SetSRID
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.winery import Winery

router = APIRouter(prefix="/api/v1/wineries", tags=["wineries"])

_VISIT_STATUSES = frozenset({"visited", "wishlist", "skip"})


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class WineryCreate(BaseModel):
    producer_id: Optional[uuid.UUID] = None
    name: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    website: Optional[str] = None
    tasting_room: bool = True
    visit_status: str = "wishlist"
    visited_at: Optional[date] = None
    visit_notes: Optional[str] = None
    visit_rating: Optional[int] = Field(None, ge=1, le=5)


class WineryUpdate(BaseModel):
    visit_status: Optional[str] = None
    visited_at: Optional[date] = None
    visit_notes: Optional[str] = None
    visit_rating: Optional[int] = Field(None, ge=1, le=5)
    address: Optional[str] = None
    website: Optional[str] = None
    tasting_room: Optional[bool] = None


class WineryRead(BaseModel):
    id: uuid.UUID
    producer_id: Optional[uuid.UUID]
    name: str
    address: Optional[str]
    website: Optional[str]
    tasting_room: bool
    visit_status: str
    visited_at: Optional[date]
    visit_notes: Optional[str]
    visit_rating: Optional[int]

    model_config = {"from_attributes": True}


class WineryMapItem(BaseModel):
    id: uuid.UUID
    name: str
    lat: Optional[float]
    lng: Optional[float]
    visit_status: str
    producer_name: Optional[str]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/map", response_model=list[WineryMapItem])
async def get_wineries_map(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WineryMapItem]:
    """
    Lightweight list for MapLibre markers: id, name, lat/lng, visit_status, producer.
    Uses ST_Y / ST_X to extract lat/lng from the PostGIS POINT.
    Only returns wineries with a location set.
    """
    sql = text("""
        SELECT
            w.id::text,
            w.name,
            w.visit_status,
            ST_Y(w.location::geometry) AS lat,
            ST_X(w.location::geometry) AS lng,
            p.name AS producer_name
        FROM wineries w
        LEFT JOIN producers p ON p.id = w.producer_id
        WHERE w.location IS NOT NULL
        ORDER BY w.name
    """)

    result = await db.execute(sql)
    rows = result.mappings().all()

    return [
        WineryMapItem(
            id=uuid.UUID(row["id"]),
            name=row["name"],
            lat=row["lat"],
            lng=row["lng"],
            visit_status=row["visit_status"],
            producer_name=row["producer_name"],
        )
        for row in rows
    ]


@router.get("", response_model=list[WineryRead])
async def list_wineries(
    visit_status: str | None = Query(
        None,
        description="Filter by visit status: visited | wishlist | skip | all (default: all)",
    ),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WineryRead]:
    stmt = (
        select(Winery)
        .options(selectinload(Winery.producer))
        .order_by(Winery.name)
        .limit(limit)
        .offset(offset)
    )

    if visit_status and visit_status != "all":
        if visit_status not in _VISIT_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"visit_status must be one of {_VISIT_STATUSES | {'all'}}",
            )
        stmt = stmt.where(Winery.visit_status == visit_status)

    result = await db.execute(stmt)
    wineries = result.scalars().all()
    return [WineryRead.model_validate(w) for w in wineries]


@router.post("", response_model=WineryRead, status_code=status.HTTP_201_CREATED)
async def create_winery(
    payload: WineryCreate,
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WineryRead:
    if payload.visit_status not in _VISIT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"visit_status must be one of {_VISIT_STATUSES}",
        )

    location = None
    if payload.lat is not None and payload.lng is not None:
        location = ST_SetSRID(ST_MakePoint(payload.lng, payload.lat), 4326)

    winery = Winery(
        producer_id=payload.producer_id,
        name=payload.name,
        location=location,
        address=payload.address,
        website=payload.website,
        tasting_room=payload.tasting_room,
        visit_status=payload.visit_status,
        visited_at=payload.visited_at,
        visit_notes=payload.visit_notes,
        visit_rating=payload.visit_rating,
    )
    db.add(winery)
    await db.flush()
    await db.refresh(winery)
    return WineryRead.model_validate(winery)


@router.put("/{winery_id}", response_model=WineryRead)
async def update_winery(
    winery_id: uuid.UUID,
    payload: WineryUpdate,
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WineryRead:
    winery = await _get_winery_or_404(winery_id, db)

    update_data = payload.model_dump(exclude_unset=True)

    if "visit_status" in update_data and update_data["visit_status"] not in _VISIT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"visit_status must be one of {_VISIT_STATUSES}",
        )

    for field, value in update_data.items():
        setattr(winery, field, value)

    await db.flush()
    await db.refresh(winery)
    return WineryRead.model_validate(winery)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_winery_or_404(winery_id: uuid.UUID, db: AsyncSession) -> Winery:
    stmt = select(Winery).where(Winery.id == winery_id)
    result = await db.execute(stmt)
    winery = result.scalar_one_or_none()
    if winery is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Winery not found",
        )
    return winery
