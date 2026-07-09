import React, { useEffect, useRef, useState } from 'react';
import {
  FileText, Plus, Download, Edit, Trash2, CheckCircle,
  XCircle, Upload, Search, ChevronDown, ChevronUp, X, Eye,
} from 'lucide-react';
import { reportTemplatesApi } from '@/api/endpoints';
import type { ReportTemplate } from '@/types';
import { formatDateTime } from '@/utils/format';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

// ── Lista de placeholders suportados ─────────────────────────────
const PLACEHOLDERS = [
  { ph: '{{NUMERO_LAUDO}}', desc: 'Número do laudo' },
  { ph: '{{OPERACAO}}', desc: 'Nome da operação' },
  { ph: '{{NUMERO_PROCEDIMENTO}}', desc: 'Número do procedimento' },
  { ph: '{{ALVO}}', desc: 'Nome do alvo' },
  { ph: '{{CPF_ALVO}}', desc: 'CPF do alvo' },
  { ph: '{{DISPOSITIVO}}', desc: 'Tipo do dispositivo' },
  { ph: '{{MARCA}}', desc: 'Fabricante' },
  { ph: '{{MODELO}}', desc: 'Modelo' },
  { ph: '{{IMEI}}', desc: 'IMEI' },
  { ph: '{{SERIAL}}', desc: 'Número de série' },
  { ph: '{{NUMERO_EVIDENCIA}}', desc: 'Nº da evidência' },
  { ph: '{{NUMERO_LACRE}}', desc: 'Nº do lacre' },
  { ph: '{{COR}}', desc: 'Cor do dispositivo' },
  { ph: '{{DATA_APREENSAO}}', desc: 'Data de apreensão' },
  { ph: '{{LOCAL_APREENSAO}}', desc: 'Local de apreensão' },
  { ph: '{{DATA_ANALISE}}', desc: 'Data de início da análise' },
  { ph: '{{DATA_EMISSAO}}', desc: 'Data de emissão' },
  { ph: '{{PERITO}}', desc: 'Perito responsável' },
  { ph: '{{HASH_MD5}}', desc: 'Hash MD5' },
  { ph: '{{HASH_SHA1}}', desc: 'Hash SHA-1' },
  { ph: '{{HASH_SHA256}}', desc: 'Hash SHA-256' },
  { ph: '{{SISTEMA_OPERACIONAL}}', desc: 'Sistema operacional' },
  { ph: '{{CAPACIDADE}}', desc: 'Capacidade de armazenamento' },
  { ph: '{{ARQUIVO_EXTRACAO}}', desc: 'Arquivo de extração' },
  { ph: '{{OBSERVACOES}}', desc: 'Observações' },
  { ph: '{{FOTO_DISPOSITIVO}}', desc: '📷 Foto frontal do dispositivo' },
  { ph: '{{FOTO_FRONTAL}}', desc: '📷 Foto frontal' },
  { ph: '{{FOTO_TRASEIRA}}', desc: '📷 Foto traseira' },
  { ph: '{{FOTO_LACRE}}', desc: '📷 Foto do lacre' },
  { ph: '{{FOTO_SERIAL}}', desc: '📷 Foto do nº de série' },
  { ph: '{{FOTO_IMEI}}', desc: '📷 Foto do IMEI' },
  { ph: '{{FOTO_APREENSAO}}', desc: '📷 Foto da apreensão' },
];

