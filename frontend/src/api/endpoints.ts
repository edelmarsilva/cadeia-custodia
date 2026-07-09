import api from './client';
import type {
  AuditLog, CustodyMovement, DeploymentTeam, DeploymentTeamMember,
  DeploymentTeamTarget, Device, DevicePhoto, Document,
  ExpertReport, GeneratedReport, IntegrityHash, Operation, OperationDashboard,
  PaginatedResponse, ReportPreview, ReportTemplate, Target, TargetHistoryResult,
  TargetPhoto, TargetSearchResult, TimelineData, User,
} from '@/types';

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
  me: () => api.get('/auth/me'),
};

// ── Users ────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<User>>('/users', { params }),
  listAll: () =>
    api.get<PaginatedResponse<User>>('/users', { params: { page: 1, page_size: 200 } }),
  create: (data: object) => api.post<User>('/users', data),
  get: (id: string) => api.get<User>(`/users/${id}`),
  update: (id: string, data: object) => api.patch<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// ── Operations ───────────────────────────────────────────────
export const operationsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; search?: string }) =>
    api.get<PaginatedResponse<Operation>>('/operations', { params }),
  create: (data: object) => api.post<Operation>('/operations', data),
  get: (id: string) => api.get<OperationDashboard>(`/operations/${id}`),
  update: (id: string, data: object) => api.patch<Operation>(`/operations/${id}`, data),
  archive: (id: string) => api.delete(`/operations/${id}`),
  listDocuments: (id: string) => api.get<Document[]>(`/operations/${id}/documents`),
  uploadDocument: (id: string, formData: FormData) =>
    api.post<Document>(`/operations/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000,
    }),
  deleteDocument: (documentId: string) => api.delete(`/operations/documents/${documentId}`),
};

// ── Operation Users (Team) ────────────────────────────────────
export const operationUsersApi = {
  list: (operationId: string) =>
    api.get<any[]>(`/operations/${operationId}/users`),
  assign: (operationId: string, userId: string) =>
    api.post<any>(`/operations/${operationId}/users`, { user_id: userId }),
  remove: (operationId: string, userId: string) =>
    api.delete(`/operations/${operationId}/users/${userId}`),
};

// ── Targets ──────────────────────────────────────────────────
export const targetsApi = {
  list: (operationId: string, params?: { page?: number; search?: string }) =>
    api.get<PaginatedResponse<Target>>(`/operations/${operationId}/targets`, { params }),
  create: (operationId: string, data: object) =>
    api.post<Target>(`/operations/${operationId}/targets`, data),
  get: (id: string) => api.get<Target>(`/targets/${id}`),
  update: (id: string, data: object) => api.patch<Target>(`/targets/${id}`, data),
  delete: (id: string) => api.delete(`/targets/${id}`),
};

// ── Devices ──────────────────────────────────────────────────
export const devicesApi = {
  listByTarget: (targetId: string, params?: { page?: number }) =>
    api.get<PaginatedResponse<Device>>(`/targets/${targetId}/devices`, { params }),
  listByOperation: (operationId: string, params?: { page?: number }) =>
    api.get<PaginatedResponse<Device>>(`/operations/${operationId}/devices`, { params }),
  create: (targetId: string, data: object) =>
    api.post<Device>(`/targets/${targetId}/devices`, data),
  createForOperation: (operationId: string, data: object) =>
    api.post<Device>(`/operations/${operationId}/devices`, data),
  get: (id: string) => api.get<Device>(`/devices/${id}`),
  update: (id: string, data: object) => api.patch<Device>(`/devices/${id}`, data),
  delete: (id: string) => api.delete(`/devices/${id}`),
};

// ── Custody ──────────────────────────────────────────────────
export const custodyApi = {
  getHistory: (deviceId: string) =>
    api.get<CustodyMovement[]>(`/devices/${deviceId}/custody`),
  getTimeline: (deviceId: string) =>
    api.get<TimelineData>(`/devices/${deviceId}/timeline`),
  registerMovement: (deviceId: string, data: object) =>
    api.post<CustodyMovement>(`/devices/${deviceId}/custody`, data),
};

// ── Photos ───────────────────────────────────────────────────
export const photosApi = {
  list: (deviceId: string) =>
    api.get<DevicePhoto[]>(`/devices/${deviceId}/photos`),
  upload: (deviceId: string, formData: FormData) =>
    api.post<DevicePhoto>(`/devices/${deviceId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000,
    }),
  delete: (photoId: string) => api.delete(`/photos/${photoId}`),
};

// ── Reports ──────────────────────────────────────────────────
export const reportsApi = {
  list: (deviceId: string) =>
    api.get<ExpertReport[]>(`/devices/${deviceId}/reports`),
  create: (deviceId: string, body: Record<string, string>, file?: File) => {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (file) fd.append('file', file);
    return api.post<ExpertReport>(`/devices/${deviceId}/reports`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000,
    });
  },
  update: (reportId: string, data: object) =>
    api.patch<ExpertReport>(`/reports/${reportId}`, data),
};

