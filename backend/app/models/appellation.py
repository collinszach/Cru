import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import (
    ARRAY,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Valid appellation_type values — enforced at application layer, documented here.
# regional | sub_regional | village | premier_cru | grand_cru |
# ava | doc | docg | qba | igp | gi | other
APPELLATION_TYPES = frozenset(
    {
        "regional",
        "sub_regional",
        "village",
        "premier_cru",
        "grand_cru",
        "ava",
        "doc",
        "docg",
        "qba",
        "igp",
        "gi",
        "other",
    }
)


class Appellation(Base):
    __tablename__ = "appellations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    country: Mapped[str] = mapped_column(String, nullable=False)
    region: Mapped[str | None] = mapped_column(String, nullable=True)
    sub_region: Mapped[str | None] = mapped_column(String, nullable=True)

    # Dr. Isabelle's corrections
    appellation_type: Mapped[str] = mapped_column(String, nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appellations.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Renamed from 'classification' to avoid ambiguity with wine classification
    legal_classification: Mapped[str | None] = mapped_column(String, nullable=True)

    # PostGIS geography — nullable because some appellations are text-only at seed time
    geometry: Mapped[object | None] = mapped_column(
        Geography(geometry_type="MULTIPOLYGON", srid=4326), nullable=True
    )

    climate: Mapped[str | None] = mapped_column(String, nullable=True)
    soil_types: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    primary_grapes: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    style_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    vintage_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Self-referential relationship — children of this appellation
    children: Mapped[list["Appellation"]] = relationship(
        "Appellation",
        foreign_keys=[parent_id],
        back_populates="parent",
    )
    parent: Mapped["Appellation | None"] = relationship(
        "Appellation",
        foreign_keys=[parent_id],
        back_populates="children",
        remote_side="Appellation.id",
    )
