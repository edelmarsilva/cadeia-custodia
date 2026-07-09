"""Modelo de Template de Laudo Pericial."""
import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class ReportTemplate(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """Template DOCX para geração automática de laudos periciais."""

    __tablename__ = "report_templates"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[str] = mapped_column(String(50), nullable=False, default="1.0")

    # Arquivo DOCX armazenado no MinIO (bucket: templates)
    file_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(500), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    created_by_user: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[created_by]
    )
    updated_by_user: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[updated_by]
    )
    generated_reports: Mapped[list["GeneratedReport"]] = relationship(  # type: ignore[name-defined]
        "GeneratedReport", back_populates="template"
    )

    def __repr__(self) -> str:
        return f"<ReportTemplate {self.name} v{self.version} [{'active' if self.is_active else 'inactive'}]>"
