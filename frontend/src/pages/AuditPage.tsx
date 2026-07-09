import React, { useEffect, useState } from 'react';
import { BookOpen, Search, Filter } from 'lucide-react';
import { auditApi } from '@/api/endpoints';
import type { AuditLog, PaginatedResponse } from '@/types';
import { formatDateTime } from '@/utils/format';

const ACTION_COLORS: Record<string, string> = {
  user_login: 'badge-info',
  user_created: 'badge-success',
  user_updated: 'badge-warning',
  user_deleted: 'badge-danger',
  operation_created: 'badge-success',
  operation_updated: 'badge-warning',
  operation_archived: 'badge-neutral',
  target_created: 'badge-success',
  target_updated: 'badge-warning',
  device_created: 'badge-success',
  device_updated: 'badge-warning',
  custody_movement_registered: 'badge-info',
  photo_uploaded: 'badge-neutral',
  report_created: 'badge-success',
  hash_registered: 'badge-info',
};

export default function AuditPage() {
  const [data, setData] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getLogs({
        page,
        page_size: 50,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
      });
      setData(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, actionFilter, entityFilter]);

  const logs = data?.items || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Log de Auditoria</h1>
          <p className="page-subtitle">Registro imutável de todas as ações realizadas no sistema</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrap" style={{ flex: 'none', width: 240 }}>
          <select className="form-select" value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os módulos</option>
            <option value="user">Usuário</option>
            <option value="operation">Operação</option>
            <option value="target">Alvo</option>
            <option value="device">Dispositivo</option>
            <option value="report">Laudo</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <input
            className="form-input"
            placeholder="Filtrar por ação (ex: device_created)…"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /> Carregando logs…</div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Módulo</th>
                  <th>ID do Registro</th>
                  <th>Descrição</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Nenhum log encontrado.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono text-sm" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.timestamp)}</td>
                    <td style={{ fontWeight: 500 }}>{log.username || '—'}</td>
                    <td>
                      <span className={`badge ${ACTION_COLORS[log.action] || 'badge-neutral'}`} style={{ fontSize: 10 }}>
                        {log.action}
                      </span>
                    </td>
                    <td><span className="badge badge-neutral">{log.entity_type || '—'}</span></td>
                    <td className="font-mono text-sm" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.entity_id ? log.entity_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td style={{ maxWidth: 280, fontSize: 12, color: 'var(--text-secondary)' }}>{log.description || '—'}</td>
                    <td className="font-mono text-sm">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(data?.pages ?? 0) > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(data!.pages, 10) }, (_, i) => i + 1).map((p) => (
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
