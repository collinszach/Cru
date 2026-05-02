import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WishlistItem(Base):
    __tablename__ = "wishlist"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # FK to wines if the wine is already in our database
    wine_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wines.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Free text for wines not yet in the DB
    free_text: Mapped[str | None] = mapped_column(String, nullable=True)
    vintage: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    # 1–5 priority (1 = highest)
    priority: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=3)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # sommelier rec | article | friend | etc.
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    estimated_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    # From Wine-Searcher — updated by nightly background task
    market_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    wine: Mapped["Wine | None"] = relationship("Wine")  # noqa: F821
    user: Mapped["User"] = relationship("User")  # noqa: F821
