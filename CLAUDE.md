# CLAUDE.md — Cru: Personal Wine Intelligence

## Project Identity

**Cru** is a personal wine intelligence system for serious drinkers.
Not a social app. Not a retail discovery tool. A private cellar brain.

It knows your palate better than you do — tracking every bottle you've opened, every tasting note you've written, every region you've explored — and uses that history to tell you what to drink next, when to open what you're cellaring, and what you've never tried that you'll love. It also surfaces the story of wine: the terroir, the vintages, the producers, the geography.

**Three modes:**
- **Cellar** — what you own, when to drink it, what it's worth
- **Journal** — what you've tasted, what you thought, how your palate has evolved
- **Discovery** — what to try next, grounded in your actual taste profile

---

## Behavioral Contracts

- **Predict before acting.** Name every file you will touch before writing a line.
- **Trace the dependency graph first.** Understand what calls what before modifying models or services.
- **Surgical edits only.** Never rewrite a working module to fix an adjacent bug.
- **No boilerplate comments.** No `# This function handles X` that restates the code.
- **Conventional commits.** `feat:`, `fix:`, `refactor:`, `chore:` — always scoped.
- **Fail loudly.** Specific exceptions with context. Never `except: pass`.
- **Type everything.** TypeScript strict on frontend. Pydantic v2 models on backend. No `any`.
- **Embeddings are immutable.** Never regenerate an embedding for a wine in-place — insert a new version with a timestamp. Recommendation quality depends on embedding stability.
- **Never mutate a tasting note after 24h.** Append amendments with timestamp instead. The note is a historical document, not a live record.

---

## Stack

### Frontend
- **Framework:** Next.js 14 (App Router), TypeScript strict
- **Styling:** Tailwind CSS + CSS variables for design tokens
- **Maps:** MapLibre GL JS (wine region explorer, winery pins)
- **State:** Zustand (client) + TanStack Query (server)
- **Auth:** Clerk
- **Charts:** Recharts (vintage charts, palate radar, cellar value over time)
- **Photo/label viewer:** Yet Another React Lightbox
- **Forms:** React Hook Form + Zod
- **Tasting note UI:** Custom structured picker (WSET-derived vocabulary) + free text
- **Animations:** Framer Motion

### Backend
- **Framework:** FastAPI (Python 3.12)
- **ORM:** SQLAlchemy 2.0 async + Alembic
- **Database:** PostgreSQL 16 + **pgvector** extension + PostGIS extension
- **Auth:** Clerk JWT middleware
- **Embeddings:** OpenAI `text-embedding-3-small` (1536d) → pgvector — or Claude embeddings when available
- **ML:** scikit-learn (collaborative filtering, regression for drinking windows), numpy
- **Storage:** MinIO (label photos, cellar photos) — same S3-compatible pattern as Atlas
- **Cache:** Redis 7
- **Background tasks:** APScheduler
- **HTTP:** httpx async

### External APIs
- **Wine-Searcher API:** Market pricing, availability by region
- **Claude API (Anthropic):** Label scanning (Vision), tasting note enhancement, cellar optimization advice, natural language cellar queries, blind tasting analysis, food pairing, destination briefs
- **Open-Meteo (historical):** Vintage condition data by region (growing season temps/rainfall)
- **CellarTracker CSV:** Import path for users migrating existing data

### Infrastructure (Docker Compose on NUC)
```
services: cru-frontend, cru-backend, cru-db (postgres+pgvector+postgis), cru-redis, cru-minio
```

---

## Repository Structure

