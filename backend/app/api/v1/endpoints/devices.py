"""Gestão de Dispositivos."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import CurrentUser
from app.db.database import get_async_session
from app.models.device_model import Device
from app.models.operation_model import Operation
from app.models.target_model import Target
from app.schemas.common_schema import MessageResponse, PaginatedResponse
from app.schemas.schemas import DeviceCreate, DeviceResponse, DeviceUpdate
from app.services import audit_service, qrcode_service, storage_service

settings = get_settings()
router = APIRouter(tags=["Dispositivos"])


# ── Listagem geral por operação (sem alvo obrigatório) ────────────
@router.get("/operations/{operation_id}/devices", response_model=PaginatedResponse[DeviceResponse])
async def list_devices_by_operation(
    operation_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    page: int = 1,
    page_size: int = 50,
):
    offset = (page - 1) * page_size
    stmt = select(Device).where(Device.operation_id == operation_id, Device.deleted_at.is_(None))
    count_stmt = select(func.count()).select_from(Device).where(
        Device.operation_id == operation_id, Device.deleted_at.is_(None)
    )
    total = (await session.execute(count_stmt)).scalar_one()
    result = await session.execute(
        stmt.order_by(Device.created_at.desc()).offset(offset).limit(page_size)
    )
    return PaginatedResponse(
        items=[DeviceResponse.model_validate(d) for d in result.scalars().all()],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


# ── Criação de dispositivo diretamente na operação (sem alvo) ─────
@router.post(
    "/operations/{operation_id}/devices",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_device_for_operation(
    operation_id: uuid.UUID,
    body: DeviceCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    op_res = await session.execute(
        select(Operation).where(Operation.id == operation_id, Operation.deleted_at.is_(None))
    )
    if not op_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    existing = await session.execute(
        select(Device).where(Device.evidence_number == body.evidence_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Número de evidência já cadastrado.")

    device = Device(
        target_id=None,
        operation_id=operation_id,
        created_by=uuid.UUID(current_user["sub"]),
        **body.model_dump(),
    )
    session.add(device)
    await session.flush()

    try:
        _, qr_url = qrcode_service.generate_qr_code(device.id, device.evidence_number)
        device.qr_code_url = qr_url
    except Exception:
        pass

    await audit_service.log_action(
        session,
        action="device_created",
        entity_type="device",
        entity_id=str(device.id),
        description=f"Dispositivo {device.evidence_number} ({device.device_type}) cadastrado sem alvo na operação {operation_id}",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(device)
    return DeviceResponse.model_validate(device)


@router.get("/targets/{target_id}/devices", response_model=PaginatedResponse[DeviceResponse])
async def list_devices_by_target(
    target_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    page: int = 1,
    page_size: int = 20,
):
    offset = (page - 1) * page_size
    stmt = select(Device).where(Device.target_id == target_id, Device.deleted_at.is_(None))
    count_stmt = select(func.count()).select_from(Device).where(
        Device.target_id == target_id, Device.deleted_at.is_(None)
    )
    total = (await session.execute(count_stmt)).scalar_one()
    result = await session.execute(
        stmt.order_by(Device.created_at.desc()).offset(offset).limit(page_size)
    )
    return PaginatedResponse(
        items=[DeviceResponse.model_validate(d) for d in result.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post(
    "/targets/{target_id}/devices",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_device(
    target_id: uuid.UUID,
    body: DeviceCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    # Valida target e pega operation_id
    target_res = await session.execute(
        select(Target).where(Target.id == target_id, Target.deleted_at.is_(None))
    )
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Alvo não encontrado.")

    # Verifica evidência duplicada
    existing = await session.execute(
        select(Device).where(Device.evidence_number == body.evidence_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Número de evidência já cadastrado.")

    device = Device(
        target_id=target_id,
        operation_id=target.operation_id,
        created_by=uuid.UUID(current_user["sub"]),
        **body.model_dump(),
    )
    session.add(device)
    await session.flush()

    # Gera QR Code
    try:
        _, qr_url = qrcode_service.generate_qr_code(device.id, device.evidence_number)
        device.qr_code_url = qr_url
    except Exception:
        pass  # não bloqueia cadastro se MinIO indisponível

    await audit_service.log_action(
        session,
        action="device_created",
        entity_type="device",
        entity_id=str(device.id),
        description=f"Dispositivo {device.evidence_number} ({device.device_type}) cadastrado",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(device)
    return DeviceResponse.model_validate(device)


@router.get("/devices/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Device).where(Device.id == device_id, Device.deleted_at.is_(None))
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")
    return DeviceResponse.model_validate(device)


@router.patch("/devices/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: uuid.UUID,
    body: DeviceUpdate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Device).where(Device.id == device_id, Device.deleted_at.is_(None))
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    old_data = {"status": device.status}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(device, field, value)

    await audit_service.log_action(
        session,
        action="device_updated",
        entity_type="device",
        entity_id=str(device_id),
        old_value=old_data,
        new_value=body.model_dump(exclude_unset=True),
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(device)
    return DeviceResponse.model_validate(device)


@router.delete("/devices/{device_id}", response_model=MessageResponse)
async def delete_device(
    device_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Device).where(Device.id == device_id, Device.deleted_at.is_(None))
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    device.soft_delete()
    await audit_service.log_action(
        session,
        action="device_deleted",
        entity_type="device",
        entity_id=str(device_id),
        description=f"Dispositivo {device.evidence_number} removido (soft delete)",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Dispositivo removido com sucesso.")
