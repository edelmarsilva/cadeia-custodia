"""Modelo de Laudo Pericial Gerado automaticamente."""
import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class GeneratedReport(Base, UUIDMixin, TimestampMixin):
    """Registro de laudo pericial gerado automaticamente a partir de um template DOCX."""

    __tablename__ = "generated_reports"

    # Referências
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("report_templates.id", ondelete="SET NULL"), nullable=True, index=True
    )
    template_version: Mapped[str | None] = mapped_column(String(50), nullable=True)

    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    operation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Metadados do laudo
    report_number: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    expert_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emission_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Arquivos gerados (caminhos no MinIO, bucket: reports)
    docx_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    pdf_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    docx_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pdf_name: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Snapshot dos dados utilizados na geração (para auditoria e rastreabilidade)
    placeholder_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    template: Mapped["ReportTemplate | None"] = relationship(  # type: ignore[name-defined]
        "ReportTemplate", back_populates="generated_reports"
    )
    device: Mapped["Device"] = relationship("Device", foreign_keys=[device_id])  # type: ignore[name-defined]
    operation: Mapped["Operation | None"] = relationship("Operation", foreign_keys=[operation_id])  # type: ignore[name-defined]
    user: Mapped["User | None"] = relationship("User", foreign_keys=[user_id])  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<GeneratedReport {self.report_number}>"
