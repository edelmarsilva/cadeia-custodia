import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Plus, Edit3, UserX, UserCheck, Shield, ChevronLeft, ChevronRight, Search, Trash2,
} from 'lucide-react';
import { usersApi } from '@/api/endpoints';
import type { User } from '@/types';
import { formatDate } from '@/utils/format';
import { ROLE_LABELS } from '@/utils/labels';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

const ROLE_BADGE: Record<string, string> = {
  admin:   'badge-danger',
  custody: 'badge-warning',
  expert:  'badge-info',
  analyst: 'badge-success',
  auditor: 'badge-neutral',
};

export default function UsersPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers]     = useState<User[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list({ page, page_size: pageSize });
      setUsers(res.data.items);
      setTotal(res.data.total);
    } catch {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleToggleActive = async (user: User) => {
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Usuário desativado.' : 'Usuário ativado.');
      load();
    } catch {
      toast.error('Erro ao alterar status do usuário.');
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(
      `Excluir permanentemente o usuário "${user.full_name}" (@${user.username})?\n\nEsta ação é irreversível.`
    );
    if (!confirmed) return;
    try {
      await usersApi.delete(user.id);
      toast.success(`Usuário ${user.username} excluído.`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir usuário.');
    }
  };

  const filtered = users.filter((u) =>
    !search ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">
            <Shield size={22} style={{ color: 'var(--color-primary)' }} />
            Gestão de Usuários
          </div>
          <div className="page-subtitle">
            {total} usuário{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}
          </div>
        </div>
        <Link to="/users/new" className="btn btn-primary">
          <Plus size={16} /> Novo Usuário
        </Link>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ padding: '12px 20px' }}>
          <div className="search-box" style={{ flex: 1 }}>
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              placeholder="Buscar por nome, username ou e-mail…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={40} className="empty-icon" />
            <div className="empty-title">Nenhum usuário encontrado</div>
            <div className="empty-desc">Crie usuários e atribua-os às operações.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Unidade</th>
                  <th>Matrícula</th>
                  <th>Cadastro</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] || 'badge-neutral'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{u.unit || '—'}</td>
                    <td className="font-mono" style={{ fontSize: 12 }}>{u.badge_number || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Link to={`/users/${u.id}/edit`} className="btn btn-secondary btn-sm">
                          <Edit3 size={13} /> Editar
                        </Link>
                        {u.id !== currentUser?.id && (
                          <>
                            <button
                              className={`btn btn-sm ${u.is_active ? 'btn-ghost' : 'btn-secondary'}`}
                              onClick={() => handleToggleActive(u)}
                              title={u.is_active ? 'Desativar usuário' : 'Ativar usuário'}
                            >
                              {u.is_active
                                ? <><UserX size={13} /> Desativar</>
                                : <><UserCheck size={13} /> Ativar</>}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={() => handleDelete(u)}
                              title="Excluir usuário"
                            >
                              <Trash2 size={13} /> Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-ghost btn-sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="pagination-info">
              Página {page} de {totalPages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
