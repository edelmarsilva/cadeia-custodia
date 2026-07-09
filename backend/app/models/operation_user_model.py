"""Tabela pivot operação ↔ usuário (atribuição de equipe)."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class OperationUser(Base):
    """Registro de atribuição de um usuário a uma operação."""

    __tablename__ = "operation_users"
    __table_args__ = (
        UniqueConstraint("operation_id", "user_id", name="uq_operation_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    operation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("operations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
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
    is_op_admin: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
        comment="Se True, este usuário é administrador desta operação específica"
    )

    # Relationships
    operation: Mapped["Operation"] = relationship(  # type: ignore[name-defined]
        "Operation", back_populates="operation_users", foreign_keys=[operation_id]
    )
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="operation_assignments", foreign_keys=[user_id]
    )
    assigner: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[assigned_by]
    )

    def __repr__(self) -> str:
        role_tag = " [OP_ADMIN]" if self.is_op_admin else ""
        return f"<OperationUser op={self.operation_id} user={self.user_id}{role_tag}>"
