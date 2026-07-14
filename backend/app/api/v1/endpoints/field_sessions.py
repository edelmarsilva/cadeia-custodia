"""Sessões de Coleta Fotográfica em Campo — Mobile App Integration."""
import hashlib
import io
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.deps import CurrentUser, require_roles, UserRole
from app.db.database import get_async_session
from app.models.device_model import Device
from app.models.field_device_record_model import FieldDeviceRecord
from app.models.field_photo_session_model import FieldPhotoSession
from app.models.operation_model import Operation
from app.models.operation_user_model import OperationUser
from app.models.photo_model import DevicePhoto
from app.models.target_model import Target
from app.schemas.field_session_schemas import (
    FieldDeviceRecordResponse,
    FieldPhotoSessionCreate,
    FieldPhotoSessionResponse,
    FieldSessionSyncPayload,
    FieldSessionSyncResult,
)
from app.services import audit_service, storage_service

settings = get_settings()
router = APIRouter(prefix="/field-sessions", tags=["Coleta de Campo (Mobile)"])
logger = logging.getLogger(__name__)

REQUIRED_STEPS = {"context", "environment", "front", "back", "serial_imei", "seal"}
FIELD_PHOTOS_BUCKET = "field-photos"

# ── Helpers ──────────────────────────────────────────────────────────────────

