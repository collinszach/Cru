"""
Wine label scanner using Claude Vision (claude-sonnet-4-6).
Extracts structured wine metadata from label photos.

Prompt sourced directly from CLAUDE.md — do not modify the extraction prompt.
Target response time: < 8s (show skeleton UI immediately on frontend).
"""
import base64
import json
from typing import Optional

import anthropic
from pydantic import BaseModel

from app.config import get_settings

_SUPPORTED_MEDIA_TYPES: dict[str, str] = {
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
}

_LABEL_SCANNER_PROMPT = """Analyze this wine label image and extract the following in JSON format:

{
  "producer": "exact producer/château/domaine name",
  "wine_name": "cuvée/wine name (may be same as producer for simple wines)",
  "appellation": "the geographic appellation or AVA/AOC designation",
  "region": "broader region (e.g., Burgundy, Napa Valley)",
  "country": "country of origin",
  "vintage": 2019,
  "grapes": ["Pinot Noir"],
  "alcohol_pct": 13.5,
  "classification": "Grand Cru",
  "style": "red",
  "volume_ml": 750,
  "additional_text": "any other notable text (biodynamic cert, vineyard name, etc.)"
}

If a field is not visible or legible on the label, return null for that field.
Be precise — wine producers, appellations, and cuvée names must be exact."""


class LabelScanResult(BaseModel):
    producer: Optional[str] = None
    wine_name: Optional[str] = None
    appellation: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    vintage: Optional[int] = None
    grapes: Optional[list[str]] = None
    alcohol_pct: Optional[float] = None
    classification: Optional[str] = None
    style: Optional[str] = None
    volume_ml: Optional[int] = None
    additional_text: Optional[str] = None
    confidence: Optional[str] = None          # high | medium | low
    extraction_notes: Optional[str] = None


def _extract_json(text: str) -> str:
    """Strip markdown code fences if Claude wrapped the JSON."""
    if "```json" in text:
        return text.split("```json")[1].split("```")[0].strip()
    if "```" in text:
        return text.split("```")[1].split("```")[0].strip()
    return text.strip()


async def scan_label(image_data: bytes, media_type: str = "image/jpeg") -> LabelScanResult:
    """
    Send a label image to Claude Vision and return extracted wine metadata.

    Args:
        image_data: Raw image bytes (JPEG / PNG / WebP / GIF).
        media_type: MIME type of the image.

    Returns:
        LabelScanResult — fields are None where not legible on the label.

    Raises:
        anthropic.APIError: On network or API-level failures (let the caller decide
            whether to surface or swallow, per CLAUDE.md: fail loudly).
    """
    if not image_data:
        raise ValueError("image_data must not be empty")

    anthropic_media_type = _SUPPORTED_MEDIA_TYPES.get(media_type.lower(), "image/jpeg")
    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    image_b64 = base64.standard_b64encode(image_data).decode("utf-8")

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": anthropic_media_type,
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": _LABEL_SCANNER_PROMPT,
                    },
                ],
            }
        ],
    )

    response_text = message.content[0].text

    try:
        json_str = _extract_json(response_text)
        data = json.loads(json_str)
        # Only pass fields that LabelScanResult knows about
        known = LabelScanResult.model_fields.keys()
        return LabelScanResult(**{k: v for k, v in data.items() if k in known})
    except (json.JSONDecodeError, Exception) as exc:
        # Return a low-confidence partial rather than raising — frontend renders what it got.
        return LabelScanResult(
            confidence="low",
            extraction_notes=f"JSON parse failed: {str(exc)[:200]}",
        )