```
cru/
├── CLAUDE.md
├── SPEC.md
├── BUILD_PLAN.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .claudeignore
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   └── (app)/
│   │       ├── layout.tsx            # Authenticated shell + sidebar
│   │       ├── cellar/               # Inventory, drinking windows, value
│   │       │   ├── page.tsx          # Cellar grid view
│   │       │   ├── [id]/             # Single bottle detail
│   │       │   └── intake/           # Add bottle flow (label scan first)
│   │       ├── journal/              # Tasting log
│   │       │   ├── page.tsx          # Chronological tasting timeline
│   │       │   └── [id]/             # Single tasting note
│   │       ├── wines/                # Wine database (logged + wishlisted)
│   │       │   ├── page.tsx
│   │       │   └── [id]/             # Wine detail: all notes, vintages, history
│   │       ├── discover/             # AI recommendations
│   │       │   ├── page.tsx          # Recommendation feed
│   │       │   └── blind/            # Blind tasting mode
│   │       ├── regions/              # Map + terroir explorer
│   │       │   ├── page.tsx          # MapLibre wine region map
│   │       │   └── [slug]/           # Region deep-dive (Burgundy, Napa, etc.)
│   │       ├── producers/            # Producer profiles
│   │       │   └── [slug]/
│   │       ├── featured/             # Featured / starred bottles (the highlight reel)
│   │       ├── pairings/             # Food pairing engine
│   │       ├── stats/                # Palate analytics
│   │       └── settings/
│   ├── components/
│   │   ├── cellar/
│   │   │   ├── BottleCard.tsx        # Card: label thumb, producer, vintage, status
│   │   │   ├── CellarGrid.tsx        # Masonry/grid of BottleCards
│   │   │   ├── DrinkingWindowBadge.tsx
│   │   │   ├── CellarValueChart.tsx  # Portfolio value over time
│   │   │   ├── BinLocator.tsx        # Visual rack grid, click to assign
│   │   │   └── ConsumptionLog.tsx    # Decrement inventory on open
│   │   ├── tasting/
│   │   │   ├── TastingNoteForm.tsx   # Full WSET-structured note entry
│   │   │   ├── AppearancePanel.tsx   # Color picker, clarity, legs
│   │   │   ├── AromaBuilder.tsx      # 3-tier descriptor picker (primary/secondary/tertiary)
│   │   │   ├── PalateSliders.tsx     # Acidity, tannin, body, sweetness, alcohol, finish
│   │   │   ├── ScoreInput.tsx        # 100-pt / 20-pt / 5-star configurable
│   │   │   ├── NoteTimeline.tsx      # All notes for a wine across dates/vintages
│   │   │   └── CriticComparison.tsx  # Your note vs Parker/Jancis/Spectator
│   │   ├── scanner/
│   │   │   ├── LabelScanner.tsx      # Camera → Claude Vision → prefilled form
│   │   │   └── ScanConfirm.tsx       # Review + correct extracted fields
│   │   ├── map/
│   │   │   ├── WineRegionMap.tsx     # MapLibre: regions choropleth + winery pins
│   │   │   ├── RegionPolygon.tsx     # Clickable appellations
│   │   │   ├── WineryMarker.tsx      # Visited / wishlist pin
│   │   │   └── VintageHeatmap.tsx    # Region × year quality matrix
│   │   ├── discover/
│   │   │   ├── RecommendationCard.tsx
│   │   │   ├── PalateRadar.tsx       # Spider chart: your taste profile
│   │   │   ├── BlindTasting.tsx      # Blind mode: note entry → AI prediction
│   │   │   └── FoodPairingSearch.tsx
│   │   ├── featured/
│   │   │   ├── FeaturedBottle.tsx    # Hero card: story, photo, occasion
│   │   │   └── MemoryEntry.tsx       # Narrative journal attached to a bottle
│   │   └── ui/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── wineOntology.ts           # Appellation hierarchy, grape data, descriptors
│   │   ├── tastingVocabulary.ts      # WSET descriptor lexicon (controlled)
│   │   └── vintageCharts.ts          # Static vintage quality data: region × year
│   └── types/
│       └── index.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── auth.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── wine.py               # Canonical wine entity
│   │   │   ├── producer.py
│   │   │   ├── appellation.py
│   │   │   ├── cellar_entry.py       # A bottle you own (inventory)
│   │   │   ├── tasting_note.py       # A structured note event
│   │   │   ├── wine_embedding.py     # pgvector embedding record
│   │   │   ├── vintage_chart.py      # Region × year quality score
│   │   │   ├── winery.py             # Physical winery (location, visited)
│   │   │   ├── photo.py
│   │   │   └── wishlist.py
│   │   ├── schemas/
│   │   ├── routers/
│   │   │   ├── cellar.py
│   │   │   ├── wines.py
│   │   │   ├── tasting.py
│   │   │   ├── discover.py
│   │   │   ├── regions.py
│   │   │   ├── producers.py
│   │   │   ├── photos.py
│   │   │   ├── pairings.py
│   │   │   ├── stats.py
│   │   │   └── scanner.py
│   │   ├── services/
│   │   │   ├── storage.py            # MinIO/S3 abstraction
│   │   │   ├── embedding.py          # Wine → embedding pipeline
│   │   │   ├── recommendation.py     # ANN search + collaborative filter
│   │   │   ├── drinking_window.py    # Aging curve logic + ML
│   │   │   ├── label_scanner.py      # Claude Vision extraction
│   │   │   ├── cellar_optimizer.py   # Claude-powered cellar advice
│   │   │   ├── blind_tasting.py      # Note analysis → prediction
│   │   │   ├── price_tracker.py      # Wine-Searcher integration
│   │   │   └── pairing.py            # Food pairing engine
│   │   └── tasks/
│   │       ├── scheduler.py
│   │       ├── price_sync.py         # Nightly Wine-Searcher price refresh
│   │       └── embedding_refresh.py  # Re-embed wines with new notes
│   ├── migrations/
│   ├── data/
│   │   ├── appellations.json         # Appellation hierarchy seed data
│   │   ├── grape_varietals.json      # 500+ varietals with synonyms
│   │   ├── vintage_quality.json      # 50 regions × 30 vintages quality scores
│   │   └── descriptors.json          # Full WSET aroma/palate lexicon
│   └── tests/
│
└── scripts/
    ├── seed_appellations.py          # Load appellation hierarchy + geo polygons
    ├── seed_grapes.py
    ├── seed_vintage_charts.py
    ├── import_cellartracker.py       # CSV import from CellarTracker export
    └── backfill_embeddings.py        # Generate embeddings for existing wines
```

---

## Domain Model: The Wine Ontology

Wine data is hierarchical. This hierarchy must be encoded in the database, not derived at query time.

```
World → Country → Region → Sub-region → Appellation → Producer → Cuvée → Vintage
  e.g.: France → Burgundy → Côte de Nuits → Gevrey-Chambertin → Domaine Rousseau → Chambertin → 2015
  e.g.: USA → California → Napa Valley → Stags Leap District → Stag's Leap Wine Cellars → Cask 23 → 2013
```

**Wine styles taxonomy:**
```
Still
  Red | White | Rosé | Orange
Sparkling
  Champagne | Crémant | Prosecco | Cava | Sekt | Pet-Nat | Other
Fortified
  Port (Ruby | Tawny | Vintage | LBV | Colheita)
  Sherry (Fino | Manzanilla | Amontillado | Oloroso | PX | Palo Cortado)
  Madeira (Sercial | Verdelho | Bual | Malmsey)
  Vin Doux Naturel | Marsala | Other
Dessert
  Botrytis (Sauternes | TBA | Beerenauslese | Riesling Auslese)
  Ice Wine | Vin de Paille | Recioto | Passito
```

