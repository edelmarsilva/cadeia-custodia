import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, Search, Briefcase, Calendar, ChevronRight, Filter,
} from 'lucide-react';
import { operationsApi } from '@/api/endpoints';
import type { Operation, PaginatedResponse } from '@/types';
import { formatDate } from '@/utils/format';
import { OPERATION_STATUS_LABELS, OPERATION_STATUS_BADGE } from '@/utils/labels';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'planning', label: 'Planejamento' },
  { value: 'active', label: 'Em Andamento' },
  { value: 'closed', label: 'Encerrada' },
  { value: 'archived', label: 'Arquivada' },
];

export default function OperationsPage() {
  const [data, setData] = useState<PaginatedResponse<Operation> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await operationsApi.list({ page, page_size: 15, status: status || undefined, search: search || undefined });
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const ops = data?.items || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Operações</h1>
          <p className="page-subtitle">
            {data?.total ?? '…'} operação(ões) cadastrada(s) no sistema
          </p>
        </div>
        <Link to="/operations/new" className="btn btn-primary">
          <Plus size={16} /> Nova Operação
        </Link>
      </div>

      {/* Filters */}
      <form className="filter-bar" onSubmit={handleSearch}>
        <div className="search-input-wrap">
          <Search className="search-icon" />
          <input
            className="form-input"
            placeholder="Buscar por nome ou número do procedimento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 200 }}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">
          <Filter size={14} /> Filtrar
        </button>
      </form>

      {/* Table */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner" /> Carregando operações…</div>
      ) : ops.length === 0 ? (
        <div className="empty-state">
          <Briefcase size={48} className="empty-icon" />
          <div className="empty-title">Nenhuma operação encontrada</div>
          <div className="empty-desc">Ajuste os filtros ou crie uma nova operação.</div>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Operação</th>
                  <th>Nº Procedimento</th>
                  <th>Unidade</th>
                  <th>Status</th>
                  <th>Início</th>
                  <th>Encerramento</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ops.map((op) => (
                  <tr key={op.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/operations/${op.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{op.name}</div>
                      {op.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {op.description.slice(0, 60)}…
                        </div>
                      )}
                    </td>
                    <td className="font-mono text-sm">{op.procedure_number || '—'}</td>
                    <td>{op.responsible_unit || '—'}</td>
                    <td>
                      <span className={`badge ${OPERATION_STATUS_BADGE[op.status as keyof typeof OPERATION_STATUS_BADGE]}`}>
                        {OPERATION_STATUS_LABELS[op.status as keyof typeof OPERATION_STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="text-sm">{formatDate(op.start_date)}</td>
                    <td className="text-sm">{formatDate(op.end_date)}</td>
                    <td>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data?.pages ?? 0) > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: data!.pages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="page-btn" onClick={() => setPage(p => Math.min(data!.pages, p + 1))} disabled={page === data?.pages}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
