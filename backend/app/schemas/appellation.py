import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AppellationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    country_code: str
    country: str
    region: str | None
    sub_region: str | None
    appellation_type: str
    parent_id: uuid.UUID | None
    legal_classification: str | None
    climate: str | None
    soil_types: list[str] | None
    primary_grapes: list[str] | None
    style_notes: str | None
    vintage_notes: str | None
    slug: str
    created_at: datetime
    # Geometry is excluded from API responses — served as GeoJSON via dedicated endpoint
