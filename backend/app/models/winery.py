import uuid
from datetime import date

from geoalchemy2 import Geography
from sqlalchemy import Boolean, Date, ForeignKey, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Winery(Base):
    __tablename__ = "wineries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    producer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("producers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[object | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    tasting_room: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # visited | wishlist | skip
    visit_status: Mapped[str] = mapped_column(
        String, nullable=False, default="wishlist"
    )
    visited_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    visit_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    visit_rating: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    producer: Mapped["Producer | None"] = relationship("Producer")  # noqa: F821
