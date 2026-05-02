"""
Wine embedding pipeline.

Design decisions (Dr. Bernard + Sofia + Raj, Phase 4):
- Global embeddings (user_id=NULL): encyclopedic only
- Personalized embeddings (user_id=<id>): encyclopedic + user experiential data
- Grape percentages encoded as "Cab 60%, Merlot 40%" for blend distinction
- Repulsion: only clean, non-faulty notes with score < 82
- IMMUTABILITY: always INSERT new row — never UPDATE wine_embeddings
- IVFFlat probes=10 set per-session at query time
"""
from __future__ import annotations

import uuid
from collections import Counter
from datetime import datetime, timezone
from statistics import mean
from typing import TYPE_CHECKING

import numpy as np
import openai
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings

if TYPE_CHECKING:
    from app.models.tasting_note import TastingNote
    from app.models.wine import Wine


EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536


def build_wine_embedding_text(
    wine: "Wine",
    notes: list["TastingNote"] | None = None,
    vintage_descriptor: str | None = None,
) -> str:
    """
    Build the text blob to embed for a wine.

    For global embeddings (notes=None): encyclopedic fields only.
    For personalized embeddings (notes provided): adds experiential data.

    IMMUTABILITY: caller must INSERT a new wine_embeddings row with this text.
    Never call this to update an existing row.
    """
    parts: list[str] = []

    # Identity
    parts.append(wine.full_name)

    if wine.appellation:
        location_parts = [wine.appellation.name]
        if wine.appellation.region:
            location_parts.append(wine.appellation.region)
        location_parts.append(wine.appellation.country)
        parts.append(f"Appellation: {', '.join(location_parts)}")

        if wine.appellation.climate:
            parts.append(f"Climate: {wine.appellation.climate}")

        if wine.appellation.soil_types:
            parts.append(f"Soils: {', '.join(wine.appellation.soil_types)}")

    # Style
    parts.append(f"Style: {wine.style}")
    if wine.color:
        parts.append(f"Color: {wine.color}")

    # Grapes — percentage-aware for blends (Dr. Bernard: critical for blend distinction)
    if wine.primary_grapes:
        grapes = wine.primary_grapes  # list of {grape, pct}
        dominant = grapes[0] if grapes else None
        is_varietal = len(grapes) == 1 or (
            dominant is not None and (dominant.get("pct") or 0) > 85
        )
        if is_varietal and dominant:
            parts.append(f"Grape: {dominant['grape']}")
        else:
            blend_str = ", ".join(
                f"{g['grape']} {g.get('pct', '?')}%"
                for g in grapes
                if g.get("grape")
            )
            if blend_str:
                parts.append(f"Blend: {blend_str}")

    # Classification
    if wine.classification:
        parts.append(f"Classification: {wine.classification}")

    # Producer style
    if wine.producer and wine.producer.style_notes:
        parts.append(f"Producer style: {wine.producer.style_notes}")

    # Vintage quality descriptor (from vintage_quality table)
    if vintage_descriptor:
        parts.append(f"Vintage quality: {vintage_descriptor}")

    # Experiential data — only for personalized embeddings
    if notes:
        # Only use clean, non-faulty notes for descriptor aggregation
        clean_notes = [
            n
            for n in notes
            if n.nose_condition == "clean" and n.quality != "faulty"
        ]
        if clean_notes:
            all_descriptors: list[str] = []
            for note in clean_notes:
                all_descriptors.extend(
                    d["descriptor"]
                    for d in (note.nose_descriptors or [])
                    if "descriptor" in d
                )
                all_descriptors.extend(
                    d["descriptor"]
                    for d in (note.palate_descriptors or [])
                    if "descriptor" in d
                )
            if all_descriptors:
                top = Counter(all_descriptors).most_common(12)
                parts.append(
                    f"Characteristic notes: {', '.join(d for d, _ in top)}"
                )

        # Average score across all notes (including faulty — score reflects overall experience)
        scores = [n.personal_score for n in notes if n.personal_score is not None]
        if scores:
            parts.append(f"Average personal score: {mean(scores):.1f}")

    return "\n".join(filter(None, parts))


async def embed_text(text: str) -> list[float]:
    """Embed a single text string using OpenAI text-embedding-3-small."""
    settings = get_settings()
    client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
        encoding_format="float",
    )
    return response.data[0].embedding


async def generate_wine_embedding(
    wine: "Wine",
    db: AsyncSession,
    user_id: str | None = None,
    notes: list["TastingNote"] | None = None,
    vintage_descriptor: str | None = None,
) -> None:
    """
    Generate and store a wine embedding.

    IMMUTABILITY: always inserts a new row. Never updates existing rows.
    The previous embedding remains in the table for historical analysis.
    """
    from app.models.wine_embedding import WineEmbedding

    embedding_text = build_wine_embedding_text(wine, notes, vintage_descriptor)
    vector = await embed_text(embedding_text)

    embedding_row = WineEmbedding(
        id=uuid.uuid4(),
        wine_id=wine.id,
        user_id=user_id,
        embedding=vector,
        embedding_text=embedding_text,
        model_version=EMBEDDING_MODEL,
    )
    db.add(embedding_row)
    await db.commit()


# ---------------------------------------------------------------------------
# Palate scale maps for structured preference axes
# ---------------------------------------------------------------------------

