import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
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
    category: Mapped[str] = mapped_column(
        Enum(
            "front", "back", "seal", "serial_number", "imei",
            "evidence_state", "other",
            name="photo_category_enum",
        ),
        nullable=False,
        default="other",
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    device: Mapped["Device"] = relationship("Device", back_populates="photos")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<DevicePhoto [{self.category}] {self.file_name}>"
