import json
import uuid
from typing import Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.dependencies import get_redis_or_none
from app.models.appellation import Appellation
from app.models.tasting_note import TastingNote
from app.models.vintage_quality import VintageQuality
from app.models.wine import Wine
from app.schemas.appellation import AppellationRead
from app.schemas.wine import WineRead

router = APIRouter(prefix="/api/v1/regions", tags=["regions"])


@router.get("/geojson")
async def get_regions_geojson(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis | None = Depends(get_redis_or_none),
) -> Response:
    """
    GeoJSON FeatureCollection of all appellations with per-user status.
    Cached in Redis 1 hour per user (key: geojson:{user_id}).
    Appellations without geometry are still included (geometry: null).
    Target: < 2MB total, < 500ms uncached.
    """
    cache_key = f"geojson:{user_id}"

    if redis_client is not None:
        cached = await redis_client.get(cache_key)
        if cached:
            return Response(content=cached, media_type="application/geo+json")

    sql = text("""
        WITH user_cellar AS (
            SELECT w.appellation_id, COUNT(*) AS bottle_count
            FROM cellar_entries ce
            JOIN wines w ON w.id = ce.wine_id
            WHERE ce.user_id = :user_id AND ce.status = 'in_cellar'
            GROUP BY w.appellation_id
        ),
        user_notes AS (
            SELECT w.appellation_id,
                   COUNT(*) AS note_count,
                   AVG(tn.personal_score) AS avg_score
            FROM tasting_notes tn
            JOIN wines w ON w.id = tn.wine_id
            WHERE tn.user_id = :user_id
            GROUP BY w.appellation_id
        ),
        user_wishlist AS (
            SELECT w.appellation_id, COUNT(*) AS wish_count
            FROM wishlist wl
            JOIN wines w ON w.id = wl.wine_id
            WHERE wl.user_id = :user_id
            GROUP BY w.appellation_id
        )
        SELECT
            a.id::text,
            a.slug,
            a.name,
            a.country,
            a.country_code,
            a.region,
            a.appellation_type,
            a.legal_classification,
            COALESCE(uc.bottle_count, 0) AS bottle_count,
            COALESCE(un.note_count, 0)   AS note_count,
            COALESCE(un.avg_score, 0)    AS avg_score,
            CASE
                WHEN uc.bottle_count > 0 THEN 'in_cellar'
                WHEN un.note_count  > 0 THEN 'visited'
                WHEN uw.wish_count  > 0 THEN 'wishlisted'
                ELSE 'unexplored'
            END AS user_status,
            CASE
                WHEN a.geometry IS NOT NULL
                THEN ST_AsGeoJSON(ST_Simplify(a.geometry::geometry, 0.01))
                ELSE NULL
            END AS geometry_json
        FROM appellations a
        LEFT JOIN user_cellar   uc ON uc.appellation_id = a.id
        LEFT JOIN user_notes    un ON un.appellation_id = a.id
        LEFT JOIN user_wishlist uw ON uw.appellation_id = a.id
        ORDER BY a.country, a.name
    """)

    result = await db.execute(sql, {"user_id": user_id})
    rows = result.mappings().all()

    features = []
    for row in rows:
        geom = json.loads(row["geometry_json"]) if row["geometry_json"] else None
        features.append({
            "type": "Feature",
            "id": row["id"],
            "geometry": geom,
            "properties": {
                "slug": row["slug"],
                "name": row["name"],
                "country": row["country"],
                "country_code": row["country_code"],
                "region": row["region"],
                "appellation_type": row["appellation_type"],
                "legal_classification": row["legal_classification"],
                "user_status": row["user_status"],
                "bottle_count": int(row["bottle_count"]),
                "note_count": int(row["note_count"]),
                "avg_score": float(row["avg_score"]) if row["avg_score"] else 0.0,
            },
        })

    geojson = json.dumps({"type": "FeatureCollection", "features": features})

    if redis_client is not None:
        await redis_client.setex(cache_key, 3600, geojson)

    return Response(content=geojson, media_type="application/geo+json")


