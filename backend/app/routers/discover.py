"""
Discovery and recommendation router.

Endpoints:
  GET  /api/v1/discover/recommendations   — ANN search against user taste profile
  GET  /api/v1/discover/similar/{wine_id} — wines cosine-similar to a specific wine
  POST /api/v1/discover/natural-language  — Claude-parsed free-text wine query
  GET  /api/v1/discover/value-picks       — high-score / low-price outliers

Performance:
  SET LOCAL ivfflat.probes = 10 is issued before every ANN query (Raj).
  Profile vector is fetched from user_taste_profiles — never recomputed inline.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import get_settings
from app.database import get_db
from app.services.embedding import EMBEDDING_MODEL, build_wine_embedding_text, embed_text

router = APIRouter(prefix="/api/v1/discover", tags=["discover"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class WineRecommendation(BaseModel):
    wine_id: uuid.UUID
    full_name: str
    style: str
    color: str | None
    distance: float
    reason: str


class NaturalLanguageQuery(BaseModel):
    query: str
    limit: int = 10


class NaturalLanguageResult(BaseModel):
    wine_id: uuid.UUID
    full_name: str
    style: str
    color: str | None
    distance: float
    match_reason: str


class ValuePick(BaseModel):
    wine_id: uuid.UUID
    full_name: str
    style: str
    color: str | None
    market_price: float | None
    avg_critic_score: float | None


# ---------------------------------------------------------------------------
# SQL templates
# ---------------------------------------------------------------------------

# Raj: SET LOCAL scopes the probe count to this transaction only, no session leak.
# Note: asyncpg cannot execute multiple statements in a single prepared statement,
# so SET LOCAL is issued as a separate execution before each ANN query.
_SET_PROBES_SQL = text("SET LOCAL ivfflat.probes = 10")

_ANN_SQL = """
SELECT
    w.id                            AS wine_id,
    w.full_name,
    w.style,
    w.color,
    we.embedding <=> CAST(:profile_vector AS vector)  AS distance
FROM wine_embeddings we
JOIN wines w ON w.id = we.wine_id
WHERE we.user_id IS NULL
  AND w.id NOT IN (
      SELECT wine_id
      FROM tasting_notes
      WHERE user_id = :user_id
        AND wine_id IS NOT NULL
      UNION
      SELECT wine_id
      FROM cellar_entries
      WHERE user_id = :user_id
        AND status = 'in_cellar'
        AND wine_id IS NOT NULL
  )
ORDER BY distance ASC
LIMIT :limit
"""

_SIMILAR_SQL = """
SELECT
    w.id                            AS wine_id,
    w.full_name,
    w.style,
    w.color,
    we.embedding <=> CAST(:target_vector AS vector)   AS distance
FROM wine_embeddings we
JOIN wines w ON w.id = we.wine_id
WHERE we.user_id IS NULL
  AND w.id != CAST(:exclude_wine_id AS uuid)
ORDER BY distance ASC
LIMIT :limit
"""

_NL_SQL = """
SELECT
    w.id        AS wine_id,
    w.full_name,
    w.style,
    w.color,
    we.embedding <=> CAST(:query_vector AS vector)    AS distance
FROM wine_embeddings we
JOIN wines w ON w.id = we.wine_id
WHERE we.user_id IS NULL
  {style_filter}
ORDER BY distance ASC
LIMIT :limit
"""

_NL_PARSE_PROMPT = """\
Parse this wine query into structured search criteria.

Query: "{query}"

Return JSON only — no prose, no markdown fences:
{{
  "style": "Still|Sparkling|Fortified|Dessert or null",
  "region": "region name or null",
  "grape": "grape name or null",
  "max_price": number or null,
  "flavor_profile": ["descriptor1", "descriptor2"],
  "occasion": "description or null"
}}"""

_REASON_PROMPT = """\
A user searched for wines with this query: "{query}"

They got back this wine: {wine_name}
It is a {style} {color} wine.

In one short sentence (max 20 words), explain specifically why this wine matches their query.\
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_user_profile_vector(user_id: str, db: AsyncSession) -> list[float]:
    """
    Fetch the user's precomputed taste profile vector.
    Raises 404 if the user has not yet accumulated enough notes to build a profile.
    """
    result = await db.execute(
        text(
            "SELECT profile_vector FROM user_taste_profiles WHERE user_id = :uid"
        ),
        {"uid": user_id},
    )
    row = result.fetchone()
    if row is None or row[0] is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Taste profile not yet available. "
                "Add at least 3 scored tasting notes to unlock recommendations."
            ),
        )
    return row[0]


