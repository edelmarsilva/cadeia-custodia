import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart2, Briefcase, Users, Cpu, Link2, FileText,
  Camera, TrendingUp, RefreshCw, Printer, ChevronRight,
  Shield, AlertTriangle, CheckCircle, Clock, Archive,
} from 'lucide-react';
import { statsApi, operationsApi } from '@/api/endpoints';
import type { SystemStats, OperationStats, Operation } from '@/types';
import { formatDateTime } from '@/utils/format';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';
import {
  OPERATION_STATUS_LABELS, OPERATION_STATUS_BADGE,
  DEVICE_TYPE_LABELS, DEVICE_STATUS_LABELS, DEVICE_STATUS_BADGE,
} from '@/utils/labels';

// ── Rótulos de movimentação ───────────────────────────────────────
const MOVEMENT_LABELS: Record<string, string> = {
  seizure: 'Apreensão', reception: 'Recepção', transfer: 'Transferência',
  analysis_start: 'Início de Análise', analysis_end: 'Fim de Análise',
  report_issued: 'Laudo Emitido', return: 'Devolução', archive: 'Arquivamento',
};

// ── Componente de barra de progresso CSS ──────────────────────────
function Bar({ value, max, color = 'var(--color-primary)' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--bg-surface-2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, minWidth: 36, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── Card de métrica ───────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color } as React.CSSProperties}>
      <div className="stat-icon" style={{ background: `${color}18` }}>
        <Icon size={18} color={color} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Seção de breakdown ────────────────────────────────────────────
