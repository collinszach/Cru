import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Producer(Base):
    __tablename__ = "producers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    country_code: Mapped[str | None] = mapped_column(String(2), nullable=True)
    appellation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appellations.id", ondelete="SET NULL"),
        nullable=True,
    )
    # PostGIS point — winery location
    location: Mapped[object | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    founded_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    winemaker: Mapped[str | None] = mapped_column(String, nullable=True)
    # Important: ownership changes matter to wine provenance
    owner: Mapped[str | None] = mapped_column(String, nullable=True)
    style_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    natural: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # EU Organic / Demeter / HVE / etc.
    organic_cert: Mapped[str | None] = mapped_column(String, nullable=True)
    biodynamic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    # Claude-generated producer brief — refreshed periodically
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    appellation: Mapped["Appellation | None"] = relationship(  # noqa: F821
        "Appellation", foreign_keys=[appellation_id]
    )
    wines: Mapped[list["Wine"]] = relationship(  # noqa: F821
        "Wine", back_populates="producer"
    )
