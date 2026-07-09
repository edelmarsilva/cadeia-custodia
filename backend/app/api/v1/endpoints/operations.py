"""Gestão de Operações."""
import logging
import uuid

from fastapi import APIRouter, Depends, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.deps import AdminOnly, CurrentUser, require_op_admin_or_global_admin
from app.db.database import get_async_session
from app.models.custody_model import CustodyMovement
from app.models.device_model import Device
from app.models.document_model import Document
from app.models.operation_model import Operation
from app.models.operation_user_model import OperationUser
from app.models.report_model import ExpertReport
from app.models.target_model import Target
from app.models.user_model import User
from app.schemas.common_schema import MessageResponse, PaginatedResponse
from app.schemas.schemas import (
    DocumentCreate,
    DocumentResponse,
    OperationCreate,
    OperationDashboard,
    OperationResponse,
    OperationUpdate,
    OperationUserAssign,
    OperationUserResponse,
    SetOpAdminBody,
    UserResponse,
)
from app.services import audit_service, storage_service

settings = get_settings()
router = APIRouter(prefix="/operations", tags=["Operações"])
logger = logging.getLogger(__name__)


@router.get("", response_model=PaginatedResponse[OperationResponse])
async def list_operations(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    search: str | None = None,
):
    offset = (page - 1) * page_size
    stmt = select(Operation).where(Operation.deleted_at.is_(None))
    count_stmt = select(func.count()).select_from(Operation).where(Operation.deleted_at.is_(None))

    # Non-admin users only see operations they are assigned to
    if current_user.get("role") != "admin":
        user_uuid = uuid.UUID(current_user["sub"])
        assigned_ids = select(OperationUser.operation_id).where(
            OperationUser.user_id == user_uuid
        )
        stmt = stmt.where(Operation.id.in_(assigned_ids))
        count_stmt = count_stmt.where(Operation.id.in_(assigned_ids))

    if status:
        stmt = stmt.where(Operation.status == status)
        count_stmt = count_stmt.where(Operation.status == status)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Operation.name.ilike(like) | Operation.procedure_number.ilike(like))
        count_stmt = count_stmt.where(Operation.name.ilike(like) | Operation.procedure_number.ilike(like))

    total = (await session.execute(count_stmt)).scalar_one()
    result = await session.execute(
        stmt.order_by(Operation.created_at.desc()).offset(offset).limit(page_size)
    )
    ops = result.scalars().all()
    return PaginatedResponse(
        items=[OperationResponse.model_validate(o) for o in ops],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
async def create_operation(
    body: OperationCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    user_uuid = uuid.UUID(current_user["sub"])
    op = Operation(**body.model_dump(), created_by=user_uuid)
    session.add(op)
    await session.flush()

    # Auto-assign creator to the operation (non-admins need it to see it)
    assignment = OperationUser(
        operation_id=op.id,
        user_id=user_uuid,
        assigned_by=user_uuid,
    )
    session.add(assignment)

    await audit_service.log_action(
        session,
        action="operation_created",
        entity_type="operation",
        entity_id=str(op.id),
        description=f"Operação '{op.name}' criada",
        user_id=user_uuid,
        username=current_user["username"],
    )
    await session.refresh(op)
    return OperationResponse.model_validate(op)


@router.get("/{operation_id}", response_model=OperationDashboard)
async def get_operation(
    operation_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Operation).where(Operation.id == operation_id, Operation.deleted_at.is_(None))
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    # Dashboard metrics
    total_targets = (await session.execute(
        select(func.count()).select_from(Target).where(Target.operation_id == operation_id, Target.deleted_at.is_(None))
    )).scalar_one()

    devices_result = await session.execute(
        select(Device).where(Device.operation_id == operation_id, Device.deleted_at.is_(None))
    )
    devices = devices_result.scalars().all()
    total_devices = len(devices)
    smartphones = sum(1 for d in devices if d.device_type == "smartphone")
    computers = sum(1 for d in devices if d.device_type in ("notebook", "desktop", "server"))
    pendrives = sum(1 for d in devices if d.device_type == "pendrive")
    storage_devs = sum(1 for d in devices if d.device_type in ("hd", "ssd", "memory_card"))
    in_analysis = sum(1 for d in devices if d.status == "in_analysis")
    in_custody = sum(1 for d in devices if d.status == "in_custody")

    # Devices with at least one report
    device_ids = [d.id for d in devices]
    with_report = 0
    if device_ids:
        with_report = (await session.execute(
            select(func.count(func.distinct(ExpertReport.device_id))).where(
                ExpertReport.device_id.in_(device_ids), ExpertReport.deleted_at.is_(None)
            )
        )).scalar_one()

    movements_count = 0
    if device_ids:
        movements_count = (await session.execute(
            select(func.count()).select_from(CustodyMovement).where(
                CustodyMovement.device_id.in_(device_ids)
            )
        )).scalar_one()

    return OperationDashboard(
        operation=OperationResponse.model_validate(op),
        total_targets=total_targets,
        total_devices=total_devices,
        smartphones=smartphones,
        computers=computers,
        pendrives=pendrives,
        storage_devices=storage_devs,
        in_analysis=in_analysis,
        with_report=with_report,
        in_custody=in_custody,
        movements_count=movements_count,
    )


@router.patch("/{operation_id}", response_model=OperationResponse)
async def update_operation(
    operation_id: uuid.UUID,
    body: OperationUpdate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Operation).where(Operation.id == operation_id, Operation.deleted_at.is_(None))
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    # Admin global OU op_admin desta operação podem editar
    if current_user.get("role") != "admin":
        user_uuid = uuid.UUID(current_user["sub"])
        op_admin_entry = (await session.execute(
            select(OperationUser).where(
                OperationUser.operation_id == operation_id,
                OperationUser.user_id == user_uuid,
                OperationUser.is_op_admin.is_(True),
            )
        )).scalar_one_or_none()
        if not op_admin_entry:
            raise HTTPException(
                status_code=403,
                detail="Apenas o administrador global ou o administrador desta operação pode editar seus dados.",
            )

    old_data = {"status": op.status, "name": op.name}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(op, field, value)

    await audit_service.log_action(
        session,
        action="operation_updated",
        entity_type="operation",
        entity_id=str(operation_id),
        old_value=old_data,
        new_value=body.model_dump(exclude_unset=True),
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(op)
    return OperationResponse.model_validate(op)


@router.delete("/{operation_id}", response_model=MessageResponse)
async def archive_operation(
    operation_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Operation).where(Operation.id == operation_id, Operation.deleted_at.is_(None))
    )
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    op.soft_delete()
    op.status = "archived"
    await audit_service.log_action(
        session,
        action="operation_archived",
        entity_type="operation",
        entity_id=str(operation_id),
        description=f"Operação '{op.name}' arquivada",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Operação arquivada com sucesso.")


# ── Documentos da Operação ────────────────────────────────────
@router.get("/{operation_id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    operation_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Document).where(
            Document.operation_id == operation_id, Document.deleted_at.is_(None)
        ).order_by(Document.created_at.desc())
    )
    out = []
    for d in result.scalars().all():
        resp = DocumentResponse.model_validate(d)
        if d.file_path:
            try:
                resp.file_url = storage_service.get_presigned_url(
                    bucket=settings.MINIO_BUCKET_DOCUMENTS,
                    object_name=d.file_path,
                    expires_seconds=7200,
                )
            except Exception as exc:
                logger.warning("Falha ao gerar URL pre-assinada para documento %s: %s", d.id, exc)
                resp.file_url = None
        out.append(resp)
    return out


@router.post(
    "/{operation_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    operation_id: uuid.UUID,
    current_user: CurrentUser,
    title: str = Form(...),
    doc_type: str = Form("other"),
    description: str | None = Form(None),
    file: UploadFile | None = None,
    session: AsyncSession = Depends(get_async_session),
):
    file_path = None
    file_name = None
    if file:
        data = await file.read()
        obj_name = storage_service.upload_file(
            bucket=settings.MINIO_BUCKET_DOCUMENTS,
            data=data,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
        )
        file_path = obj_name
        file_name = file.filename

    doc = Document(
        operation_id=operation_id,
        title=title,
        doc_type=doc_type,
        description=description,
        file_path=file_path,
        file_name=file_name,
        created_by=uuid.UUID(current_user["sub"]),
    )
    session.add(doc)
    await session.flush()
    await audit_service.log_action(
        session,
        action="document_uploaded",
        entity_type="document",
        entity_id=str(doc.id),
        description=f"Documento '{title}' anexado à operação {operation_id}",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(doc)
    resp = DocumentResponse.model_validate(doc)
    if doc.file_path:
        try:
            resp.file_url = storage_service.get_presigned_url(
                bucket=settings.MINIO_BUCKET_DOCUMENTS,
                object_name=doc.file_path,
                expires_seconds=7200,
            )
        except Exception as exc:
            logger.warning("Falha ao gerar URL pre-assinada para documento recém-enviado: %s", exc)
            resp.file_url = None
    return resp


@router.delete(
    "/documents/{document_id}",
    response_model=MessageResponse,
)
async def delete_document(
    document_id: uuid.UUID,
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
):
    """Remove um documento. Restrito a administradores."""
    result = await session.execute(
        select(Document).where(Document.id == document_id, Document.deleted_at.is_(None))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado.")

    operation_id = doc.operation_id
    file_path    = doc.file_path
    doc.soft_delete()

    # Remove o arquivo físico do MinIO após soft-delete
    if file_path:
        try:
            storage_service.delete_object(settings.MINIO_BUCKET_DOCUMENTS, file_path)
        except Exception as exc:
            logger.warning("Falha ao remover arquivo de documento do storage %s: %s", document_id, exc)

    await audit_service.log_action(
        session,
        action="document_deleted",
        entity_type="document",
        entity_id=str(document_id),
        description=f"Documento '{doc.title}' excluído por administrador",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Documento removido.")


# ── Equipe da Operação ────────────────────────────────────────────
@router.get("/{operation_id}/users", response_model=list[OperationUserResponse])
async def list_operation_users(
    operation_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Lista todos os usuários atribuídos à operação."""
    result = await session.execute(
        select(OperationUser)
        .options(selectinload(OperationUser.user))
        .where(OperationUser.operation_id == operation_id)
        .order_by(OperationUser.assigned_at)
    )
    entries = result.scalars().all()
    out = []
    for e in entries:
        r = OperationUserResponse.model_validate(e)
        if e.user:
            r.user = UserResponse.model_validate(e.user)
        out.append(r)
    return out


@router.post(
    "/{operation_id}/users",
    response_model=OperationUserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def assign_user_to_operation(
    operation_id: uuid.UUID,
    body: OperationUserAssign,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Atribui um usuário à operação.

    Permitido para: admin global e op_admin da operação.
    """
    # Verifica se o solicitante tem permissão (admin global ou op_admin)
    if current_user.get("role") != "admin":
        requester_uuid = uuid.UUID(current_user["sub"])
        op_admin_entry = (await session.execute(
            select(OperationUser).where(
                OperationUser.operation_id == operation_id,
                OperationUser.user_id == requester_uuid,
                OperationUser.is_op_admin.is_(True),
            )
        )).scalar_one_or_none()
        if not op_admin_entry:
            raise HTTPException(
                status_code=403,
                detail="Apenas o administrador global ou o administrador desta operação pode atribuir membros.",
            )

    # Verifica operação
    op = (await session.execute(
        select(Operation).where(Operation.id == operation_id, Operation.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    # Verifica usuário
    user = (await session.execute(
        select(User).where(User.id == body.user_id, User.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Verifica duplicidade
    existing = (await session.execute(
        select(OperationUser).where(
            OperationUser.operation_id == operation_id,
            OperationUser.user_id == body.user_id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Usuário já atribuído a esta operação.")

    assigner_uuid = uuid.UUID(current_user["sub"])
    entry = OperationUser(
        operation_id=operation_id,
        user_id=body.user_id,
        assigned_by=assigner_uuid,
        is_op_admin=body.is_op_admin,
    )
    session.add(entry)
    await session.flush()

    await audit_service.log_action(
        session,
        action="operation_user_assigned",
        entity_type="operation",
        entity_id=str(operation_id),
        description=f"Usuário {user.username} atribuído à operação {op.name}{'(op_admin)' if body.is_op_admin else ''}",
        user_id=assigner_uuid,
        username=current_user["username"],
    )
    await session.refresh(entry)
    await session.refresh(entry, ["user"])
    r = OperationUserResponse.model_validate(entry)
    r.user = UserResponse.model_validate(entry.user)
    return r


@router.delete("/{operation_id}/users/{user_id}", response_model=MessageResponse)
async def remove_user_from_operation(
    operation_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Remove atribuição de um usuário da operação.

    Permitido para: admin global e op_admin da operação.
    Op_admin não pode remover a si mesmo se for o único op_admin.
    """
    # Verifica permissão
    if current_user.get("role") != "admin":
        requester_uuid = uuid.UUID(current_user["sub"])
        op_admin_entry = (await session.execute(
            select(OperationUser).where(
                OperationUser.operation_id == operation_id,
                OperationUser.user_id == requester_uuid,
                OperationUser.is_op_admin.is_(True),
            )
        )).scalar_one_or_none()
        if not op_admin_entry:
            raise HTTPException(
                status_code=403,
                detail="Apenas o administrador global ou o administrador desta operação pode remover membros.",
            )

    entry = (await session.execute(
        select(OperationUser).where(
            OperationUser.operation_id == operation_id,
            OperationUser.user_id == user_id,
        )
    )).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada.")

    # Impede que o único op_admin se remova
    if entry.is_op_admin:
        other_admins_count = (await session.execute(
            select(func.count()).select_from(OperationUser).where(
                OperationUser.operation_id == operation_id,
                OperationUser.is_op_admin.is_(True),
                OperationUser.user_id != user_id,
            )
        )).scalar_one()
        if other_admins_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Não é possível remover o único administrador da operação. Promova outro membro primeiro.",
            )

    await session.delete(entry)
    await audit_service.log_action(
        session,
        action="operation_user_removed",
        entity_type="operation",
        entity_id=str(operation_id),
        description=f"Usuário {user_id} removido da operação {operation_id}",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Usuário removido da operação com sucesso.")


@router.patch("/{operation_id}/users/{user_id}/set-op-admin", response_model=OperationUserResponse)
async def set_operation_admin(
    operation_id: uuid.UUID,
    user_id: uuid.UUID,
    body: SetOpAdminBody,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Promove ou rebaixa um membro como administrador desta operação.

    Permitido para: admin global e op_admin da operação.
    """
    # Verifica permissão
    if current_user.get("role") != "admin":
        requester_uuid = uuid.UUID(current_user["sub"])
        op_admin_entry = (await session.execute(
            select(OperationUser).where(
                OperationUser.operation_id == operation_id,
                OperationUser.user_id == requester_uuid,
                OperationUser.is_op_admin.is_(True),
            )
        )).scalar_one_or_none()
        if not op_admin_entry:
            raise HTTPException(
                status_code=403,
                detail="Apenas o administrador global ou o administrador desta operação pode alterar permissões.",
            )

    entry = (await session.execute(
        select(OperationUser).where(
            OperationUser.operation_id == operation_id,
            OperationUser.user_id == user_id,
        ).options(selectinload(OperationUser.user))
    )).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Usuário não encontrado nesta operação.")

    # Impede que o único op_admin se rebaixe
    if entry.is_op_admin and not body.is_op_admin:
        other_admins_count = (await session.execute(
            select(func.count()).select_from(OperationUser).where(
                OperationUser.operation_id == operation_id,
                OperationUser.is_op_admin.is_(True),
                OperationUser.user_id != user_id,
            )
        )).scalar_one()
        if other_admins_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Não é possível rebaixar o único administrador da operação. Promova outro membro primeiro.",
            )

    old_value = entry.is_op_admin
    entry.is_op_admin = body.is_op_admin

    action_label = "promovido a administrador" if body.is_op_admin else "rebaixado de administrador"
    await audit_service.log_action(
        session,
        action="operation_user_admin_changed",
        entity_type="operation",
        entity_id=str(operation_id),
        description=f"Usuário {entry.user.username if entry.user else user_id} {action_label} na operação {operation_id}",
        old_value={"is_op_admin": old_value},
        new_value={"is_op_admin": body.is_op_admin},
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.flush()
    await session.refresh(entry)
    r = OperationUserResponse.model_validate(entry)
    if entry.user:
        r.user = UserResponse.model_validate(entry.user)
    return r

