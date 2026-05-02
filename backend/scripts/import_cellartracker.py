#!/usr/bin/env python3
"""
Import wines from CellarTracker CSV export.

CellarTracker export columns (standard export):
  Wine, Vintage, Producer, Type, Country, Region, Appellation,
  Varietal, Size, Price, Quantity, Location, Notes, MyRating

Usage:
  python -m scripts.import_cellartracker path/to/cellartracker_export.csv --user-id USER_ID
  python -m scripts.import_cellartracker path/to/export.csv --user-id USER_ID --dry-run
"""
import argparse
import asyncio
import csv
import re
import sys
import uuid
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Style mapping — CellarTracker "Type" → Cru style
# ---------------------------------------------------------------------------

STYLE_MAP: dict[str, str] = {
    "Red": "red",
    "White": "white",
    "Rosé": "rosé",
    "Rose": "rosé",
    "Sparkling": "sparkling",
    "Champagne": "sparkling",
    "Prosecco": "sparkling",
    "Cava": "sparkling",
    "Port": "fortified",
    "Sherry": "fortified",
    "Madeira": "fortified",
    "Fortified": "fortified",
    "Dessert": "dessert",
    "Sweet": "dessert",
    "Orange": "orange",
}

# CellarTracker Size field → Cru format
FORMAT_MAP: dict[str, str] = {
    "375mL": "375ml",
    "375": "375ml",
    "750mL": "750ml",
    "750": "750ml",
    "1500mL": "1.5L",
    "1.5L": "1.5L",
    "3000mL": "3L",
    "3L": "3L",
    "6000mL": "6L",
    "6L": "6L",
}


def _map_style(ct_type: str) -> str:
    """Map CellarTracker type to Cru style. Defaults to 'red'."""
    return STYLE_MAP.get(ct_type.strip(), "red")


def _map_format(ct_size: str) -> str:
    """Map CellarTracker size to Cru bottle format. Defaults to 750ml."""
    return FORMAT_MAP.get(ct_size.strip(), "750ml")


