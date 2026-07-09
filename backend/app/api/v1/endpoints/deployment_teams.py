"""Equipes de Deflagração — CRUD, membros e atribuição de alvos."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import AdminOnly, CurrentUser
from app.db.database import get_async_session
from app.models.deployment_team_member_model import DeploymentTeamMember
from app.models.deployment_team_model import DeploymentTeam
from app.models.deployment_team_target_model import DeploymentTeamTarget
from app.models.operation_model import Operation
from app.models.target_model import Target
from app.models.user_model import User
from app.schemas.common_schema import MessageResponse
from app.schemas.schemas import (
    DeploymentTeamCreate,
    DeploymentTeamMemberAssign,
    DeploymentTeamMemberResponse,
    DeploymentTeamResponse,
    DeploymentTeamTargetAssign,
    DeploymentTeamTargetResponse,
    DeploymentTeamUpdate,
    TargetResponse,
    UserResponse,
)
from app.services import audit_service

router = APIRouter(tags=["Equipes de Deflagração"])


def _resolve_member_response(m: DeploymentTeamMember) -> DeploymentTeamMemberResponse:
    mr = DeploymentTeamMemberResponse.model_validate(m)
    if m.user:
        mr.user = UserResponse.model_validate(m.user)
    return mr


def _resolve_team_response(team: DeploymentTeam) -> DeploymentTeamResponse:
    """Converte o modelo ORM em schema de resposta com membros e alvos."""
    resp = DeploymentTeamResponse.model_validate(team)
    resp.members = [_resolve_member_response(m) for m in team.members]
    resp.target_assignments = []
    for ta in team.target_assignments:
        tar = DeploymentTeamTargetResponse.model_validate(ta)
        if ta.target:
            tar.target = TargetResponse.model_validate(ta.target)
        resp.target_assignments.append(tar)
    return resp


# ── CRUD das Equipes ──────────────────────────────────────────────

@router.get("/operations/{operation_id}/teams", response_model=list[DeploymentTeamResponse])
async def list_teams(
    operation_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Lista todas as Equipes de Deflagração de uma Operação."""
    result = await session.execute(
        select(DeploymentTeam)
        .options(
            selectinload(DeploymentTeam.members).selectinload(DeploymentTeamMember.user),
            selectinload(DeploymentTeam.target_assignments).selectinload(DeploymentTeamTarget.target),
        )
        .where(
            DeploymentTeam.operation_id == operation_id,
            DeploymentTeam.deleted_at.is_(None),
        )
        .order_by(DeploymentTeam.name)
    )
    return [_resolve_team_response(t) for t in result.scalars().all()]


