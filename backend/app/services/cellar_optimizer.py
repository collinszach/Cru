"""
Cellar optimizer using Claude (claude-sonnet-4-6).
Generates personalized advice on what to open, what to hold, what's at risk.

The prompt is sourced from CLAUDE.md verbatim — do not modify it.
Response is cached for 24h (key: f"optimizer:{user_id}") to avoid repeated Claude calls.
"""
import json
from datetime import datetime, timezone

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.cellar_entry import CellarEntry
from app.models.user_taste_profile import UserTasteProfile
from app.models.wine import Wine
from app.models.appellation import Appellation
from app.models.producer import Producer
from app.services.drinking_window import calculate_drinking_window


# Verbatim from CLAUDE.md — do not modify.
CELLAR_OPTIMIZER_PROMPT = """\
You are a Master Sommelier advising a serious collector on their cellar.

USER'S TASTE PROFILE:
{taste_profile_summary}

CURRENT CELLAR ({bottle_count} bottles, total value ${total_value}):
{cellar_json}

DRINKING WINDOW ANALYSIS:
{window_analysis}

Provide:
1. TOP 5 BOTTLES TO OPEN IN THE NEXT 6 MONTHS (with specific reasons, flag anything at risk)
2. TOP 3 BOTTLES TO HOLD (explain why they benefit most from more time)
3. ANY BOTTLES PAST OR NEAR PEAK (urgent action needed)
4. ONE OBSERVATION about cellar composition balance (over-concentrated in a region/style?)
5. ONE ACQUISITION SUGGESTION based on gaps in the cellar vs their taste profile

Be specific. Use producer names and vintages. Think like a MW advising a real collection."""


async def get_cellar_optimization(
    user_id: str,
    db: AsyncSession,
    redis_client=None,
) -> dict:
    """
    Generate Claude-powered cellar optimization advice.
    Cached 24h in Redis. Falls back to generating fresh if Redis unavailable.
    """
    cache_key = f"optimizer:{user_id}"

    if redis_client:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)

    result = await db.execute(
        select(CellarEntry, Wine, Appellation, Producer)
        .join(Wine, Wine.id == CellarEntry.wine_id)
        .outerjoin(Appellation, Appellation.id == Wine.appellation_id)
        .outerjoin(Producer, Producer.id == Wine.producer_id)
        .where(CellarEntry.user_id == user_id)
        .where(CellarEntry.status == "in_cellar")
        .order_by(CellarEntry.vintage)
    )
    rows = result.all()

    if not rows:
        return {
            "error": "no_bottles",
            "message": "Add bottles to your cellar to receive optimization advice.",
        }

    cellar_items = []
    window_items = []
    total_value = 0.0

    for entry, wine, appellation, producer in rows:
        window = calculate_drinking_window(
            appellation_slug=appellation.slug if appellation else "default",
            vintage=entry.vintage,
        )
        value = float(entry.current_value or entry.purchase_price or 0)
        total_value += value * (entry.quantity or 1)

        cellar_items.append({
            "wine": wine.full_name,
            "vintage": entry.vintage,
            "quantity": entry.quantity,
            "value_per_bottle": value,
            "bin": entry.bin_location,
        })
        window_items.append(
            f"{wine.full_name} {entry.vintage}: {window['status']} — {window['recommendation']}"
        )

    profile_result = await db.execute(
        select(UserTasteProfile).where(UserTasteProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()

    if profile and profile.note_count >= 3:
        affinities: dict = profile.flavor_affinities or {}
        top_flavors = sorted(affinities.items(), key=lambda x: x[1], reverse=True)[:8]
        taste_summary = (
            f"Based on {profile.note_count} tasting notes. "
            f"Prefers: acidity={float(profile.pref_acidity or 0):.1f}/1, "
            f"tannin={float(profile.pref_tannin or 0):.1f}/1, "
            f"body={float(profile.pref_body or 0):.1f}/1. "
            f"Top flavors: {', '.join(f for f, _ in top_flavors)}."
        )
    else:
        taste_summary = "Taste profile not yet established (fewer than 3 tasting notes)."

    prompt = CELLAR_OPTIMIZER_PROMPT.format(
        taste_profile_summary=taste_summary,
        bottle_count=sum(e.quantity or 1 for e, _, _, _ in rows),
        total_value=f"{total_value:,.0f}",
        cellar_json=json.dumps(cellar_items, indent=2),
        window_analysis="\n".join(window_items),
    )

    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    advice_text = message.content[0].text

    result_data = {
        "advice": advice_text,
        "bottle_count": len(rows),
        "total_value": total_value,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

    if redis_client:
        await redis_client.setex(cache_key, 86400, json.dumps(result_data))

    return result_data
