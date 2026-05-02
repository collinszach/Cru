import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

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
        ForeignKey("wines.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    cellar_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cellar_entries.id", ondelete="SET NULL"),
        nullable=True,
    )
    tasting_note_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasting_notes.id", ondelete="SET NULL"),
        nullable=True,
    )
    # label | cellar | setting | menu | vineyard
    type: Mapped[str] = mapped_column(String, nullable=False)
    # MinIO object key
    storage_key: Mapped[str] = mapped_column(String, nullable=False)
    # MinIO thumbnail key (generated on upload)
    thumbnail_key: Mapped[str | None] = mapped_column(String, nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    taken_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Was this photo uploaded for Claude Vision label extraction?
    is_label_scan: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Raw Claude Vision extraction result
    extracted_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    wine: Mapped["Wine | None"] = relationship("Wine")  # noqa: F821
    user: Mapped["User"] = relationship("User")  # noqa: F821
    cellar_entry: Mapped["CellarEntry | None"] = relationship("CellarEntry")  # noqa: F821
    tasting_note: Mapped["TastingNote | None"] = relationship("TastingNote")  # noqa: F821
