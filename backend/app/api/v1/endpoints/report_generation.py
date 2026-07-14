"""Endpoints de Geração Automática de Laudos Periciais.

Fluxo principal:
  1. POST /devices/{id}/generate-report/preview  → pré-visualização dos dados
  2. POST /devices/{id}/generate-report           → gera DOCX + PDF e salva no MinIO
  3. GET  /devices/{id}/generated-reports         → histórico do dispositivo
  4. GET  /generated-reports                      → histórico global
  5. GET  /generated-reports/{id}/download/docx   → download DOCX
  6. GET  /generated-reports/{id}/download/pdf    → download PDF
"""
import logging
import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.deps import ExpertOrAnalystOrAdmin
from app.db.database import get_async_session
from app.models.device_model import Device
from app.models.generated_report_model import GeneratedReport
from app.models.operation_model import Operation
from app.models.photo_model import DevicePhoto
from app.models.report_template_model import ReportTemplate
from app.models.target_model import Target
from app.schemas.schemas import (
    GeneratedReportCreate,
    GeneratedReportResponse,
    ReportPreviewResponse,
    OperationDocumentCreate,
    OperationDocumentPreviewResponse,
    TargetDocumentPreviewResponse,
    GeneratedDocumentResponse,
)
from app.services import audit_service, storage_service
from app.services.report_generation_service import (
    build_placeholder_context,
    build_operation_context,
    build_target_context,
    convert_to_pdf,
    generate_docx,
)

settings = get_settings()
router = APIRouter(tags=["Geração de Laudos"])
logger = logging.getLogger(__name__)


