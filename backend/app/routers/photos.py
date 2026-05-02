"""
Photos router — label photos, cellar shots, tasting settings.

TRANSACTIONAL DELETE CONTRACT:
  MinIO removal happens first. If it fails, the DB record is preserved and
  the error is surfaced to the caller. This prevents orphaned DB rows pointing
  at non-existent objects. The reverse (DB deleted, MinIO object still present)
  is an acceptable leak — objects are cheap; dangling DB records are not.

CRITICAL: Every DB query MUST include a user_id filter.
"""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from minio.error import S3Error
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.photo import Photo
from app.models.wine import Wine
from app.schemas.wine import WineCreate, WineRead
from app.services.storage import StorageService, get_storage

router = APIRouter(prefix="/api/v1", tags=["photos"])

_ALLOWED_PHOTO_TYPES = frozenset({"label", "cellar", "setting", "menu", "vineyard"})
_ALLOWED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp", "image/heic"})
_MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


class PhotoRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    wine_id: Optional[uuid.UUID]
    cellar_entry_id: Optional[uuid.UUID]
    tasting_note_id: Optional[uuid.UUID]
    type: str
    storage_key: str
    thumbnail_key: Optional[str]
    caption: Optional[str]
    taken_at: Optional[datetime]
    is_label_scan: bool
    created_at: datetime


class PresignedUrlResponse(BaseModel):
    id: uuid.UUID
    url: str
    thumbnail_url: Optional[str]
    expires_in: int  # seconds


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------


@router.post("/photos", response_model=PhotoRead, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile = File(...),
    type: str = Form(...),
    wine_id: Optional[uuid.UUID] = Form(None),
    cellar_entry_id: Optional[uuid.UUID] = Form(None),
    tasting_note_id: Optional[uuid.UUID] = Form(None),
    caption: Optional[str] = Form(None),
    taken_at: Optional[datetime] = Form(None),
    is_label_scan: bool = Form(False),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageService = Depends(get_storage),
) -> PhotoRead:
    if type not in _ALLOWED_PHOTO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"type must be one of {sorted(_ALLOWED_PHOTO_TYPES)}",
        )

    content_type = file.content_type or "application/octet-stream"
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported content type '{content_type}'. Allowed: {sorted(_ALLOWED_CONTENT_TYPES)}",
        )

    file_data = await file.read()
    if len(file_data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {_MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
        )

    # Derive file extension from content type
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/heic": "heic",
    }
    extension = ext_map.get(content_type, "jpg")

    storage_key, thumbnail_key = await storage.upload_label(
        user_id=user_id,
        file_data=file_data,
        content_type=content_type,
        extension=extension,
    )

    photo = Photo(
        user_id=user_id,
        wine_id=wine_id,
        cellar_entry_id=cellar_entry_id,
        tasting_note_id=tasting_note_id,
        type=type,
        storage_key=storage_key,
        thumbnail_key=thumbnail_key,
        caption=caption,
        taken_at=taken_at,
        is_label_scan=is_label_scan,
    )
    db.add(photo)
    await db.flush()
    await db.refresh(photo)
    return PhotoRead.model_validate(photo)


# ---------------------------------------------------------------------------
# Presigned URL
# ---------------------------------------------------------------------------


@router.get("/photos/{photo_id}/url", response_model=PresignedUrlResponse)
async def get_photo_url(
    photo_id: uuid.UUID,
    expires: int = 3600,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageService = Depends(get_storage),
) -> PresignedUrlResponse:
    photo = await _get_photo_or_404(photo_id, user_id, db)

    url = await storage.get_presigned_url(photo.storage_key, expires_seconds=expires)
    thumbnail_url: Optional[str] = None
    if photo.thumbnail_key:
        thumbnail_url = await storage.get_presigned_url(
            photo.thumbnail_key, expires_seconds=expires
        )

    return PresignedUrlResponse(
        id=photo.id,
        url=url,
        thumbnail_url=thumbnail_url,
        expires_in=expires,
    )


# ---------------------------------------------------------------------------
# Delete (MinIO first, then DB)
# ---------------------------------------------------------------------------


