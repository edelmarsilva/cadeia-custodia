import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  FileText, ArrowLeft, Wand2, Eye, Download, CheckCircle,
  ChevronDown, ChevronUp, AlertTriangle, FileCheck, BookOpen, Copy,
} from 'lucide-react';
import { devicesApi, reportTemplatesApi, reportGenerationApi } from '@/api/endpoints';
import type { Device, ReportTemplate, ReportPreview } from '@/types';
import { formatDate, formatDateTime } from '@/utils/format';
import { DEVICE_TYPE_LABELS } from '@/utils/labels';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

// ── Tabela de pré-visualização ────────────────────────────────────
function PreviewTable({ preview }: { preview: ReportPreview }) {
  const rows: [string, string | number | undefined][] = [
    ['Número do Laudo', preview.report_number],
    ['Perito Responsável', preview.expert_name],
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
    ['Cor', preview.color],
    ['Data de Apreensão', preview.seizure_date],
    ['Local de Apreensão', preview.seizure_location],
    ['Data de Início da Análise', preview.analysis_start_date],
    ['—', '—'],
    ['Nome do Alvo', preview.target_name],
    ['CPF do Alvo', preview.target_cpf],
    ['—', '—'],
    ['Operação', preview.operation_name],
    ['Nº do Procedimento', preview.procedure_number],
    ['—', '—'],
    ['Hash MD5', preview.hash_md5],
    ['Hash SHA-1', preview.hash_sha1],
    ['Hash SHA-256', preview.hash_sha256],
    ['—', '—'],
    ['Fotos disponíveis', `${preview.photos_count} foto(s)`],
    ['Observações', preview.observations],
  ];

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
              fontSize: 12, fontFamily: typeof value === 'string' && value.length > 20 ? 'var(--font-mono)' : undefined,
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

// ── Painel de Placeholders ──────────────────────────────────────
function PlaceholdersPanel({ placeholders }: { placeholders: { text_placeholders: { placeholder: string; field: string }[]; image_placeholders: { placeholder: string; category: string }[] } | null }) {
  if (!placeholders) return null;
  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <BookOpen size={16} /> Placeholders Disponíveis
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {placeholders.text_placeholders.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Texto</div>
            {placeholders.text_placeholders.map((p, i) => (
              <div key={i} style={{ fontSize: 12, padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                <code>{p.placeholder}</code>
                <span style={{ color: 'var(--text-muted)' }}>{p.field}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────────────────────────
export default function GenerateReportPage() {
  const { id: deviceId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [device, setDevice] = useState<Device | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [placeholders, setPlaceholders] = useState<{ text_placeholders: { placeholder: string; field: string }[]; image_placeholders: { placeholder: string; category: string }[] } | null>(null);
  const [showPlaceholders, setShowPlaceholders] = useState(false);

  // Formulário
  const [templateId, setTemplateId] = useState('');
  const [reportNumber, setReportNumber] = useState('');
  const [expertName, setExpertName] = useState(user?.full_name || '');
  const [emissionDate, setEmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');

  // Preview
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Geração
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ docxUrl?: string; pdfUrl?: string; reportId?: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!deviceId) return;
      try {
        const [{ data: dev }, { data: tpls }] = await Promise.all([
          devicesApi.get(deviceId),
          reportTemplatesApi.list(true),
        ]);
        setDevice(dev);
        setTemplates(tpls);
        // Pré-seleciona template passado via query param
        const paramTemplateId = searchParams.get('template_id');
        if (paramTemplateId && tpls.some((t) => t.id === paramTemplateId)) {
          setTemplateId(paramTemplateId);
        } else if (tpls.length > 0) {
          setTemplateId(tpls[0].id);
        }
        // Carrega placeholders em background
        reportTemplatesApi.placeholders()
          .then((r) => setPlaceholders(r.data))
          .catch(() => {});
      } catch {
        toast.error('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [deviceId]);

  const buildPayload = () => ({
    template_id: templateId,
    report_number: reportNumber,
    expert_name: expertName || null,
    emission_date: emissionDate || null,
    observations: observations || null,
  });

  const handlePreview = async () => {
    if (!deviceId || !templateId || !reportNumber.trim()) {
      toast.error('Preencha o modelo, número do laudo antes de visualizar.');
      return;
    }
    setPreviewLoading(true);
    try {
      const { data } = await reportGenerationApi.preview(deviceId, buildPayload());
      setPreview(data);
      setShowPreview(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao gerar pré-visualização.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!deviceId || !templateId || !reportNumber.trim()) {
      toast.error('Preencha o modelo e o número do laudo.');
      return;
    }
    setGenerating(true);
    try {
      const { data } = await reportGenerationApi.generate(deviceId, buildPayload());
      toast.success('Laudo gerado com sucesso!');
      setGenerated({
        docxUrl: data.docx_url || undefined,
        pdfUrl: data.pdf_url || undefined,
        reportId: data.id,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao gerar laudo.');
    } finally {
      setGenerating(false);
    }
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

  if (!device) {
    return (
      <div className="page">
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          Dispositivo não encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Link to={`/devices/${deviceId}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 13 }}>
          <ArrowLeft size={14} /> Voltar ao Dispositivo
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Gerar Laudo</span>
      </div>

      {/* Sucesso de geração */}
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
              Laudo gerado com sucesso!
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
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/devices/${deviceId}`)}
            >
              Ver Histórico de Laudos
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
                <Wand2 size={18} color="var(--color-primary)" />
                Gerar Laudo Pericial
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Dispositivo: <strong style={{ color: 'var(--text-secondary)' }}>
                  {device.brand} {device.model} — {device.evidence_number}
                </strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Modelo */}
              <div className="form-group">
                <label className="form-label">Modelo de Laudo *</label>
                {templates.length === 0 ? (
                  <div style={{
                    padding: '12px 16px', borderRadius: 8,
                    background: 'var(--bg-warning)', fontSize: 13,
                    color: 'var(--color-warning)',
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}>
                    <AlertTriangle size={14} style={{ marginRight: 6 }} />
                    Nenhum modelo ativo cadastrado.{' '}
                    <Link to="/pericia/templates" style={{ color: 'var(--color-primary)' }}>
                      Cadastrar modelo
                    </Link>
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value={templateId}
                    onChange={e => setTemplateId(e.target.value)}
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (v{t.version})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Número do Laudo */}
              <div className="form-group">
                <label className="form-label">Número do Laudo *</label>
                <input
                  className="form-input"
                  value={reportNumber}
                  onChange={e => setReportNumber(e.target.value)}
                  placeholder="Ex: LAU-001/2024"
                />
              </div>

              {/* Perito */}
              <div className="form-group">
                <label className="form-label">Perito Responsável</label>
                <input
                  className="form-input"
                  value={expertName}
                  onChange={e => setExpertName(e.target.value)}
                  placeholder="Nome completo do perito"
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
                  placeholder="Informações adicionais para o laudo..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost"
                  onClick={handlePreview}
                  disabled={previewLoading || !templateId || !reportNumber}
                >
                  <Eye size={15} />
                  {previewLoading ? 'Carregando...' : 'Pré-visualizar Dados'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={generating || !templateId || !reportNumber}
                  style={{ flex: 1 }}
                >
                  <Wand2 size={15} />
                  {generating ? 'Gerando laudo...' : 'Gerar Laudo (DOCX + PDF)'}
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

        {/* Coluna direita — info dispositivo + preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Resumo do dispositivo */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
              📱 Dados do Dispositivo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 12 }}>
              {[
                ['Tipo', DEVICE_TYPE_LABELS[device.device_type] || device.device_type],
                ['Fabricante', device.brand],
                ['Modelo', device.model],
                ['Nº Evidência', device.evidence_number],
                ['Nº Lacre', device.seal_number],
                ['Serial', device.serial_number],
                ['Data Apreensão', device.seizure_date ? formatDate(device.seizure_date) : null],
              ].map(([label, val]) => (
                val ? (
                  <div key={label as string}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>{label}</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{val}</div>
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {/* Pré-visualização */}
          {preview && (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div
                onClick={() => setShowPreview(!showPreview)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', marginBottom: showPreview ? 16 : 0,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={14} />
                  Pré-visualização dos Dados ({Object.values(preview).filter(Boolean).length - 1} campos)
                </div>
                {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              {showPreview && <PreviewTable preview={preview} />}
            </div>
          )}
          {/* Painel de Placeholders */}
          {placeholders && (
            <div className="card" style={{ padding: '16px 20px' }}>
              <div
                onClick={() => setShowPlaceholders(!showPlaceholders)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', marginBottom: showPlaceholders ? 16 : 0,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={14} /> Placeholders Disponíveis no Template
                </div>
                {showPlaceholders ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              {showPlaceholders && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Texto ({placeholders.text_placeholders.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
                      {placeholders.text_placeholders.map((p) => (
                        <div
                          key={p.placeholder}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '5px 8px', borderRadius: 6,
                            background: 'var(--bg-base)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            navigator.clipboard.writeText(p.placeholder);
                            toast.success(`${p.placeholder} copiado!`);
                          }}
                          title="Clique para copiar"
                        >
                          <code style={{ fontSize: 11, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', flex: 1 }}>
                            {p.placeholder}
                          </code>
                          <Copy size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Imagem ({placeholders.image_placeholders.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
                      {placeholders.image_placeholders.map((p) => (
                        <div
                          key={p.placeholder}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '5px 8px', borderRadius: 6,
                            background: 'var(--bg-base)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            navigator.clipboard.writeText(p.placeholder);
                            toast.success(`${p.placeholder} copiado!`);
                          }}
                          title="Clique para copiar"
                        >
                          <code style={{ fontSize: 11, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', flex: 1 }}>
                            {p.placeholder}
                          </code>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.category}</span>
                          <Copy size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface-2)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.6 }}>
                    💡 <strong>Como usar:</strong> Insira os placeholders (ex: <code>{'{{NUMERO_LAUDO}}'}</code>) no seu documento DOCX.
                    Eles serão substituídos automaticamente pelos dados do dispositivo ao gerar o laudo.
                    Clique em qualquer placeholder para copiá-lo.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
