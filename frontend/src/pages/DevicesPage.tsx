import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu, Plus, Search, Filter, X, ChevronRight,
  Smartphone, HardDrive, Monitor, Server, MemoryStick,
  Usb, CreditCard, Shield, AlertCircle,
} from 'lucide-react';
import { devicesApi } from '@/api/endpoints';
import { DEVICE_TYPE_LABELS } from '@/utils/labels';
import type { Device } from '@/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  seized:      { label: 'Apreendido',   color: 'var(--color-warning, #f59e0b)' },
  in_custody:  { label: 'Em Custódia',  color: 'var(--color-accent)'           },
  in_analysis: { label: 'Em Análise',   color: 'var(--color-primary)'          },
  finished:    { label: 'Concluído',    color: 'var(--color-success, #16a34a)' },
  returned:    { label: 'Devolvido',    color: 'var(--text-muted)'             },
};

const DEVICE_TYPE_ICONS: Record<string, React.ElementType> = {
  smartphone:        Smartphone,
  tablet:            Smartphone,
  notebook:          Monitor,
  desktop:           Monitor,
  server:            Server,
  hd:                HardDrive,
  ssd:               HardDrive,
  pendrive:          Usb,
  memory_card:       CreditCard,
  dvr:               Monitor,
  network_equipment: Server,
  other:             Cpu,
};

const DEVICE_TYPES = Object.entries(DEVICE_TYPE_LABELS);

export default function DevicesPage() {
  const navigate = useNavigate();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devicesApi.listAll({
        page,
        page_size: pageSize,
        search: search || undefined,
        device_type: filterType || undefined,
        status: filterStatus || undefined,
      });
      setDevices(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const clearFilters = () => {
    setSearch(''); setSearchInput('');
    setFilterType(''); setFilterStatus('');
    setPage(1);
  };

  const hasFilters = !!(search || filterType || filterStatus);
  const pages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dispositivos</h1>
          <p className="page-subtitle">
            Todos os dispositivos cadastrados no sistema
            {total > 0 && <> — <strong>{total}</strong> no total</>}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/devices/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} />
          Novo Dispositivo
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Busca textual */}
          <div style={{ flex: 2, minWidth: 220 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 32 }}
                placeholder="Nº evidência, marca, modelo, série..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          {/* Tipo */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Tipo</label>
            <select className="form-select" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
              <option value="">Todos os tipos</option>
              {DEVICE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Status */}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Status</label>
            <select className="form-select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ height: 38 }}>
              <Search size={14} />
            </button>
            {hasFilters && (
              <button type="button" className="btn btn-ghost" style={{ height: 38 }} onClick={clearFilters}>
                <X size={14} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : devices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 64 }}>
          <Cpu size={56} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Nenhum dispositivo encontrado</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 13 }}>
            {hasFilters ? 'Ajuste os filtros para ver mais resultados.' : 'Cadastre o primeiro dispositivo usando o botão acima.'}
          </div>
          {!hasFilters && (
            <button className="btn btn-primary" onClick={() => navigate('/devices/new')}>
              <Plus size={15} /> Novo Dispositivo
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                {['Nº Evidência', 'Tipo', 'Marca / Modelo', 'Status', 'Operação', 'Alvo', ''].map((h) => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const TypeIcon = DEVICE_TYPE_ICONS[d.device_type] || Cpu;
                const st = STATUS_LABELS[d.status] || { label: d.status, color: 'var(--text-muted)' };
                return (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/devices/${d.id}`)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>
                        {d.evidence_number}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TypeIcon size={14} color="var(--color-primary)" />
                        <span style={{ fontSize: 13 }}>{DEVICE_TYPE_LABELS[d.device_type] || d.device_type}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      {[d.brand, d.model].filter(Boolean).join(' ') || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: st.color + '20', color: st.color,
                        border: `1px solid ${st.color}40`,
                      }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {(d as any).operation_name || (d.operation_id ? '—' : <span style={{ fontStyle: 'italic' }}>Avulso</span>)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {d.target_id ? '—' : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem alvo</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ChevronRight size={15} color="var(--text-muted)" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Paginação */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: 13 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                ← Anterior
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Página {page} de {pages}
              </span>
              <button className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: 13 }} disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                Próxima →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
