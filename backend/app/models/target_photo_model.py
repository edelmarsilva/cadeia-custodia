"""Fotografias de Alvo (identidade / reconhecimento)."""
import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class TargetPhoto(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Fotografia associada a um Alvo (diferente de DevicePhoto, que é evidência de dispositivo)."""

    __tablename__ = "target_photos"

    target_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("targets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    caption: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    target: Mapped["Target"] = relationship(  # type: ignore[name-defined]
        "Target", back_populates="photos"
    )

    def __repr__(self) -> str:
        return f"<TargetPhoto {self.file_name} target={self.target_id}>"
