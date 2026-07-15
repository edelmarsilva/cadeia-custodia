"""Sessões de Coleta Fotográfica em Campo — Mobile App Integration.

Inclui:
- CRUD de sessões de campo
- Geração de QR Code de missão (para provisionamento offline do app mobile)
- Importação de pacote ZIP exportado pelo app mobile
"""
import base64
import hashlib
import io
import json
import logging
import uuid
import zipfile
from datetime import datetime, timezone
from typing import Optional

import qrcode
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import CurrentUser, ExpertOrAnalystOrAdmin
from app.db.database import get_async_session
from app.models.deployment_team_model import DeploymentTeam
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
    FieldQrCodeResponse,
    FieldSessionImportResult,
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


def _generate_qr_image_b64(payload_b64: str) -> str:
    """Gera imagem PNG do QR Code e retorna em Base64."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=4,
    )
    qr.add_data(payload_b64)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# ── QR Code de Missão ────────────────────────────────────────────────────────

@router.get(
    "/qrcode",
    response_model=FieldQrCodeResponse,
    summary="Gera QR Code de missão para o app mobile",
)
async def generate_field_qrcode(
    operation_id: uuid.UUID,
    team_id: uuid.UUID,
    target_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
):
    """Gera um QR Code contendo os dados da missão para ser escaneado pelo app mobile.

    O QR Code é usado para provisionamento offline: o agente escaneia o código
    antes de sair ao campo e o app carrega automaticamente os dados da operação,
    equipe e alvo — sem necessidade de rede ou login no campo.
    """
    # Buscar operação
    op = (await db.execute(select(Operation).where(
        Operation.id == operation_id, Operation.deleted_at.is_(None)
    ))).scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    # Buscar equipe
    team = (await db.execute(select(DeploymentTeam).where(
        DeploymentTeam.id == team_id, DeploymentTeam.operation_id == operation_id
    ))).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe não encontrada.")

    # Buscar alvo
    target = (await db.execute(select(Target).where(
        Target.id == target_id, Target.operation_id == operation_id, Target.deleted_at.is_(None)
    ))).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Alvo não encontrado.")

    # Montar payload compacto (chaves curtas para QR menor)
    payload = {
        "v": 1,
        "on": op.name,
        "pn": op.procedure_number or "",
        "oid": str(op.id),
        "tn": team.name,
        "tid": str(team.id),
        "tgn": target.full_name,
        "tgcpf": target.cpf or "",
        "tgid": str(target.id),
        "ia": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "ib": current_user.get("username", ""),
    }

    payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    payload_b64 = base64.b64encode(payload_json.encode()).decode()
    qr_image_b64 = _generate_qr_image_b64(payload_b64)

    await audit_service.log(
        db=db,
        user_id=uuid.UUID(current_user["sub"]),
        action="GENERATE_FIELD_QRCODE",
        resource_type="field_session_qrcode",
        resource_id=str(target_id),
        details={"operation": op.name, "team": team.name, "target": target.full_name},
    )

    return FieldQrCodeResponse(
        qr_payload_b64=payload_b64,
        qr_image_base64=qr_image_b64,
        operation_name=op.name,
        team_name=team.name,
        target_name=target.full_name,
    )


# ── Importação de Pacote ZIP ─────────────────────────────────────────────────

@router.post(
    "/import",
    response_model=FieldSessionImportResult,
    summary="Importa pacote ZIP exportado pelo app mobile",
)
async def import_field_session(
    current_user: CurrentUser,
    file: UploadFile = File(..., description="Arquivo ZIP exportado pelo app mobile"),
    db: AsyncSession = Depends(get_async_session),
):
    """Importa um pacote ZIP gerado pelo app mobile de coleta forense em campo.

    O ZIP deve conter:
    - `manifest.json`: metadados da sessão, dispositivos e fotos
    - `photos/{local_device_id}/{filename}`: arquivos de imagem
    """
    user_id = uuid.UUID(current_user["sub"])

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="O arquivo enviado deve ser um .zip.")

    raw_zip = await file.read()
    if len(raw_zip) > 512 * 1024 * 1024:  # limite 512 MB
        raise HTTPException(status_code=400, detail="Arquivo ZIP excede 512 MB.")

    errors: list[str] = []
    warnings: list[str] = []
    devices_imported = 0
    photos_imported = 0
    photos_failed = 0
    created_session_id: Optional[uuid.UUID] = None

    try:
        with zipfile.ZipFile(io.BytesIO(raw_zip)) as zf:
            # ── 1. Ler manifest.json ──────────────────────────────────────────
            if "manifest.json" not in zf.namelist():
                raise HTTPException(status_code=400, detail="manifest.json não encontrado no ZIP.")

            manifest = json.loads(zf.read("manifest.json").decode("utf-8"))
            session_data = manifest.get("session", {})

            operation_name: str = session_data.get("operation_name", "Operação Desconhecida")
            procedure_number: str = session_data.get("procedure_number", "")
            team_name: str = session_data.get("team_name", "")
            target_name: str = session_data.get("target_name", "Alvo Desconhecido")
            target_cpf: str = session_data.get("target_cpf", "")
            agent_name: str = session_data.get("agent_name", "")

            # IDs vindos do QR Code (opcionais — se presentes usamos para lookup direto)
            op_id_str: Optional[str] = session_data.get("operation_id")
            target_id_str: Optional[str] = session_data.get("target_id")
            team_id_str: Optional[str] = session_data.get("team_id")

            # ── 2. Buscar Operação ────────────────────────────────────────────
            op: Optional[Operation] = None
            if op_id_str:
                op = (await db.execute(select(Operation).where(
                    Operation.id == uuid.UUID(op_id_str),
                    Operation.deleted_at.is_(None),
                ))).scalar_one_or_none()

            if not op:
                # Busca por nome como fallback
                op_rows = (await db.execute(select(Operation).where(
                    Operation.name.ilike(f"%{operation_name}%"),
                    Operation.deleted_at.is_(None),
                ))).scalars().all()
                if op_rows:
                    op = op_rows[0]
                    if len(op_rows) > 1:
                        warnings.append(f"Múltiplas operações com nome '{operation_name}'. Usada a primeira encontrada.")
                else:
                    warnings.append(f"Operação '{operation_name}' não encontrada no sistema. Sessão criada sem vínculo.")

            # ── 3. Buscar Alvo ────────────────────────────────────────────────
            target: Optional[Target] = None
            if target_id_str:
                target = (await db.execute(select(Target).where(
                    Target.id == uuid.UUID(target_id_str),
                    Target.deleted_at.is_(None),
                ))).scalar_one_or_none()

            if not target and target_cpf and op:
                target = (await db.execute(select(Target).where(
                    Target.cpf == target_cpf,
                    Target.operation_id == op.id,
                    Target.deleted_at.is_(None),
                ))).scalar_one_or_none()

            if not target:
                warnings.append(f"Alvo '{target_name}' não localizado pelo CPF. Sessão criada sem vínculo ao alvo.")

            # ── 4. Buscar Equipe ──────────────────────────────────────────────
            team: Optional[DeploymentTeam] = None
            if team_id_str:
                team = (await db.execute(select(DeploymentTeam).where(
                    DeploymentTeam.id == uuid.UUID(team_id_str)
                ))).scalar_one_or_none()

            # ── 5. Criar FieldPhotoSession ────────────────────────────────────
            started_at_str = session_data.get("started_at")
            started_at = (
                datetime.fromisoformat(started_at_str.replace("Z", "+00:00"))
                if started_at_str else datetime.now(timezone.utc)
            )

            field_session = FieldPhotoSession(
                operation_id=op.id if op else uuid.UUID("00000000-0000-0000-0000-000000000001"),
                team_id=team.id if team else None,
                target_id=target.id if target else None,
                created_by=user_id,
                device_model_capture=session_data.get("device_model_capture"),
                status="synced",
                started_at=started_at,
                synced_at=datetime.now(timezone.utc),
            )
            db.add(field_session)
            await db.flush()
            created_session_id = field_session.id

            # ── 6. Processar Dispositivos e Fotos ─────────────────────────────
            devices_raw: list[dict] = manifest.get("devices", [])
            for dev_data in devices_raw:
                local_id: str = dev_data.get("local_id", str(uuid.uuid4()))
                steps_done: dict = {}

                # Criar FieldDeviceRecord
                record = FieldDeviceRecord(
                    session_id=field_session.id,
                    local_id=local_id,
                    device_type=dev_data.get("device_type"),
                    brand=dev_data.get("brand"),
                    model=dev_data.get("model"),
                    color=dev_data.get("color"),
                    serial_number_detected=dev_data.get("serial_number_detected"),
                    imei_detected=dev_data.get("imei_detected"),
                    seizure_location=dev_data.get("seizure_location"),
                    latitude=dev_data.get("latitude"),
                    longitude=dev_data.get("longitude"),
                    photo_steps_done={},
                    is_complete=False,
                )
                db.add(record)
                await db.flush()

                # Processar cada foto do dispositivo
                photos_raw: list[dict] = dev_data.get("photos", [])
                for photo_meta in photos_raw:
                    zip_path: str = photo_meta.get("file_name", "")
                    photo_step: str = photo_meta.get("step", "other")

                    try:
                        if zip_path not in zf.namelist():
                            errors.append(f"Foto não encontrada no ZIP: {zip_path}")
                            photos_failed += 1
                            continue

                        photo_bytes = zf.read(zip_path)

                        # Verificar SHA-256
                        computed_hash = hashlib.sha256(photo_bytes).hexdigest()
                        declared_hash = photo_meta.get("sha256", "")
                        if declared_hash and computed_hash != declared_hash:
                            errors.append(f"Hash SHA-256 inválido para {zip_path}. Foto pode estar corrompida.")
                            photos_failed += 1
                            continue

                        # Upload para MinIO
                        file_name = zip_path.split("/")[-1]
                        minio_path = (
                            f"{field_session.id}/{local_id}/{photo_step}/{file_name}"
                        )
                        object_name = storage_service.upload_file(
                            bucket=FIELD_PHOTOS_BUCKET,
                            data=photo_bytes,
                            filename=minio_path,
                            content_type="image/jpeg",
                        )

                        # Capturar metadados de data
                        captured_at_str = photo_meta.get("captured_at")
                        captured_at = (
                            datetime.fromisoformat(captured_at_str.replace("Z", "+00:00"))
                            if captured_at_str else None
                        )

                        # Criar DevicePhoto com placeholder de device_id
                        photo_rec = DevicePhoto(
                            device_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
                            file_path=object_name,
                            file_name=file_name,
                            caption=photo_meta.get("caption"),
                            category="other",
                            photo_step=photo_step,
                            sha256_hash=computed_hash,
                            latitude=photo_meta.get("latitude"),
                            longitude=photo_meta.get("longitude"),
                            captured_at=captured_at,
                            capture_device_model=session_data.get("device_model_capture"),
                            field_device_record_id=record.id,
                            session_id=field_session.id,
                            created_by=user_id,
                        )
                        db.add(photo_rec)
                        steps_done[photo_step] = True
                        photos_imported += 1

                    except Exception as exc:
                        logger.exception("Erro ao processar foto %s: %s", zip_path, exc)
                        errors.append(f"Erro na foto {zip_path}: {exc}")
                        photos_failed += 1

                # Atualizar checklist do dispositivo
                is_complete = all(s in steps_done for s in REQUIRED_STEPS)
                record.photo_steps_done = steps_done
                record.is_complete = is_complete
                devices_imported += 1

        await db.commit()

    except HTTPException:
        raise
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Arquivo ZIP inválido ou corrompido.")
    except Exception as exc:
        logger.exception("Erro ao importar pacote de campo: %s", exc)
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar o pacote: {exc}")

    # ── Auditoria ────────────────────────────────────────────────────────────
    await audit_service.log(
        db=db,
        user_id=user_id,
        action="IMPORT_FIELD_SESSION",
        resource_type="field_photo_session",
        resource_id=str(created_session_id) if created_session_id else "unknown",
        details={
            "operation": operation_name,
            "target": target_name,
            "agent": agent_name,
            "devices": devices_imported,
            "photos": photos_imported,
            "errors": len(errors),
        },
    )

    return FieldSessionImportResult(
        session_id=created_session_id,
        operation_name=operation_name,
        procedure_number=procedure_number or None,
        team_name=team_name or None,
        target_name=target_name,
        agent_name=agent_name or None,
        devices_imported=devices_imported,
        photos_imported=photos_imported,
        photos_failed=photos_failed,
        errors=errors,
        warnings=warnings,
        success=len(errors) == 0,
    )


# ── Criar Sessão (legado API-sync) ────────────────────────────────────────────

@router.post("", response_model=FieldPhotoSessionResponse, status_code=201)
async def create_session(
    payload: FieldPhotoSessionCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
):
    user_id = uuid.UUID(current_user["sub"])
    role = current_user.get("role")

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


# ── Listar Sessões ────────────────────────────────────────────────────────────

@router.get("", response_model=list[FieldPhotoSessionResponse])
async def list_sessions(
    operation_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = None,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_async_session),
):
    q = select(FieldPhotoSession)
    if operation_id:
        q = q.where(FieldPhotoSession.operation_id == operation_id)
    if status_filter:
        q = q.where(FieldPhotoSession.status == status_filter)
    q = q.order_by(FieldPhotoSession.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


# ── Detalhar Sessão ───────────────────────────────────────────────────────────

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


# ── Dispositivos da Sessão ────────────────────────────────────────────────────

@router.get("/{session_id}/devices", response_model=list[FieldDeviceRecordResponse])
async def list_session_devices(
    session_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_session),
):
    records = (
        await db.execute(
            select(FieldDeviceRecord)
            .where(FieldDeviceRecord.session_id == session_id)
            .order_by(FieldDeviceRecord.created_at.asc())
        )
    ).scalars().all()
    return records
