"""Associação Alvo ↔ Equipe de Deflagração."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class DeploymentTeamTarget(Base):
    """Registro de atribuição de um Alvo a uma Equipe de Deflagração.

    Regra de negócio: equipe e alvo devem pertencer à mesma Operação.
    Essa validação é feita na camada de serviço/endpoint, não por FK.
    """

    __tablename__ = "deployment_team_targets"
    __table_args__ = (
        UniqueConstraint("team_id", "target_id", name="uq_team_target"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deployment_teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("targets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    team: Mapped["DeploymentTeam"] = relationship(  # type: ignore[name-defined]
        "DeploymentTeam", back_populates="target_assignments"
    )
    target: Mapped["Target"] = relationship(  # type: ignore[name-defined]
        "Target", back_populates="team_assignments"
    )
    assigner: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[assigned_by]
    )

    def __repr__(self) -> str:
        return f"<DeploymentTeamTarget team={self.team_id} target={self.target_id}>"
