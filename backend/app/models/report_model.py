import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class ExpertReport(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "expert_reports"

    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    report_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    expert_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    expert_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emission_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("drafting", "review", "signed", "cancelled", name="report_status_enum"),
        nullable=False,
        default="drafting",
    )
    file_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    observations: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    device: Mapped["Device"] = relationship("Device", back_populates="expert_reports")  # type: ignore[name-defined]
    expert_user: Mapped["User | None"] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[expert_user_id]
    )

    def __repr__(self) -> str:
        return f"<ExpertReport {self.report_number} [{self.status}]>"
