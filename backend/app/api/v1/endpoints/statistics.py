"""Relatórios Estatísticos — por Operação e Geral do Sistema."""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.database import get_async_session
from app.models.custody_model import CustodyMovement
from app.models.device_model import Device
from app.models.generated_report_model import GeneratedReport
from app.models.operation_model import Operation
from app.models.operation_user_model import OperationUser
from app.models.photo_model import DevicePhoto
from app.models.report_model import ExpertReport
from app.models.target_model import Target
from app.models.user_model import User

router = APIRouter(tags=["Estatísticas"])


def _fmt_date(d: Any) -> str | None:
    if d is None:
        return None
    try:
        return d.strftime("%d/%m/%Y")
    except Exception:
        return str(d)


@router.get("/stats/system")
async def system_stats(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    year: int | None = None,
):
    """Estatísticas gerais do sistema. Acessível por admin e auditor.

    Parâmetros:
    - year (opcional): filtra operações (e entidades relacionadas) pelo ano da
      data de início da operação. Quando ausente, retorna dados de todos os anos.
    """
    role = current_user.get("role", "")
    if role not in ("admin", "auditor"):
        raise HTTPException(status_code=403, detail="Apenas administradores e auditores podem acessar as estatísticas do sistema.")

    from sqlalchemy import extract

    # ── Anos disponíveis (para popular o seletor) ───────────────────────────
    years_rows = (await session.execute(
        select(func.extract("year", Operation.start_date).label("yr"))
        .where(Operation.deleted_at.is_(None), Operation.start_date.isnot(None))
        .group_by(func.extract("year", Operation.start_date))
        .order_by(func.extract("year", Operation.start_date).desc())
    )).all()
    # Inclui também operações sem start_date via created_at
    years_by_created = (await session.execute(
        select(func.extract("year", Operation.created_at).label("yr"))
        .where(Operation.deleted_at.is_(None), Operation.start_date.is_(None))
        .group_by(func.extract("year", Operation.created_at))
        .order_by(func.extract("year", Operation.created_at).desc())
    )).all()
    available_years = sorted(
        {int(r.yr) for r in years_rows if r.yr} | {int(r.yr) for r in years_by_created if r.yr},
        reverse=True,
    )

    # ── Filtro de operações por ano ─────────────────────────────────────────
    def op_year_filter(stmt):
        """Aplica filtro de ano (start_date ou created_at) à query de Operation."""
        if year is None:
            return stmt
        return stmt.where(
            (func.extract("year", Operation.start_date) == year)
            | (
                Operation.start_date.is_(None)
                & (func.extract("year", Operation.created_at) == year)
            )
        )

    # IDs das operações no filtro (para subqueries de entidades relacionadas)
    op_ids_stmt = op_year_filter(
        select(Operation.id).where(Operation.deleted_at.is_(None))
    )

    # ── Totais ─────────────────────────────────────────────────────────────
    op_base = select(func.count()).select_from(Operation).where(Operation.deleted_at.is_(None))
    total_ops = (await session.execute(op_year_filter(op_base))).scalar_one()

    # Targets e Devices são escopo da operação quando há filtro de ano
    if year is not None:
        total_targets = (await session.execute(
            select(func.count()).select_from(Target)
            .where(Target.deleted_at.is_(None), Target.operation_id.in_(op_ids_stmt))
        )).scalar_one()
        total_devices = (await session.execute(
            select(func.count()).select_from(Device)
            .where(Device.deleted_at.is_(None), Device.operation_id.in_(op_ids_stmt))
        )).scalar_one()
        dev_ids_stmt = select(Device.id).where(
            Device.deleted_at.is_(None), Device.operation_id.in_(op_ids_stmt)
        )
        total_movements = (await session.execute(
            select(func.count()).select_from(CustodyMovement)
            .where(CustodyMovement.device_id.in_(dev_ids_stmt))
        )).scalar_one()
        total_reports = (await session.execute(
            select(func.count()).select_from(ExpertReport)
            .where(ExpertReport.deleted_at.is_(None), ExpertReport.device_id.in_(dev_ids_stmt))
        )).scalar_one()
        total_generated = (await session.execute(
            select(func.count()).select_from(GeneratedReport)
            .where(GeneratedReport.operation_id.in_(op_ids_stmt))
        )).scalar_one()
        total_photos = (await session.execute(
            select(func.count()).select_from(DevicePhoto)
            .where(DevicePhoto.deleted_at.is_(None), DevicePhoto.device_id.in_(dev_ids_stmt))
        )).scalar_one()
    else:
        dev_ids_stmt = None
        total_targets = (await session.execute(select(func.count()).select_from(Target).where(Target.deleted_at.is_(None)))).scalar_one()
        total_devices = (await session.execute(select(func.count()).select_from(Device).where(Device.deleted_at.is_(None)))).scalar_one()
        total_movements = (await session.execute(select(func.count()).select_from(CustodyMovement))).scalar_one()
        total_reports = (await session.execute(select(func.count()).select_from(ExpertReport).where(ExpertReport.deleted_at.is_(None)))).scalar_one()
        total_generated = (await session.execute(select(func.count()).select_from(GeneratedReport))).scalar_one()
        total_photos = (await session.execute(select(func.count()).select_from(DevicePhoto).where(DevicePhoto.deleted_at.is_(None)))).scalar_one()

    # Usuários não se filtram por ano (são globais)
    total_users = (await session.execute(select(func.count()).select_from(User).where(User.deleted_at.is_(None)))).scalar_one()

    # ── Operações por status (com filtro) ──────────────────────────────────
    ops_by_status_base = (
        select(Operation.status, func.count().label("cnt"))
        .where(Operation.deleted_at.is_(None))
        .group_by(Operation.status)
    )
    ops_by_status_rows = (await session.execute(op_year_filter(ops_by_status_base))).all()
    ops_by_status = [{"status": r.status, "count": r.cnt} for r in ops_by_status_rows]

    # ── Dispositivos por tipo (com filtro de ano) ──────────────────────────
    if year is not None:
        dev_type_where = (Device.deleted_at.is_(None), Device.operation_id.in_(op_ids_stmt))
        dev_status_where = dev_type_where
    else:
        dev_type_where = (Device.deleted_at.is_(None),)
        dev_status_where = (Device.deleted_at.is_(None),)

    dev_by_type_rows = (await session.execute(
        select(Device.device_type, func.count().label("cnt"))
        .where(*dev_type_where).group_by(Device.device_type).order_by(func.count().desc())
    )).all()
    devices_by_type = [{"type": r.device_type, "count": r.cnt} for r in dev_by_type_rows]

    dev_by_status_rows = (await session.execute(
        select(Device.status, func.count().label("cnt"))
        .where(*dev_status_where).group_by(Device.status).order_by(func.count().desc())
    )).all()
    devices_by_status = [{"status": r.status, "count": r.cnt} for r in dev_by_status_rows]

    # ── Movimentações por tipo (com filtro) ────────────────────────────────
    if year is not None and dev_ids_stmt is not None:
        mov_where = (CustodyMovement.device_id.in_(dev_ids_stmt),)
    else:
        mov_where = ()

    mov_by_type_rows = (await session.execute(
        select(CustodyMovement.movement_type, func.count().label("cnt"))
        .where(*mov_where).group_by(CustodyMovement.movement_type).order_by(func.count().desc())
    )).all()
    movements_by_type = [{"type": r.movement_type, "count": r.cnt} for r in mov_by_type_rows]

    # ── Top 5 operações por dispositivos (com filtro) ──────────────────────
    top_ops_base = (
        select(Operation.id, Operation.name, Operation.procedure_number, Operation.status, func.count(Device.id).label("device_count"))
        .outerjoin(Device, (Device.operation_id == Operation.id) & (Device.deleted_at.is_(None)))
        .where(Operation.deleted_at.is_(None))
        .group_by(Operation.id, Operation.name, Operation.procedure_number, Operation.status)
        .order_by(func.count(Device.id).desc())
        .limit(5)
    )
    top_ops_rows = (await session.execute(op_year_filter(top_ops_base))).all()

    top_operations = []
    for row in top_ops_rows:
        target_count = (await session.execute(
            select(func.count()).select_from(Target).where(Target.operation_id == row.id, Target.deleted_at.is_(None))
        )).scalar_one()
        top_operations.append({"id": str(row.id), "name": row.name, "procedure_number": row.procedure_number, "status": row.status, "devices": row.device_count, "targets": target_count})

    # ── Atividade recente (filtro: 28d ou ano inteiro se filtro ativo) ─────
    if year is not None and dev_ids_stmt is not None:
        recent_where = (CustodyMovement.device_id.in_(dev_ids_stmt),)
    else:
        cutoff = datetime.now(timezone.utc) - timedelta(days=28)
        recent_where = (CustodyMovement.movement_date >= cutoff,)

    recent_rows = (await session.execute(
        select(CustodyMovement.movement_date, CustodyMovement.movement_type, CustodyMovement.responsible_name)
        .where(*recent_where).order_by(CustodyMovement.movement_date.desc()).limit(10)
    )).all()
    recent_activity = [{"date": r.movement_date.isoformat(), "type": r.movement_type, "responsible": r.responsible_name} for r in recent_rows]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "year_filter": year,
        "available_years": available_years,
        "totals": {"operations": total_ops, "targets": total_targets, "devices": total_devices, "custody_movements": total_movements, "expert_reports": total_reports, "generated_documents": total_generated, "users": total_users, "photos": total_photos},
        "operations_by_status": ops_by_status,
        "devices_by_type": devices_by_type,
        "devices_by_status": devices_by_status,
        "movements_by_type": movements_by_type,
        "top_operations": top_operations,
        "recent_activity": recent_activity,
    }


