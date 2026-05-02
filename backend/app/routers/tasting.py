"""
Tasting notes router.

IMMUTABILITY CONTRACT: A tasting note may be freely edited within 24 hours of
creation. After 24 hours, all fields are locked and observations must be appended
via POST /notes/{id}/amend. The note is a historical document — never mutate it
after the window closes.

CRITICAL: Every DB query MUST include a user_id filter.
"""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import AsyncSessionLocal, get_db
from app.dependencies import get_redis_or_none
from app.models.tasting_note import TastingNote
from app.models.wine import Wine
from app.schemas.common import PaginatedResponse
from app.schemas.tasting_note import (
    AmendmentCreate,
    TastingNoteCreate,
    TastingNoteRead,
    TastingNoteUpdate,
)

router = APIRouter(prefix="/api/v1/notes", tags=["tasting"])

_IMMUTABILITY_WINDOW = timedelta(hours=24)


def _schedule_profile_recompute(user_id: str) -> None:
    """
    Fire-and-forget: recompute user taste profile in a fresh DB session.

    Must use its own session — the request session may already be committed
    or closed by the time this coroutine runs.
    """
    from app.services.embedding import recompute_taste_profile

    async def _run() -> None:
        async with AsyncSessionLocal() as session:
            try:
                await recompute_taste_profile(user_id, session)
            except Exception:
                import logging

                logging.getLogger(__name__).exception(
                    "Background taste profile recompute failed for user %s", user_id
                )

    asyncio.create_task(_run())


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


@router.get("", response_model=PaginatedResponse[TastingNoteRead])
async def list_notes(
    wine_id: uuid.UUID | None = Query(None),
    vintage: int | None = Query(None),
    score_min: float | None = Query(None, ge=0),
    score_max: float | None = Query(None, le=100),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, le=200),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[TastingNoteRead]:
    base = select(TastingNote).where(TastingNote.user_id == user_id)
    if wine_id is not None:
        base = base.where(TastingNote.wine_id == wine_id)
    if vintage is not None:
        base = base.where(TastingNote.vintage == vintage)
    if score_min is not None:
        base = base.where(TastingNote.personal_score >= score_min)
    if score_max is not None:
        base = base.where(TastingNote.personal_score <= score_max)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    stmt = (
        base
        .options(
            selectinload(TastingNote.wine).selectinload(Wine.producer),
            selectinload(TastingNote.wine).selectinload(Wine.appellation),
        )
        .order_by(TastingNote.tasted_at.desc())
        .limit(per_page)
        .offset((page - 1) * per_page)
    )

    result = await db.execute(stmt)
    notes = result.scalars().all()
    items = [TastingNoteRead.model_validate(n) for n in notes]
    return PaginatedResponse(items=items, total=total, page=page, per_page=per_page, has_more=(page * per_page) < total)


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


@router.post("", response_model=TastingNoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: TastingNoteCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis | None = Depends(get_redis_or_none),
) -> TastingNoteRead:
    data = payload.model_dump()

    # Serialize DescriptorItem lists to plain dicts for JSONB storage
    for field in ("nose_descriptors", "palate_descriptors"):
        if data.get(field):
            data[field] = [
                item if isinstance(item, dict) else item.model_dump()
                for item in data[field]
            ]

    note = TastingNote(user_id=user_id, amendments=[], **data)
    db.add(note)
    await db.flush()
    await db.refresh(note)

    # Invalidate the geojson choropleth cache — a new note changes user_status.
    if redis_client is not None:
        await redis_client.delete(f"geojson:{user_id}")

    # Fire-and-forget: update taste profile without blocking the response.
    # Only schedule if the note has a personal score (needed for profile weighting).
    if note.personal_score is not None:
        _schedule_profile_recompute(user_id)

    return TastingNoteRead.model_validate(note)


# ---------------------------------------------------------------------------
# Detail
# ---------------------------------------------------------------------------


