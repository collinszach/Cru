#!/usr/bin/env python3
"""
Seed a curated catalogue of canonical wines and their producers.

Covers the world's most iconic estates and cuvées — enough to make the
app immediately useful for exploring wines, adding to cellar, and testing
recommendations.

Usage: python -m scripts.seed_wines
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import get_settings
from app.models.producer import Producer
from app.models.wine import Wine
import uuid


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

PRODUCERS = [
    # Burgundy
    {"slug": "domaine-rousseau", "name": "Domaine Armand Rousseau", "country_code": "FR",
     "style_notes": "The benchmark estate in Gevrey-Chambertin. Wines of extraordinary precision, purity, and longevity. Rousseau owns more Chambertin than any other producer.",
     "appellation_slug": "gevrey-chambertin"},
    {"slug": "drc", "name": "Domaine de la Romanée-Conti", "country_code": "FR",
     "style_notes": "The most celebrated domaine in Burgundy. Monopole owner of Romanée-Conti and La Tâche. Wines of incomparable depth and complexity aged in new oak.",
     "appellation_slug": "gevrey-chambertin"},
    {"slug": "leroy", "name": "Domaine Leroy", "country_code": "FR",
     "style_notes": "Lalou Bize-Leroy's biodynamic estate. Extraordinarily low yields produce wines of tremendous concentration and longevity. Among the most expensive Burgundies.",
     "appellation_slug": "gevrey-chambertin"},
    {"slug": "dugat-py", "name": "Domaine Dugat-Py", "country_code": "FR",
     "style_notes": "Bernard Dugat-Py works with very old vines and very low yields. Rich, concentrated, very long-lived wines across the Gevrey hierarchy.",
     "appellation_slug": "gevrey-chambertin"},
    # Bordeaux
    {"slug": "chateau-petrus", "name": "Château Pétrus", "country_code": "FR",
     "style_notes": "Pomerol's most iconic estate. Nearly 100% Merlot from a unique clay plateau. Extraordinary richness and concentration with remarkable aging potential.",
     "appellation_slug": "pauillac"},
    {"slug": "chateau-margaux", "name": "Château Margaux", "country_code": "FR",
     "style_notes": "First Growth. The most perfumed and feminine of the Médoc first growths. 75% Cabernet Sauvignon. The 2015 is one of the greatest wines ever made.",
     "appellation_slug": "pauillac"},
    {"slug": "chateau-latour", "name": "Château Latour", "country_code": "FR",
     "style_notes": "First Growth. The most structured and longest-lived of the Médoc first growths. 80% Cabernet Sauvignon. L'Enclos de Latour is one of the finest spots in Bordeaux.",
     "appellation_slug": "pauillac"},
    {"slug": "chateau-mouton-rothschild", "name": "Château Mouton Rothschild", "country_code": "FR",
     "style_notes": "First Growth. The most flamboyant and opulent of the Médoc first growths. Famous for artist labels. 85% Cabernet Sauvignon.",
     "appellation_slug": "pauillac"},
    {"slug": "pichon-baron", "name": "Château Pichon Baron", "country_code": "FR",
     "style_notes": "Pauillac Second Growth. The most consistently excellent second growth in the Médoc. 60% Cabernet Sauvignon. Concentrated, structured, age-worthy.",
     "appellation_slug": "pauillac"},
    # Rhône
    {"slug": "chapoutier", "name": "M. Chapoutier", "country_code": "FR",
     "style_notes": "Tain-l'Hermitage-based négociant and estate. Biodynamic pioneer in the Northern Rhône. Single-vineyard Hermitage (Le Méal, De l'Orée) among the finest expressions.",
     "appellation_slug": "chambolle-musigny"},
    # Barolo
    {"slug": "giacomo-conterno", "name": "Giacomo Conterno", "country_code": "IT",
     "style_notes": "The traditionalist benchmark of Barolo. Monfortino is one of Italy's most iconic wines — aged 7+ years in large Slavonian oak casks. Cascina Francia and Cerretta are superb.",
     "appellation_slug": "barolo"},
    {"slug": "gaja", "name": "Gaja", "country_code": "IT",
     "style_notes": "Angelo Gaja modernised Piedmont and put it on the world stage. Sorì San Lorenzo, Sorì Tildìn, and Costa Russi are among Italy's most prestigious wines.",
     "appellation_slug": "barolo"},
    {"slug": "bartolo-mascarello", "name": "Bartolo Mascarello", "country_code": "IT",
     "style_notes": "The conscience of traditional Barolo. Maria Teresa Mascarello blends multiple crus into a single, profoundly traditional Barolo of uncommon grace and longevity.",
     "appellation_slug": "barolo"},
    {"slug": "bruno-giacosa", "name": "Bruno Giacosa", "country_code": "IT",
     "style_notes": "Falletto di Serralunga d'Alba is one of Barolo's greatest crus. Giacosa's red-label Riservas are legendary. Santo Stefano di Neive Barbaresco is equally iconic.",
     "appellation_slug": "barolo"},
    # Napa Valley
    {"slug": "harlan-estate", "name": "Harlan Estate", "country_code": "US",
     "style_notes": "Oakville's most prestigious estate. Cashmere tannins, extraordinary concentration, 25+ year aging potential. The Maiden is the second wine.",
     "appellation_slug": "napa-valley"},
    {"slug": "screaming-eagle", "name": "Screaming Eagle", "country_code": "US",
     "style_notes": "Oakville cult Cabernet. Tiny production, mailing list only. Wines of extraordinary finesse and concentration. One of Napa's most sought-after bottles.",
     "appellation_slug": "napa-valley"},
    {"slug": "shafer", "name": "Shafer Vineyards", "country_code": "US",
     "style_notes": "Stags Leap District. Hillside Select is one of Napa's most consistent benchmarks. 100% Cabernet Sauvignon, aged 32 months in French oak.",
     "appellation_slug": "napa-valley"},
    {"slug": "ridge-vineyards", "name": "Ridge Vineyards", "country_code": "US",
     "style_notes": "Healdsburg (Monte Bello) and Cupertino (estate). Monte Bello is California's greatest age-worthy Cabernet. Lytton Springs and Geyserville Zinfandels are also exceptional.",
     "appellation_slug": "napa-valley"},
    # Champagne
    {"slug": "krug", "name": "Krug", "country_code": "FR",
     "style_notes": "The prestige cuvée house. Grande Cuvée is a multi-vintage blend of extraordinary complexity. Clos du Mesnil (blanc de blancs from a single Chardonnay plot) is among the rarest Champagnes.",
     "appellation_slug": "champagne"},
    {"slug": "salon", "name": "Salon", "country_code": "FR",
     "style_notes": "The only house that produces a single-vintage, single-cru blanc de blancs. Only 37 vintages declared since 1905. Le Mesnil-sur-Oger Chardonnay of extraordinary mineral precision.",
     "appellation_slug": "champagne"},
    {"slug": "bollinger", "name": "Bollinger", "country_code": "FR",
     "style_notes": "Aÿ-based house known for powerful, Pinot Noir-driven Champagne. RD (Recently Disgorged) is one of Champagne's finest prestige cuvées. Fermented and aged in small oak barrels.",
     "appellation_slug": "champagne"},
    # Germany
    {"slug": "egon-muller", "name": "Egon Müller – Scharzhof", "country_code": "DE",
     "style_notes": "Scharzhofberg in the Mosel Saar. Trockenbeerenauslese and Auslese are among the world's most expensive and long-lived whites. Benchmark for Riesling's noble rot expressions.",
     "appellation_slug": "mosel"},
    {"slug": "jj-prum", "name": "J.J. Prüm", "country_code": "DE",
     "style_notes": "Graach and Wehlen on the Mittelmosel. Wehlener Sonnenuhr Auslese and Spätlese are benchmarks for the style. Wines that age 50+ years with extraordinary grace.",
     "appellation_slug": "mosel"},
]

# producer_slug → appellation_slug lookup for wines
WINES = [
    # Burgundy — Gevrey-Chambertin
    {"producer": "domaine-rousseau", "name": "Chambertin Grand Cru", "full_name": "Domaine Armand Rousseau Chambertin Grand Cru",
     "style": "Still", "color": "red", "grapes": [{"grape": "Pinot Noir", "pct": 100}],
     "classification": "Grand Cru", "appellation": "gevrey-chambertin", "description": "Rousseau's crown jewel. The 2.15-hectare holding in the greatest grand cru in Burgundy. Wines of extraordinary depth, spice, and longevity — typically needs 15+ years."},
    {"producer": "domaine-rousseau", "name": "Chambertin-Clos de Bèze Grand Cru", "full_name": "Domaine Armand Rousseau Chambertin-Clos de Bèze Grand Cru",
     "style": "Still", "color": "red", "grapes": [{"grape": "Pinot Noir", "pct": 100}],
     "classification": "Grand Cru", "appellation": "gevrey-chambertin", "description": "Often considered more elegant than Chambertin itself. Rousseau's largest grand cru holding (1.37ha). The Clos de Bèze is historically the senior appellation."},
    {"producer": "domaine-rousseau", "name": "Clos Saint-Jacques Premier Cru", "full_name": "Domaine Armand Rousseau Gevrey-Chambertin Clos Saint-Jacques",
     "style": "Still", "color": "red", "grapes": [{"grape": "Pinot Noir", "pct": 100}],
     "classification": "Premier Cru", "appellation": "gevrey-chambertin", "description": "The finest premier cru in Gevrey, often exceeding grand crus from lesser producers. 2.22ha. Remarkable concentration and elegance."},
    {"producer": "drc", "name": "Romanée-Conti Grand Cru", "full_name": "Domaine de la Romanée-Conti Romanée-Conti Grand Cru",
     "style": "Still", "color": "red", "grapes": [{"grape": "Pinot Noir", "pct": 100}],
     "classification": "Grand Cru", "appellation": "gevrey-chambertin", "description": "The most celebrated wine in the world. 1.8ha monopole. Approximately 5,000 bottles per year. 30-50 year aging potential in great vintages."},
    {"producer": "drc", "name": "La Tâche Grand Cru", "full_name": "Domaine de la Romanée-Conti La Tâche Grand Cru",
     "style": "Still", "color": "red", "grapes": [{"grape": "Pinot Noir", "pct": 100}],
     "classification": "Grand Cru", "appellation": "gevrey-chambertin", "description": "DRC's other monopole. 6ha. More immediately accessible than RC but equally long-lived. Remarkable spice, floral complexity, and silken texture."},
    {"producer": "leroy", "name": "Musigny Grand Cru", "full_name": "Domaine Leroy Musigny Grand Cru",
     "style": "Still", "color": "red", "grapes": [{"grape": "Pinot Noir", "pct": 100}],
     "classification": "Grand Cru", "appellation": "chambolle-musigny", "description": "Leroy's Musigny is among the most sought-after Burgundies. Tiny production, extraordinary purity. The 'silk and lace' grand cru at its most concentrated."},

    # Barolo
    {"producer": "giacomo-conterno", "name": "Barolo Monfortino Riserva", "full_name": "Giacomo Conterno Barolo Monfortino Riserva",
     "style": "Still", "color": "red", "grapes": [{"grape": "Nebbiolo", "pct": 100}],
     "classification": "Riserva", "appellation": "barolo", "description": "The iconic traditional Barolo. Produced only in exceptional years. Aged 7+ years in large oak casks. One of Italy's most age-worthy wines — 40-50 year potential."},
    {"producer": "giacomo-conterno", "name": "Barolo Cascina Francia", "full_name": "Giacomo Conterno Barolo Cascina Francia",
     "style": "Still", "color": "red", "grapes": [{"grape": "Nebbiolo", "pct": 100}],
     "classification": None, "appellation": "barolo", "description": "Conterno's primary non-Monfortino Barolo from the Serralunga d'Alba cru. Produced in years where Monfortino is not declared. Similar power and longevity."},
    {"producer": "gaja", "name": "Barolo Sperss", "full_name": "Gaja Barolo Sperss",
     "style": "Still", "color": "red", "grapes": [{"grape": "Nebbiolo", "pct": 100}],
     "classification": None, "appellation": "barolo", "description": "Gaja's Barolo from the Marenca-Rivette cru in Serralunga. Produced since 1988. 100% Nebbiolo aged in small French barriques — the modernist approach."},
    {"producer": "bartolo-mascarello", "name": "Barolo", "full_name": "Bartolo Mascarello Barolo",
     "style": "Still", "color": "red", "grapes": [{"grape": "Nebbiolo", "pct": 100}],
     "classification": None, "appellation": "barolo", "description": "The traditional single-wine statement of Barolo. Four crus blended — Cannubi, Rüe, San Lorenzo, Rocche — producing a wine of unusual complexity and coherence. Anti-Barolo Boys to the end."},

    # Bordeaux
    {"producer": "chateau-petrus", "name": "Pétrus", "full_name": "Château Pétrus",
     "style": "Still", "color": "red", "grapes": [{"grape": "Merlot", "pct": 95}, {"grape": "Cabernet Franc", "pct": 5}],
     "classification": None, "appellation": "pauillac", "description": "Pomerol's most revered estate. Unique blue clay soil of the Pomerol plateau. Rich, opulent, and concentrated with extraordinary aging potential. ~30-40 year drinking window."},
    {"producer": "chateau-margaux", "name": "Château Margaux", "full_name": "Château Margaux",
     "style": "Still", "color": "red", "grapes": [{"grape": "Cabernet Sauvignon", "pct": 75}, {"grape": "Merlot", "pct": 20}, {"grape": "Cabernet Franc", "pct": 5}],
     "classification": "Premier Grand Cru Classé", "appellation": "pauillac", "description": "The most perfumed of the Médoc first growths. 2015 is considered the greatest Margaux ever made. Extraordinary elegance and violet-scented purity."},
    {"producer": "chateau-latour", "name": "Château Latour", "full_name": "Château Latour",
     "style": "Still", "color": "red", "grapes": [{"grape": "Cabernet Sauvignon", "pct": 80}, {"grape": "Merlot", "pct": 18}, {"grape": "Cabernet Franc", "pct": 2}],
     "classification": "Premier Grand Cru Classé", "appellation": "pauillac", "description": "The most structured and longest-lived first growth. Deep, powerful, impenetrably tannic in youth. Needs minimum 20 years in great vintages. The Enclos is superb."},
    {"producer": "pichon-baron", "name": "Pichon Baron", "full_name": "Château Pichon Baron",
     "style": "Still", "color": "red", "grapes": [{"grape": "Cabernet Sauvignon", "pct": 60}, {"grape": "Merlot", "pct": 35}, {"grape": "Cabernet Franc", "pct": 5}],
     "classification": "Deuxième Grand Cru Classé", "appellation": "pauillac", "description": "The most consistently outstanding Pauillac second growth. Richer and more accessible than the first growths in youth but with similar aging potential."},

    # Napa Valley
    {"producer": "harlan-estate", "name": "Harlan Estate", "full_name": "Harlan Estate",
     "style": "Still", "color": "red", "grapes": [{"grape": "Cabernet Sauvignon", "pct": 70}, {"grape": "Merlot", "pct": 20}, {"grape": "Cabernet Franc", "pct": 8}, {"grape": "Petit Verdot", "pct": 2}],
     "classification": None, "appellation": "napa-valley", "description": "Oakville's most prestigious cult wine. Textural, velvety, and enormously concentrated. One of Napa's finest age-worthy Cabernets with 25+ year potential."},
    {"producer": "shafer", "name": "Hillside Select Cabernet Sauvignon", "full_name": "Shafer Hillside Select Cabernet Sauvignon",
     "style": "Still", "color": "red", "grapes": [{"grape": "Cabernet Sauvignon", "pct": 100}],
     "classification": None, "appellation": "napa-valley", "description": "Stags Leap District benchmark. 100% Cabernet Sauvignon from estate hillside vineyards. Aged 32 months in new French oak. 20-25 year drinking window."},
    {"producer": "ridge-vineyards", "name": "Monte Bello", "full_name": "Ridge Monte Bello",
     "style": "Still", "color": "red", "grapes": [{"grape": "Cabernet Sauvignon", "pct": 70}, {"grape": "Merlot", "pct": 18}, {"grape": "Petit Verdot", "pct": 12}],
     "classification": None, "appellation": "napa-valley", "description": "California's greatest age-worthy Cabernet. Santa Cruz Mountains estate at 800m elevation. 1971 Monte Bello shocked the world at the Judgment of Paris rematch in 2006."},

    # Champagne
    {"producer": "krug", "name": "Grande Cuvée", "full_name": "Krug Grande Cuvée",
     "style": "Sparkling", "color": None, "grapes": [{"grape": "Pinot Noir", "pct": 45}, {"grape": "Chardonnay", "pct": 35}, {"grape": "Pinot Meunier", "pct": 20}],
     "classification": "NV", "appellation": "champagne", "description": "The benchmark prestige non-vintage Champagne. Blended from over 120 wines across 10+ vintages. Extraordinary complexity, toasted brioche, and dried fruit character."},
    {"producer": "krug", "name": "Clos du Mesnil", "full_name": "Krug Clos du Mesnil",
     "style": "Sparkling", "color": None, "grapes": [{"grape": "Chardonnay", "pct": 100}],
     "classification": "Blanc de Blancs", "appellation": "champagne", "description": "The rarest Krug. A 1.84ha walled clos in the village of Le Mesnil-sur-Oger. Single-vintage blanc de blancs of extraordinary mineral precision and 30+ year aging potential."},
    {"producer": "salon", "name": "Salon S", "full_name": "Salon S Blanc de Blancs Le Mesnil",
     "style": "Sparkling", "color": None, "grapes": [{"grape": "Chardonnay", "pct": 100}],
     "classification": "Blanc de Blancs Vintage", "appellation": "champagne", "description": "One of Champagne's rarest and most sought-after wines. Only 37 vintages declared since 1905. Le Mesnil-sur-Oger Chardonnay aged 10+ years on lees. Incomparable mineral precision."},
    {"producer": "bollinger", "name": "RD", "full_name": "Bollinger R.D. Extra Brut",
     "style": "Sparkling", "color": None, "grapes": [{"grape": "Pinot Noir", "pct": 70}, {"grape": "Chardonnay", "pct": 30}],
     "classification": "Vintage RD", "appellation": "champagne", "description": "Recently Disgorged. Extended lees aging followed by late disgorgement. One of Champagne's greatest prestige cuvées — rich, creamy, and extraordinarily complex."},

    # Germany
    {"producer": "egon-muller", "name": "Scharzhofberger Riesling Trockenbeerenauslese", "full_name": "Egon Müller Scharzhofberger Riesling TBA",
     "style": "Dessert", "color": "white", "grapes": [{"grape": "Riesling", "pct": 100}],
     "classification": "Trockenbeerenauslese", "appellation": "mosel", "description": "The most expensive German wine and one of the world's rarest. Produced in exceptionally rare years from botrytised, shrivelled individual berries. 50-100 year aging potential."},
    {"producer": "egon-muller", "name": "Scharzhofberger Riesling Auslese", "full_name": "Egon Müller Scharzhofberger Riesling Auslese",
     "style": "Still", "color": "white", "grapes": [{"grape": "Riesling", "pct": 100}],
     "classification": "Auslese", "appellation": "mosel", "description": "Scharzhofberg's finest terroir expressed in a more accessible format. Racingly high acidity balances the residual sugar. Extraordinary aging potential — 30+ years."},
    {"producer": "jj-prum", "name": "Wehlener Sonnenuhr Riesling Auslese", "full_name": "J.J. Prüm Wehlener Sonnenuhr Riesling Auslese",
     "style": "Still", "color": "white", "grapes": [{"grape": "Riesling", "pct": 100}],
     "classification": "Auslese", "appellation": "mosel", "description": "The benchmark Mosel Auslese. Wehlener Sonnenuhr is one of the Mittelmosel's greatest sites. Honeyed, concentrated, but racingly fresh. Needs minimum 10 years and can last 50."},
    {"producer": "jj-prum", "name": "Wehlener Sonnenuhr Riesling Spätlese", "full_name": "J.J. Prüm Wehlener Sonnenuhr Riesling Spätlese",
     "style": "Still", "color": "white", "grapes": [{"grape": "Riesling", "pct": 100}],
     "classification": "Spätlese", "appellation": "mosel", "description": "The more approachable entry point to Prüm's Sonnenuhr. Off-dry, floral, and light-bodied. Can be drunk young but rewards 15-20 years of aging."},
]


async def seed(session: AsyncSession) -> None:
    # Fetch slug→id map for appellations
    result = await session.execute(text("SELECT slug, id FROM appellations"))
    app_slug_to_id: dict[str, str] = {row.slug: str(row.id) for row in result.fetchall()}

    # Build producer records
    producer_slug_to_id: dict[str, str] = {}
    producers_inserted = 0

    for p_data in PRODUCERS:
        # Skip if already exists
        check = await session.execute(
            text("SELECT id FROM producers WHERE slug = :slug"),
            {"slug": p_data["slug"]},
        )
        existing = check.fetchone()
        if existing:
            producer_slug_to_id[p_data["slug"]] = str(existing.id)
            continue

        producer_id = uuid.uuid4()
        producer_slug_to_id[p_data["slug"]] = str(producer_id)

        app_id = app_slug_to_id.get(p_data.get("appellation_slug", ""))

        producer = Producer(
            id=producer_id,
            slug=p_data["slug"],
            name=p_data["name"],
            country_code=p_data["country_code"],
            style_notes=p_data.get("style_notes"),
            appellation_id=app_id or None,
        )
        session.add(producer)
        producers_inserted += 1

    await session.flush()
    print(f"Producers: {producers_inserted} inserted (rest already existed)")

    # Build wine records
    wines_inserted = 0
    for w_data in WINES:
        slug = _slugify(w_data["full_name"])

        check = await session.execute(
            text("SELECT id FROM wines WHERE slug = :slug"),
            {"slug": slug},
        )
        if check.fetchone():
            continue

        app_id = app_slug_to_id.get(w_data.get("appellation", ""))
        producer_id = producer_slug_to_id.get(w_data["producer"])

        wine = Wine(
            id=uuid.uuid4(),
            slug=slug,
            name=w_data["name"],
            full_name=w_data["full_name"],
            style=w_data["style"],
            color=w_data.get("color"),
            primary_grapes=w_data.get("grapes"),
            classification=w_data.get("classification"),
            description=w_data.get("description"),
            producer_id=producer_id,
            appellation_id=app_id or None,
        )
        session.add(wine)
        wines_inserted += 1

    await session.commit()
    print(f"Wines: {wines_inserted} inserted (rest already existed)")


def _slugify(text: str) -> str:
    import re
    text = text.lower()
    text = re.sub(r"[àáâãäå]", "a", text)
    text = re.sub(r"[èéêë]", "e", text)
    text = re.sub(r"[ìíîï]", "i", text)
    text = re.sub(r"[òóôõö]", "o", text)
    text = re.sub(r"[ùúûü]", "u", text)
    text = re.sub(r"[ç]", "c", text)
    text = re.sub(r"[ñ]", "n", text)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s]+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text


async def main() -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        await seed(session)

    await engine.dispose()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
