import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  History, Download, FileText, Search, Filter, ChevronLeft,
  ChevronRight, ExternalLink, FileCheck,
} from 'lucide-react';
import { reportGenerationApi } from '@/api/endpoints';
import type { GeneratedReport } from '@/types';
import { formatDate, formatDateTime } from '@/utils/format';
import toast from 'react-hot-toast';

export default function GeneratedReportsPage() {
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await reportGenerationApi.listAll({ page, page_size: pageSize });
      setReports(data);
    } catch {
      toast.error('Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleDownload = async (
    reportId: string,
    type: 'docx' | 'pdf',
    fileName?: string
  ) => {
    try {
      const { data } =
        type === 'docx'
          ? await reportGenerationApi.downloadDocx(reportId)
          : await reportGenerationApi.downloadPdf(reportId);
      window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Erro ao baixar ${type.toUpperCase()}.`);
    }
  };

  const filtered = reports.filter(r =>
    r.report_number.toLowerCase().includes(search.toLowerCase()) ||
    (r.expert_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">
            <History size={22} style={{ marginRight: 10, color: 'var(--color-primary)' }} />
            Histórico de Laudos
          </h1>
          <p className="page-sub">
            Registro de todos os laudos periciais gerados automaticamente pelo sistema.
          </p>
        </div>
      </div>

      {/* Busca */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)',
          }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por número ou perito..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Carregando histórico...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <History size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {search ? 'Nenhum laudo encontrado para a busca.' : 'Nenhum laudo gerado ainda.'}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-2)' }}>
                {['Nº do Laudo', 'Perito', 'Data Emissão', 'Dispositivo', 'Gerado em', 'Arquivos'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    transition: 'background var(--transition)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)')}
                >
                  {/* Número do Laudo */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileCheck size={14} color="var(--color-primary)" />
                      <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {r.report_number}
                      </span>
                    </div>
                    {r.template_version && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        template v{r.template_version}
                      </div>
                    )}
                  </td>

                  {/* Perito */}
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {r.expert_name || '—'}
                  </td>

                  {/* Data de Emissão */}
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {r.emission_date ? formatDate(r.emission_date) : '—'}
                  </td>

                  {/* Dispositivo */}
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      to={`/devices/${r.device_id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        color: 'var(--color-accent)', fontSize: 12,
                      }}
                    >
                      <ExternalLink size={12} />
                      Ver dispositivo
                    </Link>
                  </td>

                  {/* Gerado em */}
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 11 }}>
                    {formatDateTime(r.created_at)}
                  </td>

                  {/* Downloads */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {r.docx_path && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDownload(r.id, 'docx', r.docx_name)}
                          title="Baixar DOCX"
                          style={{ fontSize: 11 }}
                        >
                          <Download size={12} /> DOCX
                        </button>
                      )}
                      {r.pdf_path && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDownload(r.id, 'pdf', r.pdf_name)}
                          title="Baixar PDF"
                          style={{ fontSize: 11 }}
                        >
                          <Download size={12} /> PDF
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação */}
          <div style={{
            padding: '12px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface-2)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Exibindo {filtered.length} registro(s)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span style={{ padding: '4px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                Pág. {page}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={reports.length < pageSize}
                onClick={() => setPage(p => p + 1)}
              >
                Próxima <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
