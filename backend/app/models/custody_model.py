import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class CustodyMovement(Base, UUIDMixin):
    """Imutável — nenhum UPDATE ou DELETE é permitido nesta tabela."""

    __tablename__ = "custody_movements"

    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    movement_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    responsible_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    responsible_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    origin_sector: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination_sector: Mapped[str | None] = mapped_column(String(255), nullable=True)
    movement_type: Mapped[str] = mapped_column(
        Enum(
            "seizure", "reception", "transfer", "analysis_start",
            "analysis_end", "report_issued", "return", "archive",
            name="movement_type_enum",
        ),
        nullable=False,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    observation: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    device: Mapped["Device"] = relationship("Device", back_populates="custody_movements")  # type: ignore[name-defined]
    responsible_user: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[responsible_user_id]
    )

    def __repr__(self) -> str:
        return f"<CustodyMovement {self.movement_type} @ {self.movement_date}>"
