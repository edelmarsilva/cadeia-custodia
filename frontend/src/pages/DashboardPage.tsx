import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Cpu, Shield, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Plus,
} from 'lucide-react';
import { operationsApi } from '@/api/endpoints';
import type { Operation, PaginatedResponse } from '@/types';
import { formatDate, formatRelative } from '@/utils/format';
import {
  OPERATION_STATUS_LABELS,
  OPERATION_STATUS_BADGE,
} from '@/utils/labels';
import { useAuthStore } from '@/store';

export default function DashboardPage() {
  const [opsData, setOpsData] = useState<PaginatedResponse<Operation> | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    operationsApi.list({ page: 1, page_size: 5 })
      .then((r) => setOpsData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const ops = opsData?.items || [];
  const totalOps = opsData?.total || 0;
  const activeOps = ops.filter((o) => o.status === 'active').length;
  const planningOps = ops.filter((o) => o.status === 'planning').length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Bom dia, {user?.full_name.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">
            Visão geral do sistema de cadeia de custódia
          </p>
        </div>
        <Link to="/operations/new" className="btn btn-primary">
          <Plus size={16} />
          Nova Operação
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--stat-color': 'var(--color-primary)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'var(--bg-warning)' }}>
            <Briefcase size={18} color="var(--color-primary)" />
          </div>
          <div className="stat-value">{totalOps}</div>
          <div className="stat-label">Total de Operações</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--color-success)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'var(--bg-success)' }}>
            <TrendingUp size={18} color="var(--color-success)" />
          </div>
          <div className="stat-value">{activeOps}</div>
          <div className="stat-label">Em Andamento</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--color-info)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'var(--bg-info)' }}>
            <Clock size={18} color="var(--color-info)" />
          </div>
          <div className="stat-value">{planningOps}</div>
          <div className="stat-label">Em Planejamento</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': 'var(--color-accent)' } as React.CSSProperties}>
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>
            <Shield size={18} color="var(--color-accent)" />
          </div>
          <div className="stat-value">{user?.role === 'admin' ? '✓' : '—'}</div>
          <div className="stat-label">Perfil: {user?.role?.toUpperCase()}</div>
        </div>
      </div>

      {/* Recent Operations */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Operações Recentes</div>
            <div className="card-subtitle">Últimas operações cadastradas no sistema</div>
          </div>
          <Link to="/operations" className="btn btn-secondary btn-sm">
            Ver todas
          </Link>
        </div>

        {loading ? (
          <div className="loading-overlay">
            <div className="spinner" />
            Carregando...
          </div>
        ) : ops.length === 0 ? (
          <div className="empty-state">
            <Briefcase size={40} className="empty-icon" />
            <div className="empty-title">Nenhuma operação cadastrada</div>
            <div className="empty-desc">Crie a primeira operação para começar.</div>
            <Link to="/operations/new" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>
              <Plus size={14} /> Nova Operação
            </Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Operação</th>
                  <th>Procedimento</th>
                  <th>Unidade</th>
                  <th>Status</th>
                  <th>Início</th>
                  <th>Criada</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((op) => (
                  <tr key={op.id}>
                    <td>
                      <Link
                        to={`/operations/${op.id}`}
                        style={{ color: 'var(--color-primary)', fontWeight: 600 }}
                      >
                        {op.name}
                      </Link>
                    </td>
                    <td className="font-mono text-sm">{op.procedure_number || '—'}</td>
                    <td>{op.responsible_unit || '—'}</td>
                    <td>
                      <span className={`badge ${OPERATION_STATUS_BADGE[op.status as keyof typeof OPERATION_STATUS_BADGE]}`}>
                        {OPERATION_STATUS_LABELS[op.status as keyof typeof OPERATION_STATUS_LABELS]}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{formatDate(op.start_date)}</td>
                    <td className="text-sm text-muted">{formatRelative(op.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
