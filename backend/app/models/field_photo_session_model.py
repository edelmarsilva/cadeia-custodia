"""Modelo de Sessão de Coleta Fotográfica em Campo."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class FieldPhotoSession(Base, UUIDMixin, TimestampMixin):
    """Sessão de coleta fotográfica de campo vinculada a uma Operação, Equipe e Alvo."""

    __tablename__ = "field_photo_sessions"

    operation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("deployment_teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    target_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("targets.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Metadados do dispositivo captor (celular usado em campo)
    device_manufacturer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_model_capture: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Status da sessão
    status: Mapped[str] = mapped_column(
        Enum("collecting", "pending_sync", "synced", "partial", name="field_session_status_enum"),
        nullable=False,
        default="collecting",
    )

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    operation: Mapped["Operation | None"] = relationship("Operation")  # type: ignore[name-defined]
    team: Mapped["DeploymentTeam | None"] = relationship("DeploymentTeam")  # type: ignore[name-defined]
    target: Mapped["Target | None"] = relationship("Target")  # type: ignore[name-defined]
    created_by_user: Mapped["User | None"] = relationship("User", foreign_keys=[created_by])  # type: ignore[name-defined]
    device_records: Mapped[list["FieldDeviceRecord"]] = relationship(  # type: ignore[name-defined]
        "FieldDeviceRecord", back_populates="session", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<FieldPhotoSession [{self.status}] op={self.operation_id}>"
