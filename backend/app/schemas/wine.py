import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class GrapeComponent(BaseModel):
    grape: str
    pct: float | None = None


class ProducerSlim(BaseModel):
    """Minimal producer shape for embedding in wine responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    country_code: str | None = None


class AppellationSlim(BaseModel):
    """Minimal appellation shape for embedding in wine responses."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    region: str | None = None
    country: str | None = None


class WineCreate(BaseModel):
    producer_id: uuid.UUID | None = None
    appellation_id: uuid.UUID | None = None
    name: str
    full_name: str
    # Still | Sparkling | Fortified | Dessert
    style: str
    # red | white | rosé | orange | amber
    color: str | None = None
    primary_grapes: list[GrapeComponent] | None = None
    classification: str | None = None
    alcohol_typical: float | None = None
    description: str | None = None
    slug: str

    @field_validator("style")
    @classmethod
    def validate_style(cls, v: str) -> str:
        allowed = {"Still", "Sparkling", "Fortified", "Dessert"}
        if v not in allowed:
            raise ValueError(f"style must be one of {allowed}")
        return v

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"red", "white", "rosé", "orange", "amber"}
        if v not in allowed:
            raise ValueError(f"color must be one of {allowed}")
        return v


class WineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    producer_id: uuid.UUID | None
    appellation_id: uuid.UUID | None
    name: str
    full_name: str
    style: str
    color: str | None
    primary_grapes: list[dict] | None
    classification: str | None
    alcohol_typical: float | None
    description: str | None
    slug: str
    created_at: datetime
    # Nested relationships — populated when ORM loads them
    producer: ProducerSlim | None = None
    appellation: AppellationSlim | None = None


class WineSearch(BaseModel):
    """Query params for wine search."""

    q: str | None = None
    style: str | None = None
    color: str | None = None
    appellation_slug: str | None = None
    producer_slug: str | None = None
    grape: str | None = None
    vintage_min: int | None = None
    vintage_max: int | None = None
    limit: int = 20
    offset: int = 0
