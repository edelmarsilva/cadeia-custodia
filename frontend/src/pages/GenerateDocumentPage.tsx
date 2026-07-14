import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  FileText, ArrowLeft, Wand2, Eye, Download, CheckCircle,
  ChevronDown, ChevronUp, AlertTriangle, FileCheck, BookOpen, Copy,
  Building2, Users,
} from 'lucide-react';
import { devicesApi, operationsApi, targetsApi, reportTemplatesApi, reportGenerationApi } from '@/api/endpoints';
import type {
  Device, Operation, Target, ReportTemplate,
  ReportPreview, OperationDocumentPreview, TargetDocumentPreview, GeneratedDocument, GeneratedReport,
} from '@/types';
import { formatDate } from '@/utils/format';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

// ── Tipos de contexto ─────────────────────────────────────────────
type SourceType = 'device' | 'operation' | 'target';

// ── Tabela de pré-visualização genérica ──────────────────────────
function PreviewTable({ rows }: { rows: [string, string | number | undefined | null][] }) {
  return (
    <div style={{
      background: 'var(--bg-base)',
      borderRadius: 10,
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {rows.map(([label, value], i) => {
        if (label === '—') {
          return <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />;
        }
        return (
          <div key={i} style={{
            display: 'flex',
            padding: '8px 16px',
            gap: 16,
            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
          }}>
            <span style={{ width: 220, flexShrink: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              {label}
            </span>
            <span style={{
              fontSize: 12,
              color: value ? 'var(--text-primary)' : 'var(--text-muted)',
              fontStyle: value ? 'normal' : 'italic',
              wordBreak: 'break-all',
            }}>
              {value || 'Não informado'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Preview para dispositivo ──────────────────────────────────────
function DevicePreviewRows({ preview }: { preview: ReportPreview }) {
  const rows: [string, string | number | undefined | null][] = [
    ['Número do Documento', preview.report_number],
    ['Responsável', preview.expert_name],
    ['Data de Emissão', preview.emission_date],
    ['—', '—'],
    ['Nº da Evidência', preview.evidence_number],
    ['Nº do Lacre', preview.seal_number],
    ['Tipo de Dispositivo', preview.device_type],
    ['Fabricante', preview.brand],
    ['Modelo', preview.model],
    ['Número de Série', preview.serial_number],
    ['IMEI', preview.imei],
    ['Sistema Operacional', preview.os],
    ['Capacidade', preview.storage_capacity],
    ['—', '—'],
    ['Nome do Alvo', preview.target_name],
    ['CPF do Alvo', preview.target_cpf],
    ['—', '—'],
    ['Operação', preview.operation_name],
    ['Nº do Procedimento', preview.procedure_number],
    ['—', '—'],
    ['Hash MD5', preview.hash_md5],
    ['Hash SHA-256', preview.hash_sha256],
  ];
  return <PreviewTable rows={rows} />;
}

// ── Preview para operação ─────────────────────────────────────────
function OperationPreviewRows({ preview }: { preview: OperationDocumentPreview }) {
  const rows: [string, string | number | undefined | null][] = [
    ['Número do Documento', preview.report_number],
    ['Responsável', preview.expert_name],
    ['Data de Emissão', preview.emission_date],
    ['—', '—'],
    ['Nome da Operação', preview.operation_name],
    ['Nº do Procedimento', preview.procedure_number],
    ['Unidade Responsável', preview.responsible_unit],
    ['Data de Início', preview.start_date],
    ['Data de Encerramento', preview.end_date],
    ['Status', preview.operation_status],
    ['—', '—'],
    ['Total de Alvos', preview.total_targets],
    ['Total de Dispositivos', preview.total_devices],
    ['—', '—'],
    ['Observações', preview.observations],
  ];
  return <PreviewTable rows={rows} />;
}

// ── Preview para alvo ─────────────────────────────────────────────
function TargetPreviewRows({ preview }: { preview: TargetDocumentPreview }) {
  const rows: [string, string | number | undefined | null][] = [
    ['Número do Documento', preview.report_number],
    ['Responsável', preview.expert_name],
    ['Data de Emissão', preview.emission_date],
    ['—', '—'],
    ['Nome do Alvo', preview.target_name],
    ['CPF', preview.target_cpf],
    ['RG', preview.target_rg],
    ['Apelido', preview.target_nickname],
    ['Data de Nascimento', preview.target_birth_date],
    ['Endereço', preview.target_address],
    ['Dispositivos Associados', preview.total_devices],
    ['—', '—'],
    ['Operação', preview.operation_name],
    ['Nº do Procedimento', preview.procedure_number],
    ['Unidade Responsável', preview.responsible_unit],
    ['—', '—'],
    ['Observações', preview.observations],
  ];
  return <PreviewTable rows={rows} />;
}

// ── Painel de Placeholders ────────────────────────────────────────
function PlaceholdersPanel({
  placeholders,
  show,
  onToggle,
}: {
  placeholders: { text_placeholders: { placeholder: string; field: string }[]; image_placeholders: { placeholder: string; category: string }[] } | null;
  show: boolean;
  onToggle: () => void;
}) {
  if (!placeholders) return null;
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div
        onClick={onToggle}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: show ? 16 : 0 }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={14} /> Placeholders Disponíveis no Template
        </div>
        {show ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {show && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Texto ({placeholders.text_placeholders.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
              {placeholders.text_placeholders.map((p) => (
                <div
                  key={p.placeholder}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, background: 'var(--bg-base)', border: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => { navigator.clipboard.writeText(p.placeholder); toast.success(`${p.placeholder} copiado!`); }}
                  title="Clique para copiar"
                >
                  <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', flex: 1 }}>{p.placeholder}</code>
                  <Copy size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface-2)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.6 }}>
            💡 <strong>Como usar:</strong> Insira os placeholders (ex: <code>{'{{NUMERO_LAUDO}}'}</code>) no seu documento DOCX. Eles serão substituídos automaticamente ao gerar o documento.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function GenerateDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Detecta o tipo de contexto a partir da URL
  const pathname = window.location.pathname;
  const sourceType: SourceType = pathname.includes('/operations/')
    ? 'operation'
    : pathname.includes('/targets/')
    ? 'target'
    : 'device';

  // Dados da entidade
  const [entity, setEntity] = useState<Device | Operation | Target | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [placeholders, setPlaceholders] = useState<{ text_placeholders: { placeholder: string; field: string }[]; image_placeholders: { placeholder: string; category: string }[] } | null>(null);
  const [showPlaceholders, setShowPlaceholders] = useState(false);

  // Formulário
  const [templateId, setTemplateId] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [responsible, setResponsible] = useState(user?.full_name || '');
  const [emissionDate, setEmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');

  // Preview
  const [preview, setPreview] = useState<ReportPreview | OperationDocumentPreview | TargetDocumentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Geração
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ docxUrl?: string; pdfUrl?: string; id?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [entityRes, tplRes] = await Promise.all([
          sourceType === 'operation'
            ? operationsApi.get(id).then((r) => ({ data: r.data.operation }))
            : sourceType === 'target'
            ? targetsApi.get(id)
            : devicesApi.get(id),
          reportTemplatesApi.list(true),
        ]);
        setEntity(entityRes.data as any);
        setTemplates(tplRes.data);
        const paramTemplateId = searchParams.get('template_id');
        if (paramTemplateId && tplRes.data.some((t) => t.id === paramTemplateId)) {
          setTemplateId(paramTemplateId);
        } else if (tplRes.data.length > 0) {
          setTemplateId(tplRes.data[0].id);
        }
        reportTemplatesApi.placeholders().then((r) => setPlaceholders(r.data)).catch(() => {});
      } catch {
        toast.error('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, sourceType]);

  const buildPayload = () => ({
    template_id: templateId,
    report_number: docNumber,
    expert_name: responsible || null,
    emission_date: emissionDate || null,
    observations: observations || null,
  });

  const handlePreview = async () => {
    if (!id || !templateId || !docNumber.trim()) {
      toast.error('Preencha o modelo e o número do documento antes de visualizar.');
      return;
    }
    setPreviewLoading(true);
    try {
      let data: any;
      if (sourceType === 'operation') {
        const res = await reportGenerationApi.previewForOperation(id, buildPayload());
        data = res.data;
      } else if (sourceType === 'target') {
        const res = await reportGenerationApi.previewForTarget(id, buildPayload());
        data = res.data;
      } else {
        const res = await reportGenerationApi.preview(id, buildPayload());
        data = res.data;
      }
      setPreview(data);
      setShowPreview(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao gerar pré-visualização.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!id || !templateId || !docNumber.trim()) {
      toast.error('Preencha o modelo e o número do documento.');
      return;
    }
    setGenerating(true);
    try {
      let data: GeneratedDocument | GeneratedReport;
      if (sourceType === 'operation') {
        const res = await reportGenerationApi.generateForOperation(id, buildPayload());
        data = res.data;
      } else if (sourceType === 'target') {
        const res = await reportGenerationApi.generateForTarget(id, buildPayload());
        data = res.data;
      } else {
        const res = await reportGenerationApi.generate(id, buildPayload());
        data = res.data;
      }
      toast.success('Documento gerado com sucesso!');
      setGenerated({
        docxUrl: (data as any).docx_url || undefined,
        pdfUrl: (data as any).pdf_url || undefined,
        id: data.id,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao gerar documento.');
    } finally {
      setGenerating(false);
    }
  };

  const getBackLink = () => {
    if (sourceType === 'operation') return `/operations/${id}`;
    if (sourceType === 'target') return `/targets/${id}`;
    return `/devices/${id}`;
  };

  const getEntityLabel = () => {
    if (!entity) return '';
    if (sourceType === 'operation') return (entity as Operation).name;
    if (sourceType === 'target') return (entity as Target).full_name;
    const d = entity as Device;
    return `${d.brand || ''} ${d.model || ''} — ${d.evidence_number}`.trim();
  };

  const getSourceIcon = () => {
    if (sourceType === 'operation') return <Building2 size={16} color="var(--color-primary)" />;
    if (sourceType === 'target') return <Users size={16} color="var(--color-accent)" />;
    return <Wand2 size={16} color="var(--color-primary)" />;
  };

  const getSourceLabel = () => {
    if (sourceType === 'operation') return 'Operação';
    if (sourceType === 'target') return 'Alvo';
    return 'Dispositivo';
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando...
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          {getSourceLabel()} não encontrado(a).
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Link to={getBackLink()} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 13 }}>
          <ArrowLeft size={14} /> Voltar
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Gerar Documento</span>
      </div>

      {/* Sucesso */}
      {generated && (
        <div style={{
          marginBottom: 24,
          background: 'var(--bg-success)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 12,
          padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <FileCheck size={20} color="var(--color-success)" />
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-success)' }}>
              Documento gerado com sucesso!
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {generated.docxUrl && (
              <a href={generated.docxUrl} target="_blank" rel="noreferrer">
                <button className="btn btn-primary btn-sm">
                  <Download size={14} /> Baixar DOCX
                </button>
              </a>
            )}
            {generated.pdfUrl && (
              <a href={generated.pdfUrl} target="_blank" rel="noreferrer">
                <button className="btn btn-ghost btn-sm">
                  <Download size={14} /> Baixar PDF
                </button>
              </a>
            )}
            {!generated.pdfUrl && (
              <span style={{ fontSize: 12, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={13} /> PDF não disponível (LibreOffice pode não estar instalado)
              </span>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(getBackLink())}>
              Voltar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Formulário */}
        <div>
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                {getSourceIcon()}
                Gerar Documento
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {getSourceLabel()}: <strong style={{ color: 'var(--text-secondary)' }}>{getEntityLabel()}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Template */}
              <div className="form-group">
                <label className="form-label">Modelo de Documento *</label>
                {templates.length === 0 ? (
                  <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--bg-warning)', fontSize: 13, color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <AlertTriangle size={14} style={{ marginRight: 6 }} />
                    Nenhum modelo ativo cadastrado.{' '}
                    <Link to="/pericia/templates" style={{ color: 'var(--color-primary)' }}>Cadastrar modelo</Link>
                  </div>
                ) : (
                  <select className="form-select" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Número do Documento */}
              <div className="form-group">
                <label className="form-label">Número do Documento *</label>
                <input
                  className="form-input"
                  value={docNumber}
                  onChange={e => setDocNumber(e.target.value)}
                  placeholder="Ex: DOC-001/2024"
                />
              </div>

              {/* Responsável */}
              <div className="form-group">
                <label className="form-label">Responsável pela Emissão</label>
                <input
                  className="form-input"
                  value={responsible}
                  onChange={e => setResponsible(e.target.value)}
                  placeholder="Nome completo do responsável"
                />
              </div>

              {/* Data */}
              <div className="form-group">
                <label className="form-label">Data de Emissão</label>
                <input
                  type="date"
                  className="form-input"
                  value={emissionDate}
                  onChange={e => setEmissionDate(e.target.value)}
                />
              </div>

              {/* Observações */}
              <div className="form-group">
                <label className="form-label">Observações Complementares</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  placeholder="Informações adicionais para o documento..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost"
                  onClick={handlePreview}
                  disabled={previewLoading || !templateId || !docNumber}
                >
                  <Eye size={15} />
                  {previewLoading ? 'Carregando...' : 'Pré-visualizar Dados'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={generating || !templateId || !docNumber}
                  style={{ flex: 1 }}
                >
                  <FileText size={15} />
                  {generating ? 'Gerando documento...' : 'Gerar Documento (DOCX + PDF)'}
                </button>
              </div>
              {generating && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                  Aguarde — substituindo placeholders e convertendo para PDF...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna direita — resumo + preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Resumo da entidade */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {getSourceIcon()} Dados da {getSourceLabel()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 12 }}>
              {sourceType === 'operation' && (() => {
                const op = entity as Operation;
                return [
                  ['Nome', op.name],
                  ['Nº Procedimento', op.procedure_number],
                  ['Unidade', op.responsible_unit],
                  ['Status', op.status],
                  ['Início', op.start_date ? formatDate(op.start_date) : null],
                ].map(([label, val]) => val ? (
                  <div key={label as string}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{val}</div>
                  </div>
                ) : null);
              })()}
              {sourceType === 'target' && (() => {
                const t = entity as Target;
                return [
                  ['Nome', t.full_name],
                  ['CPF', t.cpf],
                  ['RG', t.rg],
                  ['Apelido', t.nickname],
                  ['Tipo', t.person_type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'],
                ].map(([label, val]) => val ? (
                  <div key={label as string}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{val}</div>
                  </div>
                ) : null);
              })()}
              {sourceType === 'device' && (() => {
                const d = entity as Device;
                return [
                  ['Fabricante', d.brand],
                  ['Modelo', d.model],
                  ['Nº Evidência', d.evidence_number],
                  ['Nº Lacre', d.seal_number],
                  ['Serial', d.serial_number],
                ].map(([label, val]) => val ? (
                  <div key={label as string}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{val}</div>
                  </div>
                ) : null);
              })()}
            </div>
          </div>

          {/* Pré-visualização */}
          {preview && (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div
                onClick={() => setShowPreview(!showPreview)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: showPreview ? 16 : 0 }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} /> Pré-visualização dos Dados
                </div>
                {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              {showPreview && (
                sourceType === 'operation'
                  ? <OperationPreviewRows preview={preview as OperationDocumentPreview} />
                  : sourceType === 'target'
                  ? <TargetPreviewRows preview={preview as TargetDocumentPreview} />
                  : <DevicePreviewRows preview={preview as ReportPreview} />
              )}
            </div>
          )}

          {/* Placeholders */}
          <PlaceholdersPanel
            placeholders={placeholders}
            show={showPlaceholders}
            onToggle={() => setShowPlaceholders(!showPlaceholders)}
          />
        </div>
      </div>
    </div>
  );
}
