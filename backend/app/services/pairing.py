"""
Food pairing engine using Claude (claude-sonnet-4-6).
Three modes: from-food (what wine?), from-wine (what food?), tonight (cellar picks).
"""
import json

import anthropic

from app.config import get_settings

FROM_FOOD_PROMPT = """You are a sommelier recommending wines to pair with a dish.

DISH: {food_description}
USER PREFERENCES: {taste_summary}
CONSTRAINTS: {constraints}

Recommend 3 wine styles (not specific bottles) that would pair excellently with this dish.
For each recommendation:
- Wine style/region (e.g. "White Burgundy, Meursault")
- Why it works (1-2 sentences, specific to this dish — acidity, fat, protein, etc.)
- What to avoid and why

Be specific about the chemistry: what in the wine complements what in the food.
Format as JSON: [{{"style": "...", "why": "...", "avoid": "..."}}]"""

FROM_WINE_PROMPT = """You are a sommelier suggesting food pairings for a specific wine.

WINE: {wine_name} {vintage}
REGION: {region}
TASTING NOTES: {tasting_notes}

Suggest 4 food pairings that would complement this wine.
Consider: the wine's structure (acidity, tannin, body), its flavor profile, its weight.
For each: dish name, why it works, ideal preparation method.
Format as JSON: [{{"dish": "...", "why": "...", "preparation": "..."}}]"""

TONIGHT_PROMPT = """You are a sommelier helping choose from a specific wine cellar for tonight's dinner.

DISH: {dish}
CONSTRAINTS: {constraints}

AVAILABLE BOTTLES IN CELLAR (currently in drinking window):
{cellar_options}

Rank the top 3 choices from the cellar for this meal. For each:
- Why this bottle specifically (reference the wine, vintage, and notes if available)
- Decanting recommendation
- Serving temperature

Format as JSON: [{{"wine_id": "...", "wine_name": "...", "vintage": 0, "reason": "...", "decant_minutes": 0, "serve_temp_c": 0.0}}]"""


def _strip_json_fences(text: str) -> str:
    if "```json" in text:
        return text.split("```json")[1].split("```")[0].strip()
    if "```" in text:
        return text.split("```")[1].split("```")[0].strip()
    return text.strip()


async def pair_from_food(
    food: str,
    taste_summary: str = "",
    constraints: str = "",
) -> list[dict]:
    """
    Given a food description, return 3 wine style recommendations with pairing rationale.
    """
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    prompt = FROM_FOOD_PROMPT.format(
        food_description=food,
        taste_summary=taste_summary or "No preference data available",
        constraints=constraints or "None",
    )
    msg = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(_strip_json_fences(msg.content[0].text))


async def pair_from_wine(
    wine_name: str,
    vintage: int,
    region: str,
    tasting_notes: str = "",
) -> list[dict]:
    """
    Given a wine, return 4 food pairing suggestions with preparation guidance.
    """
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    prompt = FROM_WINE_PROMPT.format(
        wine_name=wine_name,
        vintage=vintage,
        region=region,
        tasting_notes=tasting_notes or "No tasting notes available",
    )
    msg = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(_strip_json_fences(msg.content[0].text))


async def pair_tonight(
    dish: str,
    constraints: str,
    cellar_options: list[dict],
) -> list[dict]:
    """
    Given a dish and the user's in-window cellar bottles, return up to 3 ranked picks
    with specific reasoning, decant time, and serve temperature.
    """
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    # Cap at 20 bottles to keep the prompt size predictable
    cellar_str = json.dumps(cellar_options[:20], indent=2)
    prompt = TONIGHT_PROMPT.format(
        dish=dish,
        constraints=constraints or "None",
        cellar_options=cellar_str,
    )
    msg = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return json.loads(_strip_json_fences(msg.content[0].text))
