"""Cadeia de Custódia — movimentações imutáveis."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.database import get_async_session
from app.models.custody_model import CustodyMovement
from app.models.device_model import Device
from app.schemas.schemas import CustodyMovementCreate, CustodyMovementResponse
from app.services import audit_service

router = APIRouter(tags=["Cadeia de Custódia"])

TIMELINE_ORDER = [
    "seizure", "reception", "transfer", "analysis_start",
    "analysis_end", "report_issued", "return", "archive",
]

MOVEMENT_LABELS = {
    "seizure": "Apreensão",
    "reception": "Recebimento",
    "transfer": "Transferência",
    "analysis_start": "Início de Análise",
    "analysis_end": "Fim de Análise",
    "report_issued": "Laudo Emitido",
    "return": "Devolução",
    "archive": "Arquivamento",
}


@router.get("/devices/{device_id}/custody", response_model=list[CustodyMovementResponse])
async def get_custody_history(
    device_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(CustodyMovement)
        .where(CustodyMovement.device_id == device_id)
        .order_by(CustodyMovement.movement_date.asc())
    )
    return [CustodyMovementResponse.model_validate(m) for m in result.scalars().all()]


@router.get("/devices/{device_id}/timeline")
async def get_timeline(
    device_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    """Retorna timeline visual com status de cada etapa."""
    result = await session.execute(
        select(CustodyMovement)
        .where(CustodyMovement.device_id == device_id)
        .order_by(CustodyMovement.movement_date.asc())
    )
    movements = result.scalars().all()

    seen_types = {m.movement_type for m in movements}
    timeline = []
    for step in TIMELINE_ORDER:
        matching = [m for m in movements if m.movement_type == step]
        timeline.append({
            "step": step,
            "label": MOVEMENT_LABELS[step],
            "completed": step in seen_types,
            "events": [
                {
                    "id": str(m.id),
                    "date": m.movement_date.isoformat(),
                    "responsible": m.responsible_name,
                    "origin": m.origin_sector,
                    "destination": m.destination_sector,
                    "observation": m.observation,
                }
                for m in matching
            ],
        })
    return {"device_id": str(device_id), "timeline": timeline}


@router.post(
    "/devices/{device_id}/custody",
    response_model=CustodyMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_movement(
    device_id: uuid.UUID,
    body: CustodyMovementCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
):
    device_res = await session.execute(
        select(Device).where(Device.id == device_id, Device.deleted_at.is_(None))
    )
    device = device_res.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado.")

    movement = CustodyMovement(
        device_id=device_id,
        responsible_user_id=uuid.UUID(current_user["sub"]),
        responsible_name=body.responsible_name or current_user["username"],
        origin_sector=body.origin_sector,
        destination_sector=body.destination_sector,
        movement_type=body.movement_type,
        reason=body.reason,
        observation=body.observation,
        created_by=uuid.UUID(current_user["sub"]),
    )
    session.add(movement)
    await session.flush()

    # Atualiza status do dispositivo conforme o tipo de movimento
    STATUS_MAP = {
        "seizure": "seized",
        "reception": "in_custody",
        "transfer": "in_custody",
        "analysis_start": "in_analysis",
        "analysis_end": "in_custody",
        "report_issued": "finished",
        "return": "returned",
    }
    if body.movement_type in STATUS_MAP:
        device.status = STATUS_MAP[body.movement_type]

    await audit_service.log_action(
        session,
        action="custody_movement_registered",
        entity_type="device",
        entity_id=str(device_id),
        description=f"Movimentação '{body.movement_type}' registrada para {device.evidence_number}",
        new_value=body.model_dump(),
        user_id=uuid.UUID(current_user["sub"]),
        username=current_user["username"],
    )
    await session.refresh(movement)
    return CustodyMovementResponse.model_validate(movement)