---

## Data Model

### Schema

```sql
-- Users
users
  id              VARCHAR PRIMARY KEY        -- Clerk user_id
  email           VARCHAR UNIQUE NOT NULL
  display_name    VARCHAR
  avatar_url      VARCHAR
  home_country    CHAR(2)
  scoring_system  VARCHAR DEFAULT '100pt'    -- '100pt' | '20pt' | '5star'
  preferences     JSONB DEFAULT '{}'         -- units, privacy, theme
  created_at      TIMESTAMPTZ DEFAULT now()

-- Appellations (static reference data, seeded from curated JSON)
appellations
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name            VARCHAR NOT NULL
  country_code    CHAR(2) NOT NULL
  country         VARCHAR NOT NULL
  region          VARCHAR
  sub_region      VARCHAR
  classification  VARCHAR       -- AOC / AVA / DOC / DOCG / QbA / IGP / GI / etc.
  geometry        GEOGRAPHY(MULTIPOLYGON,4326)   -- PostGIS boundary
  climate         VARCHAR       -- maritime / continental / mediterranean / etc.
  soil_types      VARCHAR[]     -- limestone / clay / gravel / volcanic / schist / etc.
  primary_grapes  VARCHAR[]     -- dominant varietals
  style_notes     TEXT          -- editorial overview
  vintage_notes   TEXT          -- general vintage guidance
  slug            VARCHAR UNIQUE NOT NULL

-- Producers (wineries, châteaux, domaines, estates)
producers
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name            VARCHAR NOT NULL
  country_code    CHAR(2)
  appellation_id  UUID REFERENCES appellations(id)
  location        GEOGRAPHY(POINT,4326)
  address         TEXT
  founded_year    INTEGER
  winemaker       VARCHAR
  owner           VARCHAR       -- important: changes in ownership matter
  style_notes     TEXT          -- their house style / philosophy
  natural         BOOLEAN DEFAULT false
  organic_cert    VARCHAR       -- EU Organic / Demeter / HVE / etc.
  biodynamic      BOOLEAN DEFAULT false
  website         VARCHAR
  slug            VARCHAR UNIQUE NOT NULL
  ai_summary      TEXT          -- Claude-generated producer brief
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Canonical wine records (producer + cuvée, version-agnostic)
wines
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  producer_id     UUID REFERENCES producers(id)
  appellation_id  UUID REFERENCES appellations(id)
  name            VARCHAR NOT NULL             -- the cuvée name
  full_name       VARCHAR NOT NULL             -- e.g. "Domaine Rousseau Chambertin Grand Cru"
  style           VARCHAR NOT NULL             -- taxonomy above
  color           VARCHAR                      -- red | white | rosé | orange | amber
  primary_grapes  JSONB                        -- [{grape: "Pinot Noir", pct: 100}]
  classification  VARCHAR                      -- Grand Cru | Premier Cru | Village | etc.
  alcohol_typical NUMERIC(4,1)
  description     TEXT                         -- editorial/encyclopedic
  slug            VARCHAR UNIQUE NOT NULL
  created_at      TIMESTAMPTZ DEFAULT now()

-- Wine embeddings (pgvector — the ML core)
wine_embeddings
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  wine_id         UUID REFERENCES wines(id) ON DELETE CASCADE
  user_id         VARCHAR REFERENCES users(id) ON DELETE CASCADE  -- NULL = global embedding
  embedding       VECTOR(1536)                 -- text-embedding-3-small
  embedding_text  TEXT                         -- the text that was embedded (for debugging)
  model_version   VARCHAR NOT NULL             -- track embedding model changes
  created_at      TIMESTAMPTZ DEFAULT now()

CREATE INDEX wine_embeddings_cosine_idx ON wine_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- User taste profile vector (materialized from tasting notes)
user_taste_profiles
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         VARCHAR UNIQUE REFERENCES users(id) ON DELETE CASCADE
  profile_vector  VECTOR(1536)                 -- weighted avg of rated wine embeddings
  last_computed   TIMESTAMPTZ DEFAULT now()
  note_count      INTEGER                      -- how many notes this is based on
  -- Structured preference axes (computed, stored for display)
  pref_sweetness  NUMERIC(3,2)                 -- 0-1 scale
  pref_acidity    NUMERIC(3,2)
  pref_tannin     NUMERIC(3,2)
  pref_body       NUMERIC(3,2)
  pref_oak        NUMERIC(3,2)
  top_regions     VARCHAR[]                    -- top 5 regions by rating
  top_grapes      VARCHAR[]                    -- top 5 varietals by rating
  flavor_affinities JSONB                      -- descriptor → avg rating when present

-- Cellar entries (bottles the user owns)
cellar_entries
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         VARCHAR REFERENCES users(id) ON DELETE CASCADE
  wine_id         UUID REFERENCES wines(id)
  vintage         SMALLINT NOT NULL
  quantity        SMALLINT DEFAULT 1
  format          VARCHAR DEFAULT '750ml'      -- 375ml | 750ml | 1.5L | 3L | 6L
  purchase_date   DATE
  purchase_price  NUMERIC(10,2)
  currency        CHAR(3) DEFAULT 'USD'
  purchase_source VARCHAR                      -- winery | retailer | auction | allocation | gift
  retailer        VARCHAR
  allocation_list VARCHAR                      -- mailing list name if applicable
  bin_location    VARCHAR                      -- physical rack position: e.g. "A-3"
  condition       VARCHAR DEFAULT 'perfect'    -- perfect | good | unknown | suspect
  provenance_notes TEXT
  drink_from      SMALLINT                     -- year
  drink_by        SMALLINT                     -- year
  is_featured     BOOLEAN DEFAULT false        -- pinned to featured / highlight reel
  featured_story  TEXT                         -- the narrative: why this bottle matters
  featured_occasion VARCHAR                    -- anniversary | discovery | gift | milestone
  featured_companions VARCHAR[]                -- who you shared it with
  current_value   NUMERIC(10,2)               -- from last Wine-Searcher sync
  value_updated   TIMESTAMPTZ
  status          VARCHAR DEFAULT 'in_cellar' -- in_cellar | consumed | gifted | lost | sold
  consumed_at     TIMESTAMPTZ
  notes           TEXT                         -- purchase/provenance notes (not tasting)
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Tasting notes (the core journal record)
tasting_notes
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         VARCHAR REFERENCES users(id) ON DELETE CASCADE
  wine_id         UUID REFERENCES wines(id)
  cellar_entry_id UUID REFERENCES cellar_entries(id) ON DELETE SET NULL
  vintage         SMALLINT NOT NULL
  tasted_at       TIMESTAMPTZ NOT NULL
  -- Context
  location        VARCHAR                      -- where you tasted it
  occasion        VARCHAR                      -- dinner | blind tasting | winery visit | etc.
  decant_minutes  INTEGER
  serve_temp_c    NUMERIC(3,1)
  companions      VARCHAR[]
  -- Appearance
  app_clarity     VARCHAR                      -- clear | hazy | cloudy
  app_intensity   VARCHAR                      -- pale | medium | deep
  app_color       VARCHAR                      -- ruby | garnet | tawny | lemon | gold | etc.
  app_other       VARCHAR                      -- legs, effervescence notes
  -- Nose
  nose_condition  VARCHAR DEFAULT 'clean'      -- clean | faulty (if faulty: note fault type)
  nose_fault      VARCHAR                      -- TCA | oxidation | reduction | brett | VA | etc.
  nose_intensity  VARCHAR                      -- light | medium- | medium | medium+ | pronounced
  nose_development VARCHAR                     -- youthful | developing | mature | tired
  nose_descriptors JSONB                       -- [{tier:'primary', descriptor:'red cherry', intensity:'medium'}]
  -- Palate
  palate_sweetness VARCHAR                     -- bone_dry | dry | off_dry | medium_dry | medium_sweet | sweet | luscious
  palate_acidity  VARCHAR                      -- low | medium- | medium | medium+ | high
  palate_tannin   VARCHAR                      -- low | medium- | medium | medium+ | high (reds only)
  palate_tannin_nature VARCHAR                 -- fine | silky | velvety | firm | grippy | drying | astringent
  palate_alcohol  VARCHAR                      -- low | medium | high
  palate_body     VARCHAR                      -- light | medium- | medium | medium+ | full
  palate_mousse   VARCHAR                      -- delicate | creamy | aggressive (sparkling only)
  palate_finish   VARCHAR                      -- short | medium | long | very_long
  palate_finish_sec INTEGER                    -- finish length in seconds
  palate_intensity VARCHAR                     -- light | medium- | medium | medium+ | pronounced
  palate_descriptors JSONB                     -- same structure as nose_descriptors
  -- Conclusion
  quality         VARCHAR                      -- faulty | poor | acceptable | good | very_good | outstanding
  readiness       VARCHAR                      -- drink_now | can_wait | not_ready | too_old
  drink_from      SMALLINT
  drink_by        SMALLINT
  pairing_notes   TEXT                         -- what food you had with it
  -- Scores
  personal_score  NUMERIC(5,1)                 -- in user's chosen system (100, 20, or 5)
  parker_score    SMALLINT
  spectator_score SMALLINT
  jancis_score    NUMERIC(4,1)
  decanter_score  SMALLINT
  suckling_score  SMALLINT
  -- Free text
  free_note       TEXT                         -- narrative free-form on top of structured
  -- AI enhancement
  ai_enhanced_note TEXT                        -- Claude-expanded prose version of structured note
  -- Amendments (append-only after 24h)
  amendments      JSONB DEFAULT '[]'           -- [{text, created_at}]
  is_blind        BOOLEAN DEFAULT false        -- was this a blind tasting?
  blind_prediction JSONB                       -- Claude's prediction before reveal
  created_at      TIMESTAMPTZ DEFAULT now()

-- Photos (labels, settings, cellar)
photos
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         VARCHAR REFERENCES users(id) ON DELETE CASCADE
  wine_id         UUID REFERENCES wines(id) ON DELETE CASCADE
  cellar_entry_id UUID REFERENCES cellar_entries(id) ON DELETE SET NULL
  tasting_note_id UUID REFERENCES tasting_notes(id) ON DELETE SET NULL
  type            VARCHAR NOT NULL             -- label | cellar | setting | menu | vineyard
  storage_key     VARCHAR NOT NULL
  thumbnail_key   VARCHAR
  caption         TEXT
  taken_at        TIMESTAMPTZ
  is_label_scan   BOOLEAN DEFAULT false        -- was this uploaded for label extraction?
  extracted_data  JSONB                        -- raw Claude Vision extraction result
  created_at      TIMESTAMPTZ DEFAULT now()

-- Wineries (physical locations, distinct from producer record)
wineries
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  producer_id     UUID REFERENCES producers(id)
  name            VARCHAR NOT NULL
  location        GEOGRAPHY(POINT,4326)
  address         TEXT
  website         VARCHAR
  tasting_room    BOOLEAN DEFAULT true
  visit_status    VARCHAR DEFAULT 'wishlist'   -- visited | wishlist | skip
  visited_at      DATE
  visit_notes     TEXT
  visit_rating    SMALLINT CHECK (visit_rating BETWEEN 1 AND 5)

-- Wishlist
wishlist
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         VARCHAR REFERENCES users(id) ON DELETE CASCADE
  wine_id         UUID REFERENCES wines(id)    -- if known wine
  free_text       VARCHAR                      -- if not yet in wine DB
  vintage         SMALLINT
  priority        SMALLINT DEFAULT 3 CHECK (priority BETWEEN 1 AND 5)
  reason          TEXT
  source          VARCHAR                      -- sommelier rec | article | friend | etc.
  estimated_price NUMERIC(10,2)
  market_price    NUMERIC(10,2)                -- from Wine-Searcher
  added_at        TIMESTAMPTZ DEFAULT now()

-- Vintage quality chart (seeded from curated data, updatable)
vintage_quality
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  appellation_id  UUID REFERENCES appellations(id)
  region_slug     VARCHAR NOT NULL             -- denormalized for fast lookup
  vintage         SMALLINT NOT NULL
  score           SMALLINT CHECK (score BETWEEN 50 AND 100)  -- Parker vintage chart scale
  descriptor      VARCHAR                      -- exceptional | outstanding | very good | etc.
  drinking_from   SMALLINT
  drinking_to     SMALLINT
  notes           TEXT
  source          VARCHAR DEFAULT 'curated'
  UNIQUE (region_slug, vintage)
```

