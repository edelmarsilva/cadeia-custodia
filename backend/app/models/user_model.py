import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("admin", "custody", "expert", "analyst", "auditor", name="user_role_enum"),
        nullable=False,
        default="analyst",
    )
    badge_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    operations: Mapped[list["Operation"]] = relationship(  # type: ignore[name-defined]
        "Operation", back_populates="responsible_user", foreign_keys="Operation.responsible_user_id"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(  # type: ignore[name-defined]
        "AuditLog", back_populates="user"
    )
    operation_assignments: Mapped[list["OperationUser"]] = relationship(  # type: ignore[name-defined]
        "OperationUser", back_populates="user",
        foreign_keys="OperationUser.user_id",
        cascade="all, delete-orphan",
    )
    led_teams: Mapped[list["DeploymentTeam"]] = relationship(  # type: ignore[name-defined]
        "DeploymentTeam", foreign_keys="DeploymentTeam.leader_id"
    )
    team_memberships: Mapped[list["DeploymentTeamMember"]] = relationship(  # type: ignore[name-defined]
        "DeploymentTeamMember", back_populates="user",
        foreign_keys="DeploymentTeamMember.user_id",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role})>"