// ── Modal de criação / edição ─────────────────────────────────────
function TemplateModal({
  template,
  onClose,
  onSuccess,
}: {
  template?: ReportTemplate;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [version, setVersion] = useState(template?.version || '1.0');
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPH, setShowPH] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!template;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nome é obrigatório.');
    if (!isEdit && !file) return toast.error('Selecione um arquivo DOCX.');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      fd.append('version', version);
      fd.append('is_active', String(isActive));
      if (file) fd.append('file', file);

      if (isEdit && template) {
        await reportTemplatesApi.update(template.id, fd);
        toast.success('Modelo atualizado com sucesso!');
      } else {
        await reportTemplatesApi.create(fd);
        toast.success('Modelo criado com sucesso!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar modelo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FileText size={16} />
            {isEdit ? 'Editar Modelo de Laudo' : 'Novo Modelo de Laudo'}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Nome do Modelo *</label>
              <input
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Laudo Padrão Smartphone 2024"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Versão</label>
              <input
                className="form-input"
                value={version}
                onChange={e => setVersion(e.target.value)}
                placeholder="1.0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={isActive ? 'active' : 'inactive'}
                onChange={e => setIsActive(e.target.value === 'active')}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Descrição</label>
              <textarea
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Descrição opcional do modelo..."
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Upload DOCX */}
          <div style={{ marginTop: 16 }}>
            <label className="form-label">
              Arquivo DOCX {isEdit ? '(deixe vazio para manter o atual)' : '*'}
            </label>
            <div
              className="upload-zone"
              style={{ marginTop: 8, cursor: 'pointer' }}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={20} color="var(--color-primary)" />
                  <span style={{ fontSize: 13 }}>{file.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : (
                <>
                  <Upload size={24} color="var(--text-muted)" />
                  <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                    Clique para selecionar o arquivo{' '}
                    <span style={{ color: 'var(--color-primary)' }}>.docx</span>
                  </div>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".docx"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
              />
            </div>
          </div>

          {/* Referência de placeholders */}
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowPH(!showPH)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'var(--color-accent)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              {showPH ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Ver placeholders suportados ({PLACEHOLDERS.length})
            </button>

            {showPH && (
              <div style={{
                marginTop: 10,
                background: 'var(--bg-base)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                maxHeight: 200,
                overflowY: 'auto',
                padding: '8px 12px',
              }}>
                {PLACEHOLDERS.map(({ ph, desc }) => (
                  <div key={ph} style={{
                    display: 'flex', gap: 12, padding: '4px 0',
                    borderBottom: '1px solid var(--border)', fontSize: 12,
                  }}>
                    <code style={{
                      color: 'var(--color-primary)', fontFamily: 'var(--font-mono)',
                      minWidth: 200, flexShrink: 0,
                    }}>
                      {ph}
                    </code>
                    <span style={{ color: 'var(--text-secondary)' }}>{desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Modelo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────
export default function ReportTemplatesPage() {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<ReportTemplate | undefined>(undefined);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canWrite = user?.role === 'admin' || user?.role === 'expert';
  const canDelete = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await reportTemplatesApi.list(!showAll);
      setTemplates(data);
    } catch {
      toast.error('Erro ao carregar modelos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [showAll]);

  const handleDownload = async (t: ReportTemplate) => {
    try {
      const { data } = await reportTemplatesApi.download(t.id);
      window.open(data.url, '_blank');
    } catch {
      toast.error('Erro ao gerar link de download.');
    }
  };

  const handleDelete = async (t: ReportTemplate) => {
    if (!confirm(`Excluir o modelo "${t.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(t.id);
    try {
      await reportTemplatesApi.delete(t.id);
      toast.success('Modelo excluído.');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir.');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">
            <FileText size={22} style={{ marginRight: 10, color: 'var(--color-primary)' }} />
            Modelos de Laudo
          </h1>
          <p className="page-sub">Gerencie os templates DOCX utilizados na geração automática de laudos periciais.</p>
        </div>
        {canWrite && (
          <button
            className="btn btn-primary"
            onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          >
            <Plus size={16} /> Novo Modelo
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar modelos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={e => setShowAll(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Mostrar inativos
        </label>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Carregando modelos...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <FileText size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {search ? 'Nenhum modelo encontrado.' : 'Nenhum modelo cadastrado ainda.'}
          </div>
          {canWrite && !search && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => { setEditTarget(undefined); setShowModal(true); }}
            >
              <Plus size={15} /> Criar primeiro modelo
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {filtered.map(t => (
            <div
              key={t.id}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                opacity: t.is_active ? 1 : 0.6,
                transition: 'var(--transition-md)',
              }}
            >
              {/* Ícone */}
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: t.is_active ? 'var(--bg-warning)' : 'var(--bg-surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FileText size={20} color={t.is_active ? 'var(--color-warning)' : 'var(--text-muted)'} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 99,
                    background: 'var(--bg-surface-2)', color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    v{t.version}
                  </span>
                  {t.is_active ? (
                    <span className="badge badge-success" style={{ fontSize: 10 }}>
                      <CheckCircle size={10} /> Ativo
                    </span>
                  ) : (
                    <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                      <XCircle size={10} /> Inativo
                    </span>
                  )}
                </div>
                {t.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {t.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {t.file_name && <span>{t.file_name} · </span>}
                  Atualizado em {formatDateTime(t.updated_at)}
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {t.file_path && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDownload(t)}
                    title="Baixar DOCX"
                  >
                    <Download size={14} /> DOCX
                  </button>
                )}
                {canWrite && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setEditTarget(t); setShowModal(true); }}
                    title="Editar"
                  >
                    <Edit size={14} />
                  </button>
                )}
                {canDelete && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(t)}
                    disabled={deleting === t.id}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TemplateModal
          template={editTarget}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
