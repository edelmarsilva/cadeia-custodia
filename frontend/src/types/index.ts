// Global TypeScript types for the chain of custody system

export type UserRole = 'admin' | 'custody' | 'expert' | 'analyst' | 'auditor';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  badge_number?: string;
  unit?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit?: string;
  badge_number?: string;
  is_active: boolean;
}

export type OperationStatus = 'planning' | 'active' | 'closed' | 'archived';

export interface Operation {
  id: string;
  name: string;
  procedure_number?: string;
  description?: string;
  responsible_unit?: string;
  responsible_user_id?: string;
  start_date?: string;
  end_date?: string;
  status: OperationStatus;
  created_at: string;
  updated_at: string;
}

export interface OperationDashboard {
  operation: Operation;
  total_targets: number;
  total_devices: number;
  smartphones: number;
  computers: number;
  pendrives: number;
  storage_devices: number;
  in_analysis: number;
  with_report: number;
  in_custody: number;
  movements_count: number;
}

export type PersonType = 'individual' | 'legal_entity';

export interface Target {
  id: string;
  operation_id: string;
  full_name: string;
  social_name?: string;
  nickname?: string;
  cpf?: string;
  rg?: string;
  person_type: PersonType;
  birth_date?: string;
  address?: string;
  observations?: string;
  created_at: string;
  updated_at: string;
}

export type DeviceType =
  | 'smartphone' | 'tablet' | 'notebook' | 'desktop' | 'server'
  | 'hd' | 'ssd' | 'pendrive' | 'memory_card' | 'dvr'
  | 'network_equipment' | 'other';

export type DeviceStatus = 'seized' | 'in_custody' | 'in_analysis' | 'finished' | 'returned';