---

## The ML Architecture

This is the core differentiator. Every tasting note you write improves your recommendations.

### 1. Wine Embedding Pipeline

Each canonical wine gets a rich text representation combining all available knowledge:
```python
def build_wine_embedding_text(wine: Wine, notes: list[TastingNote]) -> str:
    """
    Assembles the text blob that gets embedded.
    Captures style, origin, varietal, tasting characteristics.
    """
    parts = [
        f"{wine.full_name} ({wine.vintage if hasattr(wine, 'vintage') else 'NV'})",
        f"Appellation: {wine.appellation.name}, {wine.appellation.region}, {wine.appellation.country}",
        f"Style: {wine.style}, Color: {wine.color}",
        f"Grapes: {', '.join(g['grape'] for g in wine.primary_grapes)}",
        f"Classification: {wine.classification or 'unclassified'}",
        f"Producer style: {wine.producer.style_notes or ''}",
        f"Climate: {wine.appellation.climate or ''}",
        f"Soils: {', '.join(wine.appellation.soil_types or [])}",
    ]
    if notes:
        # Aggregate descriptor frequencies from all notes
        all_descriptors = [d['descriptor'] for n in notes for d in (n.nose_descriptors or [])]
        all_descriptors += [d['descriptor'] for n in notes for d in (n.palate_descriptors or [])]
        if all_descriptors:
            top = Counter(all_descriptors).most_common(12)
            parts.append(f"Characteristic notes: {', '.join(d for d, _ in top)}")
        avg_score = mean(n.personal_score for n in notes if n.personal_score)
        parts.append(f"Average personal score: {avg_score:.1f}")
    return "\n".join(filter(None, parts))
```