async def _assert_operation_member(
    operation_id: uuid.UUID,
    user_id: uuid.UUID,
    role: str,
    session: AsyncSession,
) -> None:
    """Verifica que o usuário é membro da operação ou admin."""
    if role == "admin":
        return
    member = (
        await session.execute(
            select(OperationUser).where(
                OperationUser.operation_id == operation_id,
                OperationUser.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não é membro desta operação.",
        )


# ── Criar sessão ─────────────────────────────────────────────────────────────

@router.post("", response_model=FieldPhotoSessionResponse, status_code=201)
async def create_session(
    payload: FieldPhotoSessionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
):
    """Cria uma nova sessão de coleta fotográfica em campo."""
    user_id = uuid.UUID(current_user["sub"])
    role = current_user.get("role")

    # Verificar se a operação existe
    op = (await db.execute(select(Operation).where(Operation.id == payload.operation_id))).scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    await _assert_operation_member(payload.operation_id, user_id, role, db)

    session_obj = FieldPhotoSession(
        operation_id=payload.operation_id,
        team_id=payload.team_id,
        target_id=payload.target_id,
        created_by=user_id,
        device_manufacturer=payload.device_manufacturer,
        device_model_capture=payload.device_model_capture,
        status="collecting",
        started_at=datetime.now(timezone.utc),
    )
    db.add(session_obj)
    await db.commit()
    await db.refresh(session_obj)

    await audit_service.log(
        db=db, user_id=user_id,
        action="CREATE_FIELD_SESSION",
        resource_type="field_photo_session",
        resource_id=str(session_obj.id),
    )
    return session_obj


# ── Listar sessões ────────────────────────────────────────────────────────────

@router.get("", response_model=list[FieldPhotoSessionResponse])
async def list_sessions(
    operation_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_async_session),
):
    """Lista sessões de coleta (filtra por operação e/ou status)."""
    q = select(FieldPhotoSession)
    if operation_id:
        q = q.where(FieldPhotoSession.operation_id == operation_id)
    if status_filter:
        q = q.where(FieldPhotoSession.status == status_filter)
    q = q.order_by(FieldPhotoSession.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


# ── Detalhar sessão ───────────────────────────────────────────────────────────

@router.get("/{session_id}", response_model=FieldPhotoSessionResponse)
async def get_session(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
):
    obj = (await db.execute(select(FieldPhotoSession).where(FieldPhotoSession.id == session_id))).scalar_one_or_none()
    if not obj:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")
    return obj


# ── Sincronização em lote ─────────────────────────────────────────────────────

@router.post("/{session_id}/sync", response_model=FieldSessionSyncResult)
async def sync_session(
    session_id: uuid.UUID,
    payload: FieldSessionSyncPayload,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
):
    """Endpoint principal de sincronização: recebe todos os dispositivos e fotos
    coletados offline e cria/vincula os registros definitivos no banco de dados.
    """
    user_id = uuid.UUID(current_user["sub"])
    role = current_user.get("role")

    # Verificar sessão
    session_obj = (
        await db.execute(select(FieldPhotoSession).where(FieldPhotoSession.id == session_id))
    ).scalar_one_or_none()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Sessão não encontrada.")

    await _assert_operation_member(session_obj.operation_id, user_id, role, db)

    devices_synced = 0
    photos_synced = 0
    errors = []

    for device_payload in payload.devices:
        try:
            # Criar ou atualizar o FieldDeviceRecord
            record = FieldDeviceRecord(
                session_id=session_obj.id,
                local_id=device_payload.local_id,
                device_type=device_payload.device_type,
                brand=device_payload.brand,
                model=device_payload.model,
                color=device_payload.color,
                serial_number_detected=device_payload.serial_number_detected,
                imei_detected=device_payload.imei_detected,
                seizure_location=device_payload.seizure_location,
                latitude=device_payload.latitude,
                longitude=device_payload.longitude,
                photo_steps_done={},
                is_complete=False,
            )
            db.add(record)
            await db.flush()  # obter ID

            steps_done: dict[str, bool] = {}

            # Processar cada foto do dispositivo
            for photo_data in device_payload.photos:
                try:
                    # Decodificar base64
                    import base64
                    raw_bytes = base64.b64decode(photo_data.file_base64)

                    # Verificar SHA-256
                    computed_hash = hashlib.sha256(raw_bytes).hexdigest()
                    if photo_data.sha256 and computed_hash != photo_data.sha256:
                        errors.append(
                            f"Hash mismatch para foto {photo_data.step} "
                            f"do dispositivo {device_payload.local_id}"
                        )
                        continue

                    # Upload para MinIO
                    bucket_path = (
                        f"{session_obj.operation_id}/"
                        f"{session_obj.target_id or 'no-target'}/"
                        f"{device_payload.local_id}/"
                        f"{photo_data.step}/"
                        f"{photo_data.file_name}"
                    )
                    object_name = storage_service.upload_file(
                        bucket=FIELD_PHOTOS_BUCKET,
                        data=raw_bytes,
                        filename=bucket_path,
                        content_type="image/jpeg",
                    )

                    # Criar DevicePhoto (sem device_id por enquanto — será vinculado após criação do Device)
                    photo_rec = DevicePhoto(
                        device_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),  # placeholder
                        file_path=object_name,
                        file_name=photo_data.file_name,
                        caption=photo_data.caption,
                        category="other",
                        photo_step=photo_data.step,
                        sha256_hash=computed_hash,
                        latitude=photo_data.latitude,
                        longitude=photo_data.longitude,
                        captured_at=photo_data.captured_at,
                        capture_device_model=session_obj.device_model_capture,
                        field_device_record_id=record.id,
                        session_id=session_obj.id,
                        created_by=user_id,
                    )
                    db.add(photo_rec)
                    steps_done[photo_data.step] = True
                    photos_synced += 1

                except Exception as exc:
                    logger.exception("Erro ao processar foto %s: %s", photo_data.step, exc)
                    errors.append(f"Erro na foto {photo_data.step}: {str(exc)}")

            # Verificar conclusão do checklist
            is_complete = all(step in steps_done for step in REQUIRED_STEPS)
            record.photo_steps_done = steps_done
            record.is_complete = is_complete

            devices_synced += 1

        except Exception as exc:
            logger.exception("Erro ao processar dispositivo %s: %s", device_payload.local_id, exc)
            errors.append(f"Erro no dispositivo {device_payload.local_id}: {str(exc)}")

    # Atualizar status da sessão
    session_obj.status = "synced" if not errors else "partial"
    session_obj.synced_at = datetime.now(timezone.utc)
    await db.commit()

    await audit_service.log(
        db=db, user_id=user_id,
        action="SYNC_FIELD_SESSION",
        resource_type="field_photo_session",
        resource_id=str(session_obj.id),
        details={
            "devices_synced": devices_synced,
            "photos_synced": photos_synced,
            "errors": errors,
        },
    )

    return FieldSessionSyncResult(
        session_id=session_obj.id,
        status=session_obj.status,
        devices_synced=devices_synced,
        photos_synced=photos_synced,
        errors=errors,
    )


# ── Dispositivos da sessão ────────────────────────────────────────────────────

@router.get("/{session_id}/devices", response_model=list[FieldDeviceRecordResponse])
async def list_session_devices(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
):
    """Lista os rascunhos de dispositivos de uma sessão."""
    records = (
        await db.execute(
            select(FieldDeviceRecord)
            .where(FieldDeviceRecord.session_id == session_id)
            .order_by(FieldDeviceRecord.created_at.asc())
        )
    ).scalars().all()
    return records
