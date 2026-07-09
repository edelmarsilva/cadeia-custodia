"""CRUD de Modelos de Laudo (ReportTemplate).

Permissões:
  - Listar/visualizar: expert, analyst, admin
  - Criar/editar:      expert, admin
  - Excluir (soft):    admin
"""
import logging
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import AdminOnly, ExpertOrAdmin, ExpertOrAnalystOrAdmin
from app.db.database import get_async_session
from app.models.report_template_model import ReportTemplate
from app.schemas.schemas import (
    ReportTemplateCreate,
    ReportTemplateResponse,
    ReportTemplateUpdate,
)
from app.schemas.common_schema import MessageResponse
from app.services import audit_service, storage_service

settings = get_settings()
router = APIRouter(tags=["Modelos de Laudo"])
logger = logging.getLogger(__name__)


def _build_response(template: ReportTemplate) -> ReportTemplateResponse:
    resp = ReportTemplateResponse.model_validate(template)
    if template.file_path:
        try:
            resp.file_url = storage_service.get_presigned_url(
                bucket=settings.MINIO_BUCKET_TEMPLATES,
                object_name=template.file_path,
                expires_seconds=7200,
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL do template %s: %s", template.id, exc)
    return resp


# ── Listar placeholders disponíveis ─────────────────────────────────────────
@router.get("/report-templates/placeholders")
async def list_placeholders(current_user: ExpertOrAnalystOrAdmin):
    """Retorna todos os placeholders suportados pelo motor de geração de laudos."""
    from app.services.report_generation_service import PLACEHOLDER_MAP, IMAGE_PLACEHOLDER_MAP
    return {
        "text_placeholders": [
            {"placeholder": ph, "field": field}
            for ph, field in PLACEHOLDER_MAP.items()
        ],
        "image_placeholders": [
            {"placeholder": ph, "category": cat}
            for ph, cat in IMAGE_PLACEHOLDER_MAP.items()
        ],
    }


# ── Listar templates ──────────────────────────────────────────────
@router.get("/report-templates", response_model=list[ReportTemplateResponse])
async def list_templates(
    current_user: ExpertOrAnalystOrAdmin,
    active_only: bool = True,
    session: AsyncSession = Depends(get_async_session),
):
    """Lista todos os modelos de laudo cadastrados."""
    stmt = select(ReportTemplate).where(ReportTemplate.deleted_at.is_(None))
    if active_only:
        stmt = stmt.where(ReportTemplate.is_active == True)  # noqa: E712
    stmt = stmt.order_by(ReportTemplate.name)
    result = await session.execute(stmt)
    templates = result.scalars().all()
    return [_build_response(t) for t in templates]


# ── Detalhar template ─────────────────────────────────────────────
@router.get("/report-templates/{template_id}", response_model=ReportTemplateResponse)
async def get_template(
    template_id: uuid.UUID,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(ReportTemplate).where(
            ReportTemplate.id == template_id,
            ReportTemplate.deleted_at.is_(None),
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo de laudo não encontrado.")
    return _build_response(template)


# ── Criar template ────────────────────────────────────────────────
@router.post(
    "/report-templates",
    response_model=ReportTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_template(
    current_user: ExpertOrAdmin,
    name: str = Form(...),
    description: str | None = Form(None),
    version: str = Form("1.0"),
    is_active: bool = Form(True),
    file: UploadFile | None = None,
    session: AsyncSession = Depends(get_async_session),
):
    """Cria um novo modelo de laudo. Requer upload de arquivo DOCX."""
    file_path = None
    file_name = None

    if file:
        if not file.filename or not file.filename.lower().endswith(".docx"):
            raise HTTPException(
                status_code=422,
                detail="Apenas arquivos .docx são aceitos como modelo.",
            )
        data = await file.read()
        obj_name = storage_service.upload_file(
            bucket=settings.MINIO_BUCKET_TEMPLATES,
            data=data,
            filename=file.filename,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        file_path = obj_name
        file_name = file.filename

    template = ReportTemplate(
        name=name,
        description=description,
        version=version,
        is_active=is_active,
        file_path=file_path,
        file_name=file_name,
        created_by=uuid.UUID(current_user["sub"]),
        updated_by=uuid.UUID(current_user["sub"]),
    )
    session.add(template)
    await session.flush()

    await audit_service.log_action(
        session,
        action="template_created",
        entity_type="report_template",
        entity_id=str(template.id),
        description=f"Modelo '{name}' v{version} criado",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(template)
    return _build_response(template)


# ── Atualizar template ────────────────────────────────────────────
@router.patch("/report-templates/{template_id}", response_model=ReportTemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    current_user: ExpertOrAdmin,
    name: str | None = Form(None),
    description: str | None = Form(None),
    version: str | None = Form(None),
    is_active: bool | None = Form(None),
    file: UploadFile | None = None,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(ReportTemplate).where(
            ReportTemplate.id == template_id,
            ReportTemplate.deleted_at.is_(None),
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo de laudo não encontrado.")

    # Atualiza campos de texto
    old_name = template.name
    if name is not None:
        template.name = name
    if description is not None:
        template.description = description
    if version is not None:
        template.version = version
    if is_active is not None:
        template.is_active = is_active

    # Atualiza arquivo DOCX (se enviado)
    if file:
        if not file.filename or not file.filename.lower().endswith(".docx"):
            raise HTTPException(status_code=422, detail="Apenas arquivos .docx são aceitos.")
        data = await file.read()
        obj_name = storage_service.upload_file(
            bucket=settings.MINIO_BUCKET_TEMPLATES,
            data=data,
            filename=file.filename,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        template.file_path = obj_name
        template.file_name = file.filename

    template.updated_by = uuid.UUID(current_user["sub"])

    await audit_service.log_action(
        session,
        action="template_updated",
        entity_type="report_template",
        entity_id=str(template_id),
        description=f"Modelo '{old_name}' atualizado",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(template)
    return _build_response(template)


# ── Excluir template (soft delete) ────────────────────────────────
@router.delete("/report-templates/{template_id}", response_model=MessageResponse)
async def delete_template(
    template_id: uuid.UUID,
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
):
    """Exclusão lógica. Restrito a administradores."""
    result = await session.execute(
        select(ReportTemplate).where(
            ReportTemplate.id == template_id,
            ReportTemplate.deleted_at.is_(None),
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo de laudo não encontrado.")

    template.soft_delete()
    template.is_active = False

    await audit_service.log_action(
        session,
        action="template_deleted",
        entity_type="report_template",
        entity_id=str(template_id),
        description=f"Modelo '{template.name}' excluído (soft delete)",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Modelo de laudo excluído.")


# ── Download do arquivo DOCX do template ──────────────────────────
@router.get("/report-templates/{template_id}/download")
async def download_template(
    template_id: uuid.UUID,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """Retorna a URL pré-assinada para download do DOCX do template."""
    result = await session.execute(
        select(ReportTemplate).where(
            ReportTemplate.id == template_id,
            ReportTemplate.deleted_at.is_(None),
        )
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo de laudo não encontrado.")
    if not template.file_path:
        raise HTTPException(status_code=404, detail="Este modelo não possui arquivo DOCX.")

    try:
        url = storage_service.get_presigned_url(
            bucket=settings.MINIO_BUCKET_TEMPLATES,
            object_name=template.file_path,
            expires_seconds=300,
        )
    except Exception as exc:
        logger.error("Falha ao gerar URL de download do template %s: %s", template_id, exc)
        raise HTTPException(status_code=500, detail="Erro ao gerar link de download.")

    await audit_service.log_action(
        session,
        action="template_downloaded",
        entity_type="report_template",
        entity_id=str(template_id),
        description=f"Download do modelo '{template.name}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return {"url": url, "file_name": template.file_name}
