"""Fotografias de Alvos — upload, listagem e exclusão."""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import AdminOnly, CurrentUser
from app.db.database import get_async_session
from app.models.target_model import Target
from app.models.target_photo_model import TargetPhoto
from app.schemas.common_schema import MessageResponse
from app.schemas.schemas import TargetPhotoResponse
from app.services import audit_service, storage_service

settings = get_settings()
router = APIRouter(tags=["Fotos de Alvos"])
logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def _get_presigned(file_path: str) -> str | None:
    try:
        return storage_service.get_presigned_url(
            bucket=settings.MINIO_BUCKET_TARGET_PHOTOS,
            object_name=file_path,
            expires_seconds=7200,
        )
    except Exception as exc:
        logger.warning("Falha ao gerar URL pre-assinada para foto de alvo: %s", exc)
        return None


@router.get("/targets/{target_id}/photos", response_model=list[TargetPhotoResponse])
async def list_target_photos(
    target_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Lista todas as fotografias associadas a um Alvo."""
    result = await session.execute(
        select(TargetPhoto)
        .where(TargetPhoto.target_id == target_id, TargetPhoto.deleted_at.is_(None))
        .order_by(TargetPhoto.created_at.desc())
    )
    photos = result.scalars().all()
    out = []
    for p in photos:
        r = TargetPhotoResponse.model_validate(p)
        r.url = _get_presigned(p.file_path)
        out.append(r)
    return out


@router.post(
    "/targets/{target_id}/photos",
    response_model=TargetPhotoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_target_photo(
    target_id: uuid.UUID,
    file: UploadFile,
    current_user: CurrentUser,
    caption: str | None = None,
    session: AsyncSession = Depends(get_async_session),
):
    """Faz upload de uma fotografia para um Alvo.

    Formatos aceitos: JPG, JPEG, PNG, WEBP. Tamanho máximo: 10 MB.
    """
    # Validate target exists
    target = (await session.execute(
        select(Target).where(Target.id == target_id, Target.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Alvo não encontrado.")

    # Validate content type
    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()
    ext = "." + filename.rsplit(".", 1)[-1] if "." in filename else ""

    if content_type not in ALLOWED_CONTENT_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Formato de arquivo não suportado: '{file.content_type}'. "
                "Formatos aceitos: JPG, JPEG, PNG, WEBP."
            ),
        )

    data = await file.read()

    # Validate file size
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=422,
            detail=f"Arquivo muito grande ({len(data) // 1024} KB). Tamanho máximo: 10 MB.",
        )

    obj_name = storage_service.upload_file(
        bucket=settings.MINIO_BUCKET_TARGET_PHOTOS,
        data=data,
        filename=file.filename,
        content_type=content_type or "image/jpeg",
    )

    photo = TargetPhoto(
        target_id=target_id,
        file_path=obj_name,
        file_name=file.filename,
        caption=caption,
        created_by=uuid.UUID(current_user["sub"]),
    )
    session.add(photo)
    await session.flush()

    await audit_service.log_action(
        session,
        action="target_photo_uploaded",
        entity_type="target",
        entity_id=str(target_id),
        description=f"Fotografia '{file.filename}' adicionada ao alvo '{target.full_name}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(photo)
    r = TargetPhotoResponse.model_validate(photo)
    r.url = _get_presigned(photo.file_path)
    return r


@router.delete("/target-photos/{photo_id}", response_model=MessageResponse)
async def delete_target_photo(
    photo_id: uuid.UUID,
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
):
    """Remove uma fotografia de Alvo. Restrito a administradores."""
    result = await session.execute(
        select(TargetPhoto).where(TargetPhoto.id == photo_id, TargetPhoto.deleted_at.is_(None))
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="Fotografia não encontrada.")

    file_path = photo.file_path
    target_id = photo.target_id
    photo.soft_delete()

    try:
        storage_service.delete_object(settings.MINIO_BUCKET_TARGET_PHOTOS, file_path)
    except Exception as exc:
        logger.warning("Falha ao remover foto de alvo do storage %s: %s", photo_id, exc)

    await audit_service.log_action(
        session,
        action="target_photo_deleted",
        entity_type="target",
        entity_id=str(target_id),
        description=f"Fotografia '{photo.file_name}' excluída por administrador",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Fotografia removida.")