This text → `text-embedding-3-small` → 1536d vector → stored in `wine_embeddings`.

### 2. User Taste Profile Vector

Recomputed whenever the user adds or modifies a tasting note:

```python
async def recompute_taste_profile(user_id: str, db: AsyncSession):
    """
    Weighted average of wine embeddings, weighted by personal score.
    Score normalized to [0,1] before weighting.
    Wines rated < 85/100 (or equivalent) get negative weight (repulsion).
    """
    notes = await get_user_notes_with_embeddings(user_id, db)
    if len(notes) < 3:
        return  # Not enough signal yet

    vectors, weights = [], []
    for note, embedding in notes:
        norm_score = normalize_score(note.personal_score, user.scoring_system)
        # Wines rated below 0.7 repel, above attract
        weight = norm_score - 0.5  # range -0.5 to +0.5
        vectors.append(np.array(embedding.embedding))
        weights.append(weight)

    profile = np.average(vectors, axis=0, weights=np.abs(weights))
    profile = profile / np.linalg.norm(profile)  # L2 normalize

    await upsert_user_taste_profile(user_id, profile, db)
```

### 3. Recommendation Engine (ANN Search)

```python
async def get_recommendations(user_id: str, db: AsyncSession, limit: int = 10):
    """
    Find wines most similar to user taste profile.
    Exclude: already rated, already in cellar, wines user has marked 'not interested'.
    Filter options: region, style, price range, readiness.
    """
    profile = await get_user_taste_profile(user_id, db)

    # pgvector cosine similarity search
    results = await db.execute(
        """
        SELECT w.id, w.full_name, we.embedding <=> :profile AS distance
        FROM wine_embeddings we
        JOIN wines w ON w.id = we.wine_id
        WHERE we.user_id IS NULL  -- global embeddings only
          AND w.id NOT IN (
            SELECT wine_id FROM tasting_notes WHERE user_id = :user_id
            UNION
            SELECT wine_id FROM cellar_entries WHERE user_id = :user_id AND status = 'in_cellar'
          )
        ORDER BY distance ASC
        LIMIT :limit
        """,
        {"profile": profile.tolist(), "user_id": user_id, "limit": limit}
    )
    return results
```

