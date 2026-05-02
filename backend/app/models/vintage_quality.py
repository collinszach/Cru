import uuid

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class VintageQuality(Base):
    __tablename__ = "vintage_quality"
    __table_args__ = (
        UniqueConstraint("region_slug", "vintage", name="uq_vintage_quality_region_year"),
        CheckConstraint("score BETWEEN 50 AND 100", name="ck_vintage_quality_score"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    appellation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appellations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Denormalized for fast lookup — avoids join on every cellar window query
    region_slug: Mapped[str] = mapped_column(String, nullable=False, index=True)
    vintage: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    # Parker-scale: 50–100
    score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    # exceptional | outstanding | very good | good | average | below average
    descriptor: Mapped[str | None] = mapped_column(String, nullable=True)
    drinking_from: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    drinking_to: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String, nullable=False, default="curated")

    appellation: Mapped["Appellation | None"] = relationship("Appellation")  # noqa: F821
