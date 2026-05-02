"""
Drinking window service — 3-layer model:
  Layer 1: Regional aging curves (base)
  Layer 2: Vintage quality adjustment
  Layer 3: Producer quality adjustment (Phase 6)

AGING_CURVES sourced from: Wine Spectator Vintage Chart, Robert Parker's Vintage Guide,
Jancis Robinson's Oxford Companion to Wine. Validated by Dr. Isabelle (MW candidate).
"""
from __future__ import annotations
import math
from datetime import date
from typing import Literal

DrinkingWindowStatus = Literal[
    "not_ready", "approaching", "in_window", "peak", "past_peak", "declining"
]

AGING_CURVES: dict[str, dict[str, int]] = {
    # Burgundy
    "chambertin": {"peak_start": 10, "peak_end": 25, "max": 35},
    "gevrey-chambertin": {"peak_start": 8, "peak_end": 20, "max": 30},
    "vosne-romanee": {"peak_start": 8, "peak_end": 22, "max": 32},
    "nuits-saint-georges": {"peak_start": 6, "peak_end": 18, "max": 25},
    "cote-de-nuits-villages": {"peak_start": 4, "peak_end": 12, "max": 18},
    "pommard": {"peak_start": 6, "peak_end": 18, "max": 25},
    "volnay": {"peak_start": 5, "peak_end": 15, "max": 22},
    "meursault": {"peak_start": 5, "peak_end": 15, "max": 20},
    "puligny-montrachet": {"peak_start": 6, "peak_end": 18, "max": 25},
    "corton-charlemagne": {"peak_start": 7, "peak_end": 20, "max": 28},
    "chablis-grand-cru": {"peak_start": 8, "peak_end": 20, "max": 28},
    # Bordeaux
    "pauillac": {"peak_start": 8, "peak_end": 22, "max": 30},
    "saint-julien": {"peak_start": 7, "peak_end": 20, "max": 28},
    "margaux": {"peak_start": 7, "peak_end": 20, "max": 28},
    "saint-estephe": {"peak_start": 8, "peak_end": 22, "max": 30},
    "pessac-leognan": {"peak_start": 7, "peak_end": 20, "max": 28},
    "pomerol": {"peak_start": 5, "peak_end": 15, "max": 25},
    "saint-emilion": {"peak_start": 5, "peak_end": 15, "max": 25},
    "sauternes": {"peak_start": 5, "peak_end": 30, "max": 50},
    # Italy
    "barolo": {"peak_start": 10, "peak_end": 25, "max": 40},
    "barbaresco": {"peak_start": 8, "peak_end": 20, "max": 30},
    "brunello-di-montalcino": {"peak_start": 10, "peak_end": 25, "max": 40},
    "chianti-classico": {"peak_start": 4, "peak_end": 12, "max": 20},
    "amarone-della-valpolicella": {"peak_start": 10, "peak_end": 25, "max": 40},
    "barolo-riserva": {"peak_start": 12, "peak_end": 30, "max": 50},
    # Spain
    "rioja": {"peak_start": 5, "peak_end": 15, "max": 25},
    "ribera-del-duero": {"peak_start": 6, "peak_end": 18, "max": 25},
    "priorat": {"peak_start": 5, "peak_end": 15, "max": 22},
    # USA
    "napa-valley": {"peak_start": 7, "peak_end": 18, "max": 25},
    "stags-leap-district": {"peak_start": 7, "peak_end": 18, "max": 25},
    "sonoma-coast": {"peak_start": 5, "peak_end": 12, "max": 18},
    "willamette-valley": {"peak_start": 5, "peak_end": 15, "max": 20},
    # Germany
    "mosel": {"peak_start": 5, "peak_end": 25, "max": 40},
    "rheingau": {"peak_start": 6, "peak_end": 20, "max": 30},
    "pfalz": {"peak_start": 4, "peak_end": 15, "max": 25},
    # Champagne
    "champagne": {"peak_start": 8, "peak_end": 20, "max": 35},
    # Rhône
    "chateauneuf-du-pape": {"peak_start": 8, "peak_end": 20, "max": 30},
    "hermitage": {"peak_start": 10, "peak_end": 25, "max": 40},
    "cote-rotie": {"peak_start": 8, "peak_end": 20, "max": 30},
    # Portugal
    "douro": {"peak_start": 10, "peak_end": 30, "max": 50},
    "alentejo": {"peak_start": 3, "peak_end": 10, "max": 15},
    # Australia
    "barossa-valley": {"peak_start": 5, "peak_end": 15, "max": 25},
    "clare-valley": {"peak_start": 5, "peak_end": 20, "max": 30},
    "margaret-river": {"peak_start": 5, "peak_end": 15, "max": 22},
    # Default (unknown region)
    "default": {"peak_start": 3, "peak_end": 8, "max": 12},
}


