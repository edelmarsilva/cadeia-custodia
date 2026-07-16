import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.base import SoftDeleteMixin, TimestampMixin, UUIDMixin


class Device(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "devices"

    # Foreign Keys
    target_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("targets.id", ondelete="SET NULL"), nullable=True, index=True
    )
    operation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operations.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Identification
    evidence_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    seal_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    qr_code_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Classification
    device_type: Mapped[str] = mapped_column(
        Enum(
            "smartphone", "tablet", "notebook", "desktop", "server",
            "hd", "ssd", "pendrive", "memory_card", "dvr",
            "network_equipment", "other",
            name="device_type_enum",
        ),
        nullable=False,
    )
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(200), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(200), nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Seizure
    seizure_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    seizure_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    seizure_observations: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status
    status: Mapped[str] = mapped_column(
        Enum("seized", "in_custody", "in_analysis", "finished", "returned", name="device_status_enum"),
        nullable=False,
        default="seized",
    )

    # Extra data (smartphone IMEI, RAM, OS, etc.)
    extra_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True, default=dict)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    target: Mapped["Target | None"] = relationship("Target", back_populates="devices")  # type: ignore[name-defined]
    operation: Mapped["Operation | None"] = relationship("Operation", back_populates="devices")  # type: ignore[name-defined]
    custody_movements: Mapped[list["CustodyMovement"]] = relationship(  # type: ignore[name-defined]
        "CustodyMovement", back_populates="device", cascade="all, delete-orphan"
    )
    photos: Mapped[list["DevicePhoto"]] = relationship(  # type: ignore[name-defined]
        "DevicePhoto", back_populates="device", cascade="all, delete-orphan"
    )
    expert_reports: Mapped[list["ExpertReport"]] = relationship(  # type: ignore[name-defined]
        "ExpertReport", back_populates="device", cascade="all, delete-orphan"
    )
    integrity_hashes: Mapped[list["IntegrityHash"]] = relationship(  # type: ignore[name-defined]
        "IntegrityHash", back_populates="device", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Device {self.evidence_number} [{self.device_type}]>"
