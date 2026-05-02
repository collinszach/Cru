import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Wine(Base):
    __tablename__ = "wines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    producer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("producers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    appellation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appellations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Cuvée name — e.g. "Chambertin Grand Cru"
    name: Mapped[str] = mapped_column(String, nullable=False)
    # Full display name — e.g. "Domaine Rousseau Chambertin Grand Cru"
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    # Still / Sparkling / Fortified / Dessert (taxonomy from CLAUDE.md)
    style: Mapped[str] = mapped_column(String, nullable=False)
    # red | white | rosé | orange | amber
    color: Mapped[str | None] = mapped_column(String, nullable=True)
    # [{grape: "Pinot Noir", pct: 100}]
    primary_grapes: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    # Grand Cru | Premier Cru | Village | etc.
    classification: Mapped[str | None] = mapped_column(String, nullable=True)
    alcohol_typical: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    producer: Mapped["Producer | None"] = relationship(  # noqa: F821
        "Producer", back_populates="wines"
    )
    appellation: Mapped["Appellation | None"] = relationship(  # noqa: F821
        "Appellation", foreign_keys=[appellation_id]
    )
    embeddings: Mapped[list["WineEmbedding"]] = relationship(  # noqa: F821
        "WineEmbedding", back_populates="wine", cascade="all, delete-orphan"
    )