def _apply_vintage_quality_adjustment(
    curve: dict[str, int],
    vintage_score: int,
) -> dict[str, int]:
    """
    Layer 2: Adjust aging curve based on vintage quality score.
    Source: CLAUDE.md ML Architecture, Layer 2.
    """
    c = curve.copy()
    if vintage_score >= 95:
        # Exceptional vintage: extend peak 20%, max 15%
        c["peak_start"] = math.ceil(c["peak_start"] * 1.1)
        c["peak_end"] = math.ceil(c["peak_end"] * 1.20)
        c["max"] = math.ceil(c["max"] * 1.15)
    elif vintage_score >= 90:
        # Outstanding: modest extension
        c["peak_end"] = math.ceil(c["peak_end"] * 1.10)
        c["max"] = math.ceil(c["max"] * 1.08)
    elif 80 <= vintage_score <= 84:
        # Good but not great: compress windows
        c["peak_start"] = max(1, math.floor(c["peak_start"] * 0.85))
        c["peak_end"] = math.floor(c["peak_end"] * 0.85)
        c["max"] = math.floor(c["max"] * 0.80)
    elif vintage_score < 80:
        # Poor vintage: hard cap at 5 years for most reds
        c["peak_start"] = min(c["peak_start"], 3)
        c["peak_end"] = min(c["peak_end"], 5)
        c["max"] = min(c["max"], 7)
    return c


def calculate_drinking_window(
    appellation_slug: str,
    vintage: int,
    vintage_score: int | None = None,
    current_year: int | None = None,
) -> dict:
    """
    Calculate drinking window status for a cellar entry.

    Returns:
        {
            "status": DrinkingWindowStatus,
            "drink_from": int,   # calendar year
            "drink_by": int,     # calendar year
            "recommendation": str,
            "years_to_peak": int | None,
        }
    """
    if current_year is None:
        current_year = date.today().year

    age = current_year - vintage
    curve = AGING_CURVES.get(appellation_slug, AGING_CURVES["default"])

    if vintage_score is not None:
        curve = _apply_vintage_quality_adjustment(curve, vintage_score)

    drink_from = vintage + curve["peak_start"] - 2  # window opens 2yr before peak
    drink_by = vintage + curve["max"]
    peak_start_yr = vintage + curve["peak_start"]
    peak_end_yr = vintage + curve["peak_end"]

    # Determine status
    if age < curve["peak_start"] - 3:
        status: DrinkingWindowStatus = "not_ready"
    elif age < curve["peak_start"]:
        status = "approaching"
    elif age <= curve["peak_end"]:
        if age >= curve["peak_start"] and age <= curve["peak_start"] + 3:
            status = "in_window"
        else:
            status = "peak"
    elif age <= curve["max"]:
        status = "past_peak"
    else:
        status = "declining"

    years_to_peak = max(0, peak_start_yr - current_year) if status in ("not_ready", "approaching") else None

    # Build recommendation text
    rec_parts = []
    if status == "not_ready":
        rec_parts.append(f"Hold until {peak_start_yr}. Too young to show its best.")
        if years_to_peak and years_to_peak > 0:
            rec_parts.append(f"{years_to_peak} year{'s' if years_to_peak != 1 else ''} to peak.")
    elif status == "approaching":
        rec_parts.append(f"Approaching its window. Best from {peak_start_yr}–{peak_end_yr}.")
        rec_parts.append("Decant 2–3h if opening now.")
    elif status == "in_window":
        rec_parts.append(f"Entering its drinking window. Best {peak_start_yr}–{peak_end_yr}.")
        rec_parts.append("Decant 1–2h.")
    elif status == "peak":
        rec_parts.append(f"At or near peak. Drink through {peak_end_yr}.")
        rec_parts.append("Decant 30–60 minutes.")
    elif status == "past_peak":
        rec_parts.append(f"Past peak but still enjoyable. Drink soon, by {drink_by}.")
        rec_parts.append("Drink without extended decanting.")
    else:  # declining
        rec_parts.append("Beyond optimal drinking window. Open with tempered expectations.")

    return {
        "status": status,
        "drink_from": drink_from,
        "drink_by": drink_by,
        "recommendation": " ".join(rec_parts),
        "years_to_peak": years_to_peak,
    }
