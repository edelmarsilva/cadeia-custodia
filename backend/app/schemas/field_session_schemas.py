"""Schemas Pydantic para o módulo de Coleta Fotográfica em Campo (Mobile App)."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ─── Criação de Sessão ────────────────────────────────────────────────────────

class FieldPhotoSessionCreate(BaseModel):
    operation_id: uuid.UUID
    team_id: Optional[uuid.UUID] = None
    target_id: Optional[uuid.UUID] = None
    device_manufacturer: Optional[str] = None
    device_model_capture: Optional[str] = None


# ─── Resposta de Sessão ───────────────────────────────────────────────────────

class FieldPhotoSessionResponse(BaseModel):
    id: uuid.UUID
    operation_id: uuid.UUID
    team_id: Optional[uuid.UUID] = None
    target_id: Optional[uuid.UUID] = None
    created_by: Optional[uuid.UUID] = None
    device_manufacturer: Optional[str] = None
    device_model_capture: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Resposta de Rascunho de Dispositivo ─────────────────────────────────────

class FieldDeviceRecordResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    device_id: Optional[uuid.UUID] = None
    local_id: str
    device_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    serial_number_detected: Optional[str] = None
    imei_detected: Optional[str] = None
    seizure_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_steps_done: Optional[dict] = None
    is_complete: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Payload de Foto Individual (dentro da sincronização legada) ──────────────

class FieldPhotoPayload(BaseModel):
    step: str = Field(..., description="Etapa: context|environment|front|back|side|serial_imei|seal|additional")
    file_name: str
    file_base64: str = Field(..., description="Conteúdo da imagem em Base64")
    sha256: Optional[str] = Field(None, description="Hash SHA-256 calculado pelo app para verificação")
    caption: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    captured_at: Optional[datetime] = None


class FieldDevicePayload(BaseModel):
    local_id: str
    device_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    serial_number_detected: Optional[str] = None
    imei_detected: Optional[str] = None
    seizure_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photos: list[FieldPhotoPayload] = Field(default_factory=list)


class FieldSessionSyncPayload(BaseModel):
    devices: list[FieldDevicePayload] = Field(default_factory=list)


class FieldSessionSyncResult(BaseModel):
    session_id: uuid.UUID
    status: str
    devices_synced: int
    photos_synced: int
    errors: list[str] = Field(default_factory=list)


# ─── QR Code de Campo ────────────────────────────────────────────────────────

class FieldQrCodeResponse(BaseModel):
    """Resposta do endpoint de geração de QR Code para missão de campo."""
    qr_payload_b64: str = Field(..., description="Payload JSON codificado em Base64 para o app")
    qr_image_base64: str = Field(..., description="Imagem PNG do QR Code em Base64 (para exibição no frontend)")
    operation_name: str
    team_name: str
    target_name: str


# ─── Importação de Pacote ZIP ────────────────────────────────────────────────

class FieldSessionImportResult(BaseModel):
    """Resultado da importação de um pacote ZIP exportado pelo app mobile."""
    session_id: Optional[uuid.UUID] = None
    operation_name: str
    procedure_number: Optional[str] = None
    team_name: Optional[str] = None
    target_name: str
    agent_name: Optional[str] = None
    devices_imported: int
    photos_imported: int
    photos_failed: int
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    success: bool
