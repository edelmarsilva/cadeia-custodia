import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import UUIDMixin


class IntegrityHash(Base, UUIDMixin):
    __tablename__ = "integrity_hashes"

    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    md5: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sha1: Mapped[str | None] = mapped_column(String(40), nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_file: Mapped[str | None] = mapped_column(String(500), nullable=True)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    calculated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    device: Mapped["Device"] = relationship("Device", back_populates="integrity_hashes")  # type: ignore[name-defined]
    user: Mapped["User | None"] = relationship("User", foreign_keys=[calculated_by])  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<IntegrityHash SHA256={self.sha256[:8] if self.sha256 else 'N/A'}...>"
