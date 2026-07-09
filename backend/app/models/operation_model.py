import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class Operation(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "operations"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    procedure_number: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsible_unit: Mapped[str | None] = mapped_column(String(255), nullable=True)
    responsible_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("planning", "active", "closed", "archived", name="operation_status_enum"),
        nullable=False,
        default="planning",
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    responsible_user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="operations", foreign_keys=[responsible_user_id]
    )
    targets: Mapped[list["Target"]] = relationship(  # type: ignore[name-defined]
        "Target", back_populates="operation", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(  # type: ignore[name-defined]
        "Document", back_populates="operation", cascade="all, delete-orphan"
    )
    devices: Mapped[list["Device"]] = relationship(  # type: ignore[name-defined]
        "Device", back_populates="operation"
    )
    operation_users: Mapped[list["OperationUser"]] = relationship(  # type: ignore[name-defined]
        "OperationUser", back_populates="operation",
        foreign_keys="OperationUser.operation_id",
        cascade="all, delete-orphan",
    )
    deployment_teams: Mapped[list["DeploymentTeam"]] = relationship(  # type: ignore[name-defined]
        "DeploymentTeam", back_populates="operation", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Operation {self.name} [{self.status}]>"