// ── Hashes ────────────────────────────────────────────────────
export const hashesApi = {
  list: (deviceId: string) =>
    api.get<IntegrityHash[]>(`/devices/${deviceId}/hashes`),
  register: (deviceId: string, data: object) =>
    api.post<IntegrityHash>(`/devices/${deviceId}/hashes`, data),
  /** Verifica se um hash já existe em outro dispositivo. */
  check: (params: { md5?: string; sha1?: string; sha256?: string; exclude_device_id?: string }) =>
    api.get<{
      found: boolean;
      conflict?: {
        device_id: string;
        evidence_number: string;
        device_type: string;
        brand: string | null;
        model: string | null;
        hash_type: string;
        hash_value: string;
      };
    }>('/hashes/check', { params }),
};

// ── Audit ────────────────────────────────────────────────────
export const auditApi = {
  getLogs: (params?: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
    page?: number;
    page_size?: number;
  }) => api.get<PaginatedResponse<AuditLog>>('/audit', { params }),
};

// ── Report Templates ──────────────────────────────────────────
export const reportTemplatesApi = {
  list: (activeOnly = true) =>
    api.get<ReportTemplate[]>('/report-templates', { params: { active_only: activeOnly } }),
  get: (id: string) => api.get<ReportTemplate>(`/report-templates/${id}`),
  create: (formData: FormData) =>
    api.post<ReportTemplate>('/report-templates', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    }),
  update: (id: string, formData: FormData) =>
    api.patch<ReportTemplate>(`/report-templates/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    }),
  delete: (id: string) => api.delete(`/report-templates/${id}`),
  download: (id: string) =>
    api.get<{ url: string; file_name: string }>(`/report-templates/${id}/download`),
};

// ── Report Generation ─────────────────────────────────────────
export const reportGenerationApi = {
  preview: (deviceId: string, data: object) =>
    api.post<ReportPreview>(`/devices/${deviceId}/generate-report/preview`, data),
  generate: (deviceId: string, data: object) =>
    api.post<GeneratedReport>(`/devices/${deviceId}/generate-report`, data, {
      timeout: 300_000, // 5 min — LibreOffice pode demorar
    }),
  listByDevice: (deviceId: string) =>
    api.get<GeneratedReport[]>(`/devices/${deviceId}/generated-reports`),
  listAll: (params?: { page?: number; page_size?: number }) =>
    api.get<GeneratedReport[]>('/generated-reports', { params }),
  downloadDocx: (reportId: string) =>
    api.get<{ url: string; file_name: string }>(`/generated-reports/${reportId}/download/docx`),
  downloadPdf: (reportId: string) =>
    api.get<{ url: string; file_name: string }>(`/generated-reports/${reportId}/download/pdf`),
};

// ── Deployment Teams ──────────────────────────────────────────
export const deploymentTeamsApi = {
  list: (operationId: string) =>
    api.get<DeploymentTeam[]>(`/operations/${operationId}/teams`),
  get: (operationId: string, teamId: string) =>
    api.get<DeploymentTeam>(`/operations/${operationId}/teams/${teamId}`),
  create: (operationId: string, data: object) =>
    api.post<DeploymentTeam>(`/operations/${operationId}/teams`, data),
  update: (operationId: string, teamId: string, data: object) =>
    api.patch<DeploymentTeam>(`/operations/${operationId}/teams/${teamId}`, data),
  delete: (operationId: string, teamId: string) =>
    api.delete(`/operations/${operationId}/teams/${teamId}`),
  // Members
  addMember: (operationId: string, teamId: string, payload: { user_id?: string; member_name?: string; member_role?: string }) =>
    api.post<DeploymentTeamMember>(`/operations/${operationId}/teams/${teamId}/members`, payload),
  removeMember: (operationId: string, teamId: string, memberId: string) =>
    api.delete(`/operations/${operationId}/teams/${teamId}/members/${memberId}`),
  // Targets
  assignTarget: (operationId: string, teamId: string, targetId: string) =>
    api.post<DeploymentTeamTarget>(`/operations/${operationId}/teams/${teamId}/targets`, { target_id: targetId }),
  removeTarget: (operationId: string, teamId: string, targetId: string) =>
    api.delete(`/operations/${operationId}/teams/${teamId}/targets/${targetId}`),
};

// ── Target Photos ─────────────────────────────────────────────
export const targetPhotosApi = {
  list: (targetId: string) =>
    api.get<TargetPhoto[]>(`/targets/${targetId}/photos`),
  upload: (targetId: string, formData: FormData) =>
    api.post<TargetPhoto>(`/targets/${targetId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000,
    }),
  delete: (photoId: string) => api.delete(`/target-photos/${photoId}`),
};

// ── Target History ────────────────────────────────────────────
export const targetHistoryApi = {
  search: (params: { q?: string; cpf?: string; rg?: string; nickname?: string; limit?: number }) =>
    api.get<TargetHistoryResult[]>('/targets/history/search', { params }),
  getHistory: (targetId: string) =>
    api.get<TargetHistoryResult[]>(`/targets/${targetId}/history`),
};

// ── Target Global Search ──────────────────────────────────────
export const targetSearchApi = {
  search: (params: { q?: string; cpf?: string; nickname?: string; operation_id?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<TargetSearchResult>>('/targets/search', { params }),
};
