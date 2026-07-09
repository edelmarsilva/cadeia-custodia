import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Cpu, Users, FileText, TrendingUp,
  Smartphone, HardDrive, Usb, Monitor, Plus, Edit3, Archive,
  X, Save, ExternalLink, UserPlus, UserX, Shield, Download, Trash2, Target,
} from 'lucide-react';
import { operationsApi, targetsApi, devicesApi, operationUsersApi, usersApi, deploymentTeamsApi } from '@/api/endpoints';
import type { OperationDashboard, Target as TargetType, Device, User, Document, DeploymentTeam } from '@/types';
import { formatDate } from '@/utils/format';
import {
  OPERATION_STATUS_LABELS, OPERATION_STATUS_BADGE,
  DEVICE_TYPE_LABELS, DEVICE_STATUS_LABELS, DEVICE_STATUS_BADGE,
  DOC_TYPE_LABELS, ROLE_LABELS,
} from '@/utils/labels';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

export default function OperationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<OperationDashboard | null>(null);
  const [targets, setTargets] = useState<TargetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'targets' | 'devices' | 'documents' | 'team' | 'equipes'>('overview');
  const [allDevices, setAllDevices] = useState<Device[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      operationsApi.get(id),
      targetsApi.list(id, { page_size: 100 } as any),
      devicesApi.listByOperation(id, { page_size: 100 } as any),
    ])
      .then(([dashRes, tgtRes, devRes]) => {
        setDashboard(dashRes.data);
        setTargets(tgtRes.data.items);
        setAllDevices(devRes.data.items || []);
      })
      .catch(() => toast.error('Erro ao carregar operação.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-overlay"><div className="spinner" /> Carregando...</div>;
  if (!dashboard) return <div className="empty-state"><div className="empty-title">Operação não encontrada.</div></div>;

  const { operation: op } = dashboard;

  const stats = [
    { label: 'Alvos', value: dashboard.total_targets, icon: Users, color: 'var(--color-info)', bg: 'var(--bg-info)' },
    { label: 'Dispositivos', value: dashboard.total_devices, icon: Cpu, color: 'var(--color-primary)', bg: 'var(--bg-warning)' },
    { label: 'Smartphones', value: dashboard.smartphones, icon: Smartphone, color: 'var(--color-success)', bg: 'var(--bg-success)' },
    { label: 'Computadores', value: dashboard.computers, icon: Monitor, color: 'var(--color-accent)', bg: 'rgba(6,182,212,0.12)' },
    { label: 'Pendrives', value: dashboard.pendrives, icon: Usb, color: 'var(--color-warning)', bg: 'var(--bg-warning)' },
    { label: 'Armazenamento', value: dashboard.storage_devices, icon: HardDrive, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
    { label: 'Em Análise', value: dashboard.in_analysis, icon: TrendingUp, color: 'var(--color-danger)', bg: 'var(--bg-danger)' },
    { label: 'Com Laudo', value: dashboard.with_report, icon: FileText, color: 'var(--color-success)', bg: 'var(--bg-success)' },
    { label: 'Em Custódia', value: dashboard.in_custody, icon: Archive, color: 'var(--color-info)', bg: 'var(--bg-info)' },
    { label: 'Movimentações', value: dashboard.movements_count, icon: TrendingUp, color: 'var(--text-secondary)', bg: 'var(--bg-surface-2)' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/operations')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 className="page-title" style={{ fontSize: 20 }}>{op.name}</h1>
              <span className={`badge ${OPERATION_STATUS_BADGE[op.status as keyof typeof OPERATION_STATUS_BADGE]}`}>
                {OPERATION_STATUS_LABELS[op.status as keyof typeof OPERATION_STATUS_LABELS]}
              </span>
            </div>
            <p className="page-subtitle">
              {op.procedure_number && <span className="font-mono">{op.procedure_number} · </span>}
              {op.responsible_unit && <span>{op.responsible_unit} · </span>}
              Início: {formatDate(op.start_date)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/operations/${id}/devices/new`} className="btn btn-primary btn-sm">
            <Plus size={14} /> Novo Dispositivo
          </Link>
          <Link to={`/operations/${id}/targets/new`} className="btn btn-secondary btn-sm">
            <Plus size={14} /> Novo Alvo
          </Link>
          <button className="btn btn-ghost btn-sm">
            <Edit3 size={14} /> Editar
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
        {stats.map((s) => (
          <div className="stat-card" key={s.label} style={{ '--stat-color': s.color } as React.CSSProperties}>
            <div className="stat-icon" style={{ background: s.bg }}>
              <s.icon size={16} color={s.color} />
            </div>
            <div className="stat-value" style={{ fontSize: 22 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['overview', 'targets', 'devices', 'documents', 'team', 'equipes'] as const).map((tab) => (
          <div
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {{ overview: 'Visão Geral', targets: `Alvos (${targets.length})`, devices: `Dispositivos (${allDevices.length})`, documents: 'Documentos', team: 'Equipe', equipes: 'Equipes de Deflagração' }[tab]}
          </div>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Dados da Operação</div>
          <div className="form-grid">
            <div><div className="form-label">Nome</div><div style={{ marginTop: 4 }}>{op.name}</div></div>
            <div><div className="form-label">Nº Procedimento</div><div className="font-mono" style={{ marginTop: 4 }}>{op.procedure_number || '—'}</div></div>
            <div><div className="form-label">Unidade</div><div style={{ marginTop: 4 }}>{op.responsible_unit || '—'}</div></div>
            <div><div className="form-label">Status</div><div style={{ marginTop: 4 }}>{OPERATION_STATUS_LABELS[op.status as keyof typeof OPERATION_STATUS_LABELS]}</div></div>
            <div><div className="form-label">Início</div><div style={{ marginTop: 4 }}>{formatDate(op.start_date)}</div></div>
            <div><div className="form-label">Encerramento</div><div style={{ marginTop: 4 }}>{formatDate(op.end_date)}</div></div>
          </div>
          {op.description && (
            <>
              <div className="divider" />
              <div className="form-label">Descrição</div>
              <p style={{ marginTop: 8, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{op.description}</p>
            </>
          )}
        </div>
      )}

      {activeTab === 'targets' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Alvos da Operação</div>
            <Link to={`/operations/${id}/targets/new`} className="btn btn-primary btn-sm">
              <Plus size={14} /> Novo Alvo
            </Link>
          </div>
          {targets.length === 0 ? (
            <div className="empty-state">
              <Users size={40} className="empty-icon" />
              <div className="empty-title">Nenhum alvo cadastrado</div>
              <div className="empty-desc">Adicione alvos a esta operação.</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th><th>CPF</th><th>Tipo</th><th>Apelido</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((t) => (
                    <tr key={t.id}>
                      <td><Link to={`/targets/${t.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{t.full_name}</Link></td>
                      <td className="font-mono text-sm">{t.cpf || '—'}</td>
                      <td><span className="badge badge-neutral">{t.person_type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'}</span></td>
                      <td>{t.nickname || '—'}</td>
                      <td><Link to={`/targets/${t.id}`} className="btn btn-ghost btn-sm">Ver</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'devices' && (
        <DevicesTab devices={allDevices} operationId={id!} />
      )}

      {activeTab === 'documents' && (
        <DocumentsTab operationId={id!} />
      )}

      {activeTab === 'team' && (
        <TeamTab operationId={id!} />
      )}

      {activeTab === 'equipes' && (
        <DeploymentTeamsTab operationId={id!} targets={targets} />
      )}
    </div>
  );
}

// ── Modal de Edição de Dispositivo ────────────────────────────────
function DeviceEditModal({
  device,
  onClose,
  onSaved,
}: {
  device: Device;
  onClose: () => void;
  onSaved: (updated: Device) => void;
}) {
  const [form, setForm] = useState({
    seal_number:           device.seal_number || '',
    device_type:           device.device_type || 'smartphone',
    brand:                 device.brand || '',
    model:                 device.model || '',
    serial_number:         device.serial_number || '',
    color:                 device.color || '',
    status:                device.status || 'seized',
    seizure_date:          device.seizure_date?.slice(0, 10) || '',
    seizure_location:      device.seizure_location || '',
    seizure_observations:  device.seizure_observations || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {
        ...form,
        seal_number:          form.seal_number          || null,
        brand:                form.brand                || null,
        model:                form.model                || null,
        serial_number:        form.serial_number        || null,
        color:                form.color                || null,
        seizure_date:         form.seizure_date         || null,
        seizure_location:     form.seizure_location     || null,
        seizure_observations: form.seizure_observations || null,
      };
      const res = await devicesApi.update(device.id, payload);
      toast.success('Dispositivo atualizado com sucesso!');
      onSaved(res.data);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar dispositivo.');
    } finally {
      setSaving(false);
    }
  };

  const deviceTypes = Object.entries(DEVICE_TYPE_LABELS);
  const deviceStatuses = Object.entries(DEVICE_STATUS_LABELS);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">
              <Edit3 size={16} style={{ display: 'inline', marginRight: 8 }} />
              Editar Dispositivo
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Evidência: <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{device.evidence_number}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={`/devices/${device.id}`} className="btn btn-ghost btn-sm" target="_blank" onClick={onClose}>
              <ExternalLink size={13} /> Ver completo
            </Link>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Identificação */}
            <div className="card-title" style={{ marginBottom: 14, fontSize: 13 }}>Classificação</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tipo de Dispositivo</label>
                <select className="form-select" value={form.device_type} onChange={(e) => set('device_type', e.target.value)}>
                  {deviceTypes.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {deviceStatuses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Marca</label>
                <input className="form-input" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Samsung, Apple, Dell…" />
              </div>
              <div className="form-group">
                <label className="form-label">Modelo</label>
                <input className="form-input" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Galaxy S23, iPhone 15…" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Número de Série</label>
                <input className="form-input font-mono" value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} placeholder="SN000000" />
              </div>
              <div className="form-group">
                <label className="form-label">Cor</label>
                <input className="form-input" value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="Preto, Branco…" />
              </div>
            </div>

            <div className="divider" />

            {/* Apreensão */}
            <div className="card-title" style={{ marginBottom: 14, fontSize: 13 }}>Dados da Apreensão</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nº do Lacre</label>
                <input className="form-input font-mono" value={form.seal_number} onChange={(e) => set('seal_number', e.target.value)} placeholder="LAC-0001" />
              </div>
              <div className="form-group">
                <label className="form-label">Data de Apreensão</label>
                <input type="date" className="form-input" value={form.seizure_date} onChange={(e) => set('seizure_date', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Local de Apreensão</label>
              <input className="form-input" value={form.seizure_location} onChange={(e) => set('seizure_location', e.target.value)} placeholder="Endereço ou descrição" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Observações</label>
              <textarea className="form-textarea" rows={3} value={form.seizure_observations}
                onChange={(e) => set('seizure_observations', e.target.value)}
                placeholder="Estado do dispositivo, condições especiais…" />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Salvando…</>
                : <><Save size={14} /> Salvar Alterações</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Aba Dispositivos ───────────────────────────────────────────────
function DevicesTab({
  devices: initialDevices,
  operationId,
}: {
  devices: Device[];
  operationId: string;
}) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [editDevice, setEditDevice] = useState<Device | null>(null);

  // Sincroniza se a prop mudar
  useEffect(() => { setDevices(initialDevices); }, [initialDevices]);

  const handleSaved = (updated: Device) => {
    setDevices((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  return (
    <>
      {editDevice && (
        <DeviceEditModal
          device={editDevice}
          onClose={() => setEditDevice(null)}
          onSaved={handleSaved}
        />
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Dispositivos da Operação</div>
            <div className="card-subtitle">{devices.length} dispositivo{devices.length !== 1 ? 's' : ''} cadastrado{devices.length !== 1 ? 's' : ''}</div>
          </div>
          <Link to={`/operations/${operationId}/devices/new`} className="btn btn-primary btn-sm">
            <Plus size={14} /> Novo Dispositivo
          </Link>
        </div>

        {devices.length === 0 ? (
          <div className="empty-state">
            <Cpu size={40} className="empty-icon" />
            <div className="empty-title">Nenhum dispositivo cadastrado</div>
            <div className="empty-desc">Cadastre dispositivos com ou sem vínculo a alvos.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nº Evidência</th>
                  <th>Tipo</th>
                  <th>Marca / Modelo</th>
                  <th>Lacre</th>
                  <th>Alvo</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--color-primary)', fontSize: 13 }}>
                        {d.evidence_number}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{DEVICE_TYPE_LABELS[d.device_type] || d.device_type}</span>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {[d.brand, d.model].filter(Boolean).join(' ') || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {d.seal_number || '—'}
                    </td>
                    <td>
                      {d.target_id
                        ? <Link to={`/targets/${d.target_id}`} style={{ color: 'var(--color-accent)', fontSize: 12 }}>Ver alvo</Link>
                        : <span className="badge badge-neutral" style={{ fontSize: 10 }}>Sem alvo</span>}
                    </td>
                    <td>
                      <span className={`badge ${DEVICE_STATUS_BADGE[d.status as keyof typeof DEVICE_STATUS_BADGE] || 'badge-neutral'}`}>
                        {DEVICE_STATUS_LABELS[d.status as keyof typeof DEVICE_STATUS_LABELS] || d.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditDevice(d)}
                          title="Editar dispositivo"
                        >
                          <Edit3 size={13} /> Editar
                        </button>
                        <Link to={`/devices/${d.id}`} className="btn btn-ghost btn-sm" title="Ver detalhes completos">
                          <ExternalLink size={13} /> Detalhes
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Aba Equipe ────────────────────────────────────────────────────
function TeamTab({ operationId }: { operationId: string }) {
  const currentUser = useAuthStore((s) => s.user);
  const isGlobalAdmin = currentUser?.role === 'admin';

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);

  const loadMembers = () => {
    setLoading(true);
    operationUsersApi.list(operationId)
      .then((r) => setMembers(r.data))
      .catch(() => toast.error('Erro ao carregar equipe.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMembers(); }, [operationId]);

  // Verifica se o usuário atual é op_admin desta operação
  const isOpAdmin = members.some(
    (m) => m.user_id === currentUser?.id && m.is_op_admin
  );
  const canManage = isGlobalAdmin || isOpAdmin;

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remover ${name} da operação?`)) return;
    try {
      await operationUsersApi.remove(operationId, userId);
      toast.success(`${name} removido da equipe.`);
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao remover usuário.');
    }
  };

  const handleToggleOpAdmin = async (m: any) => {
    const newValue = !m.is_op_admin;
    const action = newValue ? 'promover' : 'rebaixar';
    const name = m.user?.full_name || 'usuário';
    if (!confirm(
      newValue
        ? `Promover ${name} a Administrador desta operação? Ele poderá adicionar/remover membros e editar dados da operação.`
        : `Remover privilégios de Administrador de ${name}?`
    )) return;
    setTogglingAdmin(m.user_id);
    try {
      await operationUsersApi.setOpAdmin(operationId, m.user_id, newValue);
      toast.success(`${name} ${newValue ? 'promovido a Administrador' : 'rebaixado a membro'} desta operação.`);
      loadMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Erro ao ${action} usuário.`);
    } finally {
      setTogglingAdmin(null);
    }
  };

  const ROLE_BADGE: Record<string, string> = {
    admin: 'badge-danger', custody: 'badge-warning', expert: 'badge-info',
    analyst: 'badge-success', auditor: 'badge-neutral',
  };

  return (
    <>
      {showModal && (
        <AddMemberModal
          operationId={operationId}
          currentMembers={members.map((m) => m.user_id)}
          canGrantOpAdmin={isGlobalAdmin}
          onClose={() => setShowModal(false)}
          onAdded={() => { loadMembers(); }}
        />
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <Shield size={16} style={{ display: 'inline', marginRight: 8 }} />
              Equipe da Operação
            </div>
            <div className="card-subtitle">{members.length} membro{members.length !== 1 ? 's' : ''} atribuído{members.length !== 1 ? 's' : ''}</div>
          </div>
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <UserPlus size={14} /> Adicionar Membro
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-overlay" style={{ height: 120 }}><div className="spinner" /></div>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <Users size={40} className="empty-icon" />
            <div className="empty-title">Nenhum membro atribuído</div>
            <div className="empty-desc">
              {canManage ? 'Adicione membros para dar acesso à operação.' : 'Nenhum membro atribuído ainda.'}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  <th>Unidade</th>
                  <th>Matrícula</th>
                  <th>Atribuído em</th>
                  {canManage && <th style={{ textAlign: 'right' }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{m.user?.full_name || '—'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{m.user?.username || '—'}</div>
                        </div>
                        {m.is_op_admin && (
                          <span
                            className="badge badge-danger"
                            style={{ fontSize: 10, padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3 }}
                            title="Administrador desta Operação"
                          >
                            <Shield size={9} /> Admin Op
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[m.user?.role] || 'badge-neutral'}`}>
                        {ROLE_LABELS[m.user?.role] || m.user?.role || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{m.user?.unit || '—'}</td>
                    <td className="font-mono" style={{ fontSize: 12 }}>{m.user?.badge_number || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(m.assigned_at)}</td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          {/* Só o admin global pode promover/rebaixar op_admin */}
                          {isGlobalAdmin && (
                            <button
                              className={`btn btn-ghost btn-sm ${m.is_op_admin ? '' : ''}`}
                              style={{ color: m.is_op_admin ? 'var(--color-warning)' : 'var(--color-primary)', fontSize: 12 }}
                              onClick={() => handleToggleOpAdmin(m)}
                              disabled={togglingAdmin === m.user_id}
                              title={m.is_op_admin ? 'Remover privilégios de Admin da Operação' : 'Promover a Admin da Operação'}
                            >
                              {togglingAdmin === m.user_id
                                ? <span className="spinner" style={{ width: 12, height: 12 }} />
                                : <Shield size={12} />}
                              {m.is_op_admin ? 'Rebaixar' : 'Tornar Admin'}
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => handleRemove(m.user_id, m.user?.full_name || 'usuário')}
                            title="Remover da operação"
                          >
                            <UserX size={13} /> Remover
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Modal de Adicionar Membro ─────────────────────────────────────
function AddMemberModal({
  operationId,
  currentMembers,
  canGrantOpAdmin,
  onClose,
  onAdded,
}: {
  operationId: string;
  currentMembers: string[];
  canGrantOpAdmin: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [isOpAdmin, setIsOpAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    usersApi.listAll()
      .then((r) => setAllUsers(r.data.items.filter((u) => u.is_active)))
      .finally(() => setLoading(false));
  }, []);

  const available = allUsers.filter((u) => !currentMembers.includes(u.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return toast.error('Selecione um usuário.');
    setSaving(true);
    try {
      await operationUsersApi.assign(operationId, selectedId, isOpAdmin);
      const userName = available.find((u) => u.id === selectedId)?.full_name || 'Usuário';
      toast.success(`${userName} adicionado à equipe${isOpAdmin ? ' como Administrador da Operação' : ''}!`);
      onAdded();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao adicionar usuário.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">
            <UserPlus size={16} style={{ display: 'inline', marginRight: 8 }} />
            Adicionar Membro à Equipe
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></div>
            ) : available.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                Todos os usuários ativos já estão na equipe.
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Selecione o usuário *</label>
                  <select
                    className="form-select"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    required
                    autoFocus
                  >
                    <option value="">— Escolha um usuário —</option>
                    {available.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} (@{u.username}) — {ROLE_LABELS[u.role] || u.role}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Opção de Admin da Operação — visivel apenas para admin global */}
                {canGrantOpAdmin && (
                  <div
                    style={{
                      background: isOpAdmin ? 'rgba(220, 38, 38, 0.05)' : 'var(--bg-surface-2)',
                      border: `1px solid ${isOpAdmin ? 'rgba(220,38,38,0.2)' : 'var(--border)'}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      marginTop: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setIsOpAdmin((v) => !v)}
                  >
                    <input
                      type="checkbox"
                      id="is-op-admin-cb"
                      checked={isOpAdmin}
                      onChange={(e) => setIsOpAdmin(e.target.checked)}
                      style={{ marginTop: 2, accentColor: 'var(--color-danger)' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
                        <Shield size={13} style={{ color: isOpAdmin ? 'var(--color-danger)' : 'var(--text-muted)' }} />
                        Administrador da Operação
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.5 }}>
                        O usuário poderá adicionar/remover membros, editar dados da operação e gerenciar todos os seus dados.
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || available.length === 0}>
              {saving
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Adicionando…</>
                : <><UserPlus size={14} /> Adicionar{isOpAdmin ? ' como Admin' : ''}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DocumentsTab({ operationId }: { operationId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadDocs = () => {
    operationsApi.listDocuments(operationId)
      .then((r) => setDocs(r.data))
      .finally(() => setLoading(false));
  };

  // Forced file download via fetch+blob: avoids the browser opening PDFs/images
  // inline and works correctly even when Content-Disposition is not set.
  const handleDownload = async (url: string, fileName: string) => {
    setDownloading(fileName);
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
      setDownloading(null);
    }
  };

  const { user: currentUserAuth } = useAuthStore();
  const isAdmin = currentUserAuth?.role === 'admin';

  const handleDeleteDoc = async (doc: Document) => {
    if (!confirm(`Excluir o documento "${doc.title}"? Esta ação é irreversível.`)) return;
    try {
      await operationsApi.deleteDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success('Documento excluído.');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir documento.');
    }
  };

  useEffect(() => { loadDocs(); }, [operationId]);

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <>
      {showModal && (
        <DocumentUploadModal
          operationId={operationId}
          onClose={() => setShowModal(false)}
          onUploaded={() => { setLoading(true); loadDocs(); }}
        />
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Documentos</div>
            <div className="card-subtitle">{docs.length} documento{docs.length !== 1 ? 's' : ''} anexado{docs.length !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Anexar Documento
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} className="empty-icon" />
            <div className="empty-title">Nenhum documento anexado</div>
            <div className="empty-desc">Clique em "Anexar Documento" para adicionar ofícios, mandados, decisões judiciais e outros arquivos.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Data</th>
                  <th></th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.title}</td>
                    <td><span className="badge badge-neutral">{DOC_TYPE_LABELS[d.doc_type] || d.doc_type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 240 }}>
                      {d.description || '—'}
                    </td>
                    <td className="text-sm">{formatDate(d.created_at)}</td>
                    <td>
                      {d.file_url ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ gap: 4 }}
                          title={d.file_name || 'Baixar arquivo'}
                          disabled={downloading === (d.file_name || d.id)}
                          onClick={() => handleDownload(d.file_url!, d.file_name || 'documento')}
                        >
                          {downloading === (d.file_name || d.id)
                            ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Baixando…</>
                            : <><Download size={12} /> Baixar</>}
                        </button>
                      ) : d.file_path ? (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>processando…</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ gap: 4 }}
                          title="Excluir documento (admin)"
                          onClick={() => handleDeleteDoc(d)}
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Modal de Anexar Documento ─────────────────────────────────────
function DocumentUploadModal({
  operationId,
  onClose,
  onUploaded,
}: {
  operationId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [form, setForm] = useState({ title: '', doc_type: 'other', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const DOC_TYPES = [
    ['judicial_decision', 'Decisão Judicial'],
    ['warrant',           'Mandado'],
    ['seizure_form',      'Ficha de Apreensão'],
    ['report',            'Relatório'],
    ['official_letter',   'Ofício'],
    ['other',             'Outros'],
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Informe o título do documento.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('doc_type', form.doc_type);
      if (form.description) fd.append('description', form.description);
      if (file) fd.append('file', file);
      await operationsApi.uploadDocument(operationId, fd);
      toast.success('Documento anexado com sucesso!');
      onUploaded();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao anexar documento.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="modal-title">
            <FileText size={16} style={{ display: 'inline', marginRight: 8 }} />
            Anexar Documento
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Título *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Ex: Mandado de Busca e Apreensão nº 001/2024"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Documento</label>
              <select className="form-select" value={form.doc_type} onChange={(e) => set('doc_type', e.target.value)}>
                {DOC_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Observações ou resumo do documento (opcional)"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Arquivo <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
              <div
                className="upload-zone"
                style={{ padding: '14px 18px', minHeight: 'unset', cursor: 'pointer' }}
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={20} color="var(--color-primary)" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{file.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {(file.size / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      style={{ marginLeft: 'auto' }}
                      onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Save size={22} color="var(--text-muted)" style={{ marginBottom: 6 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Clique para selecionar um arquivo
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      PDF, DOCX, XLSX, imagens — máx. 50MB
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                  style={{ display: 'none' }}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Enviando…</>
                : <><Save size={14} /> Anexar Documento</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DeploymentTeamsTab ────────────────────────────────────────────
function DeploymentTeamsTab({ operationId, targets }: { operationId: string; targets: TargetType[] }) {
  const [teams, setTeams] = useState<DeploymentTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    Promise.all([deploymentTeamsApi.list(operationId), usersApi.listAll()])
      .then(([tr, ur]) => { setTeams(tr.data); setAllUsers(ur.data.items || []); })
      .catch(() => toast.error('Erro ao carregar equipes.'))
      .finally(() => setLoading(false));
  }, [operationId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const res = await deploymentTeamsApi.create(operationId, { name: newTeamName.trim(), description: newTeamDesc.trim() || undefined });
      setTeams((prev) => [...prev, res.data]);
      setNewTeamName(''); setNewTeamDesc(''); setShowCreate(false);
      toast.success('Equipe criada com sucesso.');
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erro ao criar equipe.'); }
    finally { setCreating(false); }
  };

  const handleDeleteTeam = async (team: DeploymentTeam) => {
    if (!confirm(`Remover equipe "${team.name}"?`)) return;
    try {
      await deploymentTeamsApi.delete(operationId, team.id);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      toast.success('Equipe removida.');
    } catch { toast.error('Erro ao remover equipe.'); }
  };

  // addMember: accepts either a system user_id OR a free-text member_name
  const handleAddMember = async (
    team: DeploymentTeam,
    payload: { user_id?: string; member_name?: string; member_role?: string },
  ) => {
    try {
      const res = await deploymentTeamsApi.addMember(operationId, team.id, payload);
      setTeams((prev) => prev.map((t) => t.id === team.id ? { ...t, members: [...t.members, res.data] } : t));
      toast.success('Membro adicionado.');
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erro ao adicionar membro.'); }
  };

  // removeMember now uses member.id (the row PK), not user_id
  const handleRemoveMember = async (team: DeploymentTeam, memberId: string) => {
    try {
      await deploymentTeamsApi.removeMember(operationId, team.id, memberId);
      setTeams((prev) => prev.map((t) => t.id === team.id
        ? { ...t, members: t.members.filter((m) => m.id !== memberId) }
        : t));
      toast.success('Membro removido.');
    } catch { toast.error('Erro ao remover membro.'); }
  };

  const handleAssignTarget = async (team: DeploymentTeam, targetId: string) => {
    if (!targetId) return;
    try {
      const res = await deploymentTeamsApi.assignTarget(operationId, team.id, targetId);
      setTeams((prev) => prev.map((t) => t.id === team.id ? { ...t, target_assignments: [...t.target_assignments, res.data] } : t));
      toast.success('Alvo atribuído à equipe.');
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Erro ao atribuir alvo.'); }
  };

  const handleRemoveTarget = async (team: DeploymentTeam, targetId: string) => {
    try {
      await deploymentTeamsApi.removeTarget(operationId, team.id, targetId);
      setTeams((prev) => prev.map((t) => t.id === team.id
        ? { ...t, target_assignments: t.target_assignments.filter((ta) => ta.target_id !== targetId) }
        : t));
      toast.success('Alvo removido da equipe.');
    } catch { toast.error('Erro ao remover alvo da equipe.'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={16} /> Equipes de Deflagração <span className="badge badge-neutral">{teams.length}</span>
        </div>
        <button id="create-team-btn" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          <Plus size={13} /> Nova Equipe
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid var(--color-primary)' }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Nova Equipe de Deflagração</div>
          <form id="create-team-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-team-name-il">Nome da Equipe *</label>
              <input id="new-team-name-il" className="form-input" type="text" placeholder="Ex: Grupo Alfa, Equipe 1..." value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="new-team-desc-il">Descrição</label>
              <input id="new-team-desc-il" className="form-input" type="text" placeholder="Descreva a função desta equipe (opcional)..." value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                {creating ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Criando...</> : <><Save size={13} /> Criar Equipe</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="empty-state">
          <Shield size={40} className="empty-icon" />
          <div className="empty-title">Nenhuma equipe cadastrada</div>
          <div className="empty-desc">Crie equipes de deflagração para organizar os policiais desta operação.</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>
            <Plus size={13} /> Criar Primeira Equipe
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {teams.map((team) => {
            const expanded = expandedId === team.id;
            const systemMemberUserIds = new Set(team.members.filter((m) => m.user_id).map((m) => m.user_id!));
            const assignedTargetIds = new Set(team.target_assignments.map((ta) => ta.target_id));
            return (
              <div key={team.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* ── Team Header (clickable to expand) ─── */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', background: expanded ? 'var(--bg-surface-2)' : 'transparent', transition: 'background 0.15s' }}
                  onClick={() => setExpandedId(expanded ? null : team.id)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{team.name}</div>
                    {team.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{team.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="badge badge-info" style={{ fontSize: 11 }}>
                      <Users size={10} style={{ marginRight: 3 }} />{team.members.length} membro{team.members.length !== 1 ? 's' : ''}
                    </span>
                    <span className="badge badge-warning" style={{ fontSize: 11 }}>
                      {team.target_assignments.length} alvo{team.target_assignments.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      id={`delete-team-${team.id}`}
                      onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team); }}
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Remover equipe"
                    >
                      <Trash2 size={14} color="var(--color-danger)" />
                    </button>
                  </div>
                </div>

                {/* ── Expanded Panel ─── */}
                {expanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px 18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

                      {/* ── Membros ─────────────────────── */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 10 }}>
                          Policiais Membros
                        </div>

                        {/* Member list */}
                        {team.members.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10 }}>
                            Nenhum membro adicionado.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                            {team.members.map((m) => {
                              const displayName = m.user?.full_name || m.member_name || m.user_id || '—';
                              const isExternal = !m.user_id;
                              return (
                                <div
                                  key={m.id}
                                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-surface-2)', borderRadius: 8, gap: 8 }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {displayName}
                                    </span>
                                    {m.member_role && (
                                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>— {m.member_role}</span>
                                    )}
                                    {isExternal && (
                                      <span className="badge badge-neutral" style={{ fontSize: 9, padding: '1px 5px', flexShrink: 0 }}>externo</span>
                                    )}
                                  </div>
                                  <button
                                    id={`rm-mem-${m.id}`}
                                    onClick={() => handleRemoveMember(team, m.id)}
                                    className="btn btn-ghost btn-icon btn-sm"
                                    style={{ flexShrink: 0 }}
                                    title="Remover membro"
                                  >
                                    <UserX size={12} color="var(--color-danger)" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add member sub-form */}
                        <AddMemberForm
                          teamId={team.id}
                          allUsers={allUsers}
                          systemMemberUserIds={systemMemberUserIds}
                          onAdd={(payload) => handleAddMember(team, payload)}
                        />
                      </div>

                      {/* ── Alvos ───────────────────────── */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 10 }}>
                          Alvos Atribuídos à Equipe
                        </div>

                        {team.target_assignments.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10 }}>
                            Nenhum alvo atribuído.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                            {team.target_assignments.map((ta) => {
                              const tg = targets.find((t) => t.id === ta.target_id);
                              const name = ta.target?.full_name || tg?.full_name || ta.target_id;
                              const nickname = ta.target?.nickname || tg?.nickname;
                              return (
                                <div
                                  key={ta.id}
                                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-surface-2)', borderRadius: 8, gap: 8 }}
                                >
                                  <div style={{ minWidth: 0 }}>
                                    <Link
                                      to={`/targets/${ta.target_id}`}
                                      style={{ fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                      {name}
                                    </Link>
                                    {nickname && (
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>"{nickname}"</div>
                                    )}
                                  </div>
                                  <button
                                    id={`rm-tgt-${ta.id}`}
                                    onClick={() => handleRemoveTarget(team, ta.target_id)}
                                    className="btn btn-ghost btn-icon btn-sm"
                                    style={{ flexShrink: 0 }}
                                    title="Remover alvo"
                                  >
                                    <X size={12} color="var(--color-danger)" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Assign target */}
                        <div style={{ display: 'flex', gap: 5 }}>
                          <select
                            id={`ts-${team.id}`}
                            className="form-input"
                            style={{ flex: 1, fontSize: 12, padding: '5px 8px', height: 30 }}
                            onChange={(e) => {
                              if (e.target.value) { handleAssignTarget(team, e.target.value); e.target.value = ''; }
                            }}
                          >
                            <option value="">— Atribuir alvo a esta equipe —</option>
                            {targets.filter((t) => !assignedTargetIds.has(t.id)).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.full_name}{t.nickname ? ` ("${t.nickname}")` : ''}
                              </option>
                            ))}
                          </select>
                          <button className="btn btn-primary btn-sm" title="Atribuir alvo selecionado">
                            <ExternalLink size={12} />
                          </button>
                        </div>

                        {targets.filter((t) => !assignedTargetIds.has(t.id)).length === 0 && targets.length > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                            Todos os alvos desta operação já foram atribuídos.
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AddMemberForm ─────────────────────────────────────────────────
// Sub-componente para adicionar membro — suporta usuário do sistema
// OU nome livre de pessoa externa.
type MemberMode = 'system' | 'external';

function AddMemberForm({
  teamId,
  allUsers,
  systemMemberUserIds,
  onAdd,
}: {
  teamId: string;
  allUsers: User[];
  systemMemberUserIds: Set<string>;
  onAdd: (payload: { user_id?: string; member_name?: string; member_role?: string }) => void;
}) {
  const [mode, setMode] = useState<MemberMode>('system');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [externalName, setExternalName] = useState('');
  const [externalRole, setExternalRole] = useState('');

  const availableUsers = allUsers.filter((u) => !systemMemberUserIds.has(u.id));

  const handleAdd = () => {
    if (mode === 'system') {
      if (!selectedUserId) return;
      onAdd({ user_id: selectedUserId });
      setSelectedUserId('');
    } else {
      if (!externalName.trim()) return;
      onAdd({ member_name: externalName.trim(), member_role: externalRole.trim() || undefined });
      setExternalName('');
      setExternalRole('');
    }
  };

  return (
    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 10, marginTop: 2 }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => setMode('system')}
          style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)',
            background: mode === 'system' ? 'var(--color-primary)' : 'transparent',
            color: mode === 'system' ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          Usuário do sistema
        </button>
        <button
          type="button"
          onClick={() => setMode('external')}
          style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)',
            background: mode === 'external' ? 'var(--color-primary)' : 'transparent',
            color: mode === 'external' ? '#fff' : 'var(--text-secondary)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          Pessoa externa
        </button>
      </div>

      {mode === 'system' ? (
        <div style={{ display: 'flex', gap: 5 }}>
          <select
            id={`ms-${teamId}`}
            className="form-input"
            style={{ flex: 1, fontSize: 12, padding: '5px 8px', height: 30 }}
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">— Selecione um policial —</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}{u.badge_number ? ` (Mat. ${u.badge_number})` : ''}{u.unit ? ` — ${u.unit}` : ''}
              </option>
            ))}
          </select>
          <button
            id={`add-sys-${teamId}`}
            className="btn btn-primary btn-sm"
            onClick={handleAdd}
            disabled={!selectedUserId}
            title="Adicionar policial"
          >
            <UserPlus size={12} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <input
              id={`ext-name-${teamId}`}
              className="form-input"
              type="text"
              placeholder="Nome completo *"
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              style={{ flex: 2, fontSize: 12, padding: '5px 8px', height: 30 }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <input
              id={`ext-role-${teamId}`}
              className="form-input"
              type="text"
              placeholder="Função / Cargo"
              value={externalRole}
              onChange={(e) => setExternalRole(e.target.value)}
              style={{ flex: 1, fontSize: 12, padding: '5px 8px', height: 30 }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
            <button
              id={`add-ext-${teamId}`}
              className="btn btn-primary btn-sm"
              onClick={handleAdd}
              disabled={!externalName.trim()}
              title="Adicionar pessoa externa"
            >
              <UserPlus size={12} />
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Ex: "Cel. João Silva", cargo "Comandante de Patrulha"
          </div>
        </div>
      )}
    </div>
  );
}