def _enrich_response(report: GeneratedReport) -> GeneratedReportResponse:
    """Gera presigned URLs para os arquivos do laudo."""
    resp = GeneratedReportResponse.model_validate(report)
    if report.docx_path:
        try:
            resp.docx_url = storage_service.get_presigned_url(
                bucket=settings.MINIO_BUCKET_REPORTS,
                object_name=report.docx_path,
                expires_seconds=7200,
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL DOCX %s: %s", report.id, exc)
    if report.pdf_path:
        try:
            resp.pdf_url = storage_service.get_presigned_url(
                bucket=settings.MINIO_BUCKET_REPORTS,
                object_name=report.pdf_path,
                expires_seconds=7200,
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL PDF %s: %s", report.id, exc)
    return resp


# ── Pré-visualização ──────────────────────────────────────────────
@router.post("/devices/{device_id}/generate-report/preview", response_model=ReportPreviewResponse)
async def preview_report(
    device_id: uuid.UUID,
    body: GeneratedReportCreate,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Retorna os dados que serão preenchidos nos placeholders, sem gerar o documento.
    Útil para conferência antes da emissão definitiva.
    """
    # Valida dispositivo
    device_res = await session.execute(
        select(Device).where(Device.id == device_id, Device.deleted_at.is_(None))
    )
    if not device_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    ctx = await build_placeholder_context(
        session=session,
        device_id=device_id,
        report_number=body.report_number,
        expert_name=body.expert_name,
        emission_date=body.emission_date,
        observations=body.observations,
    )

    return ReportPreviewResponse(
        report_number=ctx["report_number"],
        expert_name=ctx["expert_name"] or None,
        emission_date=ctx["emission_date"] or None,
        evidence_number=ctx["evidence_number"] or None,
        seal_number=ctx["seal_number"] or None,
        device_type=ctx["device_type"] or None,
        brand=ctx["brand"] or None,
        model=ctx["model"] or None,
        serial_number=ctx["serial_number"] or None,
        color=ctx["color"] or None,
        imei=ctx["imei"] or None,
        os=ctx["os"] or None,
        storage_capacity=ctx["storage_capacity"] or None,
        seizure_date=ctx["seizure_date"] or None,
        seizure_location=ctx["seizure_location"] or None,
        target_name=ctx["target_name"] or None,
        target_cpf=ctx["target_cpf"] or None,
        operation_name=ctx["operation_name"] or None,
        procedure_number=ctx["procedure_number"] or None,
        hash_md5=ctx["hash_md5"] or None,
        hash_sha1=ctx["hash_sha1"] or None,
        hash_sha256=ctx["hash_sha256"] or None,
        photos_count=ctx["photos_count"],
        analysis_start_date=ctx["analysis_start_date"] or None,
        observations=ctx["observations"] or None,
    )


# ── Geração do Laudo ──────────────────────────────────────────────
@router.post(
    "/devices/{device_id}/generate-report",
    response_model=GeneratedReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_report(
    device_id: uuid.UUID,
    body: GeneratedReportCreate,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """
    Gera automaticamente um laudo pericial em DOCX e PDF a partir do template selecionado.
    Substitui todos os placeholders e insere imagens do dispositivo.
    """
    # 1. Valida dispositivo
    device_res = await session.execute(
        select(Device).where(Device.id == device_id, Device.deleted_at.is_(None))
    )
    device: Device | None = device_res.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    # 2. Valida template
    tpl_res = await session.execute(
        select(ReportTemplate).where(
            ReportTemplate.id == body.template_id,
            ReportTemplate.deleted_at.is_(None),
            ReportTemplate.is_active == True,  # noqa: E712
        )
    )
    template: ReportTemplate | None = tpl_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo de laudo não encontrado ou inativo.")
    if not template.file_path:
        raise HTTPException(status_code=422, detail="O modelo selecionado não possui arquivo DOCX.")

    # 3. Constrói contexto de placeholders
    ctx = await build_placeholder_context(
        session=session,
        device_id=device_id,
        report_number=body.report_number,
        expert_name=body.expert_name,
        emission_date=body.emission_date,
        observations=body.observations,
    )

    # 4. Baixa o arquivo DOCX do template do MinIO
    try:
        from minio import Minio
        from datetime import timedelta
        import io

        minio_client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL,
        )
        response = minio_client.get_object(settings.MINIO_BUCKET_TEMPLATES, template.file_path)
        template_bytes: bytes = response.read()
        response.close()
        response.release_conn()
    except Exception as exc:
        logger.error("Erro ao baixar template do MinIO: %s", exc)
        raise HTTPException(status_code=500, detail=f"Erro ao carregar modelo: {exc}")

    # 5. Baixa as fotos do dispositivo para inserção no documento
    photos: list[DevicePhoto] = ctx.get("_photos", [])
    photo_bytes_map: dict[str, bytes] = {}
    for photo in photos:
        try:
            resp = minio_client.get_object(settings.MINIO_BUCKET_PHOTOS, photo.file_path)
            photo_bytes_map[photo.file_path] = resp.read()
            resp.close()
            resp.release_conn()
        except Exception as exc:
            logger.warning("Não foi possível baixar a foto %s: %s", photo.file_path, exc)

    # 6. Gera o DOCX com placeholders substituídos
    try:
        docx_bytes = generate_docx(template_bytes, ctx, photo_bytes_map)
    except Exception as exc:
        logger.error("Erro ao gerar DOCX: %s", exc)
        raise HTTPException(status_code=500, detail=f"Erro ao gerar documento DOCX: {exc}")

    # 7. Converte para PDF
    pdf_bytes: bytes | None = None
    try:
        pdf_bytes = convert_to_pdf(docx_bytes)
    except Exception as exc:
        logger.warning("Conversão PDF falhou: %s — laudo DOCX disponível.", exc)

    # 8. Faz upload do DOCX e PDF para o MinIO (bucket: reports)
    safe_number = body.report_number.replace("/", "-").replace(" ", "_")
    docx_filename = f"laudo_{safe_number}.docx"
    pdf_filename = f"laudo_{safe_number}.pdf"

    docx_path = storage_service.upload_file(
        bucket=settings.MINIO_BUCKET_REPORTS,
        data=docx_bytes,
        filename=docx_filename,
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    pdf_path = None
    if pdf_bytes:
        pdf_path = storage_service.upload_file(
            bucket=settings.MINIO_BUCKET_REPORTS,
            data=pdf_bytes,
            filename=pdf_filename,
            content_type="application/pdf",
        )

    # 9. Cria snapshot dos dados para auditoria (sem os bytes de imagem)
    snapshot = {k: v for k, v in ctx.items() if not k.startswith("_")}

    # 10. Persiste o registro GeneratedReport
    gen_report = GeneratedReport(
        template_id=body.template_id,
        template_version=template.version,
        device_id=device_id,
        operation_id=device.operation_id,
        user_id=uuid.UUID(current_user["sub"]),
        report_number=body.report_number,
        expert_name=body.expert_name,
        emission_date=body.emission_date,
        observations=body.observations,
        docx_path=docx_path,
        pdf_path=pdf_path,
        docx_name=docx_filename,
        pdf_name=pdf_filename if pdf_path else None,
        placeholder_data=snapshot,
    )
    session.add(gen_report)
    await session.flush()

    # 11. Log de auditoria
    await audit_service.log_action(
        session,
        action="report_generated",
        entity_type="device",
        entity_id=str(device_id),
        description=f"Laudo '{body.report_number}' gerado usando template '{template.name}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
        new_value={"report_id": str(gen_report.id), "template": template.name},
    )

    await session.refresh(gen_report)
    return _enrich_response(gen_report)


# ── Histórico por dispositivo ─────────────────────────────────────
@router.get("/devices/{device_id}/generated-reports", response_model=list[GeneratedReportResponse])
async def list_device_reports(
    device_id: uuid.UUID,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """Lista o histórico de laudos gerados para um dispositivo específico."""
    result = await session.execute(
        select(GeneratedReport)
        .where(GeneratedReport.device_id == device_id)
        .order_by(GeneratedReport.created_at.desc())
    )
    reports = result.scalars().all()
    return [_enrich_response(r) for r in reports]


# ── Histórico global ──────────────────────────────────────────────
@router.get("/generated-reports", response_model=list[GeneratedReportResponse])
async def list_all_reports(
    current_user: ExpertOrAnalystOrAdmin,
    page: int = 1,
    page_size: int = 20,
    session: AsyncSession = Depends(get_async_session),
):
    """Histórico global de todos os laudos gerados, com paginação."""
    offset = (page - 1) * page_size
    result = await session.execute(
        select(GeneratedReport)
        .order_by(GeneratedReport.created_at.desc())
        .limit(page_size)
        .offset(offset)
    )
    reports = result.scalars().all()
    return [_enrich_response(r) for r in reports]


# ── Download DOCX ──────────────────────────────────────────────────
@router.get("/generated-reports/{report_id}/download/docx")
async def download_docx(
    report_id: uuid.UUID,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(GeneratedReport).where(GeneratedReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Laudo não encontrado.")
    if not report.docx_path:
        raise HTTPException(status_code=404, detail="Arquivo DOCX não disponível.")

    try:
        url = storage_service.get_presigned_url(
            bucket=settings.MINIO_BUCKET_REPORTS,
            object_name=report.docx_path,
            expires_seconds=300,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar link: {exc}")

    await audit_service.log_action(
        session,
        action="report_downloaded",
        entity_type="generated_report",
        entity_id=str(report_id),
        description=f"Download DOCX do laudo '{report.report_number}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return {"url": url, "file_name": report.docx_name}


# ── Download PDF ───────────────────────────────────────────────────
@router.get("/generated-reports/{report_id}/download/pdf")
async def download_pdf(
    report_id: uuid.UUID,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(GeneratedReport).where(GeneratedReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Laudo não encontrado.")
    if not report.pdf_path:
        raise HTTPException(
            status_code=404,
            detail="PDF não disponível. A conversão pode ter falhado ou o LibreOffice não está instalado.",
        )

    try:
        url = storage_service.get_presigned_url(
            bucket=settings.MINIO_BUCKET_REPORTS,
            object_name=report.pdf_path,
            expires_seconds=300,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar link: {exc}")

    await audit_service.log_action(
        session,
        action="report_downloaded",
        entity_type="generated_report",
        entity_id=str(report_id),
        description=f"Download PDF do laudo '{report.report_number}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return {"url": url, "file_name": report.pdf_name}


# ── Helpers para geração genérica (operação/alvo) ─────────────────

def _enrich_document_response(report: GeneratedReport) -> GeneratedDocumentResponse:
    """Gera presigned URLs para documentos gerados de operações/alvos."""
    resp = GeneratedDocumentResponse.model_validate(report)
    if report.docx_path:
        try:
            resp.docx_url = storage_service.get_presigned_url(
                bucket=settings.MINIO_BUCKET_REPORTS,
                object_name=report.docx_path,
                expires_seconds=7200,
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL DOCX %s: %s", report.id, exc)
    if report.pdf_path:
        try:
            resp.pdf_url = storage_service.get_presigned_url(
                bucket=settings.MINIO_BUCKET_REPORTS,
                object_name=report.pdf_path,
                expires_seconds=7200,
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL PDF %s: %s", report.id, exc)
    return resp


async def _generate_document_from_context(
    ctx: dict,
    body: OperationDocumentCreate,
    source_type: str,
    operation_id: uuid.UUID | None,
    target_id: uuid.UUID | None,
    current_user: dict,
    session: AsyncSession,
    template: ReportTemplate,
) -> GeneratedDocumentResponse:
    """Lógica compartilhada para gerar um documento DOCX+PDF e persistir no banco."""
    from minio import Minio

    minio_client = Minio(
        endpoint=settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_USE_SSL,
    )

    # Baixa template DOCX
    try:
        response = minio_client.get_object(settings.MINIO_BUCKET_TEMPLATES, template.file_path)
        template_bytes: bytes = response.read()
        response.close()
        response.release_conn()
    except Exception as exc:
        logger.error("Erro ao baixar template do MinIO: %s", exc)
        raise HTTPException(status_code=500, detail=f"Erro ao carregar modelo: {exc}")

    # Gera DOCX (sem fotos para operação/alvo)
    try:
        docx_bytes = generate_docx(template_bytes, ctx, {})
    except Exception as exc:
        logger.error("Erro ao gerar DOCX: %s", exc)
        raise HTTPException(status_code=500, detail=f"Erro ao gerar documento DOCX: {exc}")

    # Converte para PDF
    pdf_bytes: bytes | None = None
    try:
        pdf_bytes = convert_to_pdf(docx_bytes)
    except Exception as exc:
        logger.warning("Conversão PDF falhou: %s — documento DOCX disponível.", exc)

    # Upload para MinIO
    safe_number = body.report_number.replace("/", "-").replace(" ", "_")
    docx_filename = f"doc_{source_type}_{safe_number}.docx"
    pdf_filename = f"doc_{source_type}_{safe_number}.pdf"

    docx_path = storage_service.upload_file(
        bucket=settings.MINIO_BUCKET_REPORTS,
        data=docx_bytes,
        filename=docx_filename,
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    pdf_path = None
    if pdf_bytes:
        pdf_path = storage_service.upload_file(
            bucket=settings.MINIO_BUCKET_REPORTS,
            data=pdf_bytes,
            filename=pdf_filename,
            content_type="application/pdf",
        )

    # Snapshot para auditoria
    snapshot = {k: v for k, v in ctx.items() if not k.startswith("_")}

    # Persiste registro
    gen_report = GeneratedReport(
        template_id=body.template_id,
        template_version=template.version,
        device_id=None,
        target_id=target_id,
        operation_id=operation_id,
        source_type=source_type,
        user_id=uuid.UUID(current_user["sub"]),
        report_number=body.report_number,
        expert_name=body.expert_name,
        emission_date=body.emission_date,
        observations=body.observations,
        docx_path=docx_path,
        pdf_path=pdf_path,
        docx_name=docx_filename,
        pdf_name=pdf_filename if pdf_path else None,
        placeholder_data=snapshot,
    )
    session.add(gen_report)
    await session.flush()

    await audit_service.log_action(
        session,
        action="document_generated",
        entity_type=source_type,
        entity_id=str(operation_id or target_id),
        description=f"Documento '{body.report_number}' gerado usando template '{template.name}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
        new_value={"report_id": str(gen_report.id), "template": template.name},
    )

    await session.refresh(gen_report)
    return _enrich_document_response(gen_report)


async def _get_active_template(body: OperationDocumentCreate, session: AsyncSession) -> ReportTemplate:
    """Valida e retorna o template ativo."""
    tpl_res = await session.execute(
        select(ReportTemplate).where(
            ReportTemplate.id == body.template_id,
            ReportTemplate.deleted_at.is_(None),
            ReportTemplate.is_active == True,  # noqa: E712
        )
    )
    template: ReportTemplate | None = tpl_res.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo não encontrado ou inativo.")
    if not template.file_path:
        raise HTTPException(status_code=422, detail="O modelo selecionado não possui arquivo DOCX.")
    return template


# ── Pré-visualização de Operação ─────────────────────────────────
@router.post(
    "/operations/{operation_id}/generate-document/preview",
    response_model=OperationDocumentPreviewResponse,
)
async def preview_operation_document(
    operation_id: uuid.UUID,
    body: OperationDocumentCreate,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """Retorna os dados da operação que serão preenchidos no documento."""
    try:
        ctx = await build_operation_context(
            session=session,
            operation_id=operation_id,
            report_number=body.report_number,
            expert_name=body.expert_name,
            emission_date=body.emission_date,
            observations=body.observations,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return OperationDocumentPreviewResponse(
        report_number=ctx["report_number"],
        expert_name=ctx["expert_name"] or None,
        emission_date=ctx["emission_date"] or None,
        operation_name=ctx["operation_name"] or None,
        procedure_number=ctx["procedure_number"] or None,
        responsible_unit=ctx["responsible_unit"] or None,
        start_date=ctx["start_date"] or None,
        end_date=ctx["end_date"] or None,
        operation_status=ctx["operation_status"] or None,
        total_targets=ctx["total_targets"] or None,
        total_devices=ctx["total_devices"] or None,
        observations=ctx["observations"] or None,
    )


# ── Geração de Documento de Operação ─────────────────────────────
@router.post(
    "/operations/{operation_id}/generate-document",
    response_model=GeneratedDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_operation_document(
    operation_id: uuid.UUID,
    body: OperationDocumentCreate,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """Gera automaticamente um documento DOCX+PDF para uma operação."""
    template = await _get_active_template(body, session)

    try:
        ctx = await build_operation_context(
            session=session,
            operation_id=operation_id,
            report_number=body.report_number,
            expert_name=body.expert_name,
            emission_date=body.emission_date,
            observations=body.observations,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return await _generate_document_from_context(
        ctx=ctx,
        body=body,
        source_type="operation",
        operation_id=operation_id,
        target_id=None,
        current_user=current_user,
        session=session,
        template=template,
    )


# ── Pré-visualização de Alvo ──────────────────────────────────────
@router.post(
    "/targets/{target_id}/generate-document/preview",
    response_model=TargetDocumentPreviewResponse,
)
async def preview_target_document(
    target_id: uuid.UUID,
    body: OperationDocumentCreate,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """Retorna os dados do alvo que serão preenchidos no documento."""
    try:
        ctx = await build_target_context(
            session=session,
            target_id=target_id,
            report_number=body.report_number,
            expert_name=body.expert_name,
            emission_date=body.emission_date,
            observations=body.observations,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return TargetDocumentPreviewResponse(
        report_number=ctx["report_number"],
        expert_name=ctx["expert_name"] or None,
        emission_date=ctx["emission_date"] or None,
        target_name=ctx["target_name"] or None,
        target_cpf=ctx["target_cpf"] or None,
        target_rg=ctx["target_rg"] or None,
        target_nickname=ctx["target_nickname"] or None,
        target_birth_date=ctx["target_birth_date"] or None,
        target_address=ctx["target_address"] or None,
        total_devices=ctx["total_devices"] or None,
        operation_name=ctx["operation_name"] or None,
        procedure_number=ctx["procedure_number"] or None,
        responsible_unit=ctx["responsible_unit"] or None,
        observations=ctx["observations"] or None,
    )


# ── Geração de Documento de Alvo ──────────────────────────────────
@router.post(
    "/targets/{target_id}/generate-document",
    response_model=GeneratedDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_target_document(
    target_id: uuid.UUID,
    body: OperationDocumentCreate,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """Gera automaticamente um documento DOCX+PDF para um alvo."""
    template = await _get_active_template(body, session)

    # Recupera operation_id do alvo para auditoria
    target_res = await session.execute(
        select(Target).where(Target.id == target_id, Target.deleted_at.is_(None))
    )
    target: Target | None = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Alvo não encontrado.")

    try:
        ctx = await build_target_context(
            session=session,
            target_id=target_id,
            report_number=body.report_number,
            expert_name=body.expert_name,
            emission_date=body.emission_date,
            observations=body.observations,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return await _generate_document_from_context(
        ctx=ctx,
        body=body,
        source_type="target",
        operation_id=target.operation_id,
        target_id=target_id,
        current_user=current_user,
        session=session,
        template=template,
    )


# ── Histórico de documentos por operação ─────────────────────────
@router.get(
    "/operations/{operation_id}/generated-documents",
    response_model=list[GeneratedDocumentResponse],
)
async def list_operation_documents(
    operation_id: uuid.UUID,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """Lista o histórico de documentos gerados para uma operação."""
    result = await session.execute(
        select(GeneratedReport)
        .where(
            GeneratedReport.operation_id == operation_id,
            GeneratedReport.source_type == "operation",
        )
        .order_by(GeneratedReport.created_at.desc())
    )
    docs = result.scalars().all()
    return [_enrich_document_response(d) for d in docs]


# ── Histórico de documentos por alvo ─────────────────────────────
@router.get(
    "/targets/{target_id}/generated-documents",
    response_model=list[GeneratedDocumentResponse],
)
async def list_target_documents(
    target_id: uuid.UUID,
    current_user: ExpertOrAnalystOrAdmin,
    session: AsyncSession = Depends(get_async_session),
):
    """Lista o histórico de documentos gerados para um alvo."""
    result = await session.execute(
        select(GeneratedReport)
        .where(
            GeneratedReport.target_id == target_id,
            GeneratedReport.source_type == "target",
        )
        .order_by(GeneratedReport.created_at.desc())
    )
    docs = result.scalars().all()
    return [_enrich_document_response(d) for d in docs]
