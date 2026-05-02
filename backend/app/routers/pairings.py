"""
Food pairing router.

Three modes:
  POST /api/v1/pairings/from-food   — dish → 3 wine style recommendations
  POST /api/v1/pairings/from-wine   — wine_id + vintage → 4 food suggestions
  POST /api/v1/pairings/tonight     — dish + constraints → ranked cellar picks (in-window only)

All endpoints are user-scoped. "tonight" queries the user's cellar for bottles currently
within their drinking window before calling Claude — never passes raw Wine-Searcher data.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.cellar_entry import CellarEntry
from app.models.wine import Wine
from app.models.tasting_note import TastingNote
from app.services.pairing import pair_from_food, pair_from_wine, pair_tonight

router = APIRouter(prefix="/api/v1/pairings", tags=["pairings"])


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class FromFoodRequest(BaseModel):
    food: str
    constraints: Optional[str] = None


class FromWineRequest(BaseModel):
    wine_id: uuid.UUID
    vintage: int


class TonightRequest(BaseModel):
    dish: str
    constraints: Optional[str] = None


# ---------------------------------------------------------------------------
# POST /pairings/from-food
# ---------------------------------------------------------------------------


@router.post("/from-food")
async def pairing_from_food(
    payload: FromFoodRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Given a food description, return 3 wine style recommendations with pairing rationale.
    Optionally incorporates the user's taste profile summary if available.
    """
    taste_summary = await _build_taste_summary(user_id, db)
    raw = await pair_from_food(
        food=payload.food,
        taste_summary=taste_summary,
        constraints=payload.constraints or "",
    )
    # Normalize: Claude returns [{style, why, avoid}] → {suggestions: [{name, reason}], notes}
    suggestions = [
        {"name": item.get("style", ""), "reason": item.get("why", "")}
        for item in (raw if isinstance(raw, list) else [])
    ]
    return {"suggestions": suggestions, "notes": ""}


# ---------------------------------------------------------------------------
# POST /pairings/from-wine
# ---------------------------------------------------------------------------


@router.post("/from-wine")
async def pairing_from_wine(
    payload: FromWineRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Given a wine and vintage, return 4 food pairing suggestions.
    Pulls the wine record and any user tasting notes for context.
    """
    wine = await _get_wine_or_404(payload.wine_id, db)

    # Collect the user's notes on this wine for richer context
    notes_result = await db.execute(
        select(TastingNote)
        .where(
            TastingNote.user_id == user_id,
            TastingNote.wine_id == payload.wine_id,
        )
        .order_by(TastingNote.tasted_at.desc())
        .limit(3)
    )
    notes = notes_result.scalars().all()
    tasting_notes = _summarise_notes(notes)

    region = ""
    if wine.appellation:
        region = f"{wine.appellation.name}, {wine.appellation.region or ''}, {wine.appellation.country}".strip(", ")

    raw = await pair_from_wine(
        wine_name=wine.full_name,
        vintage=payload.vintage,
        region=region,
        tasting_notes=tasting_notes,
    )
    # Normalize: Claude returns [{dish, why, preparation}] → {suggestions: [{name, reason}], notes}
    suggestions = [
        {"name": item.get("dish", ""), "reason": item.get("why", "")}
        for item in (raw if isinstance(raw, list) else [])
    ]
    return {"suggestions": suggestions, "notes": ""}


# ---------------------------------------------------------------------------
# POST /pairings/tonight
# ---------------------------------------------------------------------------


@router.post("/tonight")
async def pairing_tonight(
    payload: TonightRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Given a dish and optional constraints, pick the best bottles from the user's cellar
    that are currently within their drinking window.

    Filters to in_cellar entries whose drink_from/drink_by span the current year.
    Passes a summary of up to 20 bottles to Claude.
    """
    now_year = datetime.now(timezone.utc).year

    stmt = (
        select(CellarEntry)
        .options(selectinload(CellarEntry.wine))
        .where(
            CellarEntry.user_id == user_id,
            CellarEntry.status == "in_cellar",
            CellarEntry.drink_from <= now_year,
            CellarEntry.drink_by >= now_year,
        )
        .order_by(CellarEntry.drink_by.asc())  # prioritise bottles closer to peak_end
        .limit(40)
    )
    rows = (await db.execute(stmt)).scalars().all()

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No bottles currently in their drinking window. Add drink_from/drink_by to cellar entries.",
        )

    cellar_options = [_cellar_entry_summary(e) for e in rows]

    raw = await pair_tonight(
        dish=payload.dish,
        constraints=payload.constraints or "",
        cellar_options=cellar_options,
    )
    # Normalize: Claude returns [{wine_id, wine_name, vintage, reason, ...}] → {suggestions: [{name, reason}], notes}
    suggestions = [
        {
            "name": f"{item.get('wine_name', '')} {item.get('vintage', '')}".strip(),
            "reason": item.get("reason", ""),
        }
        for item in (raw if isinstance(raw, list) else [])
    ]
    return {"suggestions": suggestions, "notes": ""}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_wine_or_404(wine_id: uuid.UUID, db: AsyncSession) -> Wine:
    result = await db.execute(
        select(Wine)
        .options(selectinload(Wine.appellation))
        .where(Wine.id == wine_id)
    )
    wine = result.scalar_one_or_none()
    if wine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wine not found")
    return wine


