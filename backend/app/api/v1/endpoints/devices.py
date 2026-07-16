"""Gestão de Dispositivos."""
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
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

_EVIDENCE_PREFIX = "MPAC-EV-"
_EVIDENCE_PATTERN = re.compile(r"^MPAC-EV-(\d+)$")


# ── Geração automática do número de evidência ─────────────────────────────────
async def _generate_evidence_number(session: AsyncSession) -> str:
    """Gera o próximo número de evidência no formato MPAC-EV-00001."""
    result = await session.execute(
        select(Device.evidence_number)
        .where(Device.evidence_number.like("MPAC-EV-%"))
        .order_by(Device.evidence_number.desc())
    )
    rows = result.scalars().all()

    max_seq = 0
    for ev in rows:
        m = _EVIDENCE_PATTERN.match(ev)
        if m:
            seq = int(m.group(1))
            if seq > max_seq:
                max_seq = seq

    return f"{_EVIDENCE_PREFIX}{max_seq + 1:05d}"


# ── Preview do próximo número (frontend) ─────────────────────────────────────
@router.get("/devices/next-evidence-number")
async def next_evidence_number(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    next_num = await _generate_evidence_number(session)
    return {"next": next_num}


# ── Listagem global de dispositivos ──────────────────────────────────────────
@router.get("/devices", response_model=PaginatedResponse[DeviceResponse])
async def list_all_devices(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
    device_type: str | None = None,
    status: str | None = None,
):
    offset = (page - 1) * page_size
    filters = [Device.deleted_at.is_(None)]

    if search:
        filters.append(
            or_(
                Device.evidence_number.ilike(f"%{search}%"),
                Device.brand.ilike(f"%{search}%"),
                Device.model.ilike(f"%{search}%"),
                Device.serial_number.ilike(f"%{search}%"),
            )
        )
    if device_type:
        filters.append(Device.device_type == device_type)
    if status:
        filters.append(Device.status == status)

    stmt = select(Device).where(*filters)
    count_stmt = select(func.count()).select_from(Device).where(*filters)

    total = (await session.execute(count_stmt)).scalar_one()
    result = await session.execute(
        stmt.order_by(Device.evidence_number.desc()).offset(offset).limit(page_size)
    )
    return PaginatedResponse(
        items=[DeviceResponse.model_validate(d) for d in result.scalars().all()],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


# ── Criação standalone (sem operação nem alvo) ────────────────────────────────
@router.post(
    "/devices",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_device_standalone(
    body: DeviceCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    evidence_number = body.evidence_number or await _generate_evidence_number(session)

    existing = await session.execute(
        select(Device).where(Device.evidence_number == evidence_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Número de evidência já cadastrado.")

    device = Device(
        target_id=None,
        operation_id=None,
        created_by=uuid.UUID(current_user["sub"]),
        evidence_number=evidence_number,
        **{k: v for k, v in body.model_dump().items() if k != "evidence_number"},
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
        description=f"Dispositivo {device.evidence_number} ({device.device_type}) cadastrado (avulso)",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(device)
    return DeviceResponse.model_validate(device)


# ── Listagem geral por operação (sem alvo obrigatório) ────────────────────────
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


# ── Criação de dispositivo diretamente na operação (sem alvo) ─────────────────
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

    evidence_number = body.evidence_number or await _generate_evidence_number(session)

    existing = await session.execute(
        select(Device).where(Device.evidence_number == evidence_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Número de evidência já cadastrado.")

    device = Device(
        target_id=None,
        operation_id=operation_id,
        created_by=uuid.UUID(current_user["sub"]),
        evidence_number=evidence_number,
        **{k: v for k, v in body.model_dump().items() if k != "evidence_number"},
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

    evidence_number = body.evidence_number or await _generate_evidence_number(session)

    # Verifica evidência duplicada
    existing = await session.execute(
        select(Device).where(Device.evidence_number == evidence_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Número de evidência já cadastrado.")

    device = Device(
        target_id=target_id,
        operation_id=target.operation_id,
        created_by=uuid.UUID(current_user["sub"]),
        evidence_number=evidence_number,
        **{k: v for k, v in body.model_dump().items() if k != "evidence_number"},
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
