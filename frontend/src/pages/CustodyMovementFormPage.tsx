import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { custodyApi } from '@/api/endpoints';
import { MOVEMENT_TYPE_LABELS } from '@/utils/labels';
import toast from 'react-hot-toast';

const MOVEMENT_TYPES = Object.entries(MOVEMENT_TYPE_LABELS);

export default function CustodyMovementFormPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    movement_type: 'reception',
    responsible_name: '',
    origin_sector: '',
    destination_sector: '',
    reason: '',
    observation: '',
  });

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        responsible_name: form.responsible_name || null,
        origin_sector: form.origin_sector || null,
        destination_sector: form.destination_sector || null,
        reason: form.reason || null,
        observation: form.observation || null,
      };
      await custodyApi.registerMovement(deviceId, payload);
      toast.success('Movimentação registrada com sucesso!');
      navigate(-1);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao registrar movimentação.');
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
            <h1 className="page-title">Registrar Movimentação</h1>
            <p className="page-subtitle">Registro imutável de cadeia de custódia</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 680 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, background: 'var(--bg-warning)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <Shield size={16} color="var(--color-warning)" />
          <span style={{ fontSize: 12, color: 'var(--color-warning)' }}>
            Esta movimentação é <strong>imutável</strong>. Verifique todos os dados antes de confirmar.
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tipo de Movimentação *</label>
            <select className="form-select" value={form.movement_type} onChange={(e) => set('movement_type', e.target.value)} required>
              {MOVEMENT_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Responsável pela Movimentação</label>
            <input className="form-input" value={form.responsible_name} onChange={(e) => set('responsible_name', e.target.value)} placeholder="Nome do responsável" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Setor de Origem</label>
              <input className="form-input" value={form.origin_sector} onChange={(e) => set('origin_sector', e.target.value)} placeholder="Ex: SETEC / DPPC" />
            </div>
            <div className="form-group">
              <label className="form-label">Setor de Destino</label>
              <input className="form-input" value={form.destination_sector} onChange={(e) => set('destination_sector', e.target.value)} placeholder="Ex: Laboratório de Perícia" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Motivo</label>
            <input className="form-input" value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Motivo da movimentação" />
          </div>

          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observation} onChange={(e) => set('observation', e.target.value)} placeholder="Informações adicionais sobre a movimentação…" rows={3} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Registrando…</> : <><Save size={14} /> Registrar Movimentação</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
