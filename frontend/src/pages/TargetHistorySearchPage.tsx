import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { targetHistoryApi } from '@/api/endpoints';
import type { TargetHistoryResult } from '@/types';
import { formatDate, formatCPF } from '@/utils/format';
import { OPERATION_STATUS_LABELS, OPERATION_STATUS_BADGE } from '@/utils/labels';
import toast from 'react-hot-toast';

export default function TargetHistorySearchPage() {
  const [q, setQ] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [nickname, setNickname] = useState('');
  const [results, setResults] = useState<TargetHistoryResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q && !cpf && !rg && !nickname) {
      toast.error('Informe ao menos um campo para pesquisar.');
      return;
    }
    setLoading(true);
    try {
      const res = await targetHistoryApi.search({
        q: q || undefined,
        cpf: cpf || undefined,
        rg: rg || undefined,
        nickname: nickname || undefined,
        limit: 100,
      });
      setResults(res.data);
      setSearched(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro na busca histórica.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQ(''); setCpf(''); setRg(''); setNickname('');
    setResults([]); setSearched(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={22} style={{ color: 'var(--color-primary)' }} />
            Histórico de Alvos
          </h1>
          <p className="page-subtitle">
            Pesquise Alvos em todas as Operações para identificar participações anteriores.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">Critérios de Busca</div>
        </div>
        <form id="history-search-form" onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="hist-q">Nome / Apelido / Nome Social</label>
              <input
                id="hist-q"
                className="form-input"
                type="text"
                placeholder="Busca ampla por qualquer nome..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hist-nickname">Vulgo / Apelido (exato)</label>
              <input
                id="hist-nickname"
                className="form-input"
                type="text"
                placeholder="Ex: Tigrão, Zé Pequeno..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hist-cpf">CPF</label>
              <input
                id="hist-cpf"
                className="form-input"
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="hist-rg">RG / Nº Identificação</label>
              <input
                id="hist-rg"
                className="form-input"
                type="text"
                placeholder="Número do RG..."
                value={rg}
                onChange={(e) => setRg(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            {searched && (
              <button type="button" className="btn btn-ghost" onClick={handleClear}>
                Limpar
              </button>
            )}
            <button
              id="history-search-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              form="history-search-form"
            >
              {loading
                ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Pesquisando...</>
                : <><Search size={14} /> Pesquisar</>}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {searched && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              Resultados {results.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: 8 }}>{results.length}</span>}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={40} className="empty-icon" />
              <div className="empty-title">Nenhum registro encontrado</div>
              <div className="empty-desc">
                Nenhum alvo correspondeu aos critérios informados nas operações cadastradas.
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nome Completo</th>
                    <th>Vulgo</th>
                    <th>CPF</th>
                    <th>RG</th>
                    <th>Operação</th>
                    <th>Código</th>
                    <th>Status</th>
                    <th>Cadastrado em</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr
                      key={`${r.target_id}-${r.operation_id}-${idx}`}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.full_name}
                        {r.social_name && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                            {r.social_name}
                          </div>
                        )}
                      </td>
                      <td style={{ fontStyle: r.nickname ? 'normal' : 'italic', color: r.nickname ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {r.nickname ? `"${r.nickname}"` : '—'}
                      </td>
                      <td className="font-mono text-sm">{formatCPF(r.cpf)}</td>
                      <td className="font-mono text-sm">{r.rg || '—'}</td>
                      <td>
                        <Link
                          to={`/operations/${r.operation_id}`}
                          style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.operation_name}
                        </Link>
                      </td>
                      <td className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        {r.operation_code || '—'}
                      </td>
                      <td>
                        <span className={`badge ${OPERATION_STATUS_BADGE[r.operation_status as keyof typeof OPERATION_STATUS_BADGE]}`}>
                          {OPERATION_STATUS_LABELS[r.operation_status as keyof typeof OPERATION_STATUS_LABELS]}
                        </span>
                      </td>
                      <td className="text-sm">{formatDate(r.registered_at)}</td>
                      <td>
                        <Link to={`/targets/${r.target_id}`} onClick={(e) => e.stopPropagation()}>
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
