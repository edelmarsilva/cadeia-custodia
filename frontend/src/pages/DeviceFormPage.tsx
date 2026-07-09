import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Cpu, User } from 'lucide-react';
import { devicesApi, targetsApi, operationsApi } from '@/api/endpoints';
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

export default function DeviceFormPage() {
  // Suporta duas rotas:
  //   /targets/:targetId/devices/new  → vincula ao alvo (legado)
  //   /operations/:operationId/devices/new → cadastra sem alvo obrigatório
  const { targetId, operationId } = useParams<{ targetId?: string; operationId?: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [operationName, setOperationName] = useState('');

  const [form, setForm] = useState({
    evidence_number: '', seal_number: '', device_type: 'smartphone',
    brand: '', model: '', serial_number: '', color: '',
    seizure_date: '', seizure_location: '', seizure_observations: '',
    status: 'seized',
  });
  const [extraData, setExtraData] = useState<Record<string, string>>({});

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));
  const setExtra = (k: string, v: string) => setExtraData((p) => ({ ...p, [k]: v }));
  const extraFields = EXTRA_FIELDS[form.device_type] || [];

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
      };

      let res;
      if (targetId) {
        // Rota clássica: via alvo
        res = await devicesApi.create(targetId, payload);
      } else if (operationId) {
        // Novo fluxo: via operação
        if (selectedTargetId) {
          // Usuário optou por vincular a um alvo
          res = await devicesApi.create(selectedTargetId, payload);
        } else {
          // Sem alvo — cadastro direto na operação
          res = await devicesApi.createForOperation(operationId, payload);
        }
      } else {
        toast.error('Rota inválida.');
        return;
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

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nº da Evidência *</label>
              <input className="form-input font-mono" value={form.evidence_number} onChange={(e) => set('evidence_number', e.target.value)} required placeholder="EV-2024-0001" />
              <div className="form-hint">Identificador único no sistema</div>
            </div>
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

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Salvando…</> : <><Save size={14} /> Cadastrar Dispositivo</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
