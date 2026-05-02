"""
User account router.

Handles:
- First-login upsert: creates/syncs the user record from Clerk JWT claims
- Profile read: GET /api/v1/me
- Profile update: PUT /api/v1/me (Cru-specific preferences only — NOT Clerk-managed fields)

Clerk manages: email, name, avatar (via their dashboard/components).
Cru manages: scoring_system, home_country, preferences (units, theme, privacy).
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, get_current_user_claims
from app.database import get_db
from app.models.user import User

router = APIRouter(tags=["account"])


class UserRead(BaseModel):
    model_config = {"from_attributes": True}
    id: str
    email: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    home_country: Optional[str]
    scoring_system: str
    preferences: dict
    created_at: datetime


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    home_country: Optional[str] = None
    scoring_system: Optional[str] = None  # 100pt | 20pt | 5star
    preferences: Optional[dict] = None    # units, privacy, theme


@router.get("/api/v1/me", response_model=UserRead)
async def get_profile(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User record not found. Call POST /api/v1/me/sync first.")
    return user


@router.post("/api/v1/me/sync", response_model=UserRead)
async def sync_user(
    user_id: str = Depends(get_current_user),
    claims: dict = Depends(get_current_user_claims),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Upsert the authenticated user's record from Clerk JWT claims.
    Frontend should call this once on first login and after profile updates.
    Safe to call repeatedly — idempotent.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    # Extract fields from Clerk JWT claims
    email = claims.get("email") or claims.get("email_address") or ""
    display_name = (
        claims.get("name")
        or f"{claims.get('first_name', '')} {claims.get('last_name', '')}".strip()
        or None
    )
    avatar_url = claims.get("image_url") or claims.get("picture") or None

    if user:
        # Update mutable Clerk-sourced fields
        if email:
            user.email = email
        if display_name:
            user.display_name = display_name
        if avatar_url:
            user.avatar_url = avatar_url
    else:
        user = User(
            id=user_id,
            email=email or f"{user_id}@clerk.local",
            display_name=display_name,
            avatar_url=avatar_url,
            scoring_system="100pt",
            preferences={},
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)
    return user


@router.put("/api/v1/me", response_model=UserRead)
async def update_profile(
    body: UserUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found. Call /api/v1/me/sync first.")

    if body.scoring_system is not None:
        if body.scoring_system not in ("100pt", "20pt", "5star"):
            raise HTTPException(400, "scoring_system must be '100pt', '20pt', or '5star'")
        user.scoring_system = body.scoring_system

    if body.display_name is not None:
        user.display_name = body.display_name

    if body.home_country is not None:
        user.home_country = body.home_country

    if body.preferences is not None:
        # Merge — don't overwrite entire dict.
        # Must create a NEW dict (not mutate in-place) so SQLAlchemy's history
        # comparison sees old != new and includes the column in the UPDATE.
        user.preferences = {**(user.preferences or {}), **body.preferences}

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/api/v1/me", status_code=204)
async def delete_account(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete user account and all associated data.
    Cellar entries, tasting notes, photos, wishlist — all cascade via DB FK rules.
    Does NOT revoke the Clerk session — frontend must call Clerk sign-out after.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found.")
    await db.delete(user)
    await db.commit()
