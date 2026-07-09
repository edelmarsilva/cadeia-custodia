"""Hashes de integridade e logs de auditoria."""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuditOrAdmin, CurrentUser
from app.db.database import get_async_session
from app.models.hash_model import IntegrityHash
from app.schemas.common_schema import PaginatedResponse
from app.schemas.schemas import (
    AuditLogResponse,
    IntegrityHashCreate,
    IntegrityHashResponse,
)
from app.services import audit_service

router = APIRouter(tags=["Integridade e Auditoria"])


# ── Hashes ───────────────────────────────────────────────────
@router.get("/devices/{device_id}/hashes", response_model=list[IntegrityHashResponse])
async def list_hashes(
    device_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(IntegrityHash)
        .where(IntegrityHash.device_id == device_id)
        .order_by(IntegrityHash.calculated_at.desc())
    )
    return [IntegrityHashResponse.model_validate(h) for h in result.scalars().all()]


@router.post(
    "/devices/{device_id}/hashes",
    response_model=IntegrityHashResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_hash(
    device_id: uuid.UUID,
    body: IntegrityHashCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    h = IntegrityHash(
        device_id=device_id,
        calculated_by=uuid.UUID(current_user["sub"]),
        **body.model_dump(),
    )
    session.add(h)
    await session.flush()
    await audit_service.log_action(
        session,
        action="hash_registered",
        entity_type="device",
        entity_id=str(device_id),
        description=f"Hash registrado: SHA256={body.sha256}",
        new_value=body.model_dump(),
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(h)
    return IntegrityHashResponse.model_validate(h)


# ── Auditoria ────────────────────────────────────────────────
@router.get("/audit", response_model=PaginatedResponse[AuditLogResponse])
async def get_audit_logs(
    current_user: AuditOrAdmin,
    session: AsyncSession = Depends(get_async_session),
    entity_type: str | None = None,
    entity_id: str | None = None,
    action: str | None = None,
    page: int = 1,
    page_size: int = 50,
):
    offset = (page - 1) * page_size
    logs, total = await audit_service.get_audit_logs(
        session,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        limit=page_size,
        offset=offset,
    )
    return PaginatedResponse(
        items=[AuditLogResponse.model_validate(lg) for lg in logs],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )
