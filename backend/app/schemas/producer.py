import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProducerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    country_code: str | None
    appellation_id: uuid.UUID | None
    address: str | None
    founded_year: int | None
    winemaker: str | None
    owner: str | None
    style_notes: str | None
    natural: bool
    organic_cert: str | None
    biodynamic: bool
    website: str | None
    slug: str
    ai_summary: str | None
    updated_at: datetime
    # location (PostGIS) excluded — served as GeoJSON in dedicated endpoints


class ProducerSearch(BaseModel):
    """Query params for producer search."""

    q: str | None = None
    country_code: str | None = None
    appellation_slug: str | None = None
    natural: bool | None = None
    biodynamic: bool | None = None
    limit: int = 20
    offset: int = 0
