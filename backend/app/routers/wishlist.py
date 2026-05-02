"""
Wishlist router.

market_price is a user-editable field — set it manually when you look up a price.
/alerts compares stored market_price vs estimated_price with no external API calls.

CRITICAL: Every query is scoped to the authenticated user_id.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.wishlist import WishlistItem

router = APIRouter(prefix="/api/v1/wishlist", tags=["wishlist"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class WishlistItemCreate(BaseModel):
    wine_id: Optional[uuid.UUID] = None
    free_text: Optional[str] = None
    vintage: Optional[int] = Field(None, ge=1800, le=2030)
    priority: int = Field(3, ge=1, le=5)
    reason: Optional[str] = None
    source: Optional[str] = None
    estimated_price: Optional[float] = None


class WishlistItemUpdate(BaseModel):
    priority: Optional[int] = Field(None, ge=1, le=5)
    reason: Optional[str] = None
    source: Optional[str] = None
    estimated_price: Optional[float] = None
    free_text: Optional[str] = None
    vintage: Optional[int] = Field(None, ge=1800, le=2030)


class WishlistItemRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    wine_id: Optional[uuid.UUID]
    wine_name: Optional[str] = None
    free_text: Optional[str]
    vintage: Optional[int]
    priority: int
    reason: Optional[str]
    source: Optional[str]
    estimated_price: Optional[float]
    market_price: Optional[float]
    # Derived: True when market_price has dropped below estimated_price
    price_alert: bool = False

    @classmethod
    def from_orm_with_alert(cls, item: WishlistItem) -> "WishlistItemRead":
        obj = cls.model_validate(item)
        if item.wine is not None and hasattr(item.wine, "full_name"):
            obj.wine_name = item.wine.full_name
        if (
            item.market_price is not None
            and item.estimated_price is not None
            and item.market_price < item.estimated_price
        ):
            obj.price_alert = True
        return obj


# ---------------------------------------------------------------------------
# GET /wishlist
# ---------------------------------------------------------------------------


@router.get("", response_model=list[WishlistItemRead])
async def list_wishlist(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WishlistItemRead]:
    """
    Return the user's full wishlist, sorted by priority (1=highest) then added_at.
    """
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.user_id == user_id)
        .options(selectinload(WishlistItem.wine))
        .order_by(WishlistItem.priority.asc(), WishlistItem.added_at.desc())
    )
    items = result.scalars().all()
    return [WishlistItemRead.from_orm_with_alert(i) for i in items]


# ---------------------------------------------------------------------------
# POST /wishlist
# ---------------------------------------------------------------------------


@router.post("", response_model=WishlistItemRead, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    payload: WishlistItemCreate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WishlistItemRead:
    """
    Add a wine (by wine_id or free_text) to the wishlist.
    At least one of wine_id or free_text must be provided.
    """
    if not payload.wine_id and not payload.free_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide either wine_id (for a known wine) or free_text (for an unknown one).",
        )

    item = WishlistItem(
        user_id=user_id,
        wine_id=payload.wine_id,
        free_text=payload.free_text,
        vintage=payload.vintage,
        priority=payload.priority,
        reason=payload.reason,
        source=payload.source,
        estimated_price=payload.estimated_price,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return WishlistItemRead.from_orm_with_alert(item)


# ---------------------------------------------------------------------------
# PUT /wishlist/{id}
# ---------------------------------------------------------------------------


@router.put("/{item_id}", response_model=WishlistItemRead)
async def update_wishlist_item(
    item_id: uuid.UUID,
    payload: WishlistItemUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WishlistItemRead:
    """Update priority, reason, source, estimated_price, or free_text."""
    item = await _get_item_or_404(item_id, user_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.flush()
    await db.refresh(item)
    return WishlistItemRead.from_orm_with_alert(item)


# ---------------------------------------------------------------------------
# DELETE /wishlist/{id}
# ---------------------------------------------------------------------------


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    item_id: uuid.UUID,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    item = await _get_item_or_404(item_id, user_id, db)
    await db.delete(item)
    await db.flush()


# ---------------------------------------------------------------------------
# GET /wishlist/alerts
# ---------------------------------------------------------------------------


@router.get("/alerts", response_model=list[WishlistItemRead])
async def price_alerts(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WishlistItemRead]:
    """
    Return wishlist items where market_price (user-entered) is below estimated_price.
    No external API call — compares stored values only.
    """
    result = await db.execute(
        select(WishlistItem)
        .where(
            WishlistItem.user_id == user_id,
            WishlistItem.market_price.isnot(None),
            WishlistItem.estimated_price.isnot(None),
            WishlistItem.market_price < WishlistItem.estimated_price,
        )
        .options(selectinload(WishlistItem.wine))
        .order_by(WishlistItem.priority.asc())
    )
    items = result.scalars().all()
    return [WishlistItemRead.from_orm_with_alert(i) for i in items]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_item_or_404(
    item_id: uuid.UUID,
    user_id: str,
    db: AsyncSession,
) -> WishlistItem:
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.id == item_id,
            WishlistItem.user_id == user_id,  # CRITICAL: user isolation
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wishlist item not found",
        )
    return item