### 4. Drinking Window Model

Two-layer approach:

**Layer 1 — Rule-based (regional aging curves):**
```python
AGING_CURVES = {
    "gevrey-chambertin":    {"peak_start": 8,  "peak_end": 20, "max": 30},
    "napa-valley-cabernet": {"peak_start": 7,  "peak_end": 18, "max": 25},
    "barolo":               {"peak_start": 10, "peak_end": 25, "max": 40},
    "champagne-vintage":    {"peak_start": 8,  "peak_end": 20, "max": 35},
    "sauternes":            {"peak_start": 5,  "peak_end": 30, "max": 50},
    "beaujolais-nouveau":   {"peak_start": 0,  "peak_end": 2,  "max": 3},
    # ... 100+ regions
}
```

**Layer 2 — Vintage quality adjustment:**
Modify the base aging curve based on `vintage_quality` score:
- 95-100pt vintage: extend peak by 20%, extend max by 15%
- 80-84pt vintage: compress peak start by 15%, compress max by 20%
- < 80pt vintage: drink within 5 years for most reds

**Layer 3 — Producer quality adjustment:**
If producer has 10+ user-rated notes with scores averaging > 92, extend windows by 10%.
(High-quality producers make age-worthy wines even in lesser appellations.)

**Output for each cellar entry:**
```
status: "not_ready" | "approaching" | "in_window" | "peak" | "past_peak" | "declining"
drink_recommendation: "Best 2027–2034. Currently closed and tannic. Decant 3h if opening now."
```

### 5. Cellar Optimizer (Claude-powered)

```python
CELLAR_OPTIMIZER_PROMPT = """
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

Be specific. Use producer names and vintages. Think like a MW advising a real collection.
"""
```

### 6. Label Scanner (Claude Vision)

```python
LABEL_SCANNER_PROMPT = """
Analyze this wine label image and extract the following in JSON format:

{
  "producer": "exact producer/château/domaine name",
  "wine_name": "cuvée/wine name (may be same as producer for simple wines)",
  "appellation": "the geographic appellation or AVA/AOC designation",
  "region": "broader region (e.g., Burgundy, Napa Valley)",
  "country": "country of origin",
  "vintage": 2019,  // integer year, null if NV
  "grapes": ["Pinot Noir"],  // list if shown on label
  "alcohol_pct": 13.5,  // numeric, null if not shown
  "classification": "Grand Cru",  // any quality classification shown
  "style": "red",  // red | white | rosé | sparkling | fortified | dessert
  "volume_ml": 750,
  "additional_text": "any other notable text (biodynamic cert, vineyard name, etc.)"
}

If a field is not visible or legible on the label, return null for that field.
Be precise — wine producers, appellations, and cuvée names must be exact.
"""
```

### 7. Blind Tasting Mode

The MW exam deduction framework, built into the UI:

**Flow:**
1. User enters structured tasting note without knowing the wine
2. On submit → Claude analyzes the note and predicts:
   - Most likely region (top 3 with confidence %)
   - Most likely grape varietal(s)
   - Probable vintage range
   - Probable quality tier (village / premier cru / grand cru)
   - Producer style hypothesis
3. User reveals the wine
4. System records: what Claude predicted, what was correct, what the user guessed
5. Over time: build a "blind tasting accuracy" stat for the user

```python
BLIND_TASTING_PROMPT = """
You are examining a blind tasting note for a classic deduction exercise.

STRUCTURED NOTE:
{structured_note}

Apply systematic MW-style deduction:

1. APPEARANCE clues: What does color intensity/hue tell us about age, grape, climate?
2. NOSE deduction: Map these primary/secondary/tertiary descriptors to likely regions/grapes
3. PALATE deduction: Acidity, tannin level/nature, body, alcohol → climate and style
4. SYNTHESIS: What combination of grape + climate + age + winemaking produces this profile?

Respond in JSON:
{
  "probable_grapes": [{"grape": "Pinot Noir", "confidence": 0.75}, ...],
  "probable_regions": [{"region": "Côte de Nuits, Burgundy", "confidence": 0.65}, ...],
  "probable_vintage_range": {"from": 2012, "to": 2018},
  "quality_tier": "premier_cru",
  "reasoning": "The combination of high acidity, fine-grained tannin, red fruit with tertiary earth and sous-bois, and a 7-second finish points strongly toward...",
  "confidence_overall": 0.6
}
"""
```

---

## API Design

All routes under `/api/v1/`. All routes require `Authorization: Bearer <clerk_jwt>`.