function BreakdownSection({ title, items, labelMap, colorFn }: {
  title: string;
  items: { type?: string; status?: string; count: number }[];
  labelMap?: Record<string, string>;
  colorFn?: (key: string) => string;
}) {
  const max = Math.max(...items.map(i => i.count), 1);
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899'];
  return (
    <div className="card" style={{ flex: 1, minWidth: 260 }}>
      <div className="card-title" style={{ marginBottom: 16, fontSize: 14 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>Sem dados</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, idx) => {
            const key = item.type || item.status || '';
            const label = labelMap ? (labelMap[key] || key) : key;
            const color = colorFn ? colorFn(key) : colors[idx % colors.length];
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {max > 0 ? Math.round((item.count / max) * 100) : 0}%
                  </span>
                </div>
                <Bar value={item.count} max={max} color={color} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Cabeçalho com botões de ação ──────────────────────────────────
function PageActions({ onRefresh, onPrint, loading }: { onRefresh: () => void; onPrint: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Atualizar
      </button>
      <button className="btn btn-secondary btn-sm" onClick={onPrint}>
        <Printer size={14} /> Imprimir PDF
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SISTEMA — visão geral
// ══════════════════════════════════════════════════════════════════
function SystemStatsView() {
  const [data, setData] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  // years populated from first API response
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const load = useCallback(async (year?: number | null) => {
    setLoading(true);
    try {
      const res = await statsApi.system(year ?? undefined);
      setData(res.data);
      // Atualiza a lista de anos disponíveis (vem do backend)
      if (res.data.available_years?.length) {
        setAvailableYears(res.data.available_years);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao carregar estatísticas do sistema.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(null); }, [load]);

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year);
    load(year);
  };

  const periodLabel = selectedYear ? `Ano ${selectedYear}` : 'Todos os anos';

  const handlePrint = () => {
    if (!data) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const statusBar = data.operations_by_status.map(s => `<tr><td>${OPERATION_STATUS_LABELS[s.status as keyof typeof OPERATION_STATUS_LABELS] || s.status}</td><td>${s.count}</td></tr>`).join('');
    const devTypeBar = data.devices_by_type.map(d => `<tr><td>${DEVICE_TYPE_LABELS[d.type as keyof typeof DEVICE_TYPE_LABELS] || d.type}</td><td>${d.count}</td></tr>`).join('');
    const topOpsHtml = data.top_operations.map((op, i) => `<tr><td>${i + 1}. ${op.name}</td><td>${op.procedure_number || '—'}</td><td>${op.targets}</td><td>${op.devices}</td></tr>`).join('');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Relatório Estatístico — Sistema (${periodLabel})</title>
    <style>body{font-family:Arial,sans-serif;color:#111;padding:32px;max-width:900px;margin:0 auto}h1{font-size:20px;border-bottom:2px solid #1e40af;padding-bottom:8px;color:#1e40af}h2{font-size:15px;margin-top:24px;color:#374151}
    .badge{display:inline-block;background:#dbeafe;color:#1e40af;border-radius:99px;padding:3px 12px;font-size:12px;font-weight:600;margin-left:8px}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.metric{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center}.metric .val{font-size:28px;font-weight:700;color:#1e40af}.metric .lbl{font-size:11px;color:#6b7280;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#f1f5f9;padding:8px;text-align:left;font-size:12px}td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px}
    .footer{margin-top:40px;border-top:1px solid #ccc;padding-top:10px;font-size:10px;color:#9ca3af}@media print{body{padding:16px}}</style></head><body>
    <h1>📊 Relatório Estatístico — Sistema Completo <span class="badge">${periodLabel}</span></h1>
    <p style="font-size:12px;color:#6b7280">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    <div class="grid">
      <div class="metric"><div class="val">${data.totals.operations}</div><div class="lbl">Operações</div></div>
      <div class="metric"><div class="val">${data.totals.targets}</div><div class="lbl">Alvos</div></div>
      <div class="metric"><div class="val">${data.totals.devices}</div><div class="lbl">Dispositivos</div></div>
      <div class="metric"><div class="val">${data.totals.custody_movements}</div><div class="lbl">Movimentações</div></div>
      <div class="metric"><div class="val">${data.totals.expert_reports}</div><div class="lbl">Documentos</div></div>
      <div class="metric"><div class="val">${data.totals.generated_documents}</div><div class="lbl">Docs Gerados</div></div>
      <div class="metric"><div class="val">${data.totals.users}</div><div class="lbl">Usuários</div></div>
      <div class="metric"><div class="val">${data.totals.photos}</div><div class="lbl">Fotografias</div></div>
    </div>
    <h2>Operações por Status</h2><table><thead><tr><th>Status</th><th>Qtde</th></tr></thead><tbody>${statusBar}</tbody></table>
    <h2>Dispositivos por Tipo</h2><table><thead><tr><th>Tipo</th><th>Qtde</th></tr></thead><tbody>${devTypeBar}</tbody></table>
    <h2>Top 5 Operações por Dispositivos</h2><table><thead><tr><th>Operação</th><th>Procedimento</th><th>Alvos</th><th>Dispositivos</th></tr></thead><tbody>${topOpsHtml}</tbody></table>
    <div class="footer">Sistema de Cadeia de Custódia Digital — MPAC</div></body></html>`);
    win.document.close(); win.focus(); win.print();
  };

  if (loading && !data) return <div className="loading-overlay"><div className="spinner" /></div>;
  if (!data) return null;

  const { totals, operations_by_status, devices_by_type, devices_by_status, movements_by_type, top_operations, recent_activity } = data;
  const deviceStatusColors: Record<string, string> = { seized: '#6366f1', in_analysis: '#f59e0b', report_issued: '#10b981', returned: '#3b82f6', archived: '#8b5cf6' };

  return (
    <div>
      {/* Barra de controles: filtro de ano + ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Botão "Geral" */}
          <button
            onClick={() => handleYearChange(null)}
            disabled={loading}
            style={{
              padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `2px solid ${selectedYear === null ? 'var(--color-primary)' : 'var(--border)'}`,
              background: selectedYear === null ? 'var(--color-primary)' : 'transparent',
              color: selectedYear === null ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            Geral
          </button>

          {/* Separador */}
          {availableYears.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>ou filtre por ano:</span>
          )}

          {/* Botões de ano */}
          {availableYears.map(yr => (
            <button
              key={yr}
              onClick={() => handleYearChange(yr)}
              disabled={loading}
              style={{
                padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `2px solid ${selectedYear === yr ? 'var(--color-primary)' : 'var(--border)'}`,
                background: selectedYear === yr ? 'var(--color-primary)' : 'transparent',
                color: selectedYear === yr ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {yr}
            </button>
          ))}

          {loading && <div className="spinner" style={{ width: 16, height: 16, marginLeft: 4 }} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Dados de: <strong>{periodLabel}</strong> · compilados em {new Date(data.generated_at).toLocaleString('pt-BR')}
          </span>
          <PageActions onRefresh={() => load(selectedYear)} onPrint={handlePrint} loading={loading} />
        </div>
      </div>

      {/* Métricas principais */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <MetricCard label="Operações" value={totals.operations} icon={Briefcase} color="var(--color-primary)" />
        <MetricCard label="Alvos" value={totals.targets} icon={Users} color="var(--color-success)" />
        <MetricCard label="Dispositivos" value={totals.devices} icon={Cpu} color="var(--color-accent)" />
        <MetricCard label="Movimentações" value={totals.custody_movements} icon={Link2} color="var(--color-warning)" />
        <MetricCard label="Documentos" value={totals.expert_reports} icon={FileText} color="#8b5cf6" />
        <MetricCard label="Docs Gerados" value={totals.generated_documents} icon={TrendingUp} color="#06b6d4" />
        <MetricCard label="Fotografias" value={totals.photos} icon={Camera} color="#ec4899" />
        <MetricCard label="Usuários" value={totals.users} icon={Shield} color="#64748b" />
      </div>

      {/* Breakdowns */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <BreakdownSection
          title="Operações por Status"
          items={operations_by_status}
          labelMap={OPERATION_STATUS_LABELS}
          colorFn={k => ({ planning: '#6366f1', active: '#10b981', closed: '#f59e0b', archived: '#6b7280' }[k] || '#6366f1')}
        />
        <BreakdownSection
          title="Dispositivos por Tipo"
          items={devices_by_type}
          labelMap={DEVICE_TYPE_LABELS}
        />
        <BreakdownSection
          title="Dispositivos por Status"
          items={devices_by_status}
          labelMap={DEVICE_STATUS_LABELS}
          colorFn={k => deviceStatusColors[k] || '#6366f1'}
        />
        <BreakdownSection
          title="Movimentações por Tipo"
          items={movements_by_type}
          labelMap={MOVEMENT_LABELS}
        />
      </div>

      {/* Top operações */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>🏆 Top 5 Operações — Mais Dispositivos</div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>#</th><th>Operação</th><th>Procedimento</th><th>Status</th><th>Alvos</th><th>Dispositivos</th></tr></thead>
            <tbody>
              {top_operations.map((op, i) => (
                <tr key={op.id}>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary)', width: 32 }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{op.name}</td>
                  <td className="font-mono text-sm">{op.procedure_number || '—'}</td>
                  <td><span className={`badge ${OPERATION_STATUS_BADGE[op.status as keyof typeof OPERATION_STATUS_BADGE] || 'badge-neutral'}`}>{OPERATION_STATUS_LABELS[op.status as keyof typeof OPERATION_STATUS_LABELS] || op.status}</span></td>
                  <td style={{ textAlign: 'center' }}>{op.targets}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{op.devices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Atividade recente */}
      {recent_activity.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>🕐 Atividade Recente (últimos 28 dias)</div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Responsável</th></tr></thead>
              <tbody>
                {recent_activity.map((a, i) => (
                  <tr key={i}>
                    <td className="text-sm">{new Date(a.date).toLocaleString('pt-BR')}</td>
                    <td><span className="badge badge-neutral">{MOVEMENT_LABELS[a.type] || a.type}</span></td>
                    <td>{a.responsible || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// POR OPERAÇÃO
// ══════════════════════════════════════════════════════════════════
function OperationStatsView() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [data, setData] = useState<OperationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOps, setLoadingOps] = useState(true);

  useEffect(() => {
    operationsApi.list({ page: 1, page_size: 100 })
      .then(r => setOperations(r.data.items))
      .catch(() => {})
      .finally(() => setLoadingOps(false));
  }, []);

  const loadStats = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setData(null);
    try {
      const res = await statsApi.operation(id);
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao carregar estatísticas da operação.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    loadStats(id);
  };

  const handlePrint = () => {
    if (!data) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const devTypeRows = data.devices_by_type.map(d => `<tr><td>${DEVICE_TYPE_LABELS[d.type as keyof typeof DEVICE_TYPE_LABELS] || d.type}</td><td>${d.count}</td></tr>`).join('');
    const movRows = data.movements_by_type.map(m => `<tr><td>${MOVEMENT_LABELS[m.type || ''] || m.type}</td><td>${m.count}</td></tr>`).join('');
    const topTgRows = data.top_targets.map((t, i) => `<tr><td>${i + 1}. ${t.name}</td><td>${t.cpf || '—'}</td><td>${t.devices}</td></tr>`).join('');
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Relatório Estatístico — ${data.operation.name}</title>
    <style>body{font-family:Arial,sans-serif;color:#111;padding:32px;max-width:900px;margin:0 auto}h1{font-size:18px;border-bottom:2px solid #1e40af;padding-bottom:8px;color:#1e40af}h2{font-size:14px;margin-top:20px;color:#374151}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}.metric{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center}.metric .val{font-size:26px;font-weight:700;color:#1e40af}.metric .lbl{font-size:11px;color:#6b7280;margin-top:4px}
    table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#f1f5f9;padding:8px;text-align:left;font-size:12px}td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;background:#f8fafc;padding:12px;border-radius:8px;margin:12px 0}.info span{color:#6b7280}
    .footer{margin-top:40px;border-top:1px solid #ccc;padding-top:10px;font-size:10px;color:#9ca3af}@media print{body{padding:16px}}</style></head><body>
    <h1>📊 Relatório Estatístico — ${data.operation.name}</h1>
    <p style="font-size:12px;color:#6b7280">Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    <div class="info">
      <div><span>Procedimento:</span> ${data.operation.procedure_number || '—'}</div>
      <div><span>Unidade:</span> ${data.operation.responsible_unit || '—'}</div>
      <div><span>Status:</span> ${OPERATION_STATUS_LABELS[data.operation.status as keyof typeof OPERATION_STATUS_LABELS] || data.operation.status}</div>
      <div><span>Início:</span> ${data.operation.start_date || '—'}</div>
    </div>
    <div class="grid">
      <div class="metric"><div class="val">${data.totals.targets}</div><div class="lbl">Alvos</div></div>
      <div class="metric"><div class="val">${data.totals.devices}</div><div class="lbl">Dispositivos</div></div>
      <div class="metric"><div class="val">${data.totals.custody_movements}</div><div class="lbl">Movimentações</div></div>
      <div class="metric"><div class="val">${data.totals.expert_reports}</div><div class="lbl">Documentos</div></div>
      <div class="metric"><div class="val">${data.totals.generated_documents}</div><div class="lbl">Docs Gerados</div></div>
      <div class="metric"><div class="val">${data.totals.photos}</div><div class="lbl">Fotografias</div></div>
    </div>
    <h2>Dispositivos por Tipo</h2><table><thead><tr><th>Tipo</th><th>Qtde</th></tr></thead><tbody>${devTypeRows}</tbody></table>
    <h2>Movimentações por Tipo</h2><table><thead><tr><th>Tipo</th><th>Qtde</th></tr></thead><tbody>${movRows}</tbody></table>
    <h2>Top Alvos por Dispositivos</h2><table><thead><tr><th>Alvo</th><th>CPF</th><th>Dispositivos</th></tr></thead><tbody>${topTgRows}</tbody></table>
    <div class="footer">Sistema de Cadeia de Custódia Digital — MPAC</div></body></html>`);
    win.document.close(); win.focus(); win.print();
  };

  return (
    <div>
      {/* Seletor de operação */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Selecionar Operação</label>
            <select
              className="form-select"
              value={selectedId}
              onChange={e => handleSelect(e.target.value)}
              disabled={loadingOps}
              style={{ width: '100%' }}
            >
              <option value="">— Escolha uma operação —</option>
              {operations.map(op => (
                <option key={op.id} value={op.id}>
                  {op.name}{op.procedure_number ? ` (${op.procedure_number})` : ''}
                </option>
              ))}
            </select>
          </div>
          {data && (
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => loadStats(selectedId)} disabled={loading}>
                <RefreshCw size={14} /> Atualizar
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
                <Printer size={14} /> Imprimir PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {!selectedId && (
        <div className="empty-state">
          <BarChart2 size={48} className="empty-icon" />
          <div className="empty-title">Selecione uma operação</div>
          <div className="empty-desc">Escolha uma operação acima para visualizar suas estatísticas detalhadas.</div>
        </div>
      )}

      {loading && <div className="loading-overlay"><div className="spinner" /></div>}

      {data && !loading && (
        <div>
          {/* Header da operação */}
          <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{data.operation.name}</div>
                <div style={{ fontSize: 13, opacity: 0.85, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {data.operation.procedure_number && <span>📋 {data.operation.procedure_number}</span>}
                  {data.operation.responsible_unit && <span>🏛️ {data.operation.responsible_unit}</span>}
                  {data.operation.start_date && <span>📅 Início: {data.operation.start_date}</span>}
                  {data.operation.end_date && <span>🔚 Encerramento: {data.operation.end_date}</span>}
                </div>
              </div>
              <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '4px 14px', fontSize: 12, fontWeight: 600 }}>
                {OPERATION_STATUS_LABELS[data.operation.status as keyof typeof OPERATION_STATUS_LABELS] || data.operation.status}
              </span>
            </div>
          </div>

          {/* Métricas */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <MetricCard label="Alvos" value={data.totals.targets} icon={Users} color="var(--color-primary)" />
            <MetricCard label="Dispositivos" value={data.totals.devices} icon={Cpu} color="var(--color-success)" />
            <MetricCard label="Movimentações" value={data.totals.custody_movements} icon={Link2} color="var(--color-warning)" />
            <MetricCard label="Documentos" value={data.totals.expert_reports} icon={FileText} color="#8b5cf6" />
            <MetricCard label="Docs Gerados" value={data.totals.generated_documents} icon={TrendingUp} color="var(--color-accent)" />
            <MetricCard label="Fotografias" value={data.totals.photos} icon={Camera} color="#ec4899" />
          </div>

          {/* Breakdowns */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <BreakdownSection title="Dispositivos por Tipo" items={data.devices_by_type} labelMap={DEVICE_TYPE_LABELS} />
            <BreakdownSection
              title="Dispositivos por Status"
              items={data.devices_by_status}
              labelMap={DEVICE_STATUS_LABELS}
              colorFn={k => ({ seized: '#6366f1', in_analysis: '#f59e0b', report_issued: '#10b981', returned: '#3b82f6', archived: '#6b7280' }[k] || '#6366f1')}
            />
            <BreakdownSection title="Movimentações por Tipo" items={data.movements_by_type} labelMap={MOVEMENT_LABELS} />
          </div>

          {/* Top alvos */}
          {data.top_targets.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title" style={{ marginBottom: 14 }}>🎯 Top Alvos por Dispositivos</div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>#</th><th>Alvo</th><th>CPF</th><th>Dispositivos</th></tr></thead>
                  <tbody>
                    {data.top_targets.map((t, i) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)', width: 32 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{t.name}</td>
                        <td className="font-mono text-sm">{t.cpf || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{t.devices}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Últimas movimentações */}
          {data.recent_movements.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 14 }}>🕐 Últimas Movimentações</div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Responsável</th><th>Origem → Destino</th></tr></thead>
                  <tbody>
                    {data.recent_movements.map((m, i) => (
                      <tr key={i}>
                        <td className="text-sm">{new Date(m.date).toLocaleString('pt-BR')}</td>
                        <td><span className="badge badge-neutral">{MOVEMENT_LABELS[m.type] || m.type}</span></td>
                        <td>{m.responsible || '—'}</td>
                        <td className="text-sm">
                          {(m.origin || m.destination) ? `${m.origin || '—'} → ${m.destination || '—'}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export default function StatisticsPage() {
  const user = useAuthStore(s => s.user);
  const canSeSystem = user?.role === 'admin' || user?.role === 'auditor';
  const [tab, setTab] = useState<'system' | 'operation'>(canSeSystem ? 'system' : 'operation');

  const tabs = [
    ...(canSeSystem ? [{ key: 'system' as const, label: 'Geral do Sistema', icon: Shield }] : []),
    { key: 'operation' as const, label: 'Por Operação', icon: Briefcase },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart2 size={22} /> Relatórios Estatísticos
          </h1>
          <p className="page-subtitle">
            Análise quantitativa das operações e do sistema de cadeia de custódia
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--color-primary)' : 'var(--text-secondary)',
              borderBottom: tab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.15s',
            }}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'system' && canSeSystem && <SystemStatsView />}
      {tab === 'operation' && <OperationStatsView />}
    </div>
  );
}
