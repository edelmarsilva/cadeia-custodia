"""Gestão de Alvos e Histórico de Alvos."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.database import get_async_session
from app.models.operation_model import Operation
from app.models.target_model import Target
from app.schemas.common_schema import MessageResponse, PaginatedResponse
from app.schemas.schemas import (
    TargetCreate,
    TargetHistoryResult,
    TargetResponse,
    TargetSearchResult,
    TargetUpdate,
)
from app.services import audit_service

router = APIRouter(tags=["Alvos"])


@router.get("/operations/{operation_id}/targets", response_model=PaginatedResponse[TargetResponse])
async def list_targets(
    operation_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
):
    offset = (page - 1) * page_size
    stmt = select(Target).where(Target.operation_id == operation_id, Target.deleted_at.is_(None))
    count_stmt = (
        select(func.count()).select_from(Target)
        .where(Target.operation_id == operation_id, Target.deleted_at.is_(None))
    )
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Target.full_name.ilike(like) | Target.cpf.ilike(like))
        count_stmt = count_stmt.where(Target.full_name.ilike(like) | Target.cpf.ilike(like))

    total = (await session.execute(count_stmt)).scalar_one()
    result = await session.execute(
        stmt.order_by(Target.full_name).offset(offset).limit(page_size)
    )
    return PaginatedResponse(
        items=[TargetResponse.model_validate(t) for t in result.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post(
    "/operations/{operation_id}/targets",
    response_model=TargetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_target(
    operation_id: uuid.UUID,
    body: TargetCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    op_exists = await session.execute(
        select(Operation).where(Operation.id == operation_id, Operation.deleted_at.is_(None))
    )
    if not op_exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    target = Target(
        operation_id=operation_id,
        created_by=uuid.UUID(current_user["sub"]),
        **body.model_dump(),
    )
    session.add(target)
    await session.flush()
    await audit_service.log_action(
        session,
        action="target_created",
        entity_type="target",
        entity_id=str(target.id),
        description=f"Alvo '{target.full_name}' criado na operação {operation_id}",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(target)
    return TargetResponse.model_validate(target)


@router.get("/targets/{target_id}", response_model=TargetResponse)
async def get_target(
    target_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Target).where(Target.id == target_id, Target.deleted_at.is_(None))
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Alvo não encontrado.")
    return TargetResponse.model_validate(target)


@router.patch("/targets/{target_id}", response_model=TargetResponse)
async def update_target(
    target_id: uuid.UUID,
    body: TargetUpdate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Target).where(Target.id == target_id, Target.deleted_at.is_(None))
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Alvo não encontrado.")

    old_data = {"full_name": target.full_name}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(target, field, value)

    await audit_service.log_action(
        session,
        action="target_updated",
        entity_type="target",
        entity_id=str(target_id),
        old_value=old_data,
        new_value=body.model_dump(exclude_unset=True),
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(target)
    return TargetResponse.model_validate(target)


@router.delete("/targets/{target_id}", response_model=MessageResponse)
async def delete_target(
    target_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Target).where(Target.id == target_id, Target.deleted_at.is_(None))
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Alvo não encontrado.")

    target.soft_delete()
    await audit_service.log_action(
        session,
        action="target_deleted",
        entity_type="target",
        entity_id=str(target_id),
        description=f"Alvo '{target.full_name}' removido (soft delete)",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Alvo removido com sucesso.")


# ── Pesquisa Global de Alvos ──────────────────────────────────────

@router.get("/targets/search", response_model=PaginatedResponse[TargetSearchResult])
async def search_targets(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    q: str | None = None,
    cpf: str | None = None,
    nickname: str | None = None,
    operation_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 30,
):
    """Pesquisa global de Alvos por nome, apelido ou CPF.

    Parâmetros:
    - q: busca ampla — nome completo, nome social ou apelido
    - cpf: busca por CPF (parcial)
    - nickname: busca por apelido/vulgo (parcial)
    - operation_id: filtrar por operação específica (opcional)
    """
    if not any([q, cpf, nickname]):
        raise HTTPException(
            status_code=400,
            detail="Informe ao menos um parâmetro: q (nome/apelido), cpf ou nickname.",
        )

    filters = [Target.deleted_at.is_(None)]

    if q:
        like = f"%{q}%"
        filters.append(
            or_(
                Target.full_name.ilike(like),
                Target.social_name.ilike(like),
                Target.nickname.ilike(like),
            )
        )
    if cpf:
        filters.append(Target.cpf.ilike(f"%{cpf}%"))
    if nickname:
        filters.append(Target.nickname.ilike(f"%{nickname}%"))
    if operation_id:
        filters.append(Target.operation_id == operation_id)

    offset = (page - 1) * page_size

    total = (await session.execute(
        select(func.count()).select_from(Target).where(*filters)
    )).scalar_one()

    result = await session.execute(
        select(Target, Operation)
        .join(Operation, Target.operation_id == Operation.id)
        .where(*filters)
        .order_by(Target.full_name)
        .offset(offset)
        .limit(page_size)
    )
    rows = result.all()

    items = [
        TargetSearchResult(
            id=t.id,
            operation_id=t.operation_id,
            operation_name=op.name,
            operation_status=op.status,
            full_name=t.full_name,
            social_name=t.social_name,
            nickname=t.nickname,
            cpf=t.cpf,
            rg=t.rg,
            person_type=t.person_type,
            birth_date=t.birth_date,
            created_at=t.created_at,
        )
        for t, op in rows
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


# ── Histórico de Alvos (busca cross-operação) ─────────────────────

@router.get("/targets/history/search", response_model=list[TargetHistoryResult])
async def search_target_history(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    q: str | None = None,
    cpf: str | None = None,
    rg: str | None = None,
    nickname: str | None = None,
    limit: int = 50,
):
    """Busca histórica de Alvos em todas as Operações.

    Parâmetros de busca (ao menos um deve ser informado):
    - q: busca ampla por nome completo, nome social ou apelido
    - cpf: busca exata ou parcial por CPF
    - rg: busca por RG
    - nickname: busca por apelido/vulgo
    """
    if not any([q, cpf, rg, nickname]):
        raise HTTPException(
            status_code=422,
            detail="Informe ao menos um parâmetro de busca: q, cpf, rg ou nickname.",
        )

    conditions = [Target.deleted_at.is_(None)]
    filters = []
    if q:
        like = f"%{q}%"
        filters.append(
            or_(
                Target.full_name.ilike(like),
                Target.social_name.ilike(like),
                Target.nickname.ilike(like),
            )
        )
    if cpf:
        filters.append(Target.cpf.ilike(f"%{cpf}%"))
    if rg:
        filters.append(Target.rg.ilike(f"%{rg}%"))
    if nickname:
        filters.append(Target.nickname.ilike(f"%{nickname}%"))

    if filters:
        conditions.append(or_(*filters))

    result = await session.execute(
        select(Target, Operation)
        .join(Operation, Target.operation_id == Operation.id)
        .where(*conditions, Operation.deleted_at.is_(None))
        .order_by(Target.full_name, Operation.created_at.desc())
        .limit(limit)
    )
    rows = result.all()

    return [
        TargetHistoryResult(
            target_id=t.id,
            full_name=t.full_name,
            social_name=t.social_name,
            nickname=t.nickname,
            cpf=t.cpf,
            rg=t.rg,
            person_type=t.person_type,
            birth_date=t.birth_date,
            operation_id=op.id,
            operation_name=op.name,
            operation_code=op.procedure_number,
            operation_status=op.status,
            registered_at=t.created_at,
        )
        for t, op in rows
    ]


@router.get("/targets/{target_id}/history", response_model=list[TargetHistoryResult])
async def get_target_history(
    target_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Retorna todas as aparições históricas de um Alvo em Operações.

    Busca por CPF, RG e nome completo do alvo base para encontrar registros
    correspondentes em outras Operações.
    """
    base = (await session.execute(
        select(Target).where(Target.id == target_id, Target.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not base:
        raise HTTPException(status_code=404, detail="Alvo não encontrado.")

    # Build match conditions using available identifiers
    match_conditions = [Target.full_name.ilike(f"%{base.full_name}%")]
    if base.cpf:
        match_conditions.append(Target.cpf == base.cpf)
    if base.rg:
        match_conditions.append(Target.rg == base.rg)

    result = await session.execute(
        select(Target, Operation)
        .join(Operation, Target.operation_id == Operation.id)
        .where(
            or_(*match_conditions),
            Target.deleted_at.is_(None),
            Operation.deleted_at.is_(None),
        )
        .order_by(Operation.created_at.desc())
    )

    return [
        TargetHistoryResult(
            target_id=t.id,
            full_name=t.full_name,
            social_name=t.social_name,
            nickname=t.nickname,
            cpf=t.cpf,
            rg=t.rg,
            person_type=t.person_type,
            birth_date=t.birth_date,
            operation_id=op.id,
            operation_name=op.name,
            operation_code=op.procedure_number,
            operation_status=op.status,
            registered_at=t.created_at,
        )
        for t, op in result.all()
    ]

