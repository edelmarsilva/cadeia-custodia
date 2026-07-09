import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


# ── User ────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: Literal["admin", "custody", "expert", "analyst", "auditor"] = "analyst"
    badge_number: str | None = None
    unit: str | None = None


class UserUpdate(BaseModel):
    email: str | None = None
    full_name: str | None = None
    role: str | None = None
    badge_number: str | None = None
    unit: str | None = None
    is_active: bool | None = None
    password: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    username: str
    email: str
    full_name: str
    role: str
    badge_number: str | None
    unit: str | None
    is_active: bool
    created_at: datetime


# ── Operation ───────────────────────────────────────────────────
class OperationCreate(BaseModel):
    name: str
    procedure_number: str | None = None
    description: str | None = None
    responsible_unit: str | None = None
    responsible_user_id: uuid.UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: Literal["planning", "active", "closed", "archived"] = "planning"


class OperationUpdate(BaseModel):
    name: str | None = None
    procedure_number: str | None = None
    description: str | None = None
    responsible_unit: str | None = None
    responsible_user_id: uuid.UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None


class OperationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    procedure_number: str | None
    description: str | None
    responsible_unit: str | None
    responsible_user_id: uuid.UUID | None
    start_date: date | None
    end_date: date | None
    status: str
    created_at: datetime
    updated_at: datetime


class OperationDashboard(BaseModel):
    operation: OperationResponse
    total_targets: int
    total_devices: int
    smartphones: int
    computers: int
    pendrives: int
    storage_devices: int
    in_analysis: int
    with_report: int
    in_custody: int
    movements_count: int


# ── Target ──────────────────────────────────────────────────────
class TargetCreate(BaseModel):
    full_name: str
    social_name: str | None = None
    nickname: str | None = None
    cpf: str | None = None
    rg: str | None = None
    person_type: Literal["individual", "legal_entity"] = "individual"
    birth_date: date | None = None
    address: str | None = None
    observations: str | None = None


class TargetUpdate(BaseModel):
    full_name: str | None = None
    social_name: str | None = None
    nickname: str | None = None
    cpf: str | None = None
    rg: str | None = None
    person_type: str | None = None
    birth_date: date | None = None
    address: str | None = None
    observations: str | None = None


class TargetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    operation_id: uuid.UUID
    full_name: str
    social_name: str | None
    nickname: str | None
    cpf: str | None
    rg: str | None
    person_type: str
    birth_date: date | None
    address: str | None
    observations: str | None
    created_at: datetime
    updated_at: datetime


# ── Device ──────────────────────────────────────────────────────
class DeviceCreate(BaseModel):
    evidence_number: str
    seal_number: str | None = None
    device_type: str
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    color: str | None = None
    seizure_date: date | None = None
    seizure_location: str | None = None
    seizure_observations: str | None = None
    status: str = "seized"
    extra_data: dict | None = None


class DeviceUpdate(BaseModel):
    seal_number: str | None = None
    brand: str | None = None
    model: str | None = None
    serial_number: str | None = None
    color: str | None = None
    seizure_date: date | None = None
    seizure_location: str | None = None
    seizure_observations: str | None = None
    status: str | None = None
    extra_data: dict | None = None


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    target_id: uuid.UUID | None
    operation_id: uuid.UUID
    evidence_number: str
    seal_number: str | None
    qr_code_url: str | None
    device_type: str
    brand: str | None
    model: str | None
    serial_number: str | None
    color: str | None
    seizure_date: date | None
    seizure_location: str | None
    seizure_observations: str | None
    status: str
    extra_data: dict | None
    created_at: datetime
    updated_at: datetime


# ── Custody Movement ────────────────────────────────────────────
class CustodyMovementCreate(BaseModel):
    responsible_name: str | None = None
    origin_sector: str | None = None
    destination_sector: str | None = None
    movement_type: str
    reason: str | None = None
    observation: str | None = None


class CustodyMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    device_id: uuid.UUID
    movement_date: datetime
    responsible_user_id: uuid.UUID | None
    responsible_name: str | None
    origin_sector: str | None
    destination_sector: str | None
    movement_type: str
    reason: str | None
    observation: str | None
    created_at: datetime


# ── Expert Report ────────────────────────────────────────────────
class ExpertReportCreate(BaseModel):
    report_number: str
    title: str
    expert_name: str | None = None
    emission_date: date | None = None
    status: str = "drafting"
    observations: str | None = None


class ExpertReportUpdate(BaseModel):
    title: str | None = None
    expert_name: str | None = None
    emission_date: date | None = None
    status: str | None = None
    observations: str | None = None


class ExpertReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    device_id: uuid.UUID
    report_number: str
    title: str
    expert_user_id: uuid.UUID | None
    expert_name: str | None
    emission_date: date | None
    status: str
    file_path: str | None
    file_name: str | None
    file_url: str | None = None  # presigned URL gerada dinamicamente
    version: int
    observations: str | None
    created_at: datetime
    updated_at: datetime


# ── Integrity Hash ───────────────────────────────────────────────
class IntegrityHashCreate(BaseModel):
    md5: str | None = None
    sha1: str | None = None
    sha256: str | None = None
    source_file: str | None = None


class IntegrityHashResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    device_id: uuid.UUID
    md5: str | None
    sha1: str | None
    sha256: str | None
    source_file: str | None
    calculated_at: datetime
    calculated_by: uuid.UUID | None


# ── Document ─────────────────────────────────────────────────────
class DocumentCreate(BaseModel):
    title: str
    doc_type: str = "other"
    description: str | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    operation_id: uuid.UUID
    title: str
    doc_type: str
    description: str | None
    file_path: str | None
    file_name: str | None
    file_url: str | None = None  # presigned URL gerada dinamicamente
    created_at: datetime

# ── Photo ────────────────────────────────────────────────────────
class PhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    device_id: uuid.UUID
    file_path: str
    file_name: str
    caption: str | None
    category: str
    created_at: datetime
    url: str | None = None  # presigned URL gerada dinamicamente


# ── Audit Log ────────────────────────────────────────────────────
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    user_id: uuid.UUID | None
    username: str | None
    timestamp: datetime
    action: str
    entity_type: str | None
    entity_id: str | None
    description: str | None
    old_value: dict | None
    new_value: dict | None
    ip_address: str | None


# ── Operation Users ──────────────────────────────────────
class OperationUserAssign(BaseModel):
    user_id: uuid.UUID
    is_op_admin: bool = False


class OperationUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    operation_id: uuid.UUID
    user_id: uuid.UUID
    assigned_at: datetime
    assigned_by: uuid.UUID | None
    is_op_admin: bool = False

    # Nested user info (populated via joinedload)
    user: "UserResponse | None" = None


class SetOpAdminBody(BaseModel):
    is_op_admin: bool


# ── Report Template ────────────────────────────────────────────────
class ReportTemplateCreate(BaseModel):
    name: str
    description: str | None = None
    version: str = "1.0"
    is_active: bool = True


class ReportTemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    version: str | None = None
    is_active: bool | None = None


class ReportTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str | None
    version: str
    file_path: str | None
    file_name: str | None
    is_active: bool
    created_by: uuid.UUID | None
    updated_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    # Computed field — presigned URL for downloading the template
    file_url: str | None = None


# ── Generated Report ───────────────────────────────────────────────
class GeneratedReportCreate(BaseModel):
    """Payload enviado pelo frontend para gerar um laudo."""
    template_id: uuid.UUID
    report_number: str
    expert_name: str | None = None
    emission_date: date | None = None
    observations: str | None = None


class GeneratedReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    template_id: uuid.UUID | None
    template_version: str | None
    device_id: uuid.UUID
    operation_id: uuid.UUID | None
    user_id: uuid.UUID | None
    report_number: str
    expert_name: str | None
    emission_date: date | None
    observations: str | None
    docx_path: str | None
    pdf_path: str | None
    docx_name: str | None
    pdf_name: str | None
    placeholder_data: dict | None
    created_at: datetime
    updated_at: datetime
    # Presigned URLs — geradas dinamicamente no endpoint
    docx_url: str | None = None
    pdf_url: str | None = None


# ── Report Generation Preview ─────────────────────────────────────
class ReportPreviewResponse(BaseModel):
    """Dados que serão substituídos nos placeholders do template."""
    report_number: str
    expert_name: str | None
    emission_date: str | None
    # Device
    evidence_number: str | None
    seal_number: str | None
    device_type: str | None
    brand: str | None
    model: str | None
    serial_number: str | None
    color: str | None
    imei: str | None
    os: str | None
    storage_capacity: str | None
    seizure_date: str | None
    seizure_location: str | None
    # Target
    target_name: str | None
    target_cpf: str | None
    # Operation
    operation_name: str | None
    procedure_number: str | None
    # Hashes
    hash_md5: str | None
    hash_sha1: str | None
    hash_sha256: str | None
    # Photos summary
    photos_count: int
    # Custody summary
    analysis_start_date: str | None
    observations: str | None


# ── Deployment Team ───────────────────────────────────────────────
class DeploymentTeamCreate(BaseModel):
    name: str
    description: str | None = None
    leader_id: uuid.UUID | None = None


class DeploymentTeamUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    leader_id: uuid.UUID | None = None


class DeploymentTeamMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    team_id: uuid.UUID
    user_id: uuid.UUID | None
    member_name: str | None
    member_role: str | None
    assigned_at: datetime
    assigned_by: uuid.UUID | None
    user: "UserResponse | None" = None


class DeploymentTeamTargetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    team_id: uuid.UUID
    target_id: uuid.UUID
    assigned_at: datetime
    assigned_by: uuid.UUID | None
    target: "TargetResponse | None" = None


class DeploymentTeamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    operation_id: uuid.UUID
    name: str
    description: str | None
    leader_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    members: list[DeploymentTeamMemberResponse] = []
    target_assignments: list[DeploymentTeamTargetResponse] = []


class DeploymentTeamMemberAssign(BaseModel):
    """Adicionar membro à equipe.

    Deve fornecer exatamente um de:
    - user_id: UUID de usuário cadastrado no sistema.
    - member_name: nome livre de pessoa externa ao sistema.
    """
    user_id: uuid.UUID | None = None
    member_name: str | None = None
    member_role: str | None = None

    @model_validator(mode="after")
    def check_at_least_one(self) -> "DeploymentTeamMemberAssign":
        if not self.user_id and not (self.member_name and self.member_name.strip()):
            raise ValueError(
                "Informe user_id (usuário do sistema) ou member_name (nome externo)."
            )
        return self


class DeploymentTeamTargetAssign(BaseModel):
    target_id: uuid.UUID


# ── Target Photo ──────────────────────────────────────────────────
class TargetPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    target_id: uuid.UUID
    file_path: str
    file_name: str
    caption: str | None
    created_at: datetime
    url: str | None = None  # presigned URL gerada dinamicamente


# ── Target History Search ─────────────────────────────────────────
class TargetHistoryResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    target_id: uuid.UUID
    full_name: str
    social_name: str | None
    nickname: str | None
    cpf: str | None
    rg: str | None
    person_type: str
    birth_date: date | None
    operation_id: uuid.UUID
    operation_name: str
    operation_code: str | None
    operation_status: str
    registered_at: datetime


# ── Target Global Search ──────────────────────────────────────────
class TargetSearchResult(BaseModel):
    """Resultado da pesquisa global de Alvos (cross-operação)."""
    id: uuid.UUID
    operation_id: uuid.UUID
    operation_name: str
    operation_status: str
    full_name: str
    social_name: str | None
    nickname: str | None
    cpf: str | None
    rg: str | None
    person_type: str
    birth_date: date | None
    created_at: datetime
