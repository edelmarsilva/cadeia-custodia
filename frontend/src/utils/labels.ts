import type { DeviceStatus, OperationStatus, ReportStatus, MovementType } from '@/types';

export const OPERATION_STATUS_LABELS: Record<OperationStatus, string> = {
  planning: 'Planejamento',
  active: 'Em Andamento',
  closed: 'Encerrada',
  archived: 'Arquivada',
};

export const OPERATION_STATUS_BADGE: Record<OperationStatus, string> = {
  planning: 'badge-info',
  active: 'badge-success',
  closed: 'badge-neutral',
  archived: 'badge-warning',
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  seized: 'Apreendido',
  in_custody: 'Em Custódia',
  in_analysis: 'Em Análise',
  finished: 'Finalizado',
  returned: 'Devolvido',
};

export const DEVICE_STATUS_BADGE: Record<DeviceStatus, string> = {
  seized: 'badge-warning',
  in_custody: 'badge-info',
  in_analysis: 'badge-danger',
  finished: 'badge-success',
  returned: 'badge-neutral',
};

export const DEVICE_TYPE_LABELS: Record<string, string> = {
  smartphone: 'Smartphone',
  tablet: 'Tablet',
  notebook: 'Notebook',
  desktop: 'Desktop',
  server: 'Servidor',
  hd: 'HD',
  ssd: 'SSD',
  pendrive: 'Pendrive',
  memory_card: 'Cartão de Memória',
  dvr: 'DVR',
  network_equipment: 'Equip. de Rede',
  other: 'Outros',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  drafting: 'Em Elaboração',
  review: 'Em Revisão',
  signed: 'Assinado',
  cancelled: 'Cancelado',
};

export const REPORT_STATUS_BADGE: Record<ReportStatus, string> = {
  drafting: 'badge-info',
  review: 'badge-warning',
  signed: 'badge-success',
  cancelled: 'badge-danger',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  seizure: 'Apreensão',
  reception: 'Recebimento',
  transfer: 'Transferência',
  analysis_start: 'Início de Análise',
  analysis_end: 'Fim de Análise',
  report_issued: 'Laudo Emitido',
  return: 'Devolução',
  archive: 'Arquivamento',
};

export const PHOTO_CATEGORY_LABELS: Record<string, string> = {
  front: 'Vista Frontal',
  back: 'Vista Traseira',
  seal: 'Lacre',
  serial_number: 'Número de Série',
  imei: 'IMEI',
  evidence_state: 'Estado da Evidência',
  other: 'Outros',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  custody: 'Custódia',
  expert: 'Perito',
  analyst: 'Analista',
  auditor: 'Auditor',
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  judicial_decision: 'Decisão Judicial',
  warrant: 'Mandado',
  seizure_form: 'Ficha de Apreensão',
  report: 'Relatório',
  official_letter: 'Ofício',
  other: 'Outros',
};
