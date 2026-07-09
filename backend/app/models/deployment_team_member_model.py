"""Associação Policial ↔ Equipe de Deflagração.

Suporta dois tipos de membro:
  * Usuário do sistema: user_id preenchido (relação FK → users)
  * Pessoa externa: member_name preenchido (texto livre, sem conta no sistema)

Pelo menos um dos dois DEVE estar preenchido (validado no schema/endpoint).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class DeploymentTeamMember(Base):
    """Registro de membro (policial) em uma Equipe de Deflagração."""

    __tablename__ = "deployment_team_members"
    # Sem UniqueConstraint global agora — um mesmo user_id pode ser
    # registrado apenas uma vez por equipe, mas names livres são irrestritios.
    # A validação de duplicidade de user_id é feita no endpoint.

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("deployment_teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # ── Membro do sistema (opcional) ──────────────────────────────
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    # ── Membro externo (opcional) ─────────────────────────────────
    member_name: Mapped[str | None] = mapped_column(
        String(300), nullable=True
    )
    member_role: Mapped[str | None] = mapped_column(
        String(200), nullable=True
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
        "DeploymentTeam", back_populates="members"
    )
    user: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="team_memberships", foreign_keys=[user_id]
    )
    assigner: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[assigned_by]
    )

    @property
    def display_name(self) -> str:
        """Nome de exibição: usuário do sistema ou nome livre."""
        if self.user:
            return self.user.full_name
        return self.member_name or str(self.id)

    def __repr__(self) -> str:
        return f"<DeploymentTeamMember team={self.team_id} display={self.display_name!r}>"
