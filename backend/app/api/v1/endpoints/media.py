"""Fotografias e Laudos Periciais."""
import logging
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import AdminOnly, CurrentUser, ExpertOrAdmin
from app.db.database import get_async_session
from app.models.device_model import Device
from app.models.photo_model import DevicePhoto
from app.models.report_model import ExpertReport
from app.schemas.common_schema import MessageResponse
from app.schemas.schemas import (
    ExpertReportCreate,
    ExpertReportResponse,
    ExpertReportUpdate,
    PhotoResponse,
)
from app.services import audit_service, storage_service

settings = get_settings()
router = APIRouter(tags=["Fotos e Laudos"])
logger = logging.getLogger(__name__)


# ── Fotografias ───────────────────────────────────────────────
@router.get("/devices/{device_id}/photos", response_model=list[PhotoResponse])
async def list_photos(
    device_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(DevicePhoto)
        .where(DevicePhoto.device_id == device_id, DevicePhoto.deleted_at.is_(None))
        .order_by(DevicePhoto.created_at.desc())
    )
    photos = result.scalars().all()
    out = []
    for p in photos:
        r = PhotoResponse.model_validate(p)
        try:
            r.url = storage_service.get_presigned_url(
                bucket=settings.MINIO_BUCKET_PHOTOS,
                object_name=p.file_path,
                expires_seconds=7200,
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL pre-assinada para foto %s: %s", p.id, exc)
            r.url = None
        out.append(r)
    return out


@router.post(
    "/devices/{device_id}/photos",
    response_model=PhotoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_photo(
    device_id: uuid.UUID,
    current_user: CurrentUser,
    file: UploadFile,
    caption: str | None = None,
    category: str = "other",
    session: AsyncSession = Depends(get_async_session),
):
    device_res = await session.execute(
        select(Device).where(Device.id == device_id, Device.deleted_at.is_(None))
    )
    if not device_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    data = await file.read()
    obj_name = storage_service.upload_file(
        bucket=settings.MINIO_BUCKET_PHOTOS,
        data=data,
        filename=file.filename,
        content_type=file.content_type or "image/jpeg",
    )

    photo = DevicePhoto(
        device_id=device_id,
        file_path=obj_name,
        file_name=file.filename,
        caption=caption,
        category=category,
        created_by=uuid.UUID(current_user["sub"]),
    )
    session.add(photo)
    await session.flush()

    await audit_service.log_action(
        session,
        action="photo_uploaded",
        entity_type="device",
        entity_id=str(device_id),
        description=f"Foto '{file.filename}' ({category}) adicionada",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(photo)
    r = PhotoResponse.model_validate(photo)
    try:
        r.url = storage_service.get_presigned_url(
            bucket=settings.MINIO_BUCKET_PHOTOS,
            object_name=photo.file_path,
            expires_seconds=7200,
        )
    except Exception as exc:
        logger.warning("Falha ao gerar URL pre-assinada para foto recém-enviada: %s", exc)
        r.url = None
    return r


@router.delete("/photos/{photo_id}", response_model=MessageResponse)
async def delete_photo(
    photo_id: uuid.UUID,
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
):
    """Remove uma fotografia. Restrito a administradores."""
    result = await session.execute(
        select(DevicePhoto).where(DevicePhoto.id == photo_id, DevicePhoto.deleted_at.is_(None))
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Foto não encontrada.")

    file_path = photo.file_path
    device_id  = photo.device_id
    photo.soft_delete()

    # Remove o arquivo físico do MinIO após soft-delete
    try:
        storage_service.delete_object(settings.MINIO_BUCKET_PHOTOS, file_path)
    except Exception as exc:
        logger.warning("Falha ao remover arquivo de foto do storage %s: %s", photo_id, exc)

    await audit_service.log_action(
        session,
        action="photo_deleted",
        entity_type="device",
        entity_id=str(device_id),
        description=f"Foto '{photo.file_name}' excluída por administrador",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Foto removida.")


# ── Laudos Periciais ──────────────────────────────────────────
@router.get("/devices/{device_id}/reports", response_model=list[ExpertReportResponse])
async def list_reports(
    device_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(ExpertReport)
        .where(ExpertReport.device_id == device_id, ExpertReport.deleted_at.is_(None))
        .order_by(ExpertReport.created_at.desc())
    )
    out = []
    for r in result.scalars().all():
        resp = ExpertReportResponse.model_validate(r)
        if r.file_path:
            try:
                resp.file_url = storage_service.get_presigned_url(
                    bucket=settings.MINIO_BUCKET_REPORTS,
                    object_name=r.file_path,
                    expires_seconds=7200,
                )
            except Exception as exc:
                logger.warning("Falha ao gerar URL pre-assinada para laudo %s: %s", r.id, exc)
                resp.file_url = None
        out.append(resp)
    return out


@router.post(
    "/devices/{device_id}/reports",
    response_model=ExpertReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_report(
    device_id: uuid.UUID,
    current_user: CurrentUser,
    report_number: str = Form(...),
    title: str = Form(...),
    expert_name: str | None = Form(None),
    emission_date: str | None = Form(None),
    status_field: str = Form("drafting", alias="status"),
    observations: str | None = Form(None),
    file: UploadFile | None = None,
    session: AsyncSession = Depends(get_async_session),
):
    from datetime import date as date_type

    device_res = await session.execute(
        select(Device).where(Device.id == device_id, Device.deleted_at.is_(None))
    )
    if not device_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    file_path = None
    file_name = None
    if file:
        data = await file.read()
        obj_name = storage_service.upload_file(
            bucket=settings.MINIO_BUCKET_REPORTS,
            data=data,
            filename=file.filename,
            content_type="application/pdf",
        )
        file_path = obj_name
        file_name = file.filename

    emission_date_parsed = None
    if emission_date:
        try:
            emission_date_parsed = date_type.fromisoformat(emission_date)
        except ValueError:
            pass

    report = ExpertReport(
        device_id=device_id,
        expert_user_id=uuid.UUID(current_user["sub"]),
        file_path=file_path,
        file_name=file_name,
        created_by=uuid.UUID(current_user["sub"]),
        report_number=report_number,
        title=title,
        expert_name=expert_name,
        emission_date=emission_date_parsed,
        status=status_field,
        observations=observations,
    )
    session.add(report)
    await session.flush()

    await audit_service.log_action(
        session,
        action="report_created",
        entity_type="device",
        entity_id=str(device_id),
        description=f"Laudo '{report_number}' criado",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(report)
    resp = ExpertReportResponse.model_validate(report)
    if report.file_path:
        try:
            resp.file_url = storage_service.get_presigned_url(
                bucket=settings.MINIO_BUCKET_REPORTS,
                object_name=report.file_path,
                expires_seconds=7200,
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL pre-assinada para laudo recém-criado: %s", exc)
            resp.file_url = None
    return resp


@router.patch("/reports/{report_id}", response_model=ExpertReportResponse)
async def update_report(
    report_id: uuid.UUID,
    body: ExpertReportUpdate,
    current_user: CurrentUser,
    file: UploadFile | None = None,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(ExpertReport).where(ExpertReport.id == report_id, ExpertReport.deleted_at.is_(None))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Laudo não encontrado.")

    if file:
        data = await file.read()
        obj_name = storage_service.upload_file(
            bucket=settings.MINIO_BUCKET_REPORTS,
            data=data,
            filename=file.filename,
            content_type="application/pdf",
        )
        report.file_path = obj_name
        report.file_name = file.filename
        report.version += 1

    old_status = report.status
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(report, field, value)

    await audit_service.log_action(
        session,
        action="report_updated",
        entity_type="report",
        entity_id=str(report_id),
        old_value={"status": old_status},
        new_value=body.model_dump(exclude_unset=True),
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(report)
    resp = ExpertReportResponse.model_validate(report)
    if report.file_path:
        try:
            resp.file_url = storage_service.get_presigned_url(
                bucket=settings.MINIO_BUCKET_REPORTS,
                object_name=report.file_path,
                expires_seconds=7200,
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL pre-assinada para laudo atualizado %s: %s", report_id, exc)
            resp.file_url = None
    return resp
