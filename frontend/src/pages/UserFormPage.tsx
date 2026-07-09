import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';
import { usersApi } from '@/api/endpoints';
import { ROLE_LABELS } from '@/utils/labels';
import toast from 'react-hot-toast';

const ROLES = [
  ['admin',   'Administrador'],
  ['custody', 'Custódia'],
  ['expert',  'Perito'],
  ['analyst', 'Analista'],
  ['auditor', 'Auditor'],
] as const;

const emptyForm = {
  full_name: '',
  username: '',
  email: '',
  password: '',
  role: 'analyst' as string,
  unit: '',
  badge_number: '',
  is_active: true,
};

export default function UserFormPage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const isEdit = Boolean(userId);

  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading]   = useState(isEdit);
  const [saving, setSaving]     = useState(false);

  const set = (field: string, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  useEffect(() => {
    if (!isEdit || !userId) return;
    usersApi.get(userId)
      .then((r) => {
        const u = r.data;
        setForm({
          full_name:    u.full_name,
          username:     u.username,
          email:        u.email,
          password:     '',
          role:         u.role,
          unit:         u.unit || '',
          badge_number: u.badge_number || '',
          is_active:    u.is_active,
        });
      })
      .catch(() => toast.error('Usuário não encontrado.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string | boolean | null> = {
        full_name:    form.full_name,
        email:        form.email,
        role:         form.role,
        unit:         form.unit  || null,
        badge_number: form.badge_number || null,
        is_active:    form.is_active,
      };

      if (isEdit) {
        if (form.password) payload.password = form.password;
        await usersApi.update(userId!, payload);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        if (!form.password) { toast.error('Defina uma senha para o novo usuário.'); return; }
        payload.username = form.username;
        payload.password = form.password;
        await usersApi.create(payload);
        toast.success('Usuário criado com sucesso!');
      }
      navigate('/users');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-group">
          <Link to="/users" className="btn btn-ghost btn-sm" style={{ marginBottom: 6 }}>
            <ArrowLeft size={14} /> Usuários
          </Link>
          <div className="page-title">
            <UserPlus size={22} style={{ color: 'var(--color-primary)' }} />
            {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
          </div>
          {isEdit && (
            <div className="page-subtitle">@{form.username}</div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ maxWidth: 760 }}>
          <div className="card-header">
            <div className="card-title">Dados Pessoais</div>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nome Completo *</label>
                <input
                  className="form-input"
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  placeholder="Nome completo do usuário"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  className="form-input font-mono"
                  value={form.username}
                  onChange={(e) => set('username', e.target.value)}
                  placeholder="usuario.silva"
                  required
                  disabled={isEdit}
                  style={isEdit ? { opacity: 0.5 } : {}}
                />
                {isEdit && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Username não pode ser alterado
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">E-mail *</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="usuario@instituicao.gov.br"
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  {isEdit ? 'Nova Senha' : 'Senha *'}
                  {isEdit && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (deixe em branco para manter)</span>}
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder={isEdit ? 'Nova senha (opcional)' : 'Mínimo 8 caracteres'}
                  required={!isEdit}
                  minLength={isEdit ? undefined : 8}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Perfil de Acesso *</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  required
                >
                  {ROLES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 760, marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">Dados Funcionais</div>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Unidade</label>
                <input
                  className="form-input"
                  value={form.unit}
                  onChange={(e) => set('unit', e.target.value)}
                  placeholder="Ex: SETOR DE PERÍCIAS DIGITAIS"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Matrícula / Nº de Identificação</label>
                <input
                  className="form-input font-mono"
                  value={form.badge_number}
                  onChange={(e) => set('badge_number', e.target.value)}
                  placeholder="Ex: 12345-6"
                />
              </div>
            </div>

            {isEdit && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status da Conta</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  {[true, false].map((val) => (
                    <label
                      key={String(val)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', fontSize: 14,
                      }}
                    >
                      <input
                        type="radio"
                        name="is_active"
                        checked={form.is_active === val}
                        onChange={() => set('is_active', val)}
                      />
                      {val ? 'Ativo' : 'Inativo'}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Roles info card */}
        <div className="card" style={{ maxWidth: 760, marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">Perfis de Acesso</div>
          </div>
          <div style={{ padding: '0 20px 16px' }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--text-muted)', fontWeight: 500 }}>Perfil</th>
                  <th style={{ textAlign: 'left', padding: '6px 0', color: 'var(--text-muted)', fontWeight: 500 }}>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['admin',   'Administrador', 'Acesso total. Vê todas as operações, gerencia usuários.'],
                  ['custody', 'Custódia',      'Gerencia movimentações de custódia. Acesso às operações atribuídas.'],
                  ['expert',  'Perito',        'Cria laudos e hashes. Acesso às operações atribuídas.'],
                  ['analyst', 'Analista',      'Consulta e análise. Acesso às operações atribuídas.'],
                  ['auditor', 'Auditor',       'Somente leitura. Acesso ao log de auditoria.'],
                ].map(([role, label, desc]) => (
                  <tr key={role} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 0', paddingRight: 16, whiteSpace: 'nowrap' }}>
                      <span className={`badge ${
                        { admin: 'badge-danger', custody: 'badge-warning', expert: 'badge-info', analyst: 'badge-success', auditor: 'badge-neutral' }[role] || 'badge-neutral'
                      }`}>{label}</span>
                    </td>
                    <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ maxWidth: 760, display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
          <Link to="/users" className="btn btn-secondary">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Salvando…</>
              : <><Save size={14} /> {isEdit ? 'Salvar Alterações' : 'Criar Usuário'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
