import React, { useCallback, useRef, useState } from 'react';
import { Upload, CheckCircle, AlertTriangle, X, Package, Camera, Smartphone, Info } from 'lucide-react';
import api from '@/api/client';

interface ImportResult {
  session_id: string | null;
  operation_name: string;
  procedure_number: string | null;
  team_name: string | null;
  target_name: string;
  agent_name: string | null;
  devices_imported: number;
  photos_imported: number;
  photos_failed: number;
  errors: string[];
  warnings: string[];
  success: boolean;
}

export default function FieldImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Selecione um arquivo .zip exportado pelo app mobile.');
      return;
    }
    setError(null);
    setResult(null);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/field-sessions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setResult(response.data as ImportResult);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Erro ao importar o pacote. Verifique o arquivo e tente novamente.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Importar Coleta de Campo</h1>
        <p className="page-subtitle">
          Importe o pacote ZIP exportado pelo aplicativo mobile de coleta forense
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* ── Como Funciona ──────────────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h2 className="card-title">
              <Info size={16} style={{ marginRight: 8, color: 'var(--color-primary)' }} />
              Como funciona
            </h2>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              {[
                { icon: '📱', step: '1', label: 'App escaneia o QR Code de missão' },
                { icon: '📸', step: '2', label: 'Agente coleta 8 etapas fotográficas' },
                { icon: '📦', step: '3', label: 'App exporta pacote ZIP' },
                { icon: '🖥️', step: '4', label: 'Importe o ZIP aqui' },
              ].map((item) => (
                <div key={item.step} style={{
                  background: 'var(--bg-surface-2)',
                  borderRadius: 10,
                  padding: '14px 12px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 4,
                  }}>
                    Passo {item.step}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Área de Upload ──────────────────────────────────────────────────── */}
        {!result && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-body">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  borderRadius: 14,
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  background: dragging ? 'rgba(10,110,189,0.06)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  style={{ display: 'none' }}
                  onChange={onFileChange}
                  disabled={uploading}
                />

                {uploading ? (
                  <div>
                    <Package size={48} style={{ color: 'var(--color-primary)', marginBottom: 16, animation: 'pulse 1.5s infinite' }} />
                    <p style={{ fontWeight: 600, marginBottom: 12 }}>Processando pacote...</p>
                    <div style={{
                      height: 8,
                      background: 'var(--bg-surface-2)',
                      borderRadius: 99,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'var(--color-primary)',
                        borderRadius: 99,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                    <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>{progress}%</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={48} style={{ color: 'var(--color-primary)', marginBottom: 16 }} />
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>
                      Arraste o arquivo ZIP ou clique para selecionar
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Arquivo exportado pelo app mobile — <strong>cadeia_campo_*.zip</strong>
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginTop: 16 }}>
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Resultado ──────────────────────────────────────────────────────── */}
        {result && (
          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {result.success
                  ? <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                  : <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />
                }
                {result.success ? 'Importação Concluída' : 'Importação com Avisos'}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setResult(null)} title="Fechar">
                <X size={16} />
              </button>
            </div>
            <div className="card-body">
              {/* Dados da missão */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <InfoBlock label="Operação" value={result.operation_name} />
                {result.procedure_number && <InfoBlock label="Nº Procedimento" value={result.procedure_number} />}
                <InfoBlock label="Alvo" value={result.target_name} />
                {result.team_name && <InfoBlock label="Equipe" value={result.team_name} />}
                {result.agent_name && <InfoBlock label="Agente" value={result.agent_name} />}
              </div>

              {/* Contadores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                <StatCard icon={<Smartphone size={20} />} value={result.devices_imported} label="Dispositivos" color="var(--color-primary)" />
                <StatCard icon={<Camera size={20} />} value={result.photos_imported} label="Fotos" color="var(--color-success)" />
                {result.photos_failed > 0 && (
                  <StatCard icon={<AlertTriangle size={20} />} value={result.photos_failed} label="Falhas" color="var(--color-warning)" />
                )}
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="alert alert-warning" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Avisos:</div>
                  {result.warnings.map((w, i) => <div key={i} style={{ fontSize: 13 }}>• {w}</div>)}
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Erros:</div>
                  {result.errors.map((e, i) => <div key={i} style={{ fontSize: 13 }}>• {e}</div>)}
                </div>
              )}

              {/* Link para sessão */}
              {result.session_id && (
                <div style={{ marginTop: 12 }}>
                  <a
                    href={`/field-sessions/${result.session_id}`}
                    className="btn btn-primary"
                  >
                    Ver Sessão Importada
                  </a>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setResult(null)}>
                  Importar Outro Pacote
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--bg-surface-2)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg-surface-2)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
      <div style={{ color, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
