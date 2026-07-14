import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class DevicePhoto(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "device_photos"

    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    caption: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Categoria herdada (compatibilidade legada)
    category: Mapped[str] = mapped_column(
        Enum(
            "front", "back", "seal", "serial_number", "imei",
            "evidence_state", "other",
            name="photo_category_enum",
        ),
        nullable=False,
        default="other",
    )

    # ── Etapa no assistente guiado (módulo mobile) ─────────────────────────
    photo_step: Mapped[str | None] = mapped_column(
        Enum(
            "context", "environment", "front", "back", "side",
            "serial_imei", "seal", "additional",
            name="photo_step_enum",
        ),
        nullable=True,
    )

    # ── Metadados forenses (preenchidos pelo app mobile) ───────────────────
    # Hash SHA-256 do arquivo de imagem para verificação de integridade
    sha256_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Coordenadas GPS no momento da captura
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Timestamp de captura no dispositivo móvel (pode diferir do created_at do servidor)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Modelo do celular usado para fotografar
    capture_device_model: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # ── Vínculos com sessão de campo ───────────────────────────────────────
    field_device_record_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("field_device_records.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("field_photo_sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    device: Mapped["Device"] = relationship("Device", back_populates="photos")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<DevicePhoto [{self.photo_step or self.category}] {self.file_name}>"
