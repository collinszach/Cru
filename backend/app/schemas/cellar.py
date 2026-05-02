import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.schemas.wine import WineRead


class CellarEntryCreate(BaseModel):
    wine_id: uuid.UUID | None = None
    vintage: int
    quantity: int = 1
    # 375ml | 750ml | 1.5L | 3L | 6L
    format: str = "750ml"
    purchase_date: date | None = None
    purchase_price: float | None = None
    currency: str = "USD"
    # winery | retailer | auction | allocation | gift
    purchase_source: str | None = None
    retailer: str | None = None
    allocation_list: str | None = None
    bin_location: str | None = None
    # perfect | good | unknown | suspect
    condition: str = "perfect"
    provenance_notes: str | None = None
    drink_from: int | None = None
    drink_by: int | None = None
    is_featured: bool = False
    featured_story: str | None = None
    featured_occasion: str | None = None
    featured_companions: list[str] | None = None
    notes: str | None = None

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, v: str) -> str:
        allowed = {"perfect", "good", "unknown", "suspect"}
        if v not in allowed:
            raise ValueError(f"condition must be one of {allowed}")
        return v

    @field_validator("format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        allowed = {"375ml", "750ml", "1.5L", "3L", "6L"}
        if v not in allowed:
            raise ValueError(f"format must be one of {allowed}")
        return v


class CellarEntryUpdate(BaseModel):
    quantity: int | None = None
    format: str | None = None
    bin_location: str | None = None
    condition: str | None = None
    provenance_notes: str | None = None
    drink_from: int | None = None
    drink_by: int | None = None
    is_featured: bool | None = None
    featured_story: str | None = None
    featured_occasion: str | None = None
    featured_companions: list[str] | None = None
    # in_cellar | consumed | gifted | lost | sold
    status: str | None = None
    notes: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"in_cellar", "consumed", "gifted", "lost", "sold"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class ConsumeRequest(BaseModel):
    quantity: int = 1
    # When consumed — defaults to now if not provided
    consumed_at: datetime | None = None
    # Link to a tasting note if note created simultaneously
    tasting_note_id: uuid.UUID | None = None


class ConsumeResponse(BaseModel):
    cellar_entry_id: uuid.UUID
    quantity_remaining: int
    status: str
    consumed_at: datetime


class CellarEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: str
    wine_id: uuid.UUID | None
    vintage: int
    quantity: int
    format: str
    purchase_date: date | None
    purchase_price: float | None
    currency: str
    purchase_source: str | None
    retailer: str | None
    allocation_list: str | None
    bin_location: str | None
    condition: str
    provenance_notes: str | None
    drink_from: int | None
    drink_by: int | None
    is_featured: bool
    featured_story: str | None
    featured_occasion: str | None
    featured_companions: list[str] | None
    current_value: float | None
    value_updated: datetime | None
    status: str
    consumed_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
    # Nested wine relationship — populated when loaded
    wine: WineRead | None = None
    # Computed drinking window fields (set by calendar/window endpoints)
    drinking_window_status: str | None = None
    drink_recommendation: str | None = None
