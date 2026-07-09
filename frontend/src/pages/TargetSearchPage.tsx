import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, X, User, Tag, Hash, ArrowRight,
  AlertCircle, Loader2, ChevronLeft, ChevronRight,
  Briefcase, FileSearch,
} from 'lucide-react';
import { targetSearchApi } from '@/api/endpoints';
import type { TargetSearchResult } from '@/types';
import { formatCPF, formatDate } from '@/utils/format';
import { OPERATION_STATUS_BADGE, OPERATION_STATUS_LABELS } from '@/utils/labels';
import toast from 'react-hot-toast';

type SearchMode = 'name' | 'cpf' | 'nickname';

const MODES: { id: SearchMode; label: string; placeholder: string; icon: React.ElementType }[] = [
  { id: 'name', label: 'Nome', placeholder: 'Buscar por nome ou nome social...', icon: User },
  { id: 'nickname', label: 'Apelido / Vulgo', placeholder: 'Buscar por apelido ou vulgo...', icon: Tag },
  { id: 'cpf', label: 'CPF', placeholder: 'Buscar por CPF (parcial ou completo)...', icon: Hash },
];

export default function TargetSearchPage() {
  const [mode, setMode] = useState<SearchMode>('name');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TargetSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 30;

  const doSearch = useCallback(async (q: string, m: SearchMode, p: number) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params: Record<string, string | number> = { page: p, page_size: PAGE_SIZE };
      if (m === 'name') params.q = q.trim();
      else if (m === 'cpf') params.cpf = q.trim().replace(/\D/g, ''); // strip formatting
      else if (m === 'nickname') params.nickname = q.trim();

      const res = await targetSearchApi.search(params);
      setResults(res.data.items);
      setTotal(res.data.total);
      setPage(res.data.page);
      setPages(res.data.pages);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erro ao pesquisar alvos.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search as user types
  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearched(false); setTotal(0); return; }
    const timer = setTimeout(() => doSearch(query, mode, 1), 400);
    return () => clearTimeout(timer);
  }, [query, mode, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query, mode, 1);
  };

  const handleModeChange = (m: SearchMode) => {
    setMode(m);
    setQuery('');
    setResults([]);
    setSearched(false);
    setTotal(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    doSearch(query, mode, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentMode = MODES.find((m) => m.id === mode)!;

  return (
    <div className="page-container">
      {/* ── Header ─────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSearch size={22} style={{ color: 'var(--color-primary)' }} />
            Pesquisa de Alvos
          </h1>
          <p className="page-subtitle">Busca global de alvos em todas as operações</p>
        </div>
      </div>

      {/* ── Search Box ─────────────────────────── */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              id={`mode-${m.id}`}
              onClick={() => handleModeChange(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 20, border: '1px solid var(--border)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                background: mode === m.id ? 'var(--color-primary)' : 'transparent',
                color: mode === m.id ? '#fff' : 'var(--text-secondary)',
                boxShadow: mode === m.id ? '0 2px 8px color-mix(in srgb, var(--color-primary) 30%, transparent)' : 'none',
              }}
            >
              <m.icon size={14} />
              {m.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form id="target-search-form" onSubmit={handleSubmit}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
              {loading
                ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                : <currentMode.icon size={18} />
              }
            </div>
            <input
              id="target-search-input"
              ref={inputRef}
              className="form-input"
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={currentMode.placeholder}
              style={{ paddingLeft: 44, paddingRight: query ? 44 : 16, fontSize: 15, height: 48, borderRadius: 12 }}
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]); setSearched(false); setTotal(0); inputRef.current?.focus(); }}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4 }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>

        {/* Tips */}
        {!searched && (
          <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { icon: User, text: 'Busque por qualquer parte do nome ou nome social' },
              { icon: Tag, text: 'Inclui apelidos e vulgo' },
              { icon: Hash, text: 'CPF aceita formatado (999.999.999-00) ou só dígitos' },
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <tip.icon size={13} />
                {tip.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Results ────────────────────────────── */}
      {searched && !loading && results.length === 0 && (
        <div className="empty-state">
          <AlertCircle size={40} className="empty-icon" />
          <div className="empty-title">Nenhum alvo encontrado</div>
          <div className="empty-desc">
            Tente outros termos ou verifique a grafia. A busca é parcial — não é necessário digitar o nome completo.
          </div>
        </div>
      )}

      {results.length > 0 && (
        <>
          {/* Result count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> alvo{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
              {pages > 1 && <span> · página {page} de {pages}</span>}
            </div>
            {total > PAGE_SIZE && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mostrando {PAGE_SIZE} por página</div>
            )}
          </div>

          {/* Results list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {results.map((r) => (
              <TargetResultCard key={r.id} result={r} query={query} mode={mode} />
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
              <button
                id="page-prev"
                className="btn btn-ghost btn-sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft size={15} /> Anterior
              </button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                const p = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= pages - 3 ? pages - 6 + i : page - 3 + i;
                return (
                  <button
                    key={p}
                    id={`page-${p}`}
                    onClick={() => handlePageChange(p)}
                    style={{
                      minWidth: 36, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                      background: p === page ? 'var(--color-primary)' : 'transparent',
                      color: p === page ? '#fff' : 'var(--text-secondary)',
                      fontSize: 13, cursor: 'pointer', fontWeight: p === page ? 600 : 400,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                id="page-next"
                className="btn btn-ghost btn-sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= pages}
              >
                Próxima <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Result Card ───────────────────────────────────────────────────
function TargetResultCard({ result: r, query, mode }: { result: TargetSearchResult; query: string; mode: SearchMode }) {
  const highlight = (text: string | null | undefined) => {
    if (!text) return null;
    if (!query.trim() || mode === 'cpf') return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase()
        ? <mark key={i} style={{ background: 'color-mix(in srgb, var(--color-primary) 25%, transparent)', color: 'var(--text-primary)', borderRadius: 2, padding: '0 1px' }}>{p}</mark>
        : p
    );
  };

  return (
    <Link
      to={`/targets/${r.id}`}
      id={`result-${r.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        className="card"
        style={{
          padding: '14px 18px', cursor: 'pointer', transition: 'all 0.15s',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-primary)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
      >
        {/* Left: target info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              {highlight(r.full_name)}
            </span>
            {r.social_name && r.social_name !== r.full_name && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ({highlight(r.social_name)})
              </span>
            )}
            {r.nickname && (
              <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                "{highlight(r.nickname)}"
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 5, flexWrap: 'wrap' }}>
            {r.cpf && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Hash size={11} /> {formatCPF(r.cpf)}
              </span>
            )}
            {r.birth_date && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Nasc. {formatDate(r.birth_date)}
              </span>
            )}
            {r.person_type === 'legal' && (
              <span className="badge badge-info" style={{ fontSize: 10 }}>PJ</span>
            )}
          </div>

          {/* Operation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Briefcase size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {r.operation_name}
            </span>
            <span className={`badge ${OPERATION_STATUS_BADGE[r.operation_status] || 'badge-neutral'}`} style={{ fontSize: 10 }}>
              {OPERATION_STATUS_LABELS[r.operation_status] || r.operation_status}
            </span>
          </div>
        </div>

        {/* Right: navigate icon */}
        <ArrowRight size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
      </div>
    </Link>
  );
}
