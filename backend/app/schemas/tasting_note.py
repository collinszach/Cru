import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator


class DescriptorItem(BaseModel):
    tier: str  # primary | secondary | tertiary
    descriptor: str
    intensity: Optional[str] = None  # light | medium | pronounced


class TastingNoteCreate(BaseModel):
    wine_id: Optional[uuid.UUID] = None
    cellar_entry_id: Optional[uuid.UUID] = None
    vintage: int = Field(..., ge=1800, le=2030)
    tasted_at: datetime
    # Context
    location: Optional[str] = None
    occasion: Optional[str] = None
    decant_minutes: Optional[int] = None
    serve_temp_c: Optional[float] = None
    companions: Optional[list[str]] = None
    # Appearance
    app_clarity: Optional[str] = None
    app_intensity: Optional[str] = None
    app_color: Optional[str] = None
    app_other: Optional[str] = None
    # Nose
    nose_condition: str = "clean"
    nose_fault: Optional[str] = None
    nose_intensity: Optional[str] = None
    nose_development: Optional[str] = None
    nose_descriptors: Optional[list[DescriptorItem]] = None
    # Palate
    palate_sweetness: Optional[str] = None
    palate_acidity: Optional[str] = None
    palate_tannin: Optional[str] = None
    palate_tannin_nature: Optional[str] = None
    palate_alcohol: Optional[str] = None
    palate_body: Optional[str] = None
    palate_mousse: Optional[str] = None
    palate_finish: Optional[str] = None
    palate_finish_sec: Optional[int] = None
    palate_intensity: Optional[str] = None
    palate_descriptors: Optional[list[DescriptorItem]] = None
    # Conclusion
    quality: Optional[str] = None
    readiness: Optional[str] = None
    drink_from: Optional[int] = None
    drink_by: Optional[int] = None
    pairing_notes: Optional[str] = None
    # Scores
    personal_score: Optional[float] = None
    parker_score: Optional[int] = None
    spectator_score: Optional[int] = None
    jancis_score: Optional[float] = None
    decanter_score: Optional[int] = None
    suckling_score: Optional[int] = None
    # Free text
    free_note: Optional[str] = None
    # Blind tasting mode
    is_blind: bool = False


class TastingNoteUpdate(BaseModel):
    """Only allowed within 24h of creation."""

    location: Optional[str] = None
    occasion: Optional[str] = None
    decant_minutes: Optional[int] = None
    serve_temp_c: Optional[float] = None
    companions: Optional[list[str]] = None
    app_clarity: Optional[str] = None
    app_intensity: Optional[str] = None
    app_color: Optional[str] = None
    app_other: Optional[str] = None
    nose_condition: Optional[str] = None
    nose_fault: Optional[str] = None
    nose_intensity: Optional[str] = None
    nose_development: Optional[str] = None
    nose_descriptors: Optional[list[DescriptorItem]] = None
    palate_sweetness: Optional[str] = None
    palate_acidity: Optional[str] = None
    palate_tannin: Optional[str] = None
    palate_tannin_nature: Optional[str] = None
    palate_alcohol: Optional[str] = None
    palate_body: Optional[str] = None
    palate_mousse: Optional[str] = None
    palate_finish: Optional[str] = None
    palate_finish_sec: Optional[int] = None
    palate_intensity: Optional[str] = None
    palate_descriptors: Optional[list[DescriptorItem]] = None
    quality: Optional[str] = None
    readiness: Optional[str] = None
    drink_from: Optional[int] = None
    drink_by: Optional[int] = None
    pairing_notes: Optional[str] = None
    personal_score: Optional[float] = None
    parker_score: Optional[int] = None
    spectator_score: Optional[int] = None
    jancis_score: Optional[float] = None
    decanter_score: Optional[int] = None
    suckling_score: Optional[int] = None
    free_note: Optional[str] = None


class AmendmentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class TastingNoteRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    wine_id: Optional[uuid.UUID]
    wine_name: Optional[str] = None
    cellar_entry_id: Optional[uuid.UUID]

    @model_validator(mode="before")
    @classmethod
    def extract_wine_name(cls, data: Any) -> Any:
        if hasattr(data, "__dict__"):
            wine = getattr(data, "wine", None)
            if wine is not None and hasattr(wine, "full_name"):
                data.__dict__.setdefault("wine_name", wine.full_name)
        return data
    vintage: int
    tasted_at: datetime
    location: Optional[str]
    occasion: Optional[str]
    decant_minutes: Optional[int]
    serve_temp_c: Optional[float]
    companions: Optional[list[str]]
    app_clarity: Optional[str]
    app_intensity: Optional[str]
    app_color: Optional[str]
    app_other: Optional[str]
    nose_condition: Optional[str]
    nose_fault: Optional[str]
    nose_intensity: Optional[str]
    nose_development: Optional[str]
    nose_descriptors: Optional[list[dict]]
    palate_sweetness: Optional[str]
    palate_acidity: Optional[str]
    palate_tannin: Optional[str]
    palate_tannin_nature: Optional[str]
    palate_alcohol: Optional[str]
    palate_body: Optional[str]
    palate_mousse: Optional[str]
    palate_finish: Optional[str]
    palate_finish_sec: Optional[int]
    palate_intensity: Optional[str]
    palate_descriptors: Optional[list[dict]]
    quality: Optional[str]
    readiness: Optional[str]
    drink_from: Optional[int]
    drink_by: Optional[int]
    pairing_notes: Optional[str]
    personal_score: Optional[float]
    parker_score: Optional[int]
    spectator_score: Optional[int]
    jancis_score: Optional[float]
    decanter_score: Optional[int]
    suckling_score: Optional[int]
    free_note: Optional[str]
    ai_enhanced_note: Optional[str]
    amendments: Optional[list[dict]]
    is_blind: bool
    blind_prediction: Optional[dict]
    created_at: datetime
