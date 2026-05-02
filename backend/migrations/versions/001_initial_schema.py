"""Initial schema — all tables, extensions, and indexes.

Revision ID: 001
Revises: None
Create Date: 2026-04-11

Tables created in FK-dependency order:
  1. users
  2. appellations (self-referential parent_id)
  3. producers (FK appellations)
  4. wines (FK producers, appellations)
  5. wine_embeddings (FK wines, users) — pgvector column + IVFFlat index
  6. user_taste_profiles (FK users) — pgvector column
  7. cellar_entries (FK users, wines)
  8. tasting_notes (FK users, wines, cellar_entries)
  9. photos (FK users, wines, cellar_entries, tasting_notes)
  10. wineries (FK producers)
  11. wishlist (FK users, wines)
  12. vintage_quality (FK appellations)
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Extensions — must exist before any vector or geography columns
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # ------------------------------------------------------------------
    # 1. users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("home_country", sa.String(2), nullable=True),
        sa.Column("scoring_system", sa.String(), nullable=False, server_default="100pt"),
        sa.Column(
            "preferences",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    # ------------------------------------------------------------------
    # 2. appellations (self-referential parent_id)
    # ------------------------------------------------------------------
    op.create_table(
        "appellations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("country_code", sa.String(2), nullable=False),
        sa.Column("country", sa.String(), nullable=False),
        sa.Column("region", sa.String(), nullable=True),
        sa.Column("sub_region", sa.String(), nullable=True),
        # Dr. Isabelle's corrections
        sa.Column("appellation_type", sa.String(), nullable=False),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("appellations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # Renamed from classification — avoids ambiguity with wine classification
        sa.Column("legal_classification", sa.String(), nullable=True),
        # PostGIS MULTIPOLYGON — nullable until geometry is seeded
        sa.Column(
            "geometry",
            sa.Text(),  # stored as WKT/WKB via geoalchemy2; actual type set below
            nullable=True,
        ),
        sa.Column("climate", sa.String(), nullable=True),
        sa.Column("soil_types", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("primary_grapes", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("style_notes", sa.Text(), nullable=True),
        sa.Column("vintage_notes", sa.Text(), nullable=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    # Replace placeholder geometry column with proper PostGIS type
    op.execute(
        "ALTER TABLE appellations "
        "ALTER COLUMN geometry TYPE geography(MULTIPOLYGON, 4326) "
        "USING geometry::geography"
    )
    op.create_index("ix_appellations_country_code", "appellations", ["country_code"])
    op.create_index("ix_appellations_parent_id", "appellations", ["parent_id"])

    # ------------------------------------------------------------------
    # 3. producers
    # ------------------------------------------------------------------
    op.create_table(
        "producers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("country_code", sa.String(2), nullable=True),
        sa.Column(
            "appellation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("appellations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "location",
            sa.Text(),  # will be cast to geography(POINT, 4326) below
            nullable=True,
        ),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("founded_year", sa.Integer(), nullable=True),
        sa.Column("winemaker", sa.String(), nullable=True),
        sa.Column("owner", sa.String(), nullable=True),
        sa.Column("style_notes", sa.Text(), nullable=True),
        sa.Column("natural", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("organic_cert", sa.String(), nullable=True),
        sa.Column("biodynamic", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("website", sa.String(), nullable=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.execute(
        "ALTER TABLE producers "
        "ALTER COLUMN location TYPE geography(POINT, 4326) "
        "USING location::geography"
    )
    op.create_index("ix_producers_appellation_id", "producers", ["appellation_id"])

    # ------------------------------------------------------------------
    # 4. wines
    # ------------------------------------------------------------------
    op.create_table(
        "wines",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "producer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("producers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "appellation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("appellations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("style", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column(
            "primary_grapes",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("classification", sa.String(), nullable=True),
        sa.Column("alcohol_typical", sa.Numeric(4, 1), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_wines_producer_id", "wines", ["producer_id"])
    op.create_index("ix_wines_appellation_id", "wines", ["appellation_id"])

    # ------------------------------------------------------------------
    # 5. wine_embeddings — pgvector column + IVFFlat index
    # ------------------------------------------------------------------
    op.create_table(
        "wine_embeddings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "wine_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wines.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("embedding_text", sa.Text(), nullable=False),
        sa.Column("model_version", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    # Add pgvector column — must use raw SQL because Alembic doesn't know the VECTOR type
    op.execute("ALTER TABLE wine_embeddings ADD COLUMN embedding vector(1536) NOT NULL")
    op.create_index("ix_wine_embeddings_wine_id", "wine_embeddings", ["wine_id"])
    op.create_index("ix_wine_embeddings_user_id", "wine_embeddings", ["user_id"])
    # IVFFlat index for cosine similarity ANN search — target < 200ms
    op.execute(
        "CREATE INDEX wine_embeddings_cosine_idx ON wine_embeddings "
        "USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )

    # ------------------------------------------------------------------
    # 6. user_taste_profiles — pgvector column
    # ------------------------------------------------------------------
    op.create_table(
        "user_taste_profiles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("last_computed", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("note_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pref_sweetness", sa.Numeric(3, 2), nullable=True),
        sa.Column("pref_acidity", sa.Numeric(3, 2), nullable=True),
        sa.Column("pref_tannin", sa.Numeric(3, 2), nullable=True),
        sa.Column("pref_body", sa.Numeric(3, 2), nullable=True),
        sa.Column("pref_oak", sa.Numeric(3, 2), nullable=True),
        sa.Column("top_regions", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("top_grapes", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column(
            "flavor_affinities",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.execute(
        "ALTER TABLE user_taste_profiles ADD COLUMN profile_vector vector(1536)"
    )
    op.create_index("ix_user_taste_profiles_user_id", "user_taste_profiles", ["user_id"])

    # ------------------------------------------------------------------
    # 7. cellar_entries
    # ------------------------------------------------------------------
    op.create_table(
        "cellar_entries",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "wine_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wines.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("vintage", sa.SmallInteger(), nullable=False),
        sa.Column("quantity", sa.SmallInteger(), nullable=False, server_default="1"),
        sa.Column("format", sa.String(), nullable=False, server_default="750ml"),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("purchase_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("purchase_source", sa.String(), nullable=True),
        sa.Column("retailer", sa.String(), nullable=True),
        sa.Column("allocation_list", sa.String(), nullable=True),
        sa.Column("bin_location", sa.String(), nullable=True),
        sa.Column("condition", sa.String(), nullable=False, server_default="perfect"),
        sa.Column("provenance_notes", sa.Text(), nullable=True),
        sa.Column("drink_from", sa.SmallInteger(), nullable=True),
        sa.Column("drink_by", sa.SmallInteger(), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("featured_story", sa.Text(), nullable=True),
        sa.Column("featured_occasion", sa.String(), nullable=True),
        sa.Column("featured_companions", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("current_value", sa.Numeric(10, 2), nullable=True),
        sa.Column("value_updated", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="in_cellar"),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cellar_entries_user_id", "cellar_entries", ["user_id"])
    op.create_index("ix_cellar_entries_wine_id", "cellar_entries", ["wine_id"])
    op.create_index(
        "ix_cellar_entries_user_status",
        "cellar_entries",
        ["user_id", "status"],
    )

    # ------------------------------------------------------------------
    # 8. tasting_notes
    # ------------------------------------------------------------------
    op.create_table(
        "tasting_notes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "wine_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wines.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "cellar_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cellar_entries.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("vintage", sa.SmallInteger(), nullable=False),
        sa.Column("tasted_at", sa.DateTime(timezone=True), nullable=False),
        # Context
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("occasion", sa.String(), nullable=True),
        sa.Column("decant_minutes", sa.Integer(), nullable=True),
        sa.Column("serve_temp_c", sa.Numeric(3, 1), nullable=True),
        sa.Column("companions", postgresql.ARRAY(sa.String()), nullable=True),
        # Appearance
        sa.Column("app_clarity", sa.String(), nullable=True),
        sa.Column("app_intensity", sa.String(), nullable=True),
        sa.Column("app_color", sa.String(), nullable=True),
        sa.Column("app_other", sa.String(), nullable=True),
        # Nose
        sa.Column("nose_condition", sa.String(), nullable=False, server_default="clean"),
        sa.Column("nose_fault", sa.String(), nullable=True),
        sa.Column("nose_intensity", sa.String(), nullable=True),
        sa.Column("nose_development", sa.String(), nullable=True),
        sa.Column(
            "nose_descriptors",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        # Palate
        sa.Column("palate_sweetness", sa.String(), nullable=True),
        sa.Column("palate_acidity", sa.String(), nullable=True),
        sa.Column("palate_tannin", sa.String(), nullable=True),
        sa.Column("palate_tannin_nature", sa.String(), nullable=True),
        sa.Column("palate_alcohol", sa.String(), nullable=True),
        sa.Column("palate_body", sa.String(), nullable=True),
        sa.Column("palate_mousse", sa.String(), nullable=True),
        sa.Column("palate_finish", sa.String(), nullable=True),
        sa.Column("palate_finish_sec", sa.Integer(), nullable=True),
        sa.Column("palate_intensity", sa.String(), nullable=True),
        sa.Column(
            "palate_descriptors",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        # Conclusion
        sa.Column("quality", sa.String(), nullable=True),
        sa.Column("readiness", sa.String(), nullable=True),
        sa.Column("drink_from", sa.SmallInteger(), nullable=True),
        sa.Column("drink_by", sa.SmallInteger(), nullable=True),
        sa.Column("pairing_notes", sa.Text(), nullable=True),
        # Scores
        sa.Column("personal_score", sa.Numeric(5, 1), nullable=True),
        sa.Column("parker_score", sa.SmallInteger(), nullable=True),
        sa.Column("spectator_score", sa.SmallInteger(), nullable=True),
        sa.Column("jancis_score", sa.Numeric(4, 1), nullable=True),
        sa.Column("decanter_score", sa.SmallInteger(), nullable=True),
        sa.Column("suckling_score", sa.SmallInteger(), nullable=True),
        # Free text + AI
        sa.Column("free_note", sa.Text(), nullable=True),
        sa.Column("ai_enhanced_note", sa.Text(), nullable=True),
        # Amendments (append-only after 24h)
        sa.Column(
            "amendments",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        # Blind tasting
        sa.Column("is_blind", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "blind_prediction",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasting_notes_user_id", "tasting_notes", ["user_id"])
    op.create_index("ix_tasting_notes_wine_id", "tasting_notes", ["wine_id"])
    op.create_index(
        "ix_tasting_notes_user_tasted_at",
        "tasting_notes",
        ["user_id", "tasted_at"],
    )

    # ------------------------------------------------------------------
    # 9. photos
    # ------------------------------------------------------------------
    op.create_table(
        "photos",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "wine_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wines.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "cellar_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cellar_entries.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "tasting_note_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tasting_notes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("storage_key", sa.String(), nullable=False),
        sa.Column("thumbnail_key", sa.String(), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_label_scan", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "extracted_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_photos_user_id", "photos", ["user_id"])
    op.create_index("ix_photos_wine_id", "photos", ["wine_id"])

    # ------------------------------------------------------------------
    # 10. wineries
    # ------------------------------------------------------------------
    op.create_table(
        "wineries",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "producer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("producers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "location",
            sa.Text(),  # cast to geography(POINT, 4326) below
            nullable=True,
        ),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("website", sa.String(), nullable=True),
        sa.Column("tasting_room", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("visit_status", sa.String(), nullable=False, server_default="wishlist"),
        sa.Column("visited_at", sa.Date(), nullable=True),
        sa.Column("visit_notes", sa.Text(), nullable=True),
        sa.Column("visit_rating", sa.SmallInteger(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "ALTER TABLE wineries "
        "ALTER COLUMN location TYPE geography(POINT, 4326) "
        "USING location::geography"
    )
    op.create_index("ix_wineries_producer_id", "wineries", ["producer_id"])

    # ------------------------------------------------------------------
    # 11. wishlist
    # ------------------------------------------------------------------
    op.create_table(
        "wishlist",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "wine_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wines.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("free_text", sa.String(), nullable=True),
        sa.Column("vintage", sa.SmallInteger(), nullable=True),
        sa.Column("priority", sa.SmallInteger(), nullable=False, server_default="3"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("estimated_price", sa.Numeric(10, 2), nullable=True),
        sa.Column("market_price", sa.Numeric(10, 2), nullable=True),
        sa.Column(
            "added_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint("priority BETWEEN 1 AND 5", name="ck_wishlist_priority"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_wishlist_user_id", "wishlist", ["user_id"])

    # ------------------------------------------------------------------
    # 12. vintage_quality
    # ------------------------------------------------------------------
    op.create_table(
        "vintage_quality",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "appellation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("appellations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("region_slug", sa.String(), nullable=False),
        sa.Column("vintage", sa.SmallInteger(), nullable=False),
        sa.Column("score", sa.SmallInteger(), nullable=True),
        sa.Column("descriptor", sa.String(), nullable=True),
        sa.Column("drinking_from", sa.SmallInteger(), nullable=True),
        sa.Column("drinking_to", sa.SmallInteger(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=False, server_default="curated"),
        sa.CheckConstraint("score BETWEEN 50 AND 100", name="ck_vintage_quality_score"),
        sa.UniqueConstraint(
            "region_slug", "vintage", name="uq_vintage_quality_region_year"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_vintage_quality_region_slug", "vintage_quality", ["region_slug"]
    )
    op.create_index(
        "ix_vintage_quality_appellation_id", "vintage_quality", ["appellation_id"]
    )


def downgrade() -> None:
    op.drop_table("vintage_quality")
    op.drop_table("wishlist")
    op.drop_table("wineries")
    op.drop_table("photos")
    op.drop_table("tasting_notes")
    op.drop_table("cellar_entries")
    op.drop_table("user_taste_profiles")
    op.drop_table("wine_embeddings")
    op.drop_table("wines")
    op.drop_table("producers")
    op.drop_table("appellations")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS postgis")
    op.execute("DROP EXTENSION IF EXISTS vector")