@router.post(
    "/operations/{operation_id}/teams",
    response_model=DeploymentTeamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_team(
    operation_id: uuid.UUID,
    body: DeploymentTeamCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Cria uma Equipe de Deflagração para a Operação."""
    op = (await session.execute(
        select(Operation).where(Operation.id == operation_id, Operation.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    team = DeploymentTeam(
        operation_id=operation_id,
        created_by=uuid.UUID(current_user["sub"]),
        **body.model_dump(),
    )
    session.add(team)
    await session.flush()
    await audit_service.log_action(
        session,
        action="deployment_team_created",
        entity_type="deployment_team",
        entity_id=str(team.id),
        description=f"Equipe '{team.name}' criada na operação {op.name}",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(team)
    result = await session.execute(
        select(DeploymentTeam)
        .options(
            selectinload(DeploymentTeam.members).selectinload(DeploymentTeamMember.user),
            selectinload(DeploymentTeam.target_assignments).selectinload(DeploymentTeamTarget.target),
        )
        .where(DeploymentTeam.id == team.id)
    )
    return _resolve_team_response(result.scalar_one())


@router.get("/operations/{operation_id}/teams/{team_id}", response_model=DeploymentTeamResponse)
async def get_team(
    operation_id: uuid.UUID,
    team_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Detalha uma Equipe de Deflagração."""
    result = await session.execute(
        select(DeploymentTeam)
        .options(
            selectinload(DeploymentTeam.members).selectinload(DeploymentTeamMember.user),
            selectinload(DeploymentTeam.target_assignments).selectinload(DeploymentTeamTarget.target),
        )
        .where(
            DeploymentTeam.id == team_id,
            DeploymentTeam.operation_id == operation_id,
            DeploymentTeam.deleted_at.is_(None),
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe não encontrada.")
    return _resolve_team_response(team)


@router.patch("/operations/{operation_id}/teams/{team_id}", response_model=DeploymentTeamResponse)
async def update_team(
    operation_id: uuid.UUID,
    team_id: uuid.UUID,
    body: DeploymentTeamUpdate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Atualiza dados de uma Equipe de Deflagração."""
    result = await session.execute(
        select(DeploymentTeam).where(
            DeploymentTeam.id == team_id,
            DeploymentTeam.operation_id == operation_id,
            DeploymentTeam.deleted_at.is_(None),
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe não encontrada.")

    old_name = team.name
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(team, field, value)

    await audit_service.log_action(
        session,
        action="deployment_team_updated",
        entity_type="deployment_team",
        entity_id=str(team_id),
        old_value={"name": old_name},
        new_value=body.model_dump(exclude_unset=True),
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.flush()
    result2 = await session.execute(
        select(DeploymentTeam)
        .options(
            selectinload(DeploymentTeam.members).selectinload(DeploymentTeamMember.user),
            selectinload(DeploymentTeam.target_assignments).selectinload(DeploymentTeamTarget.target),
        )
        .where(DeploymentTeam.id == team_id)
    )
    return _resolve_team_response(result2.scalar_one())


@router.delete("/operations/{operation_id}/teams/{team_id}", response_model=MessageResponse)
async def delete_team(
    operation_id: uuid.UUID,
    team_id: uuid.UUID,
    current_user: AdminOnly,
    session: AsyncSession = Depends(get_async_session),
):
    """Remove (soft delete) uma Equipe de Deflagração. Restrito a administradores."""
    result = await session.execute(
        select(DeploymentTeam).where(
            DeploymentTeam.id == team_id,
            DeploymentTeam.operation_id == operation_id,
            DeploymentTeam.deleted_at.is_(None),
        )
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe não encontrada.")

    team.soft_delete()
    await audit_service.log_action(
        session,
        action="deployment_team_deleted",
        entity_type="deployment_team",
        entity_id=str(team_id),
        description=f"Equipe '{team.name}' removida (soft delete)",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Equipe removida com sucesso.")


# ── Membros da Equipe ─────────────────────────────────────────────

@router.post(
    "/operations/{operation_id}/teams/{team_id}/members",
    response_model=DeploymentTeamMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    operation_id: uuid.UUID,
    team_id: uuid.UUID,
    body: DeploymentTeamMemberAssign,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Adiciona um membro à Equipe de Deflagração.

    Aceita:
    - user_id: UUID de usuário cadastrado no sistema.
    - member_name + (opcional) member_role: pessoa externa, sem conta.
    """
    team = (await session.execute(
        select(DeploymentTeam).where(
            DeploymentTeam.id == team_id,
            DeploymentTeam.operation_id == operation_id,
            DeploymentTeam.deleted_at.is_(None),
        )
    )).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe não encontrada.")

    user: User | None = None
    display_name: str

    if body.user_id:
        # ── Membro do sistema ──────────────────────────────────────
        user = (await session.execute(
            select(User).where(User.id == body.user_id, User.deleted_at.is_(None))
        )).scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")

        existing = (await session.execute(
            select(DeploymentTeamMember).where(
                DeploymentTeamMember.team_id == team_id,
                DeploymentTeamMember.user_id == body.user_id,
            )
        )).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Usuário já é membro desta equipe.")

        display_name = user.full_name
        member = DeploymentTeamMember(
            team_id=team_id,
            user_id=body.user_id,
            member_name=None,
            member_role=body.member_role,
            assigned_by=uuid.UUID(current_user["sub"]),
        )
    else:
        # ── Membro externo (nome livre) ────────────────────────────
        display_name = body.member_name  # type: ignore[assignment]
        member = DeploymentTeamMember(
            team_id=team_id,
            user_id=None,
            member_name=body.member_name,
            member_role=body.member_role,
            assigned_by=uuid.UUID(current_user["sub"]),
        )

    session.add(member)
    await session.flush()
    await audit_service.log_action(
        session,
        action="team_member_added",
        entity_type="deployment_team",
        entity_id=str(team_id),
        description=f"Membro '{display_name}' adicionado à equipe '{team.name}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(member)
    if member.user_id:
        await session.refresh(member, ["user"])
    return _resolve_member_response(member)


@router.delete(
    "/operations/{operation_id}/teams/{team_id}/members/{member_id}",
    response_model=MessageResponse,
)
async def remove_member(
    operation_id: uuid.UUID,
    team_id: uuid.UUID,
    member_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Remove um membro da Equipe de Deflagração pelo ID do registro."""
    team = (await session.execute(
        select(DeploymentTeam).where(
            DeploymentTeam.id == team_id,
            DeploymentTeam.operation_id == operation_id,
            DeploymentTeam.deleted_at.is_(None),
        )
    )).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe não encontrada.")

    member = (await session.execute(
        select(DeploymentTeamMember).where(
            DeploymentTeamMember.id == member_id,
            DeploymentTeamMember.team_id == team_id,
        )
    )).scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado nesta equipe.")

    display = member.display_name
    await session.delete(member)
    await audit_service.log_action(
        session,
        action="team_member_removed",
        entity_type="deployment_team",
        entity_id=str(team_id),
        description=f"Membro '{display}' removido da equipe '{team.name}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Membro removido da equipe com sucesso.")


# ── Alvos da Equipe ───────────────────────────────────────────────

@router.post(
    "/operations/{operation_id}/teams/{team_id}/targets",
    response_model=DeploymentTeamTargetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def assign_target_to_team(
    operation_id: uuid.UUID,
    team_id: uuid.UUID,
    body: DeploymentTeamTargetAssign,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Atribui um Alvo à Equipe de Deflagração.

    Validação: Alvo e Equipe devem pertencer à mesma Operação.
    """
    team = (await session.execute(
        select(DeploymentTeam).where(
            DeploymentTeam.id == team_id,
            DeploymentTeam.operation_id == operation_id,
            DeploymentTeam.deleted_at.is_(None),
        )
    )).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe não encontrada.")

    target = (await session.execute(
        select(Target).where(Target.id == body.target_id, Target.deleted_at.is_(None))
    )).scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Alvo não encontrado.")

    # ── Regra de negócio: equipe e alvo devem ser da mesma Operação ──
    if target.operation_id != team.operation_id:
        raise HTTPException(
            status_code=422,
            detail=(
                "Validação falhou: o Alvo pertence a uma Operação diferente da Equipe. "
                "Atribuição bloqueada — equipe e alvo devem estar na mesma Operação."
            ),
        )

    existing = (await session.execute(
        select(DeploymentTeamTarget).where(
            DeploymentTeamTarget.team_id == team_id,
            DeploymentTeamTarget.target_id == body.target_id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Alvo já atribuído a esta equipe.")

    assignment = DeploymentTeamTarget(
        team_id=team_id,
        target_id=body.target_id,
        assigned_by=uuid.UUID(current_user["sub"]),
    )
    session.add(assignment)
    await session.flush()
    await audit_service.log_action(
        session,
        action="team_target_assigned",
        entity_type="deployment_team",
        entity_id=str(team_id),
        description=f"Alvo '{target.full_name}' atribuído à equipe '{team.name}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(assignment)
    await session.refresh(assignment, ["target"])
    tar = DeploymentTeamTargetResponse.model_validate(assignment)
    tar.target = TargetResponse.model_validate(assignment.target)
    return tar


@router.delete(
    "/operations/{operation_id}/teams/{team_id}/targets/{target_id}",
    response_model=MessageResponse,
)
async def remove_target_from_team(
    operation_id: uuid.UUID,
    team_id: uuid.UUID,
    target_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Remove a atribuição de um Alvo à Equipe de Deflagração."""
    team = (await session.execute(
        select(DeploymentTeam).where(
            DeploymentTeam.id == team_id,
            DeploymentTeam.operation_id == operation_id,
            DeploymentTeam.deleted_at.is_(None),
        )
    )).scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Equipe não encontrada.")

    assignment = (await session.execute(
        select(DeploymentTeamTarget).where(
            DeploymentTeamTarget.team_id == team_id,
            DeploymentTeamTarget.target_id == target_id,
        )
    )).scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Alvo não está atribuído a esta equipe.")

    await session.delete(assignment)
    await audit_service.log_action(
        session,
        action="team_target_removed",
        entity_type="deployment_team",
        entity_id=str(team_id),
        description=f"Alvo {target_id} removido da equipe '{team.name}'",
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    return MessageResponse(message="Alvo removido da equipe com sucesso.")