_ACIDITY_SCALE: dict[str, float] = {
    "low": 0.1,
    "medium-": 0.3,
    "medium": 0.5,
    "medium+": 0.7,
    "high": 0.9,
}
_TANNIN_SCALE: dict[str, float] = {
    "low": 0.1,
    "medium-": 0.3,
    "medium": 0.5,
    "medium+": 0.7,
    "high": 0.9,
}
_BODY_SCALE: dict[str, float] = {
    "light": 0.1,
    "medium-": 0.3,
    "medium": 0.5,
    "medium+": 0.7,
    "full": 0.9,
}
_SWEETNESS_SCALE: dict[str, float] = {
    "bone_dry": 0.0,
    "dry": 0.1,
    "off_dry": 0.25,
    "medium_dry": 0.4,
    "medium_sweet": 0.6,
    "sweet": 0.8,
    "luscious": 1.0,
}


def _scale(val: str | None, scale: dict[str, float]) -> float | None:
    if val is None:
        return None
    return scale.get(val)


def _avg(values: list[float | None]) -> float | None:
    valid = [v for v in values if v is not None]
    return mean(valid) if valid else None


def _normalize_score(score: float, system: str) -> float:
    """Normalize a raw score to [0, 1] range based on user's scoring system."""
    if system == "100pt":
        return (score - 50) / 50  # 50→0.0, 100→1.0
    elif system == "20pt":
        return (score - 10) / 10  # 10→0.0, 20→1.0
    else:  # 5star
        return (score - 1) / 4  # 1→0.0, 5→1.0


async def recompute_taste_profile(user_id: str, db: AsyncSession) -> None:
    """
    Recompute user's taste profile vector and structured preference axes.

    Design (Dr. Bernard + Sofia):
    - Weighted average of wine embeddings, weighted by personal score
    - Score normalized to [0,1]; net weight = norm - 0.5 (range -0.5 to +0.5)
    - Repulsion only applied to: nose_condition='clean', quality!='faulty', score < 82
    - If a note doesn't qualify for repulsion but would have negative weight, weight → 0
    - Minimum 3 notes before computing (not enough signal otherwise)
    - Populates BOTH profile_vector AND structured preference axes
    """
    from app.models.tasting_note import TastingNote
    from app.models.user import User
    from app.models.user_taste_profile import UserTasteProfile
    from app.models.wine_embedding import WineEmbedding

    # Fetch user's notes joined to the latest global embedding per wine
    # Subquery: latest global embedding per wine
    result = await db.execute(
        select(TastingNote, WineEmbedding)
        .join(
            WineEmbedding,
            (WineEmbedding.wine_id == TastingNote.wine_id)
            & (WineEmbedding.user_id.is_(None)),  # global embeddings only
        )
        .where(TastingNote.user_id == user_id)
        .where(TastingNote.personal_score.is_not(None))
        .where(TastingNote.wine_id.is_not(None))
    )
    rows = result.all()

    if len(rows) < 3:
        return  # Not enough signal

    # Fetch user scoring system for normalization
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    scoring_system = user.scoring_system if user else "100pt"

    vectors: list[np.ndarray] = []
    weights: list[float] = []
    all_notes: list[TastingNote] = []

    for note, embedding in rows:
        all_notes.append(note)
        norm = _normalize_score(float(note.personal_score), scoring_system)
        # Repulsion only for clean, non-faulty, genuinely disliked wines
        is_repulsion_candidate = (
            note.nose_condition == "clean"
            and note.quality != "faulty"
            and float(note.personal_score) < 82
        )
        weight = norm - 0.5  # range -0.5 to +0.5
        if not is_repulsion_candidate and weight < 0:
            weight = 0.0  # don't repel faulty/dirty-nose notes — absence of signal, not dislike
        vectors.append(np.array(embedding.embedding, dtype=np.float32))
        weights.append(weight)

    abs_weights = np.abs(weights)
    if abs_weights.sum() == 0:
        return

    profile_vector = np.average(vectors, axis=0, weights=abs_weights)
    norm = np.linalg.norm(profile_vector)
    if norm == 0:
        return
    profile_vector = profile_vector / norm  # L2 normalize

    # --- Structured preference axes ---
    pref_acidity = _avg([_scale(n.palate_acidity, _ACIDITY_SCALE) for n in all_notes])
    pref_tannin = _avg([_scale(n.palate_tannin, _TANNIN_SCALE) for n in all_notes])
    pref_body = _avg([_scale(n.palate_body, _BODY_SCALE) for n in all_notes])
    pref_sweetness = _avg([_scale(n.palate_sweetness, _SWEETNESS_SCALE) for n in all_notes])

    # Flavor affinities: descriptor → count across all notes
    descriptor_counts: Counter[str] = Counter()
    for note in all_notes:
        for d in (note.nose_descriptors or []) + (note.palate_descriptors or []):
            if "descriptor" in d:
                descriptor_counts[d["descriptor"]] += 1

    flavor_affinities: dict[str, int] = dict(descriptor_counts.most_common(20))

    # Upsert user_taste_profile
    existing = await db.execute(
        select(UserTasteProfile).where(UserTasteProfile.user_id == user_id)
    )
    profile = existing.scalar_one_or_none()

    profile_data: dict = {
        "profile_vector": profile_vector.tolist(),
        "note_count": len(all_notes),
        "pref_acidity": pref_acidity,
        "pref_tannin": pref_tannin,
        "pref_body": pref_body,
        "pref_sweetness": pref_sweetness,
        "flavor_affinities": flavor_affinities,
    }

    if profile:
        for k, v in profile_data.items():
            setattr(profile, k, v)
        profile.last_computed = datetime.now(timezone.utc)
    else:
        profile = UserTasteProfile(
            id=uuid.uuid4(),
            user_id=user_id,
            **profile_data,
        )
        db.add(profile)

    await db.commit()
