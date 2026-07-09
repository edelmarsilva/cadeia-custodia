"""Gestão de usuários (admin only)."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AdminOnly, CurrentUser
from app.core.security import get_password_hash
from app.db.database import get_async_session
from app.models.user_model import User
from app.schemas.common_schema import MessageResponse, PaginatedResponse
from app.schemas.schemas import UserCreate, UserResponse, UserUpdate
from app.services import audit_service

router = APIRouter(prefix="/users", tags=["Usuários"])


@router.get("", response_model=PaginatedResponse[UserResponse])
async def list_users(
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
    page: int = 1,
    page_size: int = 20,
):
    offset = (page - 1) * page_size
    count_result = await session.execute(
        select(func.count()).select_from(User).where(User.deleted_at.is_(None))
    )
    total = count_result.scalar_one()
    result = await session.execute(
        select(User).where(User.deleted_at.is_(None)).offset(offset).limit(page_size)
    )
    users = result.scalars().all()
    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
):
    # Verifica duplicidade
    existing = await session.execute(
        select(User).where(
            (User.username == body.username) | (User.email == body.email),
            User.deleted_at.is_(None),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username ou e-mail já cadastrado.")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=get_password_hash(body.password),
        full_name=body.full_name,
        role=body.role,
        badge_number=body.badge_number,
        unit=body.unit,
    )
    session.add(user)
    await session.flush()

    await audit_service.log_action(
        session,
        action="user_created",
        entity_type="user",
        entity_id=str(user.id),
        description=f"Usuário {user.username} criado com role {user.role}",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    old_data = {"role": user.role, "is_active": user.is_active}
    if body.email:
        user.email = body.email
    if body.full_name:
        user.full_name = body.full_name
    if body.role:
        user.role = body.role
    if body.badge_number is not None:
        user.badge_number = body.badge_number
    if body.unit is not None:
        user.unit = body.unit
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.hashed_password = get_password_hash(body.password)

    await audit_service.log_action(
        session,
        action="user_updated",
        entity_type="user",
        entity_id=str(user_id),
        old_value=old_data,
        new_value={"role": user.role, "is_active": user.is_active},
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: uuid.UUID,
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    user.soft_delete()
    await audit_service.log_action(
        session,
        action="user_deleted",
        entity_type="user",
        entity_id=str(user_id),
        description=f"Usuário {user.username} desativado (soft delete)",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Usuário desativado com sucesso.")