export interface Device {
  id: string;
  target_id?: string | null;
  operation_id: string;
  evidence_number: string;
  seal_number?: string;
  qr_code_url?: string;
  device_type: DeviceType;
  brand?: string;
  model?: string;
  serial_number?: string;
  color?: string;
  seizure_date?: string;
  seizure_location?: string;
  seizure_observations?: string;
  status: DeviceStatus;
  extra_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type MovementType =
  | 'seizure' | 'reception' | 'transfer' | 'analysis_start'
  | 'analysis_end' | 'report_issued' | 'return' | 'archive';

export interface CustodyMovement {
  id: string;
  device_id: string;
  movement_date: string;
  responsible_user_id?: string;
  responsible_name?: string;
  origin_sector?: string;
  destination_sector?: string;
  movement_type: MovementType;
  reason?: string;
  observation?: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  responsible?: string;
  origin?: string;
  destination?: string;
  observation?: string;
}

export interface TimelineStep {
  step: string;
  label: string;
  completed: boolean;
  events: TimelineEvent[];
}

export interface TimelineData {
  device_id: string;
  timeline: TimelineStep[];
}

export type PhotoCategory =
  | 'front' | 'back' | 'seal' | 'serial_number' | 'imei' | 'evidence_state' | 'other';

export interface DevicePhoto {
  id: string;
  device_id: string;
  file_path: string;
  file_name: string;
  caption?: string;
  category: PhotoCategory;
  created_at: string;
  url?: string | null;
}

export type ReportStatus = 'drafting' | 'review' | 'signed' | 'cancelled';

export interface ExpertReport {
  id: string;
  device_id: string;
  report_number: string;
  title: string;
  expert_user_id?: string;
  expert_name?: string;
  emission_date?: string;
  status: ReportStatus;
  file_path?: string;
  file_name?: string;
  file_url?: string | null;
  version: number;
  observations?: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrityHash {
  id: string;
  device_id: string;
  md5?: string;
  sha1?: string;
  sha256?: string;
  source_file?: string;
  calculated_at: string;
  calculated_by?: string;
}

export interface Document {
  id: string;
  operation_id: string;
  title: string;
  doc_type: string;
  description?: string;
  file_path?: string;
  file_name?: string;
  file_url?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  username?: string;
  timestamp: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Report Template ───────────────────────────────────────────────
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  version: string;
  file_path?: string;
  file_name?: string;
  file_url?: string | null;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// ── Generated Report ──────────────────────────────────────────────
export interface GeneratedReport {
  id: string;
  template_id?: string;
  template_version?: string;
  device_id: string;
  operation_id?: string;
  user_id?: string;
  report_number: string;
  expert_name?: string;
  emission_date?: string;
  observations?: string;
  docx_path?: string;
  pdf_path?: string;
  docx_name?: string;
  pdf_name?: string;
  placeholder_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  docx_url?: string | null;
  pdf_url?: string | null;
}

// ── Report Preview ────────────────────────────────────────────────
export interface ReportPreview {
  report_number: string;
  expert_name?: string;
  emission_date?: string;
  evidence_number?: string;
  seal_number?: string;
  device_type?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  color?: string;
  imei?: string;
  os?: string;
  storage_capacity?: string;
  seizure_date?: string;
  seizure_location?: string;
  target_name?: string;
  target_cpf?: string;
  operation_name?: string;
  procedure_number?: string;
  hash_md5?: string;
  hash_sha1?: string;
  hash_sha256?: string;
  photos_count: number;
  analysis_start_date?: string;
  observations?: string;
}

// ── Operation Document Preview ────────────────────────────────────
export interface OperationDocumentPreview {
  report_number: string;
  expert_name?: string;
  emission_date?: string;
  operation_name?: string;
  procedure_number?: string;
  responsible_unit?: string;
  start_date?: string;
  end_date?: string;
  operation_status?: string;
  total_targets?: string;
  total_devices?: string;
  observations?: string;
}

// ── Target Document Preview ───────────────────────────────────────
export interface TargetDocumentPreview {
  report_number: string;
  expert_name?: string;
  emission_date?: string;
  target_name?: string;
  target_cpf?: string;
  target_rg?: string;
  target_nickname?: string;
  target_birth_date?: string;
  target_address?: string;
  total_devices?: string;
  operation_name?: string;
  procedure_number?: string;
  responsible_unit?: string;
  observations?: string;
}

// ── Generated Document (Operation/Target) ────────────────────────
export interface GeneratedDocument {
  id: string;
  template_id?: string;
  template_version?: string;
  device_id?: string | null;
  operation_id?: string;
  target_id?: string;
  user_id?: string;
  source_type?: string;
  report_number: string;
  expert_name?: string;
  emission_date?: string;
  observations?: string;
  docx_path?: string;
  pdf_path?: string;
  docx_name?: string;
  pdf_name?: string;
  placeholder_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  docx_url?: string | null;
  pdf_url?: string | null;
}

// ── Deployment Teams ──────────────────────────────────────────────
export interface DeploymentTeamMember {
  id: string;
  team_id: string;
  user_id?: string | null;
  member_name?: string | null;
  member_role?: string | null;
  assigned_at: string;
  assigned_by?: string;
  user?: User;
}

export interface DeploymentTeamTarget {
  id: string;
  team_id: string;
  target_id: string;
  assigned_at: string;
  assigned_by?: string;
  target?: Target;
}

export interface DeploymentTeam {
  id: string;
  operation_id: string;
  name: string;
  description?: string;
  leader_id?: string;
  created_at: string;
  updated_at: string;
  members: DeploymentTeamMember[];
  target_assignments: DeploymentTeamTarget[];
}

// ── Target Photo ──────────────────────────────────────────────────
export interface TargetPhoto {
  id: string;
  target_id: string;
  file_path: string;
  file_name: string;
  caption?: string;
  created_at: string;
  url?: string | null;
}

// ── Target History ────────────────────────────────────────────────
export interface TargetHistoryResult {
  target_id: string;
  full_name: string;
  social_name?: string;
  nickname?: string;
  cpf?: string;
  rg?: string;
  person_type: PersonType;
  birth_date?: string;
  operation_id: string;
  operation_name: string;
  operation_code?: string;
  operation_status: OperationStatus;
  registered_at: string;
}
// ── Target Global Search ──────────────────────────────────────────
export interface TargetSearchResult {
  id: string;
  operation_id: string;
  operation_name: string;
  operation_status: OperationStatus;
  full_name: string;
  social_name?: string | null;
  nickname?: string | null;
  cpf?: string | null;
  rg?: string | null;
  person_type: string;
  birth_date?: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Statistics ────────────────────────────────────────────────────────────

export interface StatCountItem {
  type?: string;
  status?: string;
  count: number;
}

export interface TopOperation {
  id: string;
  name: string;
  procedure_number?: string;
  status: string;
  devices: number;
  targets: number;
}

export interface TopTarget {
  id: string;
  name: string;
  cpf?: string;
  devices: number;
}

export interface RecentActivity {
  date: string;
  type: string;
  responsible?: string;
  origin?: string;
  destination?: string;
  observation?: string;
}

export interface SystemStats {
  generated_at: string;
  year_filter: number | null;
  available_years: number[];
  totals: {
    operations: number;
    targets: number;
    devices: number;
    custody_movements: number;
    expert_reports: number;
    generated_documents: number;
    users: number;
    photos: number;
  };
  operations_by_status: StatCountItem[];
  devices_by_type: StatCountItem[];
  devices_by_status: StatCountItem[];
  movements_by_type: StatCountItem[];
  top_operations: TopOperation[];
  recent_activity: RecentActivity[];
}

export interface OperationStats {
  generated_at: string;
  operation: {
    id: string;
    name: string;
    procedure_number?: string;
    responsible_unit?: string;
    status: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  };
  totals: {
    targets: number;
    devices: number;
    custody_movements: number;
    expert_reports: number;
    generated_documents: number;
    photos: number;
  };
  devices_by_type: StatCountItem[];
  devices_by_status: StatCountItem[];
  movements_by_type: StatCountItem[];
  top_targets: TopTarget[];
  recent_movements: RecentActivity[];
}
