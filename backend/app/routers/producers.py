import uuid
from datetime import datetime, timedelta, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.models.producer import Producer
from app.schemas.common import PaginatedResponse
from app.schemas.producer import ProducerRead

router = APIRouter(prefix="/api/v1/producers", tags=["producers"])

_BRIEF_TTL_DAYS = 30

_PRODUCER_BRIEF_PROMPT = """You are writing a brief for a serious wine collector's app.

Producer: {name}
Region: {appellation}, {country}
Founded: {founded_year}
Winemaker: {winemaker}
Style notes: {style_notes}
Organic/Biodynamic: {organic_info}

Write a 2-paragraph producer brief (150-200 words total) for a sophisticated audience.
First paragraph: the producer's identity, philosophy, and place in the wine world.
Second paragraph: what to expect from their wines — style, aging, what occasions they suit.
Tone: authoritative but not academic. No marketing language. No superlatives."""


@router.get("", response_model=PaginatedResponse[ProducerRead])
async def search_producers(
    query: str | None = Query(None, description="Search on producer name"),
    q: str | None = Query(None, description="Alias for query"),
    country_code: str | None = Query(None),
    natural: bool | None = Query(None),
    biodynamic: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    # Legacy limit/offset params — honoured when present
    limit: int | None = Query(None, le=100),
    offset: int | None = Query(None, ge=0),
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ProducerRead]:
    search_term = query or q

    base = select(Producer)
    if search_term:
        base = base.where(Producer.name.ilike(f"%{search_term}%"))
    if country_code:
        base = base.where(Producer.country_code == country_code.upper())
    if natural is not None:
        base = base.where(Producer.natural == natural)
    if biodynamic is not None:
        base = base.where(Producer.biodynamic == biodynamic)

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
        .options(selectinload(Producer.appellation))
        .order_by(Producer.name)
        .limit(eff_limit)
        .offset(eff_offset)
    )

    result = await db.execute(stmt)
    producers = result.scalars().all()
    items = [ProducerRead.model_validate(p) for p in producers]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page if limit is None else (eff_offset // eff_limit + 1),
        per_page=eff_limit,
        has_more=(eff_offset + eff_limit) < total,
    )


@router.get("/{slug}", response_model=ProducerRead)
async def get_producer(
    slug: str,
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProducerRead:
    stmt = (
        select(Producer)
        .where(Producer.slug == slug)
        .options(selectinload(Producer.appellation))
    )
    result = await db.execute(stmt)
    producer = result.scalar_one_or_none()
    if producer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producer '{slug}' not found",
        )
    return ProducerRead.model_validate(producer)


class ProducerBriefResponse(BaseModel):
    producer: ProducerRead
    brief: str
    brief_cached: bool


@router.get("/{slug}/brief", response_model=ProducerBriefResponse)
async def get_producer_brief(
    slug: str,
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProducerBriefResponse:
    """
    Return producer detail + a Claude-generated 2-paragraph brief.

    The brief is cached in producer.ai_summary. It is regenerated when:
    - producer.ai_summary is NULL, or
    - producer.updated_at is older than 30 days.

    The regenerated summary is persisted back to the DB before responding,
    so subsequent calls are served from cache.
    """
    stmt = (
        select(Producer)
        .where(Producer.slug == slug)
        .options(selectinload(Producer.appellation))
    )
    result = await db.execute(stmt)
    producer = result.scalar_one_or_none()
    if producer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producer '{slug}' not found",
        )

    ttl_cutoff = datetime.now(tz=timezone.utc) - timedelta(days=_BRIEF_TTL_DAYS)
    brief_is_fresh = (
        producer.ai_summary is not None
        and producer.updated_at.replace(tzinfo=timezone.utc) > ttl_cutoff
    )

    if brief_is_fresh:
        return ProducerBriefResponse(
            producer=ProducerRead.model_validate(producer),
            brief=producer.ai_summary,  # type: ignore[arg-type]
            brief_cached=True,
        )

    # Build organic/biodynamic descriptor for the prompt
    organic_parts: list[str] = []
    if producer.organic_cert:
        organic_parts.append(producer.organic_cert)
    if producer.biodynamic:
        organic_parts.append("biodynamic")
    if producer.natural:
        organic_parts.append("natural")
    organic_info = ", ".join(organic_parts) if organic_parts else "conventional"

    appellation_name = producer.appellation.name if producer.appellation else "unknown"
    country = (
        producer.appellation.country if producer.appellation else (producer.country_code or "unknown")
    )

    prompt = _PRODUCER_BRIEF_PROMPT.format(
        name=producer.name,
        appellation=appellation_name,
        country=country,
        founded_year=producer.founded_year or "unknown",
        winemaker=producer.winemaker or "unknown",
        style_notes=producer.style_notes or "not specified",
        organic_info=organic_info,
    )

    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    brief_text: str = message.content[0].text.strip()

    producer.ai_summary = brief_text
    producer.updated_at = datetime.now(tz=timezone.utc)
    await db.flush()

    return ProducerBriefResponse(
        producer=ProducerRead.model_validate(producer),
        brief=brief_text,
        brief_cached=False,
    )