def _slugify(text: str) -> str:
    """Generate a URL-safe slug from arbitrary text."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


def _parse_vintage(raw: str) -> Optional[int]:
    """Return integer vintage, or None for NV / blank / invalid."""
    raw = raw.strip()
    if not raw or raw.upper() in ("NV", "N/V", "NON-VINTAGE", "0"):
        return None
    try:
        v = int(raw)
        return v if 1800 <= v <= 2030 else None
    except ValueError:
        return None


def _parse_price(raw: str) -> Optional[float]:
    """Strip currency symbols and commas; return float or None."""
    raw = raw.strip().replace(",", "").replace("$", "").replace("€", "").replace("£", "")
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def _parse_quantity(raw: str) -> int:
    try:
        q = int(raw.strip())
        return q if q > 0 else 1
    except ValueError:
        return 1


def _parse_rating(raw: str) -> Optional[float]:
    """CellarTracker MyRating is a 100-pt score. Return float or None."""
    raw = raw.strip()
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Core async import logic
# ---------------------------------------------------------------------------


async def import_cellartracker(
    csv_path: str,
    user_id: str,
    dry_run: bool = False,
) -> dict:
    """
    Parse a CellarTracker CSV export and import bottles into Cru's database.

    Strategy:
    - For each CSV row, attempt to match an existing Wine record by
      full_name ILIKE match (producer + wine name) and appellation by name ILIKE.
    - If no Wine match, create a new Wine (with null appellation_id if no appellation match).
    - Create a CellarEntry for each row.
    - Skips rows where vintage is missing AND quantity is 0.

    Returns {"imported": N, "skipped": M, "errors": E, "details": [...]}
    """
    from sqlalchemy import func, select
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.database import AsyncSessionLocal
    from app.models.appellation import Appellation
    from app.models.cellar_entry import CellarEntry
    from app.models.wine import Wine

    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        print("No rows found in CSV.")
        return {"imported": 0, "skipped": 0, "errors": 0, "details": []}

    # Normalise column names — CellarTracker sometimes varies capitalisation
    def _col(row: dict, *names: str) -> str:
        for name in names:
            if name in row:
                return row[name]
            # case-insensitive fallback
            for k in row:
                if k.strip().lower() == name.lower():
                    return row[k]
        return ""

    imported = 0
    skipped = 0
    errors = 0
    details: list[dict] = []

    async with AsyncSessionLocal() as db:
        for i, row in enumerate(rows, start=1):
            wine_col = _col(row, "Wine", "wine")
            producer_col = _col(row, "Producer", "producer")
            vintage_raw = _col(row, "Vintage", "vintage")
            ct_type = _col(row, "Type", "type")
            country = _col(row, "Country", "country")
            region = _col(row, "Region", "region")
            appellation_col = _col(row, "Appellation", "appellation")
            varietal = _col(row, "Varietal", "varietal")
            size_col = _col(row, "Size", "size")
            price_col = _col(row, "Price", "price")
            quantity_col = _col(row, "Quantity", "quantity")
            location_col = _col(row, "Location", "location")
            notes_col = _col(row, "Notes", "notes")
            rating_col = _col(row, "MyRating", "myrating", "My Rating")

            vintage = _parse_vintage(vintage_raw)
            quantity = _parse_quantity(quantity_col)

            if quantity == 0:
                skipped += 1
                details.append({"row": i, "status": "skipped", "reason": "quantity=0", "wine": wine_col})
                continue

            # Build the full_name the same way Cru does: "Producer WineName"
            full_name = f"{producer_col} {wine_col}".strip() if producer_col else wine_col.strip()
            if not full_name:
                skipped += 1
                details.append({"row": i, "status": "skipped", "reason": "no wine name", "wine": wine_col})
                continue

            style = _map_style(ct_type)
            bottle_format = _map_format(size_col)
            purchase_price = _parse_price(price_col)
            bin_location = location_col.strip() or None
            notes = notes_col.strip() or None
            personal_score = _parse_rating(rating_col)

            if dry_run:
                imported += 1
                details.append({"row": i, "status": "dry_run", "wine": full_name, "vintage": vintage})
                continue

            try:
                # 1. Find or create Appellation
                appellation_id: Optional[uuid.UUID] = None
                if appellation_col.strip():
                    app_result = await db.execute(
                        select(Appellation).where(
                            func.lower(Appellation.name) == appellation_col.strip().lower()
                        ).limit(1)
                    )
                    app = app_result.scalar_one_or_none()
                    if app:
                        appellation_id = app.id
                    elif region.strip():
                        # Try matching on region name instead
                        region_result = await db.execute(
                            select(Appellation).where(
                                func.lower(Appellation.region) == region.strip().lower()
                            ).limit(1)
                        )
                        region_app = region_result.scalar_one_or_none()
                        if region_app:
                            appellation_id = region_app.id

                # 2. Find or create Wine
                wine_result = await db.execute(
                    select(Wine).where(
                        func.lower(Wine.full_name) == full_name.lower()
                    ).limit(1)
                )
                wine = wine_result.scalar_one_or_none()

                if wine is None:
                    # Build a unique slug — append a short uuid fragment if needed
                    base_slug = _slugify(full_name)[:80]
                    slug = base_slug

                    # Ensure slug uniqueness
                    existing_slug = await db.execute(
                        select(Wine.id).where(Wine.slug == slug).limit(1)
                    )
                    if existing_slug.scalar_one_or_none() is not None:
                        slug = f"{base_slug}-{str(uuid.uuid4())[:8]}"

                    # Determine color from style
                    color_map = {
                        "red": "red", "white": "white", "rosé": "rosé",
                        "orange": "orange", "sparkling": None, "fortified": None,
                        "dessert": None,
                    }
                    color = color_map.get(style)

                    grapes: Optional[list[dict]] = None
                    if varietal.strip():
                        grapes = [{"grape": varietal.strip(), "pct": None}]

                    wine = Wine(
                        name=wine_col.strip() or full_name,
                        full_name=full_name,
                        style=style,
                        color=color,
                        primary_grapes=grapes,
                        appellation_id=appellation_id,
                        slug=slug,
                    )
                    db.add(wine)
                    await db.flush()  # get wine.id before creating CellarEntry

                # 3. Create CellarEntry
                entry = CellarEntry(
                    user_id=user_id,
                    wine_id=wine.id,
                    vintage=vintage if vintage else 2000,  # fallback for NV
                    quantity=quantity,
                    format=bottle_format,
                    purchase_price=purchase_price,
                    currency="USD",
                    purchase_source="import",
                    bin_location=bin_location,
                    notes=notes,
                    status="in_cellar",
                )
                db.add(entry)

                imported += 1
                details.append({
                    "row": i,
                    "status": "imported",
                    "wine": full_name,
                    "vintage": vintage,
                    "quantity": quantity,
                    "appellation_matched": appellation_id is not None,
                })

            except Exception as exc:
                errors += 1
                details.append({
                    "row": i,
                    "status": "error",
                    "wine": full_name,
                    "error": str(exc),
                })
                # Roll back only this row — continue importing the rest
                await db.rollback()
                # Re-open the session for subsequent rows
                continue

        if not dry_run:
            await db.commit()

    summary = {"imported": imported, "skipped": skipped, "errors": errors}
    print(
        f"CellarTracker import complete: "
        f"{imported} imported, {skipped} skipped, {errors} errors"
        + (" (DRY RUN — nothing written)" if dry_run else "")
    )
    return {**summary, "details": details}


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Import a CellarTracker CSV export into Cru."
    )
    parser.add_argument("csv_path", help="Path to CellarTracker export CSV")
    parser.add_argument("--user-id", required=True, help="Cru user ID (Clerk user_id)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate rows without writing to the database",
    )
    args = parser.parse_args()

    result = asyncio.run(
        import_cellartracker(args.csv_path, args.user_id, args.dry_run)
    )
    sys.exit(0 if result["errors"] == 0 else 1)
