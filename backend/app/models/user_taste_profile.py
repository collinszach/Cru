"""
User taste profile — recomputed asynchronously after each tasting note.
Never recomputed in the request path.
"""
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserTasteProfile(Base):
    __tablename__ = "user_taste_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    # Weighted average of rated wine embeddings — L2 normalized
    profile_vector: Mapped[list[float] | None] = mapped_column(
        Vector(1536), nullable=True
    )
    last_computed: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # How many tasting notes this profile is based on
    note_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Structured preference axes (0–1 scale, computed from notes)
    pref_sweetness: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    pref_acidity: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    pref_tannin: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    pref_body: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    pref_oak: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)

    # Computed from top-rated wines
    top_regions: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    top_grapes: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    # descriptor → avg rating when that descriptor is present
    flavor_affinities: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    user: Mapped["User"] = relationship("User")  # noqa: F821