```
# Cellar
GET    /cellar                       User's cellar (filter: status, region, style, readiness)
POST   /cellar                       Add bottle to cellar
PUT    /cellar/{id}                  Update cellar entry (quantity, bin, featured status)
DELETE /cellar/{id}                  Remove (mark as consumed/gifted/sold)
POST   /cellar/{id}/consume          Log consumption event, decrement quantity
GET    /cellar/value                 Portfolio value timeline
GET    /cellar/optimize              Claude cellar optimization advice (cached 24h)
GET    /cellar/calendar              Drinking window calendar: bottles by recommended year

# Tasting Notes
GET    /notes                        User's tasting log (paginated, filter by wine/region/score)
POST   /notes                        Create tasting note
GET    /notes/{id}                   Note detail
PUT    /notes/{id}                   Update note (within 24h only)
POST   /notes/{id}/amend             Append amendment (after 24h)
GET    /notes/{id}/blind-analysis    Run blind tasting prediction on note

# Wines
GET    /wines                        Search wine database
GET    /wines/{id}                   Wine detail + all user notes + cellar entries
GET    /wines/{id}/vintages          All vintages with quality scores + user notes
POST   /wines                        Add new wine to database (if not found)
GET    /wines/search                 Full-text + embedding search

# Scanner
POST   /scanner/label                Multipart: image → Claude Vision → extracted fields
POST   /scanner/confirm              Confirm extraction, create or link to wine record

# Discovery
GET    /discover/recommendations     ANN recommendations against user taste profile
GET    /discover/similar/{wine_id}   Wines similar to a specific wine
POST   /discover/natural-language    "Find me something like the 2015 Pichon Baron under $80"
GET    /discover/value-picks         High score / low price outliers in Wine-Searcher data
GET    /discover/emerging-regions    Regions where user has few notes but taste match is high

# Producers
GET    /producers                    Search producers
GET    /producers/{slug}             Producer detail: wines, notes, winery location
GET    /producers/{slug}/brief       Claude-generated producer brief

# Regions
GET    /regions                      All appellations with geometry (for map)
GET    /regions/{slug}               Appellation detail: wines, vintage chart, climate
GET    /regions/{slug}/vintage-chart Vintage quality scores for this region

# Wineries
GET    /wineries                     User's winery list (visited + wishlist)
POST   /wineries                     Add winery (with visit status)
PUT    /wineries/{id}                Update visit details

# Stats & Analytics
GET    /stats                        Dashboard stats
GET    /stats/palate-radar           Taste preference axes (sweetness/acidity/tannin/etc.)
GET    /stats/regions-breakdown      Countries and regions in cellar + notes
GET    /stats/score-distribution     Personal score histogram
GET    /stats/consumption-rate       Bottles per month/year
GET    /stats/critic-agreement       How well user ratings correlate with Parker/Jancis/etc.
GET    /stats/taste-evolution        Preference axis changes over time

# Food Pairing
POST   /pairings/from-food           Body: {food description} → wine recommendations
POST   /pairings/from-wine           Body: {wine_id, vintage} → food suggestions
POST   /pairings/tonight             Body: {dish, constraints} → cellar picks ready to drink tonight

# Wishlist
GET    /wishlist                     User's wish list with current prices
POST   /wishlist                     Add wine to wishlist
PUT    /wishlist/{id}                Update priority/notes
DELETE /wishlist/{id}                Remove
```

---

## Map Implementation

### Layers (render order)
1. **Appellation polygons** — choropleth fill: visited (has user notes) / in_cellar / wishlisted / unexplored
2. **Winery markers** — visited (filled pin) vs wishlist (outline pin)
3. **User's winery visit pins** — with visit date, rating

### Data
- Appellation geometry stored in `appellations.geometry` (PostGIS MultiPolygon)
- Seed from: Wine-GIS open data + manual curation for precise AOC/AVA boundaries
- Simplified 10m geometry for map rendering (simplified from 1m source)
- Click appellation polygon → slide-in panel: style overview, key grapes, vintage chart, user's notes from this region

### Tile Source
- Protomaps PMTiles (self-hosted, free) for base map
- Custom dark ocean/slate style consistent with Cru's aesthetic

---

## Featured Bottles

Featured bottles are the emotional core of the app. These aren't just high-rated wines — they're bottles that have a story.

### What makes a bottle "featured":
- User explicitly stars it in the cellar
- Could be: a birth-year wine, a first trip to a region, a gift from someone important, a unicorn allocation, an unbelievable value find

### FeaturedBottle data:
```
cellar_entries.is_featured = true
cellar_entries.featured_story = "Narrative text — the story behind this bottle"
cellar_entries.featured_occasion = "20th anniversary | first Burgundy trip | etc."
cellar_entries.featured_companions = ["Sarah", "Tom"]
```

### Featured UI:
- Full-bleed label photo, editorial layout
- Story displayed as prose, not a form
- "What the critics said" vs "What you said" side-by-side
- Memory map: where you were when you drank it (if location logged)
- Only visible to the user (private by default)

---

## Natural Language Cellar Query

A conversational interface over the user's own cellar:

```
User: "What should I open tonight with a rack of lamb? Budget one hour of decanting."
→ Query cellar for: in_window reds, high tannin, long finish, bottle > 2h decant flagged
→ Claude assembles: 3 cellar picks with pairing notes and decant timing

User: "What's my best bottle I should open in the next year?"
→ Filter: cellar entries where drink_by BETWEEN now AND now+1year
→ Sort by estimated_value DESC, personal_score DESC
→ Claude narrates: "Your 2009 Pichon Baron hits its optimal window in 2025..."

User: "Find me something like the Roagna Barbaresco I loved but under $100"
→ Embed "Roagna Barbaresco" note → ANN search in Wine-Searcher price-filtered results
→ Return semantically similar wines with market price < $100
```

---

## Build Phases

### Phase 1 — Foundation (Week 1–2)
- [ ] Docker Compose: postgres+pgvector+postgis, redis, minio, backend, frontend
- [ ] Alembic migrations: users, appellations, producers, wines, cellar_entries
- [ ] Clerk auth integration
- [ ] Seed: appellations, grape varietals, vintage quality charts
- [ ] Wine search + add (manual entry, no scanner yet)
- [ ] Basic cellar CRUD

### Phase 2 — Tasting Journal (Week 2–3)
- [ ] Structured tasting note form (WSET vocabulary picker)
- [ ] Free-text note layer on top of structured
- [ ] Note timeline view
- [ ] Score input (configurable system)
- [ ] Photo upload for labels and settings
- [ ] Basic stats: count, avg score, regions