def _cellar_entry_summary(entry: CellarEntry) -> dict:
    wine = entry.wine
    return {
        "wine_id": str(entry.id),
        "wine_name": wine.full_name if wine else "Unknown",
        "vintage": entry.vintage,
        "style": wine.style if wine else "",
        "drink_from": entry.drink_from,
        "drink_by": entry.drink_by,
        "bin_location": entry.bin_location,
        "quantity": entry.quantity,
    }


def _summarise_notes(notes: list[TastingNote]) -> str:
    if not notes:
        return ""
    parts: list[str] = []
    for n in notes:
        descriptors: list[str] = []
        for d in (n.nose_descriptors or []):
            if d.get("descriptor"):
                descriptors.append(d["descriptor"])
        for d in (n.palate_descriptors or []):
            if d.get("descriptor"):
                descriptors.append(d["descriptor"])
        line = f"Tasted {n.tasted_at.year}: {', '.join(descriptors[:6])}"
        if n.palate_finish:
            line += f"; finish {n.palate_finish}"
        if n.personal_score:
            line += f"; score {n.personal_score}"
        parts.append(line)
    return " | ".join(parts)


async def _build_taste_summary(user_id: str, db: AsyncSession) -> str:
    """
    Assemble a one-line taste summary from the user's highest-rated notes.
    Used as soft context in from-food pairings — not load-bearing.
    """
    result = await db.execute(
        select(TastingNote.palate_acidity, TastingNote.palate_tannin, TastingNote.palate_body)
        .where(
            TastingNote.user_id == user_id,
            TastingNote.personal_score.isnot(None),
            TastingNote.personal_score >= 88,
        )
        .limit(50)
    )
    rows = result.all()
    if not rows:
        return ""
    # Tally the most common values across the top-rated notes
    from collections import Counter
    acid_counts = Counter(r.palate_acidity for r in rows if r.palate_acidity)
    tannin_counts = Counter(r.palate_tannin for r in rows if r.palate_tannin)
    body_counts = Counter(r.palate_body for r in rows if r.palate_body)
    parts: list[str] = []
    if acid_counts:
        parts.append(f"prefers {acid_counts.most_common(1)[0][0]} acidity")
    if tannin_counts:
        parts.append(f"{tannin_counts.most_common(1)[0][0]} tannin")
    if body_counts:
        parts.append(f"{body_counts.most_common(1)[0][0]} body")
    return "User palate: " + ", ".join(parts) if parts else ""