@router.get("/{note_id}", response_model=TastingNoteRead)
async def get_note(
    note_id: uuid.UUID,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TastingNoteRead:
    note = await _get_note_or_404(note_id, user_id, db)
    return TastingNoteRead.model_validate(note)


# ---------------------------------------------------------------------------
# Update (within 24h window only)
# ---------------------------------------------------------------------------


@router.put("/{note_id}", response_model=TastingNoteRead)
async def update_note(
    note_id: uuid.UUID,
    payload: TastingNoteUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TastingNoteRead:
    note = await _get_note_or_404(note_id, user_id, db)

    age = datetime.now(timezone.utc) - note.created_at.replace(tzinfo=timezone.utc)
    if age >= _IMMUTABILITY_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Note immutable after 24 hours. Use /amend instead.",
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Serialize DescriptorItem lists to plain dicts for JSONB storage
    for field in ("nose_descriptors", "palate_descriptors"):
        if field in update_data and update_data[field]:
            update_data[field] = [
                item if isinstance(item, dict) else item.model_dump()
                for item in update_data[field]
            ]

    for field, value in update_data.items():
        setattr(note, field, value)

    await db.flush()
    await db.refresh(note)

    # Re-trigger profile recompute if score changed (within the 24h window).
    if "personal_score" in update_data and note.personal_score is not None:
        _schedule_profile_recompute(user_id)

    return TastingNoteRead.model_validate(note)


# ---------------------------------------------------------------------------
# Amend (append-only, always allowed)
# ---------------------------------------------------------------------------


@router.post("/{note_id}/amend", response_model=TastingNoteRead)
async def amend_note(
    note_id: uuid.UUID,
    payload: AmendmentCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TastingNoteRead:
    """
    Append an amendment to a tasting note. Allowed at any time, including
    after the 24-hour immutability window. The amendment is timestamped and
    appended to the JSONB amendments array — never edits existing content.
    """
    note = await _get_note_or_404(note_id, user_id, db)

    amendment = {
        "text": payload.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    current = list(note.amendments or [])
    current.append(amendment)
    note.amendments = current

    await db.flush()
    await db.refresh(note)
    return TastingNoteRead.model_validate(note)


# ---------------------------------------------------------------------------
# Blind tasting analysis
# ---------------------------------------------------------------------------


@router.get("/{note_id}/blind-analysis")
async def blind_analysis(
    note_id: uuid.UUID,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Run MW-style blind deduction on a tasting note.
    Only valid when note.is_blind is True — otherwise 400.
    Stores the prediction in note.blind_prediction if not already present.
    Returns the BlindTastingPrediction JSON alongside the note id.
    """
    from app.services.blind_tasting import predict_blind_wine

    note = await _get_note_or_404(note_id, user_id, db)

    if not note.is_blind:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This note was not recorded as a blind tasting (is_blind=False).",
        )

    # If a prediction was already stored, return it without re-calling Claude.
    stored = note.blind_prediction or {}
    if stored.get("prediction") and "probable_grapes" in stored["prediction"]:
        return {"note_id": str(note.id), "prediction": stored["prediction"]}

    note_data = {
        "app_clarity": note.app_clarity,
        "app_intensity": note.app_intensity,
        "app_color": note.app_color,
        "nose_intensity": note.nose_intensity,
        "nose_development": note.nose_development,
        "nose_descriptors": note.nose_descriptors or [],
        "palate_sweetness": note.palate_sweetness,
        "palate_acidity": note.palate_acidity,
        "palate_tannin": note.palate_tannin,
        "palate_tannin_nature": note.palate_tannin_nature,
        "palate_body": note.palate_body,
        "palate_alcohol": note.palate_alcohol,
        "palate_finish": note.palate_finish,
        "palate_finish_sec": note.palate_finish_sec,
        "palate_descriptors": note.palate_descriptors or [],
        "quality": note.quality,
        "readiness": note.readiness,
    }

    prediction = await predict_blind_wine(note_data)
    prediction_dict = prediction.model_dump()

    # Persist the prediction — mark as not-yet-revealed
    note.blind_prediction = {"prediction": prediction_dict, "revealed": False}
    await db.flush()

    return {"note_id": str(note.id), "prediction": prediction_dict}


class BlindRevealRequest(BaseModel):
    grape: str
    region: str
    vintage: int
    classification: str
    wine_id: uuid.UUID | None = None


@router.post("/{note_id}/blind-reveal")
async def blind_reveal(
    note_id: uuid.UUID,
    payload: BlindRevealRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Reveal the actual wine identity and score the blind prediction.
    Stores accuracy alongside the original prediction in note.blind_prediction.
    Returns the full result: prediction + accuracy + wine_identity.
    """
    from app.services.blind_tasting import (
        BlindTastingPrediction,
        GrapeConfidence,
        RegionConfidence,
        score_prediction_accuracy,
    )

    note = await _get_note_or_404(note_id, user_id, db)

    if not note.is_blind:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This note was not recorded as a blind tasting (is_blind=False).",
        )

    stored = note.blind_prediction or {}
    raw_prediction = stored.get("prediction")

    if not raw_prediction:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Run /blind-analysis first to generate a prediction before revealing.",
        )

    if stored.get("revealed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Wine already revealed. Accuracy is already stored.",
        )

    prediction = BlindTastingPrediction(
        probable_grapes=[GrapeConfidence(**g) for g in raw_prediction["probable_grapes"]],
        probable_regions=[RegionConfidence(**r) for r in raw_prediction["probable_regions"]],
        probable_vintage_range=raw_prediction["probable_vintage_range"],
        quality_tier=raw_prediction["quality_tier"],
        reasoning=raw_prediction["reasoning"],
        confidence_overall=raw_prediction["confidence_overall"],
    )

    actual = {
        "grape": payload.grape,
        "region": payload.region,
        "vintage": payload.vintage,
        "classification": payload.classification,
    }
    accuracy = score_prediction_accuracy(prediction, actual)

    wine_identity = {
        "grape": payload.grape,
        "region": payload.region,
        "vintage": payload.vintage,
        "classification": payload.classification,
        "wine_id": str(payload.wine_id) if payload.wine_id else None,
    }

    note.blind_prediction = {
        "prediction": raw_prediction,
        "accuracy": accuracy,
        "wine_identity": wine_identity,
        "revealed": True,
    }
    await db.flush()

    return {
        "note_id": str(note.id),
        "prediction": raw_prediction,
        "accuracy": accuracy,
        "wine_identity": wine_identity,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_note_or_404(
    note_id: uuid.UUID,
    user_id: str,
    db: AsyncSession,
) -> TastingNote:
    """
    Fetch a tasting note belonging to user_id.
    Returns 404 whether the note doesn't exist OR belongs to another user —
    never leak existence of another user's notes.
    """
    stmt = (
        select(TastingNote)
        .options(
            selectinload(TastingNote.wine).selectinload(Wine.producer),
            selectinload(TastingNote.wine).selectinload(Wine.appellation),
        )
        .where(
            TastingNote.id == note_id,
            TastingNote.user_id == user_id,  # CRITICAL: user isolation
        )
    )
    result = await db.execute(stmt)
    note = result.scalar_one_or_none()
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tasting note not found",
        )
    return note