@router.delete("/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: uuid.UUID,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageService = Depends(get_storage),
) -> None:
    """
    Delete a photo. MinIO objects are removed first. If MinIO deletion fails,
    the DB record is NOT deleted and the error is surfaced — preserving the
    ability to retry or investigate. Never delete the DB record if MinIO fails.
    """
    photo = await _get_photo_or_404(photo_id, user_id, db)

    # MinIO deletion must succeed before the DB record is touched
    try:
        await storage.delete_object(photo.storage_key)
        if photo.thumbnail_key:
            await storage.delete_object(photo.thumbnail_key)
    except S3Error as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage deletion failed; DB record preserved. Retry later. ({exc})",
        )

    await db.delete(photo)
    await db.flush()


# ---------------------------------------------------------------------------
# Scanner — Phase 3
# ---------------------------------------------------------------------------


class ScanLabelResponse(BaseModel):
    """
    Flat response that matches the frontend's LabelScanResult type with photo_id added.
    All extraction fields are at the top level so the frontend can use them directly.
    """
    photo_id: uuid.UUID
    presigned_url: str
    scan_failed: bool
    # LabelScanResult fields — all optional; None when label was unreadable
    producer: Optional[str] = None
    wine_name: Optional[str] = None
    appellation: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None
    vintage: Optional[int] = None
    grapes: Optional[list[str]] = None
    alcohol_pct: Optional[float] = None
    classification: Optional[str] = None
    style: Optional[str] = None
    volume_ml: Optional[int] = None
    additional_text: Optional[str] = None
    confidence: Optional[str] = None
    extraction_notes: Optional[str] = None


@router.post("/scanner/label", tags=["scanner"], response_model=ScanLabelResponse)
async def scan_label_photo(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    storage: StorageService = Depends(get_storage),
) -> ScanLabelResponse:
    """
    Upload a wine label photo, run Claude Vision extraction, and persist the photo.

    Storage upload and Claude Vision scan run concurrently — neither blocks the other.
    If the scan fails the photo is still saved; extraction fields are null.
    Frontend should render skeleton UI immediately; response may take up to 8 s.
    """
    import asyncio

    from app.services.label_scanner import scan_label

    content_type = file.content_type or "image/jpeg"
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File must be an image, got '{content_type}'",
        )

    image_data = await file.read()
    if len(image_data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds maximum size of {_MAX_UPLOAD_BYTES // (1024 * 1024)} MB",
        )

    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic"}
    extension = ext_map.get(content_type, "jpg")

    storage_result, scan_result = await asyncio.gather(
        storage.upload_label(user_id, image_data, content_type, extension),
        scan_label(image_data, content_type),
        return_exceptions=True,
    )

    if isinstance(storage_result, Exception):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage upload failed: {storage_result}",
        )

    storage_key, thumbnail_key = storage_result

    scan_failed = isinstance(scan_result, Exception)
    extracted_data: dict = {}
    if not scan_failed:
        extracted_data = scan_result.model_dump()  # type: ignore[union-attr]

    photo = Photo(
        user_id=user_id,
        type="label",
        storage_key=storage_key,
        thumbnail_key=thumbnail_key,
        is_label_scan=True,
        extracted_data=extracted_data if not scan_failed else {"error": str(scan_result)[:400]},
    )
    db.add(photo)
    await db.flush()
    await db.refresh(photo)

    presigned_url = await storage.get_presigned_url(storage_key)

    return ScanLabelResponse(
        photo_id=photo.id,
        presigned_url=presigned_url,
        scan_failed=scan_failed,
        **extracted_data,
    )


# ---------------------------------------------------------------------------
# Scanner confirm
# ---------------------------------------------------------------------------


class ScanConfirmRequest(BaseModel):
    """
    Payload sent after the user reviews and corrects the label extraction.

    Either wine_id (link to an existing wine) or the extracted fields are used
    to find-or-create a wine record. photo_id links the label photo to the wine.
    """
    # Link to existing wine if the user selected one from autocomplete
    wine_id: uuid.UUID | None = None
    photo_id: uuid.UUID | None = None
    # Extracted / corrected label fields
    producer: str | None = None
    wine_name: str | None = None
    appellation: str | None = None
    region: str | None = None
    country: str | None = None
    vintage: int | None = None
    grapes: list[str] | None = None
    alcohol_pct: float | None = None
    classification: str | None = None
    style: str | None = None
    volume_ml: int | None = None