@router.get("", response_model=list[AppellationRead])
async def list_regions(
    country_code: str | None = Query(None),
    appellation_type: str | None = Query(None),
    parent_id: uuid.UUID | None = Query(None, description="Filter to children of a parent appellation"),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AppellationRead]:
    stmt = (
        select(Appellation)
        .order_by(Appellation.country, Appellation.name)
        .limit(limit)
        .offset(offset)
    )

    if country_code:
        stmt = stmt.where(Appellation.country_code == country_code.upper())
    if appellation_type:
        stmt = stmt.where(Appellation.appellation_type == appellation_type)
    if parent_id is not None:
        stmt = stmt.where(Appellation.parent_id == parent_id)

    result = await db.execute(stmt)
    appellations = result.scalars().all()
    return [AppellationRead.model_validate(a) for a in appellations]


@router.get("/{slug}", response_model=AppellationRead)
async def get_region(
    slug: str,
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AppellationRead:
    stmt = select(Appellation).where(Appellation.slug == slug)
    result = await db.execute(stmt)
    appellation = result.scalar_one_or_none()
    if appellation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Region '{slug}' not found",
        )
    return AppellationRead.model_validate(appellation)


class VintageChartEntry(BaseModel):
    vintage: int
    score: Optional[int]
    descriptor: Optional[str]
    drinking_from: Optional[int]
    drinking_to: Optional[int]
    notes: Optional[str]
    user_notes: int


@router.get("/{slug}/vintage-chart", response_model=list[VintageChartEntry])
async def get_vintage_chart(
    slug: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[VintageChartEntry]:
    """
    Return vintage quality scores for this region with the calling user's
    note count per vintage. Ordered by vintage descending (newest first).

    The user_notes count is scoped to this user — never leaks another user's data.
    """
    # Confirm region exists
    region_result = await db.execute(
        select(Appellation).where(Appellation.slug == slug)
    )
    if region_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Region '{slug}' not found",
        )

    # Fetch vintage quality rows for this slug
    vq_result = await db.execute(
        select(VintageQuality)
        .where(VintageQuality.region_slug == slug)
        .order_by(VintageQuality.vintage.desc())
    )
    vq_rows = vq_result.scalars().all()

    if not vq_rows:
        return []

    # Count user's tasting notes per vintage for wines in this appellation,
    # using a single aggregated query — user_id filter is mandatory.
    note_counts_result = await db.execute(
        select(TastingNote.vintage, func.count(TastingNote.id).label("cnt"))
        .join(Wine, TastingNote.wine_id == Wine.id)
        .join(Appellation, Wine.appellation_id == Appellation.id)
        .where(
            TastingNote.user_id == user_id,
            Appellation.slug == slug,
        )
        .group_by(TastingNote.vintage)
    )
    note_counts: dict[int, int] = {row.vintage: row.cnt for row in note_counts_result}

    return [
        VintageChartEntry(
            vintage=row.vintage,
            score=row.score,
            descriptor=row.descriptor,
            drinking_from=row.drinking_from,
            drinking_to=row.drinking_to,
            notes=row.notes,
            user_notes=note_counts.get(row.vintage, 0),
        )
        for row in vq_rows
    ]


class RegionWineRead(BaseModel):
    wine: WineRead
    cellar_count: int


@router.get("/{slug}/wines", response_model=list[WineRead])
async def get_region_wines(
    slug: str,
    style: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WineRead]:
    """
    Wines belonging to this appellation, with optional style filter.
    Ordered by full_name ascending.
    """
    region_result = await db.execute(
        select(Appellation).where(Appellation.slug == slug)
    )
    appellation = region_result.scalar_one_or_none()
    if appellation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Region '{slug}' not found",
        )

    stmt = (
        select(Wine)
        .where(Wine.appellation_id == appellation.id)
        .options(
            selectinload(Wine.producer),
            selectinload(Wine.appellation),
        )
        .order_by(Wine.full_name)
        .limit(limit)
        .offset(offset)
    )
    if style:
        stmt = stmt.where(Wine.style == style)

    result = await db.execute(stmt)
    wines = result.scalars().all()
    return [WineRead.model_validate(w) for w in wines]
