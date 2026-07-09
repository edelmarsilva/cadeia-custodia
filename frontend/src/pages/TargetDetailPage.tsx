import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Cpu, ChevronRight, Camera, Users, Clock,
  Trash2, X, Upload, Image, AlertCircle, ExternalLink,
} from 'lucide-react';
import { targetsApi, devicesApi, targetPhotosApi, targetHistoryApi, deploymentTeamsApi } from '@/api/endpoints';
import type { Target, Device, TargetPhoto, TargetHistoryResult, DeploymentTeam } from '@/types';
import { formatDate, formatCPF } from '@/utils/format';
import {
  DEVICE_TYPE_LABELS, DEVICE_STATUS_BADGE, DEVICE_STATUS_LABELS,
  OPERATION_STATUS_LABELS, OPERATION_STATUS_BADGE,
} from '@/utils/labels';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

type Tab = 'info' | 'photos' | 'teams' | 'history';

export default function TargetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [target, setTarget] = useState<Target | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [photos, setPhotos] = useState<TargetPhoto[]>([]);
  const [teams, setTeams] = useState<DeploymentTeam[]>([]);
  const [history, setHistory] = useState<TargetHistoryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [lightbox, setLightbox] = useState<TargetPhoto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      targetsApi.get(id),
      devicesApi.listByTarget(id),
      targetPhotosApi.list(id),
    ])
      .then(([tRes, dRes, pRes]) => {
        setTarget(tRes.data);
        setDevices(dRes.data.items);
        setPhotos(pRes.data);
        // Load teams from same operation
        return deploymentTeamsApi.list(tRes.data.operation_id);
      })
      .then((tRes) => {
        // Filter teams that have this target assigned
        const withTarget = tRes.data.filter((team) =>
          team.target_assignments.some((ta) => ta.target_id === id)
        );
        setTeams(withTarget);
      })
      .catch(() => toast.error('Erro ao carregar alvo.'))
      .finally(() => setLoading(false));
  }, [id]);

  const loadHistory = async () => {
    if (!target || historyLoaded) return;
    setLoadingHistory(true);
    try {
      const res = await targetHistoryApi.getHistory(id!);
      setHistory(res.data);
      setHistoryLoaded(true);
    } catch {
      toast.error('Erro ao carregar histórico.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'history' && !historyLoaded) loadHistory();
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res = await targetPhotosApi.upload(id, fd);
      setPhotos((prev) => [res.data, ...prev]);
      toast.success('Fotografia adicionada.');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao enviar fotografia.';
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photo: TargetPhoto) => {
    if (!confirm(`Remover fotografia "${photo.file_name}"?`)) return;
    try {
      await targetPhotosApi.delete(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      if (lightbox?.id === photo.id) setLightbox(null);
      toast.success('Fotografia removida.');
    } catch {
      toast.error('Erro ao remover fotografia.');
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!target) return <div className="empty-state"><div className="empty-title">Alvo não encontrado.</div></div>;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'info', label: 'Informações', icon: <Cpu size={14} /> },
    { id: 'photos', label: 'Fotografias', icon: <Camera size={14} />, count: photos.length },
    { id: 'teams', label: 'Equipes', icon: <Users size={14} />, count: teams.length },
    { id: 'history', label: 'Histórico', icon: <Clock size={14} /> },
  ];

  return (
    <div>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', top: 20, right: 24, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={28} />
          </button>
          <img
            src={lightbox.url || ''}
            alt={lightbox.caption || lightbox.file_name}
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.caption && (
            <div style={{ position: 'fixed', bottom: 24, color: '#fff', fontSize: 14, opacity: 0.8 }}>
              {lightbox.caption}
            </div>
          )}
        </div>
      )}

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{target.full_name}</h1>
            <p className="page-subtitle">
              {target.nickname && <span>"{target.nickname}" · </span>}
              CPF: {formatCPF(target.cpf)} ·{' '}
              <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                {target.person_type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </span>
            </p>
          </div>
        </div>
        <Link to={`/targets/${id}/devices/new`} className="btn btn-primary">
          <Plus size={15} /> Novo Dispositivo
        </Link>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className="badge badge-neutral" style={{ fontSize: 10, padding: '1px 6px' }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Info ─────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="dashboard-grid dashboard-grid-2" style={{ gap: 20 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Dados do Alvo</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Nome Completo', target.full_name],
                ['Nome Social', target.social_name],
                ['Apelido / Vulgo', target.nickname],
                ['CPF', formatCPF(target.cpf)],
                ['RG', target.rg],
                ['Data de Nascimento', formatDate(target.birth_date)],
                ['Endereço', target.address],
              ].map(([label, value]) => value ? (
                <div key={label} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 140, flexShrink: 0, paddingTop: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ) : null)}
              {target.observations && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Observações</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{target.observations}</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Dispositivos Apreendidos</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 6 }}>
              {devices.length}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>dispositivo(s) associado(s)</div>
            <Link to={`/targets/${id}/devices/new`} className="btn btn-primary btn-sm">
              <Plus size={14} /> Cadastrar Dispositivo
            </Link>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><div className="card-title">Dispositivos</div></div>
            {devices.length === 0 ? (
              <div className="empty-state">
                <Cpu size={36} className="empty-icon" />
                <div className="empty-title">Nenhum dispositivo cadastrado</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Nº Evidência</th><th>Tipo</th><th>Marca / Modelo</th>
                      <th>Nº Série</th><th>Status</th><th>Apreensão</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((d) => (
                      <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/devices/${d.id}`)}>
                        <td className="font-mono" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{d.evidence_number}</td>
                        <td><span className="badge badge-neutral">{DEVICE_TYPE_LABELS[d.device_type]}</span></td>
                        <td>{[d.brand, d.model].filter(Boolean).join(' ') || '—'}</td>
                        <td className="font-mono text-sm">{d.serial_number || '—'}</td>
                        <td><span className={`badge ${DEVICE_STATUS_BADGE[d.status as keyof typeof DEVICE_STATUS_BADGE]}`}>{DEVICE_STATUS_LABELS[d.status as keyof typeof DEVICE_STATUS_LABELS]}</span></td>
                        <td className="text-sm">{formatDate(d.seizure_date)}</td>
                        <td><ChevronRight size={15} color="var(--text-muted)" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Photos ───────────────────────────────────── */}
      {activeTab === 'photos' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Camera size={16} style={{ marginRight: 6 }} />Fotografias do Alvo</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={fileRef}
                type="file"
                id="photo-upload-input"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleUploadPhoto}
              />
              <button
                id="photo-upload-btn"
                className="btn btn-primary btn-sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Enviando...</>
                  : <><Upload size={13} /> Adicionar Foto</>}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
            Formatos aceitos: JPG, JPEG, PNG, WEBP · Tamanho máximo: 10 MB
          </div>
          {photos.length === 0 ? (
            <div className="empty-state">
              <Image size={40} className="empty-icon" />
              <div className="empty-title">Nenhuma fotografia cadastrada</div>
              <div className="empty-desc">Adicione fotografias de identificação do alvo.</div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => fileRef.current?.click()}>
                <Upload size={13} /> Upload de Fotografia
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
              {photos.map((p) => (
                <div
                  key={p.id}
                  style={{
                    position: 'relative', borderRadius: 10, overflow: 'hidden',
                    background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'transform 0.15s',
                  }}
                  onClick={() => p.url && setLightbox(p)}
                >
                  {p.url ? (
                    <img
                      src={p.url}
                      alt={p.caption || p.file_name}
                      style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '100%', aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image size={32} color="var(--text-muted)" />
                    </div>
                  )}
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.caption || p.file_name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(p.created_at)}</div>
                  </div>
                  {isAdmin && (
                    <button
                      id={`delete-photo-${p.id}`}
                      onClick={(e) => { e.stopPropagation(); handleDeletePhoto(p); }}
                      style={{
                        position: 'absolute', top: 6, right: 6, width: 26, height: 26,
                        background: 'rgba(239,68,68,0.85)', border: 'none', borderRadius: 6,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={13} color="#fff" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Teams ────────────────────────────────────── */}
      {activeTab === 'teams' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Users size={16} style={{ marginRight: 6 }} />Equipes de Deflagração</div>
            <Link to={`/operations/${target.operation_id}`} className="btn btn-ghost btn-sm">
              <ExternalLink size={13} /> Ver Operação
            </Link>
          </div>
          {teams.length === 0 ? (
            <div className="empty-state">
              <Users size={40} className="empty-icon" />
              <div className="empty-title">Nenhuma equipe atribuída</div>
              <div className="empty-desc">Este alvo ainda não foi atribuído a nenhuma equipe de deflagração.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {teams.map((team) => (
                <div
                  key={team.id}
                  style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{team.name}</div>
                      {team.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{team.description}</div>
                      )}
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                      {team.members.length} membro(s)
                    </span>
                  </div>
                  {team.members.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {team.members.map((m) => (
                        <span
                          key={m.id}
                          style={{
                            background: 'var(--bg-surface)', border: '1px solid var(--border)',
                            borderRadius: 20, padding: '2px 10px', fontSize: 11, color: 'var(--text-secondary)',
                          }}
                        >
                          {m.user?.full_name || m.user_id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: History ──────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title"><Clock size={16} style={{ marginRight: 6 }} />Histórico em Operações</div>
          </div>
          {loadingHistory ? (
            <div className="loading-overlay" style={{ position: 'relative', height: 120 }}>
              <div className="spinner" /> Carregando histórico...
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={40} className="empty-icon" />
              <div className="empty-title">Nenhum histórico encontrado</div>
              <div className="empty-desc">
                Este alvo não aparece em outras operações com os identificadores disponíveis.
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome Completo</th><th>Operação</th><th>Código</th>
                    <th>Status</th><th>Cadastrado em</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, idx) => (
                    <tr key={`${h.target_id}-${h.operation_id}-${idx}`}>
                      <td style={{ fontWeight: 500 }}>{h.full_name}</td>
                      <td>
                        <Link to={`/operations/${h.operation_id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                          {h.operation_name}
                        </Link>
                      </td>
                      <td className="font-mono text-sm">{h.operation_code || '—'}</td>
                      <td>
                        <span className={`badge ${OPERATION_STATUS_BADGE[h.operation_status as keyof typeof OPERATION_STATUS_BADGE]}`}>
                          {OPERATION_STATUS_LABELS[h.operation_status as keyof typeof OPERATION_STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="text-sm">{formatDate(h.registered_at)}</td>
                      <td>
                        <Link to={`/targets/${h.target_id}`}>
                          <ChevronRight size={15} color="var(--text-muted)" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
