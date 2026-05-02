"""
Blind tasting prediction service using Claude (claude-sonnet-4-6).
Implements MW-style systematic deduction from structured tasting notes.

The BLIND_TASTING_PROMPT is sourced verbatim from CLAUDE.md.
"""
import json

import anthropic
from pydantic import BaseModel

from app.config import get_settings


class GrapeConfidence(BaseModel):
    grape: str
    confidence: float  # 0.0–1.0


class RegionConfidence(BaseModel):
    region: str
    confidence: float


class BlindTastingPrediction(BaseModel):
    probable_grapes: list[GrapeConfidence]
    probable_regions: list[RegionConfidence]
    probable_vintage_range: dict  # {from: int, to: int}
    quality_tier: str  # village | premier_cru | grand_cru | regional
    reasoning: str
    confidence_overall: float


BLIND_TASTING_PROMPT = """You are examining a blind tasting note for a classic deduction exercise.

STRUCTURED NOTE:
{structured_note}

Apply systematic MW-style deduction:

1. APPEARANCE clues: What does color intensity/hue tell us about age, grape, climate?
2. NOSE deduction: Map these primary/secondary/tertiary descriptors to likely regions/grapes
3. PALATE deduction: Acidity, tannin level/nature, body, alcohol → climate and style
4. SYNTHESIS: What combination of grape + climate + age + winemaking produces this profile?

Respond in JSON:
{{
  "probable_grapes": [{{"grape": "Pinot Noir", "confidence": 0.75}}],
  "probable_regions": [{{"region": "Côte de Nuits, Burgundy", "confidence": 0.65}}],
  "probable_vintage_range": {{"from": 2012, "to": 2018}},
  "quality_tier": "premier_cru",
  "reasoning": "The combination of high acidity, fine-grained tannin, red fruit with tertiary earth and sous-bois, and a 7-second finish points strongly toward...",
  "confidence_overall": 0.6
}}"""


def _format_note_for_prompt(note_data: dict) -> str:
    """Format structured tasting note fields into readable text for Claude."""
    lines: list[str] = []

    # Appearance
    app_parts = [
        note_data.get("app_intensity"),
        note_data.get("app_color"),
        note_data.get("app_clarity"),
    ]
    if any(app_parts):
        lines.append(f"APPEARANCE: {', '.join(p for p in app_parts if p)}")

    # Nose
    nose_parts: list[str] = []
    if note_data.get("nose_intensity"):
        nose_parts.append(f"Intensity: {note_data['nose_intensity']}")
    if note_data.get("nose_development"):
        nose_parts.append(f"Development: {note_data['nose_development']}")
    if note_data.get("nose_descriptors"):
        descs = [
            d.get("descriptor", "")
            for d in note_data["nose_descriptors"]
            if d.get("descriptor")
        ]
        if descs:
            nose_parts.append(f"Descriptors: {', '.join(descs)}")
    if nose_parts:
        lines.append(f"NOSE: {'; '.join(nose_parts)}")

    # Palate
    palate_parts: list[str] = []
    for field, label in [
        ("palate_sweetness", "Sweetness"),
        ("palate_acidity", "Acidity"),
        ("palate_tannin", "Tannin"),
        ("palate_tannin_nature", "Tannin nature"),
        ("palate_body", "Body"),
        ("palate_alcohol", "Alcohol"),
        ("palate_finish", "Finish"),
    ]:
        if note_data.get(field):
            palate_parts.append(f"{label}: {note_data[field]}")
    if note_data.get("palate_finish_sec"):
        palate_parts.append(f"Finish length: {note_data['palate_finish_sec']}s")
    if note_data.get("palate_descriptors"):
        descs = [
            d.get("descriptor", "")
            for d in note_data["palate_descriptors"]
            if d.get("descriptor")
        ]
        if descs:
            palate_parts.append(f"Descriptors: {', '.join(descs)}")
    if palate_parts:
        lines.append(f"PALATE: {'; '.join(palate_parts)}")

    # Conclusions
    if note_data.get("quality"):
        lines.append(f"QUALITY ASSESSMENT: {note_data['quality']}")
    if note_data.get("readiness"):
        lines.append(f"READINESS: {note_data['readiness']}")

    return "\n".join(lines) if lines else "Insufficient note data for deduction."


async def predict_blind_wine(note_data: dict) -> BlindTastingPrediction:
    """
    Run blind tasting prediction on a structured tasting note.
    Returns MW-style deduction with confidence scores.
    """
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    structured_note = _format_note_for_prompt(note_data)
    prompt = BLIND_TASTING_PROMPT.format(structured_note=structured_note)

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    response_text = message.content[0].text
    # Strip markdown fences if present
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0].strip()
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0].strip()

    data = json.loads(response_text)
    return BlindTastingPrediction(**data)


def score_prediction_accuracy(
    prediction: BlindTastingPrediction,
    actual: dict,  # {grape: str, region: str, vintage: int, classification: str}
) -> dict:
    """
    Score Claude's prediction against the actual wine.
    Returns {overall_pct, grape_correct, region_correct, vintage_in_range, tier_correct, details}
    """
    score: float = 0.0
    max_score = 4
    details: dict = {}

    # Grape — top prediction vs actual
    if prediction.probable_grapes:
        top_grape = prediction.probable_grapes[0].grape.lower()
        actual_grape = (actual.get("grape") or "").lower()
        grape_correct = bool(
            actual_grape and (actual_grape in top_grape or top_grape in actual_grape)
        )
        details["grape"] = {
            "predicted": prediction.probable_grapes[0].grape,
            "actual": actual.get("grape"),
            "correct": grape_correct,
        }
        if grape_correct:
            score += 1

    # Region — top prediction vs actual region
    if prediction.probable_regions:
        top_region = prediction.probable_regions[0].region.lower()
        actual_region = (actual.get("region") or "").lower()
        region_correct = bool(
            actual_region
            and (actual_region in top_region or top_region in actual_region)
        )
        partial = not region_correct and any(
            w in top_region for w in actual_region.split() if len(w) > 3
        )
        details["region"] = {
            "predicted": prediction.probable_regions[0].region,
            "actual": actual.get("region"),
            "correct": region_correct,
            "partial": partial,
        }
        if region_correct:
            score += 1
        elif partial:
            score += 0.5

    # Vintage in range
    if actual.get("vintage") and prediction.probable_vintage_range:
        vintage = int(actual["vintage"])
        in_range = (
            prediction.probable_vintage_range.get("from", 0)
            <= vintage
            <= prediction.probable_vintage_range.get("to", 9999)
        )
        details["vintage"] = {
            "range": prediction.probable_vintage_range,
            "actual": vintage,
            "in_range": in_range,
        }
        if in_range:
            score += 1

    # Quality tier
    if actual.get("classification") and prediction.quality_tier:
        tier_map: dict[str, list[str]] = {
            "grand_cru": ["grand cru", "gc"],
            "premier_cru": ["premier cru", "1er cru"],
            "village": ["village", "commune"],
            "regional": ["regional", "generic"],
        }
        actual_cls = actual["classification"].lower()
        tier_correct = any(kw in actual_cls for kw in tier_map.get(prediction.quality_tier, []))
        details["tier"] = {
            "predicted": prediction.quality_tier,
            "actual": actual["classification"],
            "correct": tier_correct,
        }
        if tier_correct:
            score += 1

    return {
        "overall_pct": round((score / max_score) * 100),
        "details": details,
    }
