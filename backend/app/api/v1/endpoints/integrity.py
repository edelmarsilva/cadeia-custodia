"""Hashes de integridade e logs de auditoria."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import AuditOrAdmin, CurrentUser
from app.db.database import get_async_session
from app.models.device_model import Device
from app.models.hash_model import IntegrityHash
from app.schemas.common_schema import PaginatedResponse
from app.schemas.schemas import (
    AuditLogResponse,
    IntegrityHashCreate,
    IntegrityHashResponse,
)
from app.services import audit_service

router = APIRouter(tags=["Integridade e Auditoria"])


# ── Verificação de hash duplicado ─────────────────────────────────────────────
# IMPORTANTE: esta rota estática (/hashes/check) DEVE ficar ANTES de
# /devices/{device_id}/hashes para evitar conflito de parâmetros de path.

@router.get("/hashes/check", summary="Verifica se um hash já está cadastrado em algum dispositivo")
async def check_hash_duplicate(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    md5: str | None = Query(None, description="Hash MD5 a verificar"),
    sha1: str | None = Query(None, description="Hash SHA-1 a verificar"),
    sha256: str | None = Query(None, description="Hash SHA-256 a verificar"),
    exclude_device_id: uuid.UUID | None = Query(None, description="Dispositivo a excluir da busca (para edição)"),
):
    """Retorna o dispositivo conflitante se o hash já estiver registrado,
    ou ``{"found": false}`` caso contrário.
    """
    if not any([md5, sha1, sha256]):
        raise HTTPException(status_code=400, detail="Informe ao menos um hash: md5, sha1 ou sha256.")

    conditions = []
    if md5:
        conditions.append(IntegrityHash.md5 == md5.lower().strip())
    if sha1:
        conditions.append(IntegrityHash.sha1 == sha1.lower().strip())
    if sha256:
        conditions.append(IntegrityHash.sha256 == sha256.lower().strip())

    stmt = (
        select(IntegrityHash, Device)
        .join(Device, IntegrityHash.device_id == Device.id)
        .where(or_(*conditions), Device.deleted_at.is_(None))
    )
    if exclude_device_id:
        stmt = stmt.where(Device.id != exclude_device_id)

    result = await session.execute(stmt)
    row = result.first()

    if not row:
        return {"found": False}

    ih, dev = row
    return {
        "found": True,
        "conflict": {
            "device_id": str(dev.id),
            "evidence_number": dev.evidence_number,
            "device_type": dev.device_type,
            "brand": dev.brand,
            "model": dev.model,
            "hash_type": "sha256" if (sha256 and ih.sha256 == sha256.lower().strip())
                         else "sha1" if (sha1 and ih.sha1 == sha1.lower().strip())
                         else "md5",
            "hash_value": ih.sha256 or ih.sha1 or ih.md5,
        },
    }


# ── Hashes por dispositivo ────────────────────────────────────────────────────
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
    """Registra um hash de integridade para o dispositivo.

    Antes de salvar, verifica se algum dos hashes informados (MD5, SHA-1 ou SHA-256)
    já está registrado em **outro** dispositivo. Em caso de conflito retorna 409 Conflict.
    """
    # ── Verifica duplicidade global ───────────────────────────────
    conditions = []
    if body.md5:
        conditions.append(IntegrityHash.md5 == body.md5.lower().strip())
    if body.sha1:
        conditions.append(IntegrityHash.sha1 == body.sha1.lower().strip())
    if body.sha256:
        conditions.append(IntegrityHash.sha256 == body.sha256.lower().strip())

    if conditions:
        dup_stmt = (
            select(IntegrityHash, Device)
            .join(Device, IntegrityHash.device_id == Device.id)
            .where(or_(*conditions), Device.deleted_at.is_(None), Device.id != device_id)
        )
        dup_result = await session.execute(dup_stmt)
        dup_row = dup_result.first()
        if dup_row:
            ih_dup, dev_dup = dup_row
            conflicting_hash = ih_dup.sha256 or ih_dup.sha1 or ih_dup.md5
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Hash duplicado detectado! O hash '{conflicting_hash}' já está registrado "
                    f"no dispositivo '{dev_dup.evidence_number}' "
                    f"({dev_dup.device_type}{' — ' + dev_dup.brand if dev_dup.brand else ''}"
                    f"{' ' + dev_dup.model if dev_dup.model else ''}). "
                    "Verifique o hash calculado antes de prosseguir."
                ),
            )

    # ── Normaliza e persiste ──────────────────────────────────────
    h = IntegrityHash(
        device_id=device_id,
        calculated_by=uuid.UUID(current_user["sub"]),
        md5=body.md5.lower().strip() if body.md5 else None,
        sha1=body.sha1.lower().strip() if body.sha1 else None,
        sha256=body.sha256.lower().strip() if body.sha256 else None,
        source_file=body.source_file,
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


# ── Auditoria ─────────────────────────────────────────────────────────────────
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
