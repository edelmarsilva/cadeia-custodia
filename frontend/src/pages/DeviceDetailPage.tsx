import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, FileText, Hash, Link2, Shield,
  Plus, CheckCircle, Clock, X, Upload, AlertTriangle,
  Download, ZoomIn, ChevronLeft, ChevronRight, Trash2, Wand2, Printer,
} from 'lucide-react';
import { devicesApi, custodyApi, photosApi, reportsApi, hashesApi, targetsApi, reportGenerationApi } from '@/api/endpoints';
import type { Device, Target, TimelineData, DevicePhoto, ExpertReport, IntegrityHash, GeneratedReport } from '@/types';
import { formatDate, formatDateTime } from '@/utils/format';
import {
  DEVICE_TYPE_LABELS, DEVICE_STATUS_BADGE, DEVICE_STATUS_LABELS,
  PHOTO_CATEGORY_LABELS, REPORT_STATUS_LABELS, REPORT_STATUS_BADGE,
} from '@/utils/labels';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store';

// ── Modal de Upload de Foto ───────────────────────────────────────
function PhotoUploadModal({ deviceId, onClose, onSuccess }: { deviceId: string; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState('other');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Selecione uma imagem.');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      if (caption) fd.append('caption', caption);
      await photosApi.upload(deviceId, fd);
      toast.success('Foto adicionada com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar foto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><Camera size={16} /> Upload de Fotografia</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div
            className="upload-zone"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {preview ? (
              <img src={preview} alt="preview" style={{ maxHeight: 180, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
            ) : (
              <>
                <Upload size={32} color="var(--text-muted)" />
                <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
                  Arraste uma imagem ou <span style={{ color: 'var(--color-primary)' }}>clique para selecionar</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG, WEBP — máx. 20MB</div>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          <div className="form-grid" style={{ marginTop: 16 }}>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(PHOTO_CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Legenda</label>
              <input className="form-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Descrição opcional da foto" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !file}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Enviando…</> : <><Upload size={14} /> Enviar Foto</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de Novo Laudo ───────────────────────────────────────────
function ReportModal({ deviceId, onClose, onSuccess }: { deviceId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    report_number: '', title: '', expert_name: '', emission_date: '', status: 'drafting', observations: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await reportsApi.create(deviceId, {
        report_number: form.report_number,
        title: form.title,
        expert_name: form.expert_name,
        emission_date: form.emission_date,
        status: form.status,
        observations: form.observations,
      }, file || undefined);
      toast.success('Laudo criado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao criar laudo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div className="modal-title"><FileText size={16} /> Novo Laudo Pericial</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nº do Laudo *</label>
              <input className="form-input font-mono" value={form.report_number} onChange={(e) => set('report_number', e.target.value)}
                placeholder="LAU-2024-001" required />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="drafting">Elaboração</option>
                <option value="review">Revisão</option>
                <option value="signed">Assinado</option>
                <option value="delivered">Entregue</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="Título descritivo do laudo" required />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Perito Responsável</label>
              <input className="form-input" value={form.expert_name} onChange={(e) => set('expert_name', e.target.value)}
                placeholder="Nome do perito" />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Emissão</label>
              <input className="form-input" type="date" value={form.emission_date} onChange={(e) => set('emission_date', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observations} onChange={(e) => set('observations', e.target.value)}
              rows={3} placeholder="Observações sobre o laudo…" />
          </div>

          <div className="form-group">
            <label className="form-label">Arquivo PDF (opcional)</label>
            <div
              className="upload-zone"
              style={{ padding: '14px', minHeight: 'unset' }}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={20} color="var(--color-primary)" />
                  <span style={{ fontSize: 13 }}>{file.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  <Upload size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Clique para anexar o PDF do laudo
                </div>
              )}
              <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Salvando…</> : <><FileText size={14} /> Criar Laudo</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal de Registro de Hash ─────────────────────────────────────
function HashModal({ deviceId, onClose, onSuccess }: { deviceId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ sha256: '', sha1: '', md5: '', source_file: '' });
  const [loading, setLoading] = useState(false);
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sha256 && !form.sha1 && !form.md5) return toast.error('Informe pelo menos um hash.');
    setLoading(true);
    try {
      const payload = {
        sha256: form.sha256 || null,
        sha1: form.sha1 || null,
        md5: form.md5 || null,
        source_file: form.source_file || null,
      };
      await hashesApi.register(deviceId, payload);
      toast.success('Hash registrado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao registrar hash.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div className="modal-title"><Hash size={16} /> Registrar Hash de Integridade</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 18, background: 'var(--bg-warning)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertTriangle size={15} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--color-warning)', lineHeight: 1.5 }}>
            Registros de hash são <strong>imutáveis</strong>. Verifique os valores antes de confirmar.
          </span>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Arquivo de Origem</label>
            <input className="form-input" value={form.source_file} onChange={(e) => set('source_file', e.target.value)}
              placeholder="Ex: image.dd, dump.bin, forensic.e01" />
          </div>

          <div className="form-group">
            <label className="form-label">SHA-256 <span style={{ color: 'var(--color-primary)', fontSize: 11 }}>(recomendado)</span></label>
            <input className="form-input font-mono" value={form.sha256} onChange={(e) => set('sha256', e.target.value)}
              placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
              style={{ fontSize: 12 }} />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">SHA-1</label>
              <input className="form-input font-mono" value={form.sha1} onChange={(e) => set('sha1', e.target.value)}
                placeholder="da39a3ee5e6b4b0d3255bfef95601890afd80709"
                style={{ fontSize: 11 }} />
            </div>
            <div className="form-group">
              <label className="form-label">MD5</label>
              <input className="form-input font-mono" value={form.md5} onChange={(e) => set('md5', e.target.value)}
                placeholder="d41d8cd98f00b204e9800998ecf8427e"
                style={{ fontSize: 11 }} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Registrando…</> : <><Hash size={14} /> Registrar Hash</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [photos, setPhotos] = useState<DevicePhoto[]>([]);
  const [reports, setReports] = useState<ExpertReport[]>([]);
  const [hashes, setHashes] = useState<IntegrityHash[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'custody' | 'photos' | 'reports' | 'hashes'>('overview');

  // Modais
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showHashModal, setShowHashModal] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const { user: currentUserAuth } = useAuthStore();
  const isAdmin = currentUserAuth?.role === 'admin';

  // Forced download via fetch+blob — garante download mesmo para PDFs e imagens
  // que o browser tentaria abrir inline.
  const handleDownload = async (url: string, fileName: string) => {
    setDownloadingFile(fileName);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      toast.error(`Erro ao baixar arquivo: ${err.message}`);
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDeletePhoto = async (photo: DevicePhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Excluir a foto "${photo.file_name}"? Esta ação é irreversível.`)) return;
    try {
      await photosApi.delete(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      toast.success('Foto excluída.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir foto.');
    }
  };

  const handleDeleteReport = async (reportId: string, reportNumber: string) => {
    if (!confirm(`Excluir o documento "${reportNumber}"? Esta ação é irreversível.`)) return;
    try {
      await reportsApi.delete(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success('Documento excluído.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir documento.');
    }
  };

  const loadDevice = async () => {
    if (!id) return;
    try {
      const [dRes, tRes, phRes, rRes, hRes] = await Promise.all([
        devicesApi.get(id),
        custodyApi.getTimeline(id),
        photosApi.list(id),
        reportsApi.list(id),
        hashesApi.list(id),
      ]);
      setDevice(dRes.data);
      setTimeline(tRes.data);
      setPhotos(phRes.data);
      setReports(rRes.data);
      setHashes(hRes.data);
      // Só busca o alvo se o dispositivo estiver vinculado a um
      if (dRes.data.target_id) {
        const tgtRes = await targetsApi.get(dRes.data.target_id);
        setTarget(tgtRes.data);
      }
    } catch {
      toast.error('Erro ao carregar dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  const reloadTab = async () => {
    if (!id) return;
    if (activeTab === 'photos') {
      const r = await photosApi.list(id); setPhotos(r.data);
    } else if (activeTab === 'reports') {
      const r = await reportsApi.list(id); setReports(r.data);
    } else if (activeTab === 'hashes') {
      const r = await hashesApi.list(id); setHashes(r.data);
    }
  };

  useEffect(() => { loadDevice(); }, [id]);

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!device) return <div className="empty-state"><div className="empty-title">Dispositivo não encontrado.</div></div>;

  const extraEntries = device.extra_data ? Object.entries(device.extra_data) : [];
  const EXTRA_LABELS: Record<string, string> = {
    imei1: 'IMEI 1', imei2: 'IMEI 2', iccid: 'ICCID', phone_number: 'Telefone',
    processor: 'Processador', ram: 'Memória RAM', os: 'Sistema Operacional',
    capacity: 'Capacidade', interface: 'Interface',
  };

  return (
    <div>
      {/* Modais */}
      {showPhotoModal && <PhotoUploadModal deviceId={id!} onClose={() => setShowPhotoModal(false)} onSuccess={reloadTab} />}
      {showReportModal && <ReportModal deviceId={id!} onClose={() => setShowReportModal(false)} onSuccess={reloadTab} />}
      {showHashModal && <HashModal deviceId={id!} onClose={() => setShowHashModal(false)} onSuccess={reloadTab} />}

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 className="page-title" style={{ fontSize: 18 }}>
                {DEVICE_TYPE_LABELS[device.device_type]}{device.brand ? ` — ${device.brand}` : ''}{device.model ? ` ${device.model}` : ''}
              </h1>
              <span className={`badge ${DEVICE_STATUS_BADGE[device.status as keyof typeof DEVICE_STATUS_BADGE] || 'badge-neutral'}`}>
                {DEVICE_STATUS_LABELS[device.status as keyof typeof DEVICE_STATUS_LABELS] || device.status}
              </span>
            </div>
            <p className="page-subtitle">
              Evidência: <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{device.evidence_number}</span>
              {device.seal_number && <> · Lacre: <span className="font-mono">{device.seal_number}</span></>}
              {target && <> · Alvo: <Link to={`/targets/${target.id}`} style={{ color: 'var(--color-accent)' }}>{target.full_name}</Link></>}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {['admin', 'expert', 'analyst'].includes(currentUserAuth?.role || '') && (
            <Link
              to={`/devices/${id}/gerar-documento`}
              className="btn btn-primary btn-sm"
            >
              <FileText size={14} /> Gerar Documento
            </Link>
          )}
          <Link to={`/devices/${id}/custody/new`} className="btn btn-secondary btn-sm">
            <Link2 size={14} /> Registrar Movimentação
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {([
          { key: 'overview', label: 'Visão Geral' },
          { key: 'custody', label: `Custódia (${timeline?.timeline?.filter(s => s.completed).length ?? 0})` },
          { key: 'photos', label: `Fotos (${photos.length})` },
          { key: 'reports', label: `Documentos (${reports.length})` },
          { key: 'hashes', label: `Hashes (${hashes.length})` },
        ] as const).map((t) => (
          <div key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key as any)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="dashboard-grid dashboard-grid-2" style={{ gap: 20 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Dados do Dispositivo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([
                ['Tipo', DEVICE_TYPE_LABELS[device.device_type]],
                ['Marca', device.brand],
                ['Modelo', device.model],
                ['Número de Série', device.serial_number],
                ['Cor', device.color],
                ['Nº Evidência', device.evidence_number],
                ['Nº Lacre', device.seal_number],
                ['Data de Apreensão', formatDate(device.seizure_date)],
                ['Local de Apreensão', device.seizure_location],
              ] as [string, string | null | undefined][]).map(([label, value]) => value ? (
                <div key={label} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 140, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 1 }}>{label}</div>
                  <div className={['Nº Evidência', 'Nº Lacre', 'Número de Série'].includes(label) ? 'font-mono' : ''} style={{ fontSize: 13 }}>{value}</div>
                </div>
              ) : null)}
              {extraEntries.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  {extraEntries.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 140, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 1 }}>{EXTRA_LABELS[k] || k}</div>
                      <div className="font-mono" style={{ fontSize: 13 }}>{String(v)}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {device.qr_code_url && (
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="card-title" style={{ marginBottom: 12 }}>QR Code da Evidência</div>
                <img src={device.qr_code_url} alt="QR Code" style={{ width: 160, height: 160, display: 'block', margin: '0 auto' }} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Escaneie para acessar esta evidência</div>
              </div>
            )}
            {device.seizure_observations && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: 10 }}>Observações da Apreensão</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{device.seizure_observations}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custody Timeline */}
      {activeTab === 'custody' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Cadeia de Custódia</div>
              <div className="card-subtitle">Histórico completo e imutável de movimentações</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                title="Imprimir / Salvar como PDF"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  const movements = timeline?.timeline?.flatMap(s => s.events) ?? [];
                  const html = `<!DOCTYPE html><html lang="pt-BR"><head>
                    <meta charset="UTF-8"/>
                    <title>Cadeia de Custódia — ${device.evidence_number}</title>
                    <style>
                      body{font-family:Arial,sans-serif;color:#111;padding:32px;max-width:800px;margin:0 auto}
                      h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:16px}
                      .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px;font-size:13px}
                      .meta span{color:#555}
                      .event{border-left:3px solid #2563eb;padding:10px 16px;margin-bottom:12px}
                      .event .date{font-size:11px;color:#555;margin-bottom:4px}
                      .event .step{font-weight:bold;font-size:13px;margin-bottom:4px}
                      .event .detail{font-size:12px;color:#444}
                      @media print{body{padding:16px}}
                    </style>
                  </head><body>
                    <h1>Cadeia de Custódia — Evidência ${device.evidence_number}</h1>
                    <div class="meta">
                      <div><span>Dispositivo:</span> ${device.brand || ''} ${device.model || ''}</div>
                      <div><span>Lacre:</span> ${device.seal_number || '—'}</div>
                      <div><span>Serial:</span> ${device.serial_number || '—'}</div>
                      <div><span>Data de Emissão:</span> ${new Date().toLocaleDateString('pt-BR')}</div>
                    </div>
                    ${movements.map(ev => `<div class="event">
                      <div class="date">${new Date(ev.date).toLocaleString('pt-BR')}</div>
                      <div class="detail">${ev.responsible ? `Responsável: ${ev.responsible}` : ''}</div>
                      ${ev.origin || ev.destination ? `<div class="detail">De: ${ev.origin || '—'} → Para: ${ev.destination || '—'}</div>` : ''}
                      ${ev.observation ? `<div class="detail">Obs: ${ev.observation}</div>` : ''}
                    </div>`).join('')}
                    <div style="margin-top:48px;border-top:1px solid #999;padding-top:12px;font-size:11px;color:#666">
                      Documento gerado em ${new Date().toLocaleString('pt-BR')} — Sistema de Cadeia de Custódia
                    </div>
                  </body></html>`;
                  printWindow.document.write(html);
                  printWindow.document.close();
                  printWindow.focus();
                  printWindow.print();
                }}
              >
                <Printer size={14} /> Imprimir
              </button>
              <Link to={`/devices/${id}/custody/new`} className="btn btn-primary btn-sm">
                <Plus size={14} /> Registrar
              </Link>
            </div>
          </div>
          {!timeline?.timeline?.some(s => s.completed) ? (
            <div className="empty-state">
              <Shield size={40} className="empty-icon" />
              <div className="empty-title">Nenhuma movimentação registrada</div>
            </div>
          ) : (
            <div className="timeline">
              {timeline!.timeline.map((step, idx) => (
                <div key={step.step} className="timeline-item">
                  <div className="timeline-line">
                    <div className={`timeline-dot ${step.completed ? 'completed' : ''}`}>
                      {step.completed ? <CheckCircle size={14} /> : <Clock size={12} color="var(--text-muted)" />}
                    </div>
                    {idx < timeline!.timeline.length - 1 && (
                      <div className={`timeline-connector ${step.completed ? 'completed' : ''}`} />
                    )}
                  </div>
                  <div className="timeline-content">
                    <div className={`timeline-step-label ${step.completed ? 'completed' : ''}`}>{step.label}</div>
                    {step.events.map((ev) => (
                      <div key={ev.id} className="timeline-event">
                        <div className="timeline-event-date">{formatDateTime(ev.date)}</div>
                        {ev.responsible && <div>Responsável: {ev.responsible}</div>}
                        {(ev.origin || ev.destination) && (
                          <div style={{ marginTop: 4 }}>
                            {ev.origin && <span>De: {ev.origin} </span>}
                            {ev.destination && <span>→ Para: {ev.destination}</span>}
                          </div>
                        )}
                        {ev.observation && <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{ev.observation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          className="modal-overlay"
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightboxIndex(null)}
        >
          {/* Nav prev */}
          {lightboxIndex > 0 && (
            <button
              className="btn btn-ghost btn-icon"
              style={{ position: 'fixed', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10000, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', width: 48, height: 48 }}
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! > 0 ? i! - 1 : i)); }}
            >
              <ChevronLeft size={24} color="#fff" />
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '90vw', maxHeight: '90vh' }}
          >
            {/* Image */}
            {photos[lightboxIndex].url ? (
              <img
                src={photos[lightboxIndex].url!}
                alt={photos[lightboxIndex].caption || photos[lightboxIndex].file_name}
                style={{ maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
              />
            ) : (
              <div style={{ width: 300, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                <Camera size={48} />
              </div>
            )}

            {/* Caption bar */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 18px', backdropFilter: 'blur(8px)' }}>
              <div>
                <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>
                  {PHOTO_CATEGORY_LABELS[photos[lightboxIndex].category] || photos[lightboxIndex].category}
                </span>
                {photos[lightboxIndex].caption && (
                  <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 10 }}>{photos[lightboxIndex].caption}</span>
                )}
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{photos[lightboxIndex].file_name}</div>
              </div>
              {photos[lightboxIndex].url && (
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0 }}
                  disabled={downloadingFile === photos[lightboxIndex].file_name}
                  onClick={(e) => { e.stopPropagation(); handleDownload(photos[lightboxIndex].url!, photos[lightboxIndex].file_name || 'foto'); }}
                >
                  {downloadingFile === photos[lightboxIndex].file_name
                    ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Baixando…</>
                    : <><Download size={13} /> Download</>}
                </button>
              )}
            </div>

            {/* Counter + Close */}
            <div style={{ position: 'fixed', top: 18, right: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{lightboxIndex + 1} / {photos.length}</span>
              <button
                className="btn btn-ghost btn-icon"
                style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '50%', width: 40, height: 40 }}
                onClick={() => setLightboxIndex(null)}
              >
                <X size={20} color="#fff" />
              </button>
            </div>
          </div>

          {/* Nav next */}
          {lightboxIndex < photos.length - 1 && (
            <button
              className="btn btn-ghost btn-icon"
              style={{ position: 'fixed', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10000, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', width: 48, height: 48 }}
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! < photos.length - 1 ? i! + 1 : i)); }}
            >
              <ChevronRight size={24} color="#fff" />
            </button>
          )}
        </div>
      )}

      {/* Photos */}
      {activeTab === 'photos' && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Fotografias</div>
              <div className="card-subtitle">{photos.length} foto{photos.length !== 1 ? 's' : ''} registrada{photos.length !== 1 ? 's' : ''}</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPhotoModal(true)}>
              <Camera size={14} /> Upload de Foto
            </button>
          </div>
          {photos.length === 0 ? (
            <div className="empty-state">
              <Camera size={40} className="empty-icon" />
              <div className="empty-title">Nenhuma fotografia adicionada</div>
              <div className="empty-desc">Clique em "Upload de Foto" para adicionar imagens do dispositivo.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, padding: '0 4px 4px' }}>
              {photos.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => setLightboxIndex(idx)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    transition: 'transform 0.18s, box-shadow 0.18s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
                >
                  {/* Admin delete button — only rendered for admin role */}
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDeletePhoto(p, e)}
                      title="Excluir foto (admin)"
                      style={{
                        position: 'absolute', top: 6, right: 6, zIndex: 10,
                        background: 'rgba(239,68,68,0.9)', border: 'none',
                        borderRadius: 6, padding: '4px 6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3,
                        color: '#fff', fontSize: 11, fontWeight: 600,
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                  {/* Thumbnail */}
                  <div style={{ width: '100%', height: 140, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {p.url ? (
                      <img
                        src={p.url}
                        alt={p.caption || p.file_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Camera size={36} color="var(--text-muted)" />
                    )}
                    {/* Zoom overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.18s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.35)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                    >
                      <ZoomIn size={28} color="#fff" style={{ opacity: 0.85 }} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>
                      {PHOTO_CATEGORY_LABELS[p.category] || p.category}
                    </div>
                    {p.caption && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.caption}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.file_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Documentos</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowReportModal(true)}>
              <FileText size={14} /> Novo Documento
            </button>
          </div>
          {reports.length === 0 ? (
            <div className="empty-state">
              <FileText size={40} className="empty-icon" />
              <div className="empty-title">Nenhum documento emitido</div>
              <div className="empty-desc">Clique em "Novo Documento" para adicionar um documento pericial.</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Nº Documento</th><th>Título</th><th>Perito</th><th>Status</th><th>Emissão</th><th>Versão</th><th>Arquivo</th><th></th></tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const isOwner = currentUserAuth?.id === r.created_by || currentUserAuth?.id === r.expert_user_id;
                    const canDelete = isAdmin || isOwner;
                    return (
                      <tr key={r.id}>
                        <td className="font-mono">{r.report_number}</td>
                        <td>{r.title}</td>
                        <td>{r.expert_name || '—'}</td>
                        <td><span className={`badge ${REPORT_STATUS_BADGE[r.status as keyof typeof REPORT_STATUS_BADGE] || 'badge-neutral'}`}>{REPORT_STATUS_LABELS[r.status as keyof typeof REPORT_STATUS_LABELS] || r.status}</span></td>
                        <td className="text-sm">{formatDate(r.emission_date)}</td>
                        <td className="font-mono">v{r.version}</td>
                        <td>
                          {r.file_url ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ gap: 4 }}
                              disabled={downloadingFile === (r.file_name || r.id)}
                              onClick={() => handleDownload(r.file_url!, r.file_name || 'documento.pdf')}
                            >
                              {downloadingFile === (r.file_name || r.id)
                                ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Baixando…</>
                                : <><Download size={12} /> PDF</>}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          {canDelete && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-danger, #ef4444)', padding: '4px 8px' }}
                              title={isOwner ? 'Excluir documento' : 'Excluir (admin)'}
                              onClick={() => handleDeleteReport(r.id, r.report_number)}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Hashes */}
      {activeTab === 'hashes' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Controle de Integridade</div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowHashModal(true)}>
              <Hash size={14} /> Registrar Hash
            </button>
          </div>
          {hashes.length === 0 ? (
            <div className="empty-state">
              <Hash size={40} className="empty-icon" />
              <div className="empty-title">Nenhum hash registrado</div>
              <div className="empty-desc">Clique em "Registrar Hash" para garantir a integridade da evidência.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {hashes.map((h) => (
                <div key={h.id} style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{h.source_file || 'Arquivo não especificado'}</span>
                    <span>{formatDateTime(h.calculated_at)}</span>
                  </div>
                  {h.md5 && <div style={{ marginBottom: 6 }}><span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 10, display: 'inline-block', width: 50 }}>MD5</span><span className="hash-value">{h.md5}</span></div>}
                  {h.sha1 && <div style={{ marginBottom: 6 }}><span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 8, display: 'inline-block', width: 50 }}>SHA1</span><span className="hash-value">{h.sha1}</span></div>}
                  {h.sha256 && <div><span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4, display: 'inline-block', width: 50 }}>SHA256</span><span className="hash-value">{h.sha256}</span></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