@router.post("/scanner/confirm", tags=["scanner"], response_model=WineRead)
async def confirm_label_scan(
    payload: ScanConfirmRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WineRead:
    """
    Confirm a label scan result. Three cases:

    1. payload.wine_id is set → link the photo to an existing wine, return it.
    2. wine_id is not set but enough data exists → find existing wine by slug
       or create a new one, link the photo, return the wine.
    3. Not enough data (no wine_name) → 422.

    In all cases, if photo_id is provided the photo record is updated to point
    at the resolved wine. The returned Wine is what the frontend uses to pre-fill
    the "Add to Cellar" form.
    """
    from sqlalchemy.orm import selectinload

    # ── Case 1: Linking to a known wine ──────────────────────────────────────
    if payload.wine_id is not None:
        wine_result = await db.execute(
            select(Wine)
            .where(Wine.id == payload.wine_id)
            .options(selectinload(Wine.producer), selectinload(Wine.appellation))
        )
        wine = wine_result.scalar_one_or_none()
        if wine is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Wine {payload.wine_id} not found",
            )
        # Link photo if provided
        if payload.photo_id is not None:
            await _link_photo_to_wine(payload.photo_id, wine.id, user_id, db)
        return WineRead.model_validate(wine)

    # ── Case 2/3: Create or find wine from extracted fields ───────────────────
    if not payload.wine_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="wine_name is required when wine_id is not provided",
        )

    # Build a deterministic slug from producer + wine_name
    import re

    def _slugify(s: str) -> str:
        s = s.lower().strip()
        s = re.sub(r"[^\w\s-]", "", s)
        return re.sub(r"[\s_-]+", "-", s).strip("-")

    slug_parts = []
    if payload.producer:
        slug_parts.append(_slugify(payload.producer))
    slug_parts.append(_slugify(payload.wine_name))
    candidate_slug = "-".join(slug_parts)

    # Try to find existing wine by slug
    existing = (
        await db.execute(select(Wine).where(Wine.slug == candidate_slug)
        .options(selectinload(Wine.producer), selectinload(Wine.appellation)))
    ).scalar_one_or_none()

    if existing is not None:
        if payload.photo_id is not None:
            await _link_photo_to_wine(payload.photo_id, existing.id, user_id, db)
        return WineRead.model_validate(existing)

    # Create a new wine record from the scan data
    full_name = f"{payload.producer} {payload.wine_name}".strip() if payload.producer else payload.wine_name
    raw_style = (payload.style or "red").lower()
    style_map = {
        "red": "Still", "white": "Still", "rosé": "Still", "rose": "Still",
        "orange": "Still", "sparkling": "Sparkling", "fortified": "Fortified",
        "dessert": "Dessert",
    }
    style = style_map.get(raw_style, "Still")
    color_map = {
        "red": "red", "white": "white", "rosé": "rosé", "rose": "rosé",
        "orange": "orange",
    }
    color = color_map.get(raw_style)

    primary_grapes = (
        [{"grape": g, "pct": None} for g in payload.grapes]
        if payload.grapes else None
    )

    new_wine = Wine(
        name=payload.wine_name,
        full_name=full_name,
        style=style,
        color=color,
        slug=candidate_slug,
        classification=payload.classification,
        alcohol_typical=payload.alcohol_pct,
        primary_grapes=primary_grapes,
    )
    db.add(new_wine)
    await db.flush()
    await db.refresh(new_wine)

    if payload.photo_id is not None:
        await _link_photo_to_wine(payload.photo_id, new_wine.id, user_id, db)

    return WineRead.model_validate(new_wine)


async def _link_photo_to_wine(
    photo_id: uuid.UUID,
    wine_id: uuid.UUID,
    user_id: str,
    db: AsyncSession,
) -> None:
    """Update photo.wine_id — silently no-ops if photo not found or not owned by user."""
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id, Photo.user_id == user_id)
    )
    photo = result.scalar_one_or_none()
    if photo is not None:
        photo.wine_id = wine_id
        await db.flush()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_photo_or_404(
    photo_id: uuid.UUID,
    user_id: str,
    db: AsyncSession,
) -> Photo:
    stmt = select(Photo).where(
        Photo.id == photo_id,
        Photo.user_id == user_id,  # CRITICAL: user isolation
    )
    result = await db.execute(stmt)
    photo = result.scalar_one_or_none()
    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found",
        )
    return photo
