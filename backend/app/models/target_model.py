import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class Target(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "targets"

    operation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    social_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nickname: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), nullable=True, index=True)
    rg: Mapped[str | None] = mapped_column(String(30), nullable=True)
    person_type: Mapped[str] = mapped_column(
        Enum("individual", "legal_entity", name="person_type_enum"),
        nullable=False,
        default="individual",
    )
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    operation: Mapped["Operation"] = relationship(  # type: ignore[name-defined]
        "Operation", back_populates="targets"
    )
    devices: Mapped[list["Device"]] = relationship(  # type: ignore[name-defined]
        "Device", back_populates="target", cascade="all, delete-orphan"
    )
    photos: Mapped[list["TargetPhoto"]] = relationship(  # type: ignore[name-defined]
        "TargetPhoto", back_populates="target", cascade="all, delete-orphan"
    )
    team_assignments: Mapped[list["DeploymentTeamTarget"]] = relationship(  # type: ignore[name-defined]
        "DeploymentTeamTarget", back_populates="target", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Target {self.full_name}>"