@router.get("/operations/{operation_id}/stats")
async def operation_stats(
    operation_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Estatísticas detalhadas de uma operação específica."""
    role = current_user.get("role", "")
    if role != "admin":
        user_id = uuid.UUID(current_user["sub"])
        membership = (await session.execute(select(OperationUser).where(OperationUser.operation_id == operation_id, OperationUser.user_id == user_id))).scalar_one_or_none()
        if not membership:
            raise HTTPException(status_code=403, detail="Acesso negado a esta operação.")

    op = (await session.execute(select(Operation).where(Operation.id == operation_id, Operation.deleted_at.is_(None)))).scalar_one_or_none()
    if not op:
        raise HTTPException(status_code=404, detail="Operação não encontrada.")

    total_targets = (await session.execute(select(func.count()).select_from(Target).where(Target.operation_id == operation_id, Target.deleted_at.is_(None)))).scalar_one()
    total_devices = (await session.execute(select(func.count()).select_from(Device).where(Device.operation_id == operation_id, Device.deleted_at.is_(None)))).scalar_one()

    device_ids_stmt = select(Device.id).where(Device.operation_id == operation_id, Device.deleted_at.is_(None))

    total_movements = (await session.execute(select(func.count()).select_from(CustodyMovement).where(CustodyMovement.device_id.in_(device_ids_stmt)))).scalar_one()
    total_reports = (await session.execute(select(func.count()).select_from(ExpertReport).where(ExpertReport.device_id.in_(device_ids_stmt), ExpertReport.deleted_at.is_(None)))).scalar_one()
    total_photos = (await session.execute(select(func.count()).select_from(DevicePhoto).where(DevicePhoto.device_id.in_(device_ids_stmt), DevicePhoto.deleted_at.is_(None)))).scalar_one()
    total_generated = (await session.execute(select(func.count()).select_from(GeneratedReport).where(GeneratedReport.operation_id == operation_id))).scalar_one()

    dev_by_type_rows = (await session.execute(
        select(Device.device_type, func.count().label("cnt")).where(Device.operation_id == operation_id, Device.deleted_at.is_(None)).group_by(Device.device_type).order_by(func.count().desc())
    )).all()
    devices_by_type = [{"type": r.device_type, "count": r.cnt} for r in dev_by_type_rows]

    dev_by_status_rows = (await session.execute(
        select(Device.status, func.count().label("cnt")).where(Device.operation_id == operation_id, Device.deleted_at.is_(None)).group_by(Device.status).order_by(func.count().desc())
    )).all()
    devices_by_status = [{"status": r.status, "count": r.cnt} for r in dev_by_status_rows]

    mov_by_type_rows = (await session.execute(
        select(CustodyMovement.movement_type, func.count().label("cnt")).where(CustodyMovement.device_id.in_(device_ids_stmt)).group_by(CustodyMovement.movement_type).order_by(func.count().desc())
    )).all()
    movements_by_type = [{"type": r.movement_type, "count": r.cnt} for r in mov_by_type_rows]

    top_targets_rows = (await session.execute(
        select(Target.id, Target.full_name, Target.cpf, func.count(Device.id).label("device_count"))
        .outerjoin(Device, (Device.target_id == Target.id) & (Device.deleted_at.is_(None)))
        .where(Target.operation_id == operation_id, Target.deleted_at.is_(None))
        .group_by(Target.id, Target.full_name, Target.cpf)
        .order_by(func.count(Device.id).desc()).limit(5)
    )).all()
    top_targets = [{"id": str(r.id), "name": r.full_name, "cpf": r.cpf, "devices": r.device_count} for r in top_targets_rows]

    recent_rows = (await session.execute(
        select(CustodyMovement).where(CustodyMovement.device_id.in_(device_ids_stmt)).order_by(CustodyMovement.movement_date.desc()).limit(10)
    )).scalars().all()
    recent_movements = [{"date": m.movement_date.isoformat(), "type": m.movement_type, "responsible": m.responsible_name, "origin": m.origin_sector, "destination": m.destination_sector, "observation": m.observation} for m in recent_rows]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "operation": {"id": str(op.id), "name": op.name, "procedure_number": op.procedure_number, "responsible_unit": op.responsible_unit, "status": op.status, "start_date": _fmt_date(op.start_date), "end_date": _fmt_date(op.end_date), "description": op.description},
        "totals": {"targets": total_targets, "devices": total_devices, "custody_movements": total_movements, "expert_reports": total_reports, "generated_documents": total_generated, "photos": total_photos},
        "devices_by_type": devices_by_type,
        "devices_by_status": devices_by_status,
        "movements_by_type": movements_by_type,
        "top_targets": top_targets,
        "recent_movements": recent_movements,
    }
