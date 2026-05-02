"""
Compute (or recompute) user taste profile vectors from tasting notes + wine embeddings.

Run after backfill_embeddings.py to unlock the Discover recommendations feature.

Usage:
    docker exec cru-backend python scripts/compute_taste_profiles.py
"""
from __future__ import annotations

import asyncio
import logging
import sys

import numpy as np
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

sys.path.insert(0, str(__import__("pathlib").Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from app.models.appellation import Appellation
from app.models.tasting_note import TastingNote
from app.models.user_taste_profile import UserTasteProfile
from app.models.wine import Wine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("compute_profiles")

# Map palate fields to 0-1 scale (matches stats.py)
_ACIDITY_MAP = {"low": 0.1, "medium-": 0.3, "medium": 0.5, "medium+": 0.7, "high": 0.9}
_TANNIN_MAP  = {"low": 0.1, "medium-": 0.3, "medium": 0.5, "medium+": 0.7, "high": 0.9}
_BODY_MAP    = {"light": 0.1, "medium-": 0.3, "medium": 0.5, "medium+": 0.7, "full": 0.9}
_SWEET_MAP   = {
    "bone_dry": 0.0, "dry": 0.1, "off_dry": 0.3,
    "medium_dry": 0.5, "medium_sweet": 0.65, "sweet": 0.8, "luscious": 1.0,
}


def _avg_mapped(values: list, mapping: dict) -> float | None:
    nums = [mapping[v] for v in values if v and v in mapping]
    return round(sum(nums) / len(nums), 2) if nums else None


async def compute_for_user(user_id: str) -> None:
    async with AsyncSessionLocal() as db:
        # Load all scored notes with wine embeddings
        stmt = (
            select(TastingNote)
            .options(
                selectinload(TastingNote.wine)
                .selectinload(Wine.appellation),
                selectinload(TastingNote.wine)
                .selectinload(Wine.producer),
            )
            .where(
                TastingNote.user_id == user_id,
                TastingNote.personal_score.isnot(None),
            )
        )
        rows = (await db.execute(stmt)).scalars().all()

        if len(rows) < 3:
            logger.warning("  %s — only %d scored notes, skipping (need 3+)", user_id, len(rows))
            return

        # Gather wine IDs and fetch embeddings
        wine_ids = [str(n.wine_id) for n in rows if n.wine_id]
        from app.models.wine_embedding import WineEmbedding
        from sqlalchemy import UUID as SAUUID, cast
        emb_stmt = (
            select(WineEmbedding.wine_id, WineEmbedding.embedding)
            .where(
                WineEmbedding.wine_id.in_([__import__("uuid").UUID(wid) for wid in wine_ids]),
                WineEmbedding.user_id.is_(None),
            )
            .order_by(WineEmbedding.created_at.desc())
        )
        emb_result = await db.execute(emb_stmt)
        embedding_map: dict[str, list[float]] = {}
        for r in emb_result:
            wid = str(r[0])
            if wid not in embedding_map:
                embedding_map[wid] = r[1]

        # Weighted average: weight = normalised score - 0.5 (repels <70, attracts >70)
        vectors, weights = [], []
        for note in rows:
            wid = str(note.wine_id)
            if wid not in embedding_map:
                continue
            # Normalise 100-pt to [0,1]; treat 70 as neutral
            norm = float(note.personal_score) / 100.0
            weight = norm - 0.5  # range -0.5 to +0.5
            vectors.append(np.array(embedding_map[wid], dtype=np.float32))
            weights.append(weight)

        if not vectors:
            logger.warning("  %s — no embeddings found for scored wines", user_id)
            return

        abs_weights = np.abs(weights)
        if abs_weights.sum() == 0:
            profile = np.mean(vectors, axis=0)
        else:
            profile = np.average(vectors, axis=0, weights=abs_weights)
        norm_val = np.linalg.norm(profile)
        if norm_val > 0:
            profile = profile / norm_val

        # Compute structured axes
        pref_acidity  = _avg_mapped([n.palate_acidity  for n in rows], _ACIDITY_MAP)
        pref_tannin   = _avg_mapped([n.palate_tannin   for n in rows], _TANNIN_MAP)
        pref_body     = _avg_mapped([n.palate_body     for n in rows], _BODY_MAP)
        pref_sweetness = _avg_mapped([n.palate_sweetness for n in rows], _SWEET_MAP)

        # Top regions
        region_counts: dict[str, int] = {}
        for note in rows:
            if note.wine and note.wine.appellation and note.wine.appellation.region:
                r = note.wine.appellation.region
                region_counts[r] = region_counts.get(r, 0) + 1
        top_regions = sorted(region_counts, key=lambda k: -region_counts[k])[:5]

        # Top grapes
        grape_counts: dict[str, int] = {}
        for note in rows:
            if note.wine and note.wine.primary_grapes:
                for g in note.wine.primary_grapes:
                    grape = g.get("grape", "") if isinstance(g, dict) else str(g)
                    if grape:
                        grape_counts[grape] = grape_counts.get(grape, 0) + 1
        top_grapes = sorted(grape_counts, key=lambda k: -grape_counts[k])[:5]

        # Flavor affinities (descriptor → avg score when present)
        desc_scores: dict[str, list[float]] = {}
        for note in rows:
            all_descs = list(note.nose_descriptors or []) + list(note.palate_descriptors or [])
            for d in all_descs:
                desc = d.get("descriptor", "") if isinstance(d, dict) else str(d)
                if desc and note.personal_score:
                    desc_scores.setdefault(desc, []).append(float(note.personal_score))
        flavor_affinities = {
            d: round(sum(scores) / len(scores), 1)
            for d, scores in desc_scores.items()
        }

        # Upsert into user_taste_profiles
        existing = (
            await db.execute(
                select(UserTasteProfile).where(UserTasteProfile.user_id == user_id)
            )
        ).scalar_one_or_none()

        if existing:
            existing.profile_vector = profile.tolist()
            existing.note_count = len(rows)
            existing.pref_acidity = pref_acidity
            existing.pref_tannin = pref_tannin
            existing.pref_body = pref_body
            existing.pref_sweetness = pref_sweetness
            existing.top_regions = top_regions
            existing.top_grapes = top_grapes
            existing.flavor_affinities = flavor_affinities
        else:
            db.add(UserTasteProfile(
                user_id=user_id,
                profile_vector=profile.tolist(),
                note_count=len(rows),
                pref_acidity=pref_acidity,
                pref_tannin=pref_tannin,
                pref_body=pref_body,
                pref_sweetness=pref_sweetness,
                top_regions=top_regions,
                top_grapes=top_grapes,
                flavor_affinities=flavor_affinities,
            ))

        await db.commit()
        logger.info("  %s — profile computed (%d notes, %d wines embedded)", user_id, len(rows), len(vectors))


async def main() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT DISTINCT user_id FROM tasting_notes WHERE personal_score IS NOT NULL"))
        user_ids = [r[0] for r in result]

    logger.info("Computing taste profiles for %d user(s)", len(user_ids))
    for uid in user_ids:
        await compute_for_user(uid)
    logger.info("Done.")


if __name__ == "__main__":
    asyncio.run(main())