def _vector_to_pg_literal(vector: list[float] | str) -> str:
    """
    Render a vector as a PostgreSQL vector literal string.

    asyncpg returns pgvector columns as plain strings (e.g. "[0.1,0.2,...]").
    When that happens, the string is already a valid literal — return it directly.
    When the caller passes a Python list[float] (e.g. from embed_text), format it.
    """
    if isinstance(vector, str):
        return vector
    return "[" + ",".join(f"{v:.8f}" for v in vector) + "]"


def _build_reason(full_name: str, style: str, color: str | None, distance: float) -> str:
    """
    Lightweight heuristic reason string — avoids a Claude call per row.
    Used for the recommendations and similar endpoints where the signal is
    implicit (embedding proximity) rather than from a parsed query.
    """
    similarity_pct = max(0, int((1 - distance) * 100))
    color_str = f"{color} " if color else ""
    return (
        f"{similarity_pct}% taste-profile match — {color_str}{style.lower()} "
        f"with shared aromatic and structural characteristics."
    )


async def _claude_reason(
    query: str,
    wine_name: str,
    style: str,
    color: str | None,
) -> str:
    """Ask Claude for a one-sentence explanation of why a wine matches a NL query."""
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    prompt = _REASON_PROMPT.format(
        query=query,
        wine_name=wine_name,
        style=style,
        color=color or "unknown color",
    )
    message = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=60,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


async def _parse_nl_query(query: str) -> dict[str, Any]:
    """Use Claude to parse a natural-language wine query into structured filters."""
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    prompt = _NL_PARSE_PROMPT.format(query=query)
    message = await client.messages.create(
        model="claude-opus-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Best-effort: return empty filters if Claude returned unexpected format
        return {}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/recommendations", response_model=list[WineRecommendation])
async def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    style: str | None = Query(None, description="Filter by wine style"),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WineRecommendation]:
    """
    Return wines most similar to the user's taste profile vector.

    Excludes: wines the user has already rated, wines currently in cellar.
    Requires at least 3 scored tasting notes (profile must exist).
    """
    profile_vector = await _get_user_profile_vector(user_id, db)
    pg_vector = _vector_to_pg_literal(profile_vector)

    # Build SQL with optional style filter
    base_sql = _ANN_SQL
    if style:
        # Inject a style filter into the WHERE clause before the ORDER BY
        base_sql = base_sql.replace(
            "ORDER BY distance ASC",
            "  AND w.style = :style\nORDER BY distance ASC",
        )

    params: dict[str, Any] = {
        "profile_vector": pg_vector,
        "user_id": user_id,
        "limit": limit,
    }
    if style:
        params["style"] = style

    await db.execute(_SET_PROBES_SQL)
    result = await db.execute(text(base_sql), params)
    rows = result.fetchall()

    return [
        WineRecommendation(
            wine_id=row.wine_id,
            full_name=row.full_name,
            style=row.style,
            color=row.color,
            distance=float(row.distance),
            reason=_build_reason(row.full_name, row.style, row.color, float(row.distance)),
        )
        for row in rows
    ]


@router.get("/similar/{wine_id}", response_model=list[WineRecommendation])
async def get_similar_wines(
    wine_id: uuid.UUID,
    limit: int = Query(10, ge=1, le=50),
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WineRecommendation]:
    """
    Return wines most similar to a specific wine by embedding cosine distance.

    Uses the wine's global embedding as the query vector.
    """
    # Fetch the target wine's latest global embedding
    result = await db.execute(
        text(
            """
            SELECT we.embedding, w.full_name, w.style, w.color
            FROM wine_embeddings we
            JOIN wines w ON w.id = we.wine_id
            WHERE we.wine_id = CAST(:wine_id AS uuid)
              AND we.user_id IS NULL
            ORDER BY we.created_at DESC
            LIMIT 1
            """
        ),
        {"wine_id": str(wine_id)},
    )
    target = result.fetchone()
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wine not found or embedding not yet generated for this wine.",
        )

    pg_vector = _vector_to_pg_literal(target.embedding)

    await db.execute(_SET_PROBES_SQL)
    result = await db.execute(
        text(_SIMILAR_SQL),
        {
            "target_vector": pg_vector,
            "exclude_wine_id": str(wine_id),
            "limit": limit,
        },
    )
    rows = result.fetchall()

    return [
        WineRecommendation(
            wine_id=row.wine_id,
            full_name=row.full_name,
            style=row.style,
            color=row.color,
            distance=float(row.distance),
            reason=_build_reason(row.full_name, row.style, row.color, float(row.distance)),
        )
        for row in rows
    ]


