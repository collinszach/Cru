"""
Tasting notes — immutable after 24 hours.

RULE: After 24h from created_at, no field may be mutated.
      Additional observations must be appended to `amendments` with a timestamp.
      The note is a historical document.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TastingNote(Base):
    __tablename__ = "tasting_notes"

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
    cellar_entry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cellar_entries.id", ondelete="SET NULL"),
        nullable=True,
    )
    vintage: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    tasted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # --- Context ---
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    # dinner | blind tasting | winery visit | etc.
    occasion: Mapped[str | None] = mapped_column(String, nullable=True)
    decant_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    serve_temp_c: Mapped[float | None] = mapped_column(Numeric(3, 1), nullable=True)
    companions: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # --- Appearance ---
    # clear | hazy | cloudy
    app_clarity: Mapped[str | None] = mapped_column(String, nullable=True)
    # pale | medium | deep
    app_intensity: Mapped[str | None] = mapped_column(String, nullable=True)
    # ruby | garnet | tawny | lemon | gold | etc.
    app_color: Mapped[str | None] = mapped_column(String, nullable=True)
    # legs, effervescence notes
    app_other: Mapped[str | None] = mapped_column(String, nullable=True)

    # --- Nose ---
    # clean | faulty
    nose_condition: Mapped[str] = mapped_column(String, nullable=False, default="clean")
    # TCA | oxidation | reduction | brett | VA | etc.
    nose_fault: Mapped[str | None] = mapped_column(String, nullable=True)
    # light | medium- | medium | medium+ | pronounced
    nose_intensity: Mapped[str | None] = mapped_column(String, nullable=True)
    # youthful | developing | mature | tired
    nose_development: Mapped[str | None] = mapped_column(String, nullable=True)
    # [{tier:'primary', descriptor:'red cherry', intensity:'medium'}]
    nose_descriptors: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)

    # --- Palate ---
    # bone_dry | dry | off_dry | medium_dry | medium_sweet | sweet | luscious
    palate_sweetness: Mapped[str | None] = mapped_column(String, nullable=True)
    # low | medium- | medium | medium+ | high
    palate_acidity: Mapped[str | None] = mapped_column(String, nullable=True)
    # low | medium- | medium | medium+ | high (reds only)
    palate_tannin: Mapped[str | None] = mapped_column(String, nullable=True)
    # fine | silky | velvety | firm | grippy | drying | astringent
    palate_tannin_nature: Mapped[str | None] = mapped_column(String, nullable=True)
    # low | medium | high
    palate_alcohol: Mapped[str | None] = mapped_column(String, nullable=True)
    # light | medium- | medium | medium+ | full
    palate_body: Mapped[str | None] = mapped_column(String, nullable=True)
    # delicate | creamy | aggressive (sparkling only)
    palate_mousse: Mapped[str | None] = mapped_column(String, nullable=True)
    # short | medium | long | very_long
    palate_finish: Mapped[str | None] = mapped_column(String, nullable=True)
    palate_finish_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # light | medium- | medium | medium+ | pronounced
    palate_intensity: Mapped[str | None] = mapped_column(String, nullable=True)
    palate_descriptors: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)

    # --- Conclusion ---
    # faulty | poor | acceptable | good | very_good | outstanding
    quality: Mapped[str | None] = mapped_column(String, nullable=True)
    # drink_now | can_wait | not_ready | too_old
    readiness: Mapped[str | None] = mapped_column(String, nullable=True)
    drink_from: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    drink_by: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    pairing_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Scores ---
    # In user's chosen system (100, 20, or 5)
    personal_score: Mapped[float | None] = mapped_column(Numeric(5, 1), nullable=True)
    parker_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    spectator_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    jancis_score: Mapped[float | None] = mapped_column(Numeric(4, 1), nullable=True)
    decanter_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    suckling_score: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # --- Free text ---
    free_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Claude-expanded prose version of the structured note
    ai_enhanced_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Amendments appended after 24h — [{text, created_at}]
    amendments: Mapped[list[dict]] = mapped_column(
        JSONB, nullable=False, server_default="[]"
    )

    # Blind tasting
    is_blind: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # Claude's prediction before reveal — stored after prediction is made
    blind_prediction: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Immutable after 24h — enforced at API layer
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    wine: Mapped["Wine | None"] = relationship("Wine")  # noqa: F821
    user: Mapped["User"] = relationship("User")  # noqa: F821
    cellar_entry: Mapped["CellarEntry | None"] = relationship(  # noqa: F821
        "CellarEntry",
        back_populates="tasting_notes",
        foreign_keys=[cellar_entry_id],
    )
