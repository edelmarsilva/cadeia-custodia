import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Cpu, User, Shield, AlertTriangle, CheckCircle, Loader2, Hash } from 'lucide-react';
import { devicesApi, targetsApi, operationsApi, hashesApi } from '@/api/endpoints';
import toast from 'react-hot-toast';
import { DEVICE_TYPE_LABELS } from '@/utils/labels';
import type { Target } from '@/types';

const DEVICE_TYPES = Object.entries(DEVICE_TYPE_LABELS);

const EXTRA_FIELDS: Record<string, { key: string; label: string; placeholder?: string }[]> = {
  smartphone: [
    { key: 'imei1', label: 'IMEI 1', placeholder: '000000000000000' },
    { key: 'imei2', label: 'IMEI 2', placeholder: '000000000000000' },
    { key: 'iccid', label: 'ICCID', placeholder: '89550...' },
    { key: 'phone_number', label: 'Número Telefônico', placeholder: '+55 00 00000-0000' },
  ],
  tablet: [
    { key: 'imei1', label: 'IMEI', placeholder: '000000000000000' },
  ],
  notebook: [
    { key: 'processor', label: 'Processador', placeholder: 'Intel Core i7-...' },
    { key: 'ram', label: 'Memória RAM', placeholder: '16GB' },
    { key: 'os', label: 'Sistema Operacional', placeholder: 'Windows 11 / Ubuntu...' },
  ],
  desktop: [
    { key: 'processor', label: 'Processador' },
    { key: 'ram', label: 'Memória RAM', placeholder: '16GB' },
    { key: 'os', label: 'Sistema Operacional' },
  ],
  server: [
    { key: 'processor', label: 'Processador' },
    { key: 'ram', label: 'Memória RAM' },
    { key: 'os', label: 'Sistema Operacional' },
  ],
  hd: [
    { key: 'capacity', label: 'Capacidade', placeholder: '1TB / 500GB' },
    { key: 'interface', label: 'Interface', placeholder: 'SATA / USB 3.0' },
  ],
  ssd: [
    { key: 'capacity', label: 'Capacidade', placeholder: '256GB / 1TB' },
    { key: 'interface', label: 'Interface', placeholder: 'NVMe / SATA' },
  ],
  pendrive: [
    { key: 'capacity', label: 'Capacidade', placeholder: '64GB / 128GB' },
  ],
  memory_card: [
    { key: 'capacity', label: 'Capacidade', placeholder: '32GB / 64GB' },
  ],
};

// ── Tipos para verificação de hash ───────────────────────────────────────────
type HashCheckStatus = 'idle' | 'checking' | 'ok' | 'duplicate';

interface HashConflict {
  device_id: string;
  evidence_number: string;
  device_type: string;
  brand: string | null;
  model: string | null;
  hash_type: string;
  hash_value: string;
}

