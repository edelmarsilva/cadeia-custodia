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


# ─── Payload de Foto Individual (dentro da sincronização) ─────────────────────

class FieldPhotoPayload(BaseModel):
    """Dados de uma fotografia coletada em campo."""
    step: str = Field(..., description="Etapa: context|environment|front|back|side|serial_imei|seal|additional")
    file_name: str
    file_base64: str = Field(..., description="Conteúdo da imagem em Base64")
    sha256: Optional[str] = Field(None, description="Hash SHA-256 calculado pelo app para verificação")
    caption: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    captured_at: Optional[datetime] = None


# ─── Payload de Dispositivo (dentro da sincronização) ────────────────────────

class FieldDevicePayload(BaseModel):
    """Dados de um dispositivo coletado em campo."""
    local_id: str = Field(..., description="ID temporário gerado pelo app mobile")
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


# ─── Payload completo de Sincronização ───────────────────────────────────────

class FieldSessionSyncPayload(BaseModel):
    """Payload enviado pelo app mobile para sincronizar toda a sessão de campo."""
    devices: list[FieldDevicePayload] = Field(default_factory=list)


# ─── Resultado da Sincronização ───────────────────────────────────────────────

class FieldSessionSyncResult(BaseModel):
    session_id: uuid.UUID
    status: str
    devices_synced: int
    photos_synced: int
    errors: list[str] = Field(default_factory=list)
