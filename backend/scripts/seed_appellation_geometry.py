"""
Seed approximate bounding-box polygon geometry for key appellations.
Uses PostGIS ST_GeomFromText to insert MULTIPOLYGON WKT.
Run with: docker exec cru-backend python scripts/seed_appellation_geometry.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg

# (slug, [[lon_min, lat_min, lon_max, lat_max], ...])
# Coordinates are approximate bounding boxes, not precise AOC boundaries.
APPELLATION_BOUNDS: list[tuple[str, list[list[float]]]] = [
    # France — Champagne
    ("champagne", [[3.1, 48.5, 4.6, 49.5]]),
    # France — Burgundy broad
    ("bourgogne", [[4.5, 46.0, 5.4, 47.5]]),
    # France — Côte de Nuits
    ("cote-de-nuits", [[4.9, 47.0, 5.05, 47.4]]),
    # France — Gevrey-Chambertin
    ("gevrey-chambertin", [[4.93, 47.21, 5.01, 47.28]]),
    # France — Chambertin (nested in Gevrey)
    ("chambertin", [[4.96, 47.23, 4.99, 47.26]]),
    # France — Nuits-Saint-Georges
    ("nuits-saint-georges", [[4.93, 47.11, 5.02, 47.17]]),
    # France — Pommard
    ("pommard", [[4.93, 47.0, 5.01, 47.05]]),
    # France — Bordeaux broad
    ("bordeaux", [[-0.8, 44.5, -0.1, 45.4]]),
    # France — Pauillac
    ("pauillac", [[-0.77, 45.18, -0.64, 45.3]]),
    # France — Margaux
    ("margaux", [[-0.73, 45.0, -0.6, 45.1]]),
    # France — Saint-Julien
    ("saint-julien", [[-0.76, 45.14, -0.63, 45.2]]),
    # France — Saint-Émilion
    ("saint-emilion", [[-0.2, 44.85, -0.05, 44.95]]),
    # France — Pomerol
    ("pomerol", [[-0.19, 44.89, -0.11, 44.95]]),
    # France — Sauternes
    ("sauternes", [[-0.38, 44.52, -0.2, 44.65]]),
    # France — Rhône / Châteauneuf
    ("chateauneuf-du-pape", [[4.75, 44.03, 4.9, 44.12]]),
    # France — Alsace
    ("alsace", [[7.2, 47.5, 7.7, 48.9]]),
    # France — Loire / Muscadet
    ("muscadet", [[-1.9, 47.0, -1.2, 47.4]]),
    # Italy — Barolo
    ("barolo", [[7.68, 44.57, 7.87, 44.67]]),
    # Italy — Barbaresco
    ("barbaresco", [[8.0, 44.68, 8.15, 44.77]]),
    # Italy — Chianti Classico
    ("chianti-classico", [[11.18, 43.35, 11.55, 43.72]]),
    # Italy — Brunello di Montalcino
    ("brunello-di-montalcino", [[11.45, 42.95, 11.7, 43.1]]),
    # Italy — Amarone / Valpolicella
    ("valpolicella", [[10.7, 45.4, 11.2, 45.65]]),
    # Spain — Rioja
    ("rioja", [[-2.9, 42.25, -1.8, 42.65]]),
    # Spain — Priorat
    ("priorat", [[0.75, 41.1, 1.0, 41.3]]),
    # Spain — Ribera del Duero
    ("ribera-del-duero", [[-3.7, 41.5, -3.0, 41.8]]),
    # Portugal — Douro
    ("douro", [[-8.2, 41.0, -7.0, 41.5]]),
    # Germany — Mosel
    ("mosel", [[6.5, 49.5, 7.4, 50.4]]),
    # Germany — Rheingau
    ("rheingau", [[7.9, 49.95, 8.5, 50.1]]),
    # USA — Napa Valley
    ("napa-valley", [[-122.55, 38.18, -122.12, 38.82]]),
    # USA — Stags Leap District (nested in Napa)
    ("stags-leap-district", [[-122.37, 38.38, -122.27, 38.46]]),
    # USA — Sonoma Coast
    ("sonoma-coast", [[-123.3, 38.2, -122.7, 38.85]]),
    # Australia — Barossa Valley
    ("barossa-valley", [[138.85, -34.65, 139.1, -34.4]]),
    # Australia — Clare Valley
    ("clare-valley", [[138.55, -33.9, 138.85, -33.55]]),
    # Australia — Margaret River
    ("margaret-river", [[114.9, -34.0, 115.2, -33.7]]),
    # New Zealand — Marlborough
    ("marlborough", [[173.5, -41.9, 174.2, -41.4]]),
    # South Africa — Stellenbosch
    ("stellenbosch", [[18.7, -34.1, 19.1, -33.85]]),
    # Argentina — Mendoza
    ("mendoza", [[-69.5, -33.5, -68.5, -32.8]]),
]


def bbox_to_wkt(lon_min: float, lat_min: float, lon_max: float, lat_max: float) -> str:
    """Convert bounding box to WKT MULTIPOLYGON."""
    ring = (
        f"{lon_min} {lat_min}, {lon_max} {lat_min}, "
        f"{lon_max} {lat_max}, {lon_min} {lat_max}, "
        f"{lon_min} {lat_min}"
    )
    return f"MULTIPOLYGON((({ring})))"


async def main() -> None:
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://cru_user:cru_pass@localhost:5432/cru",
    )
    # Convert SQLAlchemy URL to asyncpg DSN
    dsn = db_url.replace("postgresql+asyncpg://", "postgresql://").replace(
        "postgresql+psycopg2://", "postgresql://"
    )

    conn = await asyncpg.connect(dsn)

    updated = 0
    skipped = 0
    for slug, boxes in APPELLATION_BOUNDS:
        # Check if this slug exists
        row = await conn.fetchrow(
            "SELECT id, geometry FROM appellations WHERE slug = $1", slug
        )
        if row is None:
            print(f"  skip  {slug!r} — not in DB")
            skipped += 1
            continue

        if row["geometry"] is not None:
            print(f"  skip  {slug!r} — already has geometry")
            skipped += 1
            continue

        # Build WKT from first box (use only one polygon per appellation for now)
        b = boxes[0]
        wkt = bbox_to_wkt(b[0], b[1], b[2], b[3])

        await conn.execute(
            """
            UPDATE appellations
            SET geometry = ST_GeogFromText($1)
            WHERE slug = $2
            """,
            wkt,
            slug,
        )
        print(f"  set   {slug!r}")
        updated += 1

    await conn.close()
    print(f"\nDone: {updated} updated, {skipped} skipped")


if __name__ == "__main__":
    asyncio.run(main())