@router.post("/natural-language", response_model=list[NaturalLanguageResult])
async def natural_language_search(
    payload: NaturalLanguageQuery,
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[NaturalLanguageResult]:
    """
    Parse a free-text wine query with Claude, embed the intent, and run ANN search.

    Example queries:
      - "Find me something like the 2015 Pichon Baron under $80"
      - "An earthy red with high acidity and long finish for a lamb dish"
      - "An affordable Burgundy-style Pinot Noir from outside France"

    The query text is embedded directly; Claude also extracts structured filters
    (style, region) that narrow the vector search. Price filtering is noted but
    deferred to a future Wine-Searcher integration.
    """
    filters = await _parse_nl_query(payload.query)

    # Embed the raw query text as the semantic anchor
    query_vector = await embed_text(payload.query)
    pg_vector = _vector_to_pg_literal(query_vector)

    # Apply extracted style filter if present
    style_filter = ""
    params: dict[str, Any] = {
        "query_vector": pg_vector,
        "limit": payload.limit,
    }
    extracted_style = filters.get("style")
    if extracted_style:
        style_filter = "AND w.style = :style"
        params["style"] = extracted_style

    sql = _NL_SQL.format(style_filter=style_filter)
    await db.execute(_SET_PROBES_SQL)
    result = await db.execute(text(sql), params)
    rows = result.fetchall()

    # Generate per-wine reason strings from Claude (top 3 only to limit API calls)
    output: list[NaturalLanguageResult] = []
    for i, row in enumerate(rows):
        if i < 3:
            reason = await _claude_reason(
                payload.query, row.full_name, row.style, row.color
            )
        else:
            reason = _build_reason(row.full_name, row.style, row.color, float(row.distance))

        output.append(
            NaturalLanguageResult(
                wine_id=row.wine_id,
                full_name=row.full_name,
                style=row.style,
                color=row.color,
                distance=float(row.distance),
                match_reason=reason,
            )
        )

    return output


@router.get("/value-picks", response_model=list[ValuePick])
async def get_value_picks(
    style: str | None = Query(None),
    color: str | None = Query(None),
    max_price: float | None = Query(None, ge=0),
    limit: int = Query(20, ge=1, le=100),
    _user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ValuePick]:
    """
    Surface wines with high critic scores relative to their market price.

    Uses current_value from cellar_entries (populated by nightly Wine-Searcher sync)
    combined with critic scores from tasting_notes. Only wines with both a market
    price and at least one critic score are returned.
    """
    # Build a query that aggregates critic scores and gets the latest market price
    where_clauses = ["w.id IS NOT NULL"]
    params: dict[str, Any] = {"limit": limit}

    if style:
        where_clauses.append("w.style = :style")
        params["style"] = style
    if color:
        where_clauses.append("w.color = :color")
        params["color"] = color
    if max_price is not None:
        where_clauses.append("price_data.market_price <= :max_price")
        params["max_price"] = max_price

    where_sql = " AND ".join(where_clauses)

    sql = f"""
    WITH price_data AS (
        SELECT
            wine_id,
            AVG(current_value) AS market_price
        FROM cellar_entries
        WHERE current_value IS NOT NULL
        GROUP BY wine_id
    ),
    score_data AS (
        SELECT
            wine_id,
            AVG(
                COALESCE(parker_score, spectator_score, decanter_score, suckling_score)::float
            ) AS avg_critic_score
        FROM tasting_notes
        WHERE (
            parker_score IS NOT NULL
            OR spectator_score IS NOT NULL
            OR decanter_score IS NOT NULL
            OR suckling_score IS NOT NULL
        )
        GROUP BY wine_id
    )
    SELECT
        w.id            AS wine_id,
        w.full_name,
        w.style,
        w.color,
        price_data.market_price,
        score_data.avg_critic_score,
        -- value score: points per dollar (higher = better value)
        CASE
            WHEN price_data.market_price > 0
            THEN score_data.avg_critic_score / price_data.market_price
            ELSE NULL
        END             AS value_ratio
    FROM wines w
    JOIN price_data ON price_data.wine_id = w.id
    JOIN score_data ON score_data.wine_id = w.id
    WHERE {where_sql}
    ORDER BY value_ratio DESC NULLS LAST
    LIMIT :limit
    """

    result = await db.execute(text(sql), params)
    rows = result.fetchall()

    return [
        ValuePick(
            wine_id=row.wine_id,
            full_name=row.full_name,
            style=row.style,
            color=row.color,
            market_price=float(row.market_price) if row.market_price is not None else None,
            avg_critic_score=(
                float(row.avg_critic_score) if row.avg_critic_score is not None else None
            ),
        )
        for row in rows
    ]
