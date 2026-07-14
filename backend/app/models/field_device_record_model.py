"""Modelo de Rascunho de Dispositivo capturado em campo (antes da sincronização)."""
import uuid

from sqlalchemy import Boolean, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class FieldDeviceRecord(Base, UUIDMixin, TimestampMixin):
    """Registro temporário de dispositivo criado pelo app mobile.
    Pode ou não estar vinculado a um Device definitivo após a sincronização.
    """

    __tablename__ = "field_device_records"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("field_photo_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Identificador local temporário gerado pelo app mobile
    local_id: Mapped[str] = mapped_column(String(100), nullable=False)

    # Dados do dispositivo (preenchidos em campo)
    device_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Dados extraídos por OCR
    serial_number_detected: Mapped[str | None] = mapped_column(String(200), nullable=True)
    imei_detected: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Localização da apreensão
    seizure_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Checklist de etapas concluídas e flag de conclusão
    # ex: {"context": true, "environment": true, "front": false, ...}
    photo_steps_done: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)
    is_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    session: Mapped["FieldPhotoSession"] = relationship(  # type: ignore[name-defined]
        "FieldPhotoSession", back_populates="device_records"
    )
    device: Mapped["Device | None"] = relationship("Device")  # type: ignore[name-defined]
    photos: Mapped[list["DevicePhoto"]] = relationship(  # type: ignore[name-defined]
        "DevicePhoto",
        primaryjoin="DevicePhoto.field_device_record_id == FieldDeviceRecord.id",
        foreign_keys="DevicePhoto.field_device_record_id",
    )

    def __repr__(self) -> str:
        return f"<FieldDeviceRecord local_id={self.local_id} complete={self.is_complete}>"
