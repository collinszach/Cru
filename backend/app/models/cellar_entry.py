import uuid
from datetime import date, datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CellarEntry(Base):
    __tablename__ = "cellar_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    wine_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wines.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    vintage: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    quantity: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)
    # 375ml | 750ml | 1.5L | 3L | 6L
    format: Mapped[str] = mapped_column(String, nullable=False, default="750ml")

    # Purchase provenance
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    purchase_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    # winery | retailer | auction | allocation | gift
    purchase_source: Mapped[str | None] = mapped_column(String, nullable=True)
    retailer: Mapped[str | None] = mapped_column(String, nullable=True)
    # Mailing list / allocation name
    allocation_list: Mapped[str | None] = mapped_column(String, nullable=True)

    # Physical storage
    # Rack position, e.g. "A-3"
    bin_location: Mapped[str | None] = mapped_column(String, nullable=True)
    # perfect | good | unknown | suspect
    condition: Mapped[str] = mapped_column(String, nullable=False, default="perfect")
    provenance_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Drinking window
    drink_from: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    drink_by: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # Featured bottle fields (emotional core of the app)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    featured_story: Mapped[str | None] = mapped_column(Text, nullable=True)
    featured_occasion: Mapped[str | None] = mapped_column(String, nullable=True)
    featured_companions: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )

    # Market value — populated by nightly Wine-Searcher sync, never in request path
    current_value: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    value_updated: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Status lifecycle
    # in_cellar | consumed | gifted | lost | sold
    status: Mapped[str] = mapped_column(String, nullable=False, default="in_cellar")
    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Purchase / provenance notes (not tasting notes)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    wine: Mapped["Wine | None"] = relationship("Wine")  # noqa: F821
    user: Mapped["User"] = relationship("User")  # noqa: F821
    tasting_notes: Mapped[list["TastingNote"]] = relationship(  # noqa: F821
        "TastingNote",
        back_populates="cellar_entry",
        foreign_keys="TastingNote.cellar_entry_id",
    )
