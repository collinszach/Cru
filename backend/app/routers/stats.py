"""
Stats router — personal analytics over the user's cellar and tasting journal.

All endpoints are read-only aggregations. Every query is strictly scoped to
the authenticated user_id — cross-user leakage is never possible by design.
"""
import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.appellation import Appellation
from app.models.cellar_entry import CellarEntry
from app.models.tasting_note import TastingNote
from app.models.wine import Wine

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


# ---------------------------------------------------------------------------
# /stats — dashboard summary
# ---------------------------------------------------------------------------


@router.get("")
async def dashboard_stats(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    High-level numbers for the dashboard header.
    Returns bottle count, note count, avg score, unique regions/producers,
    total cellar value, and bottles currently in their drinking window.
    """
    now_year = datetime.now(timezone.utc).year

    # Cellar aggregate
    cellar_agg = await db.execute(
        select(
            func.sum(CellarEntry.quantity).label("total_bottles"),
            func.count(CellarEntry.id).label("bottle_count"),
            func.sum(
                case(
                    (CellarEntry.current_value.isnot(None), CellarEntry.current_value * CellarEntry.quantity),
                    else_=0,
                )
            ).label("total_cellar_value"),
            func.count(
                case(
                    (
                        (CellarEntry.drink_from <= now_year) & (CellarEntry.drink_by >= now_year),
                        CellarEntry.id,
                    )
                )
            ).label("bottles_in_window"),
            func.count(
                case(
                    (
                        (CellarEntry.drink_from > now_year) & (CellarEntry.drink_from <= now_year + 5),
                        CellarEntry.id,
                    )
                )
            ).label("bottles_approaching"),
            func.count(
                case(
                    (
                        (CellarEntry.drink_from <= now_year)
                        & (CellarEntry.drink_by >= now_year)
                        & ((now_year - CellarEntry.drink_from) > 2),
                        CellarEntry.id,
                    )
                )
            ).label("bottles_at_peak"),
        ).where(
            CellarEntry.user_id == user_id,
            CellarEntry.status == "in_cellar",
        )
    )
    cellar_row = cellar_agg.one()

    # Notes aggregate
    notes_agg = await db.execute(
        select(
            func.count(TastingNote.id).label("total_notes"),
            func.avg(TastingNote.personal_score).label("avg_score"),
        ).where(TastingNote.user_id == user_id)
    )
    notes_row = notes_agg.one()

    # Unique regions (via appellation on wine)
    unique_regions_result = await db.execute(
        select(func.count(func.distinct(Appellation.region))).where(
            TastingNote.user_id == user_id,
            TastingNote.wine_id == Wine.id,
            Wine.appellation_id == Appellation.id,
            Appellation.region.isnot(None),
        )
    )
    unique_regions = unique_regions_result.scalar() or 0

    # Unique producers
    unique_producers_result = await db.execute(
        select(func.count(func.distinct(Wine.producer_id))).where(
            TastingNote.user_id == user_id,
            TastingNote.wine_id == Wine.id,
            Wine.producer_id.isnot(None),
        )
    )
    unique_producers = unique_producers_result.scalar() or 0

    avg_score = notes_row.avg_score
    return {
        "total_bottles": int(cellar_row.total_bottles or 0),
        "bottle_count": cellar_row.bottle_count or 0,
        "total_notes": notes_row.total_notes or 0,
        "avg_score": round(float(avg_score), 1) if avg_score else None,
        "unique_regions": unique_regions,
        "unique_producers": unique_producers,
        "total_cellar_value": float(cellar_row.total_cellar_value or 0),
        "bottles_in_window": cellar_row.bottles_in_window or 0,
        "bottles_approaching": cellar_row.bottles_approaching or 0,
        "bottles_at_peak": cellar_row.bottles_at_peak or 0,
        "currency": "USD",
    }


# ---------------------------------------------------------------------------
# /stats/regions-breakdown
# ---------------------------------------------------------------------------


@router.get("/regions-breakdown")
async def regions_breakdown(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """
    Per-region summary: how many bottles owned, notes written, and average
    personal score. Joins cellar_entries + tasting_notes through wines and
    appellations.
    """
    # Representative slug per region (pick first appellation that has vintage_quality data, else any)
    from app.models.vintage_quality import VintageQuality
    slug_stmt = (
        select(Appellation.region, Appellation.slug)
        .where(Appellation.region.isnot(None))
        .order_by(Appellation.region, Appellation.slug)
    )
    slug_rows = (await db.execute(slug_stmt)).all()
    # For each region prefer a slug that exists in vintage_quality
    vq_slugs_result = await db.execute(select(VintageQuality.region_slug).distinct())
    vq_slugs: set[str] = {r[0] for r in vq_slugs_result.all()}
    region_slug_map: dict[str, str] = {}
    for row in slug_rows:
        region = row.region
        if region not in region_slug_map:
            region_slug_map[region] = row.slug  # fallback: first slug
        if row.slug in vq_slugs:
            region_slug_map[region] = row.slug  # prefer one with vintage data

    # Cellar counts per region
    cellar_stmt = (
        select(
            Appellation.region,
            Appellation.country,
            func.sum(CellarEntry.quantity).label("bottle_count"),
        )
        .join(Wine, Wine.appellation_id == Appellation.id)
        .join(CellarEntry, CellarEntry.wine_id == Wine.id)
        .where(
            CellarEntry.user_id == user_id,
            CellarEntry.status == "in_cellar",
            Appellation.region.isnot(None),
        )
        .group_by(Appellation.region, Appellation.country)
    )
    cellar_rows = (await db.execute(cellar_stmt)).all()
    cellar_by_region: dict[str, dict] = {
        row.region: {"bottle_count": int(row.bottle_count or 0), "country": row.country}
        for row in cellar_rows
    }

    # Note counts + avg score per region
    notes_stmt = (
        select(
            Appellation.region,
            Appellation.country,
            func.count(TastingNote.id).label("note_count"),
            func.avg(TastingNote.personal_score).label("avg_score"),
        )
        .join(Wine, Wine.appellation_id == Appellation.id)
        .join(TastingNote, TastingNote.wine_id == Wine.id)
        .where(
            TastingNote.user_id == user_id,
            Appellation.region.isnot(None),
        )
        .group_by(Appellation.region, Appellation.country)
    )
    note_rows = (await db.execute(notes_stmt)).all()
    notes_by_region: dict[str, dict] = {
        row.region: {
            "note_count": row.note_count,
            "avg_score": round(float(row.avg_score), 1) if row.avg_score else None,
            "country": row.country,
        }
        for row in note_rows
    }

    # Merge both result sets
    all_regions = set(cellar_by_region) | set(notes_by_region)
    breakdown = []
    for region in sorted(all_regions):
        cellar_data = cellar_by_region.get(region, {})
        notes_data = notes_by_region.get(region, {})
        country = cellar_data.get("country") or notes_data.get("country", "")
        breakdown.append(
            {
                "region": region,
                "slug": region_slug_map.get(region, region.lower().replace(" ", "-")),
                "country": country,
                "bottle_count": cellar_data.get("bottle_count", 0),
                "note_count": notes_data.get("note_count", 0),
                "avg_score": notes_data.get("avg_score"),
            }
        )

    breakdown.sort(key=lambda r: r["bottle_count"] + r["note_count"], reverse=True)
    return breakdown


# ---------------------------------------------------------------------------
# /stats/score-distribution
# ---------------------------------------------------------------------------


@router.get("/score-distribution")
async def score_distribution(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """
    Personal score histogram in fixed buckets: <80, 80-84, 85-89, 90-94, 95-100.
    Only includes notes that have a personal_score.
    """
    buckets = [
        ("under 80", 0, 79.99),
        ("80-84", 80, 84.99),
        ("85-89", 85, 89.99),
        ("90-94", 90, 94.99),
        ("95-100", 95, 100),
    ]

    result = []
    for label, low, high in buckets:
        count_result = await db.execute(
            select(func.count(TastingNote.id)).where(
                TastingNote.user_id == user_id,
                TastingNote.personal_score.isnot(None),
                TastingNote.personal_score >= low,
                TastingNote.personal_score <= high,
            )
        )
        result.append({"bucket": label, "count": count_result.scalar() or 0})

    return result


# ---------------------------------------------------------------------------
# /stats/palate-radar
# ---------------------------------------------------------------------------

# String → numeric mapping for structured palate fields (0.0–1.0)
_ACIDITY_MAP = {
    "low": 0.1,
    "medium-": 0.3,
    "medium": 0.5,
    "medium+": 0.7,
    "high": 0.9,
}
_TANNIN_MAP = _ACIDITY_MAP  # same scale
_BODY_MAP = {
    "light": 0.1,
    "medium-": 0.3,
    "medium": 0.5,
    "medium+": 0.7,
    "full": 0.9,
}
_SWEETNESS_MAP = {
    "bone_dry": 0.0,
    "dry": 0.1,
    "off_dry": 0.3,
    "medium_dry": 0.4,
    "medium_sweet": 0.6,
    "sweet": 0.8,
    "luscious": 1.0,
}
_ALCOHOL_MAP = {
    "low": 0.2,
    "medium": 0.5,
    "high": 0.8,
}
_FINISH_MAP = {
    "short": 0.1,
    "medium": 0.4,
    "long": 0.7,
    "very_long": 1.0,
}


def _avg_mapped(values: list[str | None], mapping: dict[str, float]) -> float | None:
    mapped = [mapping[v] for v in values if v and v in mapping]
    if not mapped:
        return None
    return round(sum(mapped) / len(mapped), 3)


@router.get("/palate-radar")
async def palate_radar(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Returns preference axes on a 0–1 scale, computed from all tasting notes.
    Field names use the pref_* prefix to match the UserTasteProfile frontend type.
    """
    stmt = select(
        TastingNote.palate_acidity,
        TastingNote.palate_tannin,
        TastingNote.palate_body,
        TastingNote.palate_sweetness,
        TastingNote.palate_alcohol,
        TastingNote.palate_finish,
        TastingNote.nose_descriptors,
        TastingNote.palate_descriptors,
        TastingNote.wine_id,
    ).where(TastingNote.user_id == user_id)

    rows = (await db.execute(stmt)).all()

    # Aggregate flavor affinities from descriptors
    from collections import Counter
    descriptor_counts: Counter = Counter()
    for r in rows:
        for d in (r.nose_descriptors or []) + (r.palate_descriptors or []):
            if isinstance(d, dict) and "descriptor" in d:
                descriptor_counts[d["descriptor"]] += 1
    flavor_affinities = dict(descriptor_counts.most_common(20))

    # Top regions from notes (via wine → appellation join)
    top_regions: list[str] = []
    top_grapes: list[str] = []
    if rows:
        region_stmt = (
            select(Appellation.region, func.count(TastingNote.id).label("cnt"))
            .join(Wine, Wine.id == TastingNote.wine_id)
            .join(Appellation, Appellation.id == Wine.appellation_id)
            .where(
                TastingNote.user_id == user_id,
                Appellation.region.isnot(None),
            )
            .group_by(Appellation.region)
            .order_by(func.count(TastingNote.id).desc())
            .limit(5)
        )
        region_rows = (await db.execute(region_stmt)).all()
        top_regions = [r.region for r in region_rows]

    return {
        "pref_acidity": _avg_mapped([r.palate_acidity for r in rows], _ACIDITY_MAP),
        "pref_tannin": _avg_mapped([r.palate_tannin for r in rows], _TANNIN_MAP),
        "pref_body": _avg_mapped([r.palate_body for r in rows], _BODY_MAP),
        "pref_sweetness": _avg_mapped([r.palate_sweetness for r in rows], _SWEETNESS_MAP),
        "pref_oak": None,  # not derivable from structured note fields
        "note_count": len(rows),
        "top_regions": top_regions,
        "top_grapes": top_grapes,
        "flavor_affinities": flavor_affinities,
    }


# ---------------------------------------------------------------------------
# /stats/consumption-rate
# ---------------------------------------------------------------------------


@router.get("/consumption-rate")
async def consumption_rate(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """
    Monthly bottle consumption over the last 12 months.
    Counts cellar entries that were consumed (status=consumed or gifted/sold)
    in the rolling window, grouped by year + month.
    """
    stmt = (
        select(
            func.extract("year", CellarEntry.consumed_at).label("year"),
            func.extract("month", CellarEntry.consumed_at).label("month"),
            func.sum(CellarEntry.quantity).label("bottles"),
        )
        .where(
            CellarEntry.user_id == user_id,
            CellarEntry.consumed_at.isnot(None),
            CellarEntry.consumed_at >= datetime.now(timezone.utc) - timedelta(days=365),
        )
        .group_by("year", "month")
        .order_by("year", "month")
    )

    rows = (await db.execute(stmt)).all()
    return [
        {
            "year": int(row.year),
            "month": int(row.month),
            "bottles": int(row.bottles or 0),
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# /stats/critic-agreement
# ---------------------------------------------------------------------------


@router.get("/critic-agreement")
async def critic_agreement(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Pearson correlation between the user's personal_score and each critic score
    (Parker, Spectator, Jancis, Decanter, Suckling).
    Only notes that have both a personal_score and the relevant critic score are used.
    Returns {parker: r | null, spectator: r | null, ...} where r ∈ [-1, 1].
    """
    stmt = select(
        TastingNote.personal_score,
        TastingNote.parker_score,
        TastingNote.spectator_score,
        TastingNote.jancis_score,
        TastingNote.decanter_score,
        TastingNote.suckling_score,
    ).where(
        TastingNote.user_id == user_id,
        TastingNote.personal_score.isnot(None),
    )
    rows = (await db.execute(stmt)).all()

    def pearson_r(pairs: list[tuple[float, float]]) -> float | None:
        n = len(pairs)
        if n < 3:
            return None
        xs = [p[0] for p in pairs]
        ys = [p[1] for p in pairs]
        mean_x = sum(xs) / n
        mean_y = sum(ys) / n
        num = sum((x - mean_x) * (y - mean_y) for x, y in pairs)
        den = math.sqrt(
            sum((x - mean_x) ** 2 for x in xs) * sum((y - mean_y) ** 2 for y in ys)
        )
        if den == 0:
            return None
        return round(num / den, 4)

    critics = {
        "parker": "parker_score",
        "spectator": "spectator_score",
        "jancis": "jancis_score",
        "decanter": "decanter_score",
        "suckling": "suckling_score",
    }
    result: dict[str, object] = {}
    for critic, attr in critics.items():
        pairs = [
            (float(r.personal_score), float(getattr(r, attr)))
            for r in rows
            if getattr(r, attr) is not None
        ]
        result[critic] = pearson_r(pairs)
        result[f"{critic}_note_count"] = len(pairs)

    return result


# ---------------------------------------------------------------------------
# /stats/taste-evolution
# ---------------------------------------------------------------------------


@router.get("/taste-evolution")
async def taste_evolution(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """
    Per-quarter averages of palate axes (acidity, tannin, body, sweetness).
    Periods with fewer than 2 notes are omitted.
    Shape: [{period: "2024-Q1", avg_acidity: 0.72, avg_tannin: 0.65, ...}]
    """
    stmt = select(
        TastingNote.tasted_at,
        TastingNote.palate_acidity,
        TastingNote.palate_tannin,
        TastingNote.palate_body,
        TastingNote.palate_sweetness,
    ).where(TastingNote.user_id == user_id)

    rows = (await db.execute(stmt)).all()

    # Group by calendar quarter
    from collections import defaultdict

    quarters: dict[str, list] = defaultdict(list)
    for row in rows:
        if row.tasted_at is None:
            continue
        dt = row.tasted_at
        q = (dt.month - 1) // 3 + 1
        period = f"{dt.year}-Q{q}"
        quarters[period].append(row)

    output: list[dict] = []
    for period in sorted(quarters):
        period_rows = quarters[period]
        if len(period_rows) < 2:
            continue
        output.append(
            {
                "period": period,
                "note_count": len(period_rows),
                "avg_acidity": _avg_mapped(
                    [r.palate_acidity for r in period_rows], _ACIDITY_MAP
                ),
                "avg_tannin": _avg_mapped(
                    [r.palate_tannin for r in period_rows], _TANNIN_MAP
                ),
                "avg_body": _avg_mapped(
                    [r.palate_body for r in period_rows], _BODY_MAP
                ),
                "avg_sweetness": _avg_mapped(
                    [r.palate_sweetness for r in period_rows], _SWEETNESS_MAP
                ),
            }
        )

    return output


# ---------------------------------------------------------------------------
# /stats/blind-accuracy
# ---------------------------------------------------------------------------


@router.get("/blind-accuracy")
async def blind_accuracy(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Aggregate blind tasting prediction accuracy from all revealed blind notes.
    Returns overall_pct and per-dimension accuracy rates.
    Only notes where is_blind=True AND blind_prediction contains a revealed accuracy
    entry are counted.
    """
    stmt = select(TastingNote.blind_prediction).where(
        TastingNote.user_id == user_id,
        TastingNote.is_blind.is_(True),
        TastingNote.blind_prediction.isnot(None),
    )
    rows = (await db.execute(stmt)).scalars().all()

    total = len(rows)
    revealed = [r for r in rows if isinstance(r, dict) and r.get("revealed")]

    if not revealed:
        return {
            "total_blind": total,
            "total_revealed": 0,
            "avg_accuracy": None,
            "grape_accuracy": None,
            "region_accuracy": None,
            "vintage_accuracy": None,
            "tier_accuracy": None,
        }

    def _pct_correct(key: str) -> float | None:
        scores = [
            r["accuracy"]["details"].get(key, {})
            for r in revealed
            if "accuracy" in r and "details" in r["accuracy"]
        ]
        if not scores:
            return None
        correct = sum(1 for s in scores if s.get("correct") or s.get("in_range"))
        return round(correct / len(scores), 4)

    overall_scores = [
        r["accuracy"]["overall_pct"]
        for r in revealed
        if "accuracy" in r and "overall_pct" in r["accuracy"]
    ]
    avg = round(sum(overall_scores) / len(overall_scores), 1) if overall_scores else None

    return {
        "total_blind": total,
        "total_revealed": len(revealed),
        "avg_accuracy": avg,
        "grape_accuracy": _pct_correct("grape"),
        "region_accuracy": _pct_correct("region"),
        "vintage_accuracy": _pct_correct("vintage"),
        "tier_accuracy": _pct_correct("tier"),
    }