// ── Componente de campo de hash com verificação em tempo real ─────────────────
function HashField({
  label, value, onChange, placeholder, fieldKey, onConflict,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  fieldKey: 'md5' | 'sha1' | 'sha256';
  onConflict: (key: 'md5' | 'sha1' | 'sha256', conflict: HashConflict | null) => void;
}) {
  const [status, setStatus] = useState<HashCheckStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const check = useCallback(async (v: string) => {
    if (!v.trim()) { setStatus('idle'); onConflict(fieldKey, null); return; }
    setStatus('checking');
    try {
      const res = await hashesApi.check({ [fieldKey]: v.trim() });
      if (res.data.found && res.data.conflict) {
        setStatus('duplicate');
        onConflict(fieldKey, res.data.conflict);
      } else {
        setStatus('ok');
        onConflict(fieldKey, null);
      }
    } catch {
      setStatus('idle');
      onConflict(fieldKey, null);
    }
  }, [fieldKey, onConflict]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timerRef.current);
    if (!v.trim()) { setStatus('idle'); onConflict(fieldKey, null); return; }
    timerRef.current = setTimeout(() => check(v), 600);
  };

  const borderColor = status === 'duplicate'
    ? 'var(--color-danger, #dc2626)'
    : status === 'ok'
    ? 'var(--color-success, #16a34a)'
    : 'var(--border)';

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          className="form-input font-mono"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          style={{ paddingRight: 36, borderColor, transition: 'border-color 0.2s' }}
          autoComplete="off"
          spellCheck={false}
        />
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center',
        }}>
          {status === 'checking' && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />}
          {status === 'ok'       && <CheckCircle size={15} style={{ color: 'var(--color-success, #16a34a)' }} />}
          {status === 'duplicate' && <AlertTriangle size={15} style={{ color: 'var(--color-danger, #dc2626)' }} />}
        </span>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DeviceFormPage() {
  // Suporta duas rotas:
  //   /targets/:targetId/devices/new  → vincula ao alvo (legado)
  //   /operations/:operationId/devices/new → cadastra sem alvo obrigatório
  //   /devices/new → cadastro avulso (sem operação nem alvo)
  const { targetId, operationId } = useParams<{ targetId?: string; operationId?: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [operationName, setOperationName] = useState('');
  const [nextEvidenceNumber, setNextEvidenceNumber] = useState<string>('');
  const [loadingEvidence, setLoadingEvidence] = useState(true);

  const [form, setForm] = useState({
    seal_number: '', device_type: 'smartphone',
    brand: '', model: '', serial_number: '', color: '',
    seizure_date: '', seizure_location: '', seizure_observations: '',
    status: 'seized',
  });
  const [extraData, setExtraData] = useState<Record<string, string>>({});;

  // ── Estado de hash ────────────────────────────────────────────
  const [hashData, setHashData] = useState({ md5: '', sha1: '', sha256: '', source_file: '' });
  const [hashConflicts, setHashConflicts] = useState<Partial<Record<'md5' | 'sha1' | 'sha256', HashConflict>>>({});

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));
  const setExtra = (k: string, v: string) => setExtraData((p) => ({ ...p, [k]: v }));
  const extraFields = EXTRA_FIELDS[form.device_type] || [];

  // Busca preview do próximo número de evidência
  useEffect(() => {
    setLoadingEvidence(true);
    devicesApi.nextEvidenceNumber()
      .then((res) => setNextEvidenceNumber(res.data.next))
      .catch(() => setNextEvidenceNumber('MPAC-EV-?????'))
      .finally(() => setLoadingEvidence(false));
  }, []);

  const handleConflict = useCallback((key: 'md5' | 'sha1' | 'sha256', conflict: HashConflict | null) => {
    setHashConflicts((prev) => {
      const next = { ...prev };
      if (conflict) next[key] = conflict;
      else delete next[key];
      return next;
    });
  }, []);

  const hasHashConflict = Object.keys(hashConflicts).length > 0;
  const hasAnyHash = !!(hashData.md5 || hashData.sha1 || hashData.sha256);

  // Se veio por operação, carrega alvos disponíveis para seleção opcional
  useEffect(() => {
    if (operationId) {
      setLoadingTargets(true);
      Promise.all([
        targetsApi.list(operationId, { page_size: 100 } as any),
        operationsApi.get(operationId),
      ]).then(([tRes, opRes]) => {
        setTargets(tRes.data.items || []);
        setOperationName(opRes.data.operation?.name || '');
      }).catch(() => {}).finally(() => setLoadingTargets(false));
    }
  }, [operationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bloqueia se houver conflito de hash não resolvido
    if (hasHashConflict) {
      const conflictKey = Object.keys(hashConflicts)[0] as 'md5' | 'sha1' | 'sha256';
      const c = hashConflicts[conflictKey]!;
      toast.error(
        `Não é possível cadastrar: o hash ${conflictKey.toUpperCase()} informado já está registrado no dispositivo "${c.evidence_number}". Verifique o hash e tente novamente.`,
        { duration: 8000 }
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        seal_number: form.seal_number || null,
        brand: form.brand || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        color: form.color || null,
        seizure_date: form.seizure_date || null,
        seizure_location: form.seizure_location || null,
        seizure_observations: form.seizure_observations || null,
        extra_data: Object.keys(extraData).length > 0 ? extraData : null,
        // evidence_number omitido → gerado automaticamente pelo backend
      };

      let res;
      if (targetId) {
        res = await devicesApi.create(targetId, payload);
      } else if (operationId) {
        if (selectedTargetId) {
          res = await devicesApi.create(selectedTargetId, payload);
        } else {
          res = await devicesApi.createForOperation(operationId, payload);
        }
      } else {
        // Rota avulsa /devices/new
        res = await devicesApi.createStandalone(payload);
      }

      // Se hash informado, registra após criar o dispositivo
      if (hasAnyHash) {
        try {
          await hashesApi.register(res.data.id, {
            md5: hashData.md5 || null,
            sha1: hashData.sha1 || null,
            sha256: hashData.sha256 || null,
            source_file: hashData.source_file || null,
          });
        } catch (hashErr: any) {
          // Mesmo que o hash falhe, o dispositivo já foi criado — avisa mas não bloqueia
          toast('Dispositivo cadastrado, mas ocorreu um erro ao salvar o hash de integridade.', { icon: '⚠️' });
        }
      }

      toast.success('Dispositivo cadastrado com sucesso!');
      navigate(`/devices/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao cadastrar dispositivo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title">Novo Dispositivo</h1>
            <p className="page-subtitle">
              {operationId && operationName ? (
                <>Operação: <strong>{operationName}</strong></>
              ) : !operationId && !targetId ? (
                'Cadastro avulso — sem vinculação a operação'
              ) : (
                'Cadastre um dispositivo apreendido'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <form onSubmit={handleSubmit}>

          {/* Seleção de alvo (apenas quando via operação) */}
          {operationId && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <User size={18} color="var(--color-accent)" />
                <div className="card-title">Vínculo com Alvo</div>
                <span className="badge badge-info" style={{ fontSize: 11 }}>Opcional</span>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Alvo da Operação</label>
                {loadingTargets ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '9px 12px' }}>
                    <span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                    Carregando alvos…
                  </div>
                ) : (
                  <select
                    className="form-select"
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                  >
                    <option value="">— Sem vínculo com alvo —</option>
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}{t.cpf ? ` (${t.cpf})` : ''}</option>
                    ))}
                  </select>
                )}
                <div className="form-hint">
                  {selectedTargetId
                    ? '✅ Dispositivo será vinculado ao alvo selecionado'
                    : '⚠️ Dispositivo será cadastrado diretamente na operação, sem vínculo com alvo'}
                </div>
              </div>

              <div className="divider" />
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Cpu size={18} color="var(--color-primary)" />
            <div className="card-title">Identificação</div>
          </div>

          {/* Nº de Evidência — gerado automaticamente */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 10, marginBottom: 20,
            background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
          }}>
            <Hash size={18} color="var(--color-accent)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                Nº de Evidência (gerado automaticamente)
              </div>
              <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.04em' }}>
                {loadingEvidence ? (
                  <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Calculando...</span>
                ) : nextEvidenceNumber}
              </div>
            </div>
            <CheckCircle size={16} color="var(--color-success, #16a34a)" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nº do Lacre</label>
              <input className="form-input font-mono" value={form.seal_number} onChange={(e) => set('seal_number', e.target.value)} placeholder="LAC-0001" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tipo de Dispositivo *</label>
            <select className="form-select" value={form.device_type} onChange={(e) => { set('device_type', e.target.value); setExtraData({}); }}>
              {DEVICE_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Marca</label>
              <input className="form-input" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Samsung, Apple, Dell..." />
            </div>
            <div className="form-group">
              <label className="form-label">Modelo</label>
              <input className="form-input" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Galaxy S23, iPhone 15..." />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Número de Série</label>
              <input className="form-input font-mono" value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} placeholder="SN00000000" />
            </div>
            <div className="form-group">
              <label className="form-label">Cor</label>
              <input className="form-input" value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="Preto, Branco, Prata..." />
            </div>
          </div>

          {extraFields.length > 0 && (
            <>
              <div className="divider" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div className="card-title">Dados Específicos — {DEVICE_TYPE_LABELS[form.device_type]}</div>
              </div>
              <div className="form-grid">
                {extraFields.map((f) => (
                  <div className="form-group" key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input
                      className="form-input font-mono"
                      value={extraData[f.key] || ''}
                      onChange={(e) => setExtra(f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="divider" />
          <div className="card-title" style={{ marginBottom: 16 }}>Dados da Apreensão</div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Data da Apreensão</label>
              <input type="date" className="form-input" value={form.seizure_date} onChange={(e) => set('seizure_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Status Inicial</label>
              <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="seized">Apreendido</option>
                <option value="in_custody">Em Custódia</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Local da Apreensão</label>
            <input className="form-input" value={form.seizure_location} onChange={(e) => set('seizure_location', e.target.value)} placeholder="Endereço ou descrição do local" />
          </div>

          <div className="form-group">
            <label className="form-label">Observações da Apreensão</label>
            <textarea className="form-textarea" value={form.seizure_observations} onChange={(e) => set('seizure_observations', e.target.value)} placeholder="Estado do dispositivo na apreensão, condições especiais…" rows={3} />
          </div>

          {/* ── Hashes de Integridade ──────────────────────────────────── */}
          <div className="divider" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Shield size={18} color="var(--color-primary)" />
            <div className="card-title">Hash de Integridade</div>
            <span className="badge badge-info" style={{ fontSize: 11 }}>Opcional</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Informe o hash calculado do dispositivo/imagem forense. O sistema verifica automaticamente
            se o hash já está registrado em outro dispositivo — se encontrar duplicata, o cadastro será bloqueado
            até que o hash seja revisado.
          </p>

          {/* Alertas de conflito */}
          {hasHashConflict && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.06)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 13, marginBottom: 4 }}>
                  Hash duplicado detectado!
                </div>
                {Object.entries(hashConflicts).map(([key, c]) => (
                  <div key={key} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    O hash <strong>{key.toUpperCase()}</strong> já está registrado no dispositivo{' '}
                    <strong>"{c.evidence_number}"</strong>
                    {c.brand || c.model ? ` (${[c.brand, c.model].filter(Boolean).join(' ')})` : ''}.
                    Verifique o hash calculado e corrija antes de prosseguir.
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-grid">
            <HashField
              label="MD5"
              fieldKey="md5"
              value={hashData.md5}
              onChange={(v) => setHashData((p) => ({ ...p, md5: v }))}
              placeholder="32 caracteres hexadecimais"
              onConflict={handleConflict}
            />
            <HashField
              label="SHA-1"
              fieldKey="sha1"
              value={hashData.sha1}
              onChange={(v) => setHashData((p) => ({ ...p, sha1: v }))}
              placeholder="40 caracteres hexadecimais"
              onConflict={handleConflict}
            />
          </div>

          <HashField
            label="SHA-256"
            fieldKey="sha256"
            value={hashData.sha256}
            onChange={(v) => setHashData((p) => ({ ...p, sha256: v }))}
            placeholder="64 caracteres hexadecimais"
            onConflict={handleConflict}
          />

          <div className="form-group">
            <label className="form-label">Arquivo de Origem / Imagem Forense</label>
            <input
              className="form-input font-mono"
              value={hashData.source_file}
              onChange={(e) => setHashData((p) => ({ ...p, source_file: e.target.value }))}
              placeholder="ex: imagem_forense_ev001.E01"
            />
            <div className="form-hint">Nome do arquivo ou imagem forense de onde o hash foi extraído</div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancelar</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || hasHashConflict}
              title={hasHashConflict ? 'Corrija o hash duplicado antes de cadastrar' : undefined}
            >
              {loading
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Salvando…</>
                : <><Save size={14} /> Cadastrar Dispositivo</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