### Phase 3 — Label Scanner + Wine DB (Week 3–4)
- [ ] Claude Vision label extraction API
- [ ] Scan → confirm → link/create wine flow
- [ ] Wine database search + autocomplete
- [ ] Producer + appellation detail pages
- [ ] MinIO photo storage pipeline

### Phase 4 — Embeddings + Recommendations (Week 4–5)
- [ ] pgvector extension + wine_embeddings schema
- [ ] Wine embedding pipeline (build_wine_embedding_text → OpenAI → pgvector)
- [ ] User taste profile computation (recompute on each note)
- [ ] ANN recommendation endpoint
- [ ] `similar wines` on wine detail page
- [ ] Natural language wine search

### Phase 5 — Map + Regions (Week 5–6)
- [ ] MapLibre GL wine region map
- [ ] Appellation choropleth (visited / in_cellar / wishlist / unexplored)
- [ ] Winery markers + visit tracking
- [ ] Region detail pages with vintage charts
- [ ] Click-through from map → region → wines → notes

### Phase 6 — Drinking Windows + Cellar Intelligence (Week 6–7)
- [ ] Drinking window model (rule-based + vintage quality adjustment)
- [ ] Cellar entry window badges
- [ ] Drinking window calendar view
- [ ] Cellar optimizer (Claude-powered advice)
- [ ] Value tracking: Wine-Searcher price sync (nightly APScheduler)
- [ ] Portfolio value chart over time

### Phase 7 — Advanced Features (Week 7–8)
- [ ] Blind tasting mode (note entry → Claude prediction → reveal)
- [ ] Food pairing engine (Claude)
- [ ] Natural language cellar query
- [ ] Featured bottles UI (editorial layout, story entry)
- [ ] Critic agreement stats
- [ ] Taste evolution chart (preference axes over time)
- [ ] CellarTracker CSV import
- [ ] Wishlist with Wine-Searcher price alerts

---

## Design System

**Aesthetic:** Private collector's ledger. Not a wine bar. Not a grape emoji app.
Think: the private tasting room of a serious négociant. Dark slate, aged oak, hand-pressed paper texture. Typography from the fine printing tradition. The UI should feel like opening a leather-bound journal in a candlelit cellar.

**Do not:** Red-and-gold "wine country" kitsch. Purple gradients. Grape bunches. Anything that looks like a restaurant menu or a Napa resort brochure.

**Color tokens:**
```css
--cru-bg:              #0d0b09;   /* near-black, warm — like a dark cellar */
--cru-surface:         #161210;   /* card backgrounds */
--cru-surface-raised:  #1e1916;   /* elevated panels */
--cru-border:          #2d2420;   /* subtle warm border */
--cru-accent-garnet:   #8b1a2e;   /* deep garnet — primary accent */
--cru-accent-gold:     #c9a84c;   /* aged gold — secondary accent */
--cru-accent-straw:    #d4b896;   /* pale straw — white wine tones */
--cru-accent-slate:    #6b7280;   /* muted slate */
--cru-text:            #e8ddd4;   /* warm off-white */
--cru-text-muted:      #8b7d74;   /* muted warm gray */
-- Color for wine types --
--cru-red:             #8b1a2e;
--cru-white:           #d4b896;
--cru-rose:            #c97a7a;
--cru-orange:          #c9824c;
--cru-sparkling:       #a8b8c8;
--cru-fortified:       #7a5a2e;
```

**Typography:**
- Display: `Cormorant Garamond` — for wine names, producer names, appellation headings. Italic for emphasis. This typeface has centuries of provenance in fine printing.
- Body: `Libre Baskerville` — serif, legible, warm. For tasting notes, descriptions, prose.
- UI: `DM Sans` — clean, low-contrast sans for labels, UI elements, metadata
- Mono: `Fira Code` — scores, percentages, dates, vintage years

**Score display:** Vintage years and scores always in mono, extra-large, left-aligned. The number is the hero.

---

## Performance Constraints

- Wine embedding ANN search must return in < 200ms — achieved with IVFFlat index (lists=100)
- Recompute user taste profile async after note save — never in the request path
- Cellar value totals cached in Redis, invalidated on price sync or new purchase
- Map appellation GeoJSON: serve simplified geometry (< 2MB total), cache in Redis 1h
- Label scanner: Claude Vision response target < 8s — show skeleton UI immediately
- Vintage chart: fully static, served from CDN or Redis, never DB-queried per-request
- Tasting note form: structured descriptors rendered from `tastingVocabulary.ts` — never fetched from API

---

## What Claude Code Should Never Do

- Never expose one user's cellar, notes, or photos to another user — user_id filter is mandatory on every query
- Never overwrite a tasting note's structured data after 24h — only append to `amendments`
- Never regenerate an embedding in-place — insert a new `wine_embeddings` row with a new timestamp
- Never delete a photo from MinIO without deleting the DB record, and vice versa — transactional
- Never call Wine-Searcher API in a user request — only in scheduled background tasks (rate limits)
- Never commit `.env` — `.claudeignore` must include `.env*`, `.env.local`
- Never store Anthropic or OpenAI API keys in frontend code — all AI calls through FastAPI backend
- Never use Mapbox SDK — MapLibre GL only
- Never use Inter, Roboto, or system-ui fonts — Cru's typography is non-negotiable
- Never collapse the appellation hierarchy — "Burgundy red" and "Gevrey-Chambertin Premier Cru" are not interchangeable