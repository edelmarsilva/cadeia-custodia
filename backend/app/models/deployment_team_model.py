"""Equipes de Deflagração — grupos de policiais vinculados a uma Operação."""
import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class DeploymentTeam(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Uma Equipe de Deflagração associada a exatamente uma Operação."""

    __tablename__ = "deployment_teams"

    operation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    leader_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    operation: Mapped["Operation"] = relationship(  # type: ignore[name-defined]
        "Operation", back_populates="deployment_teams"
    )
    leader: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[leader_id]
    )
    members: Mapped[list["DeploymentTeamMember"]] = relationship(  # type: ignore[name-defined]
        "DeploymentTeamMember",
        back_populates="team",
        cascade="all, delete-orphan",
    )
    target_assignments: Mapped[list["DeploymentTeamTarget"]] = relationship(  # type: ignore[name-defined]
        "DeploymentTeamTarget",
        back_populates="team",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<DeploymentTeam {self.name} op={self.operation_id}>"
