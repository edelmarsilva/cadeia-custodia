import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { operationsApi } from '@/api/endpoints';
import toast from 'react-hot-toast';

export default function OperationFormPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    procedure_number: '',
    description: '',
    responsible_unit: '',
    start_date: '',
    end_date: '',
    status: 'planning',
  });

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        procedure_number: form.procedure_number || null,
      };
      const res = await operationsApi.create(payload);
      toast.success('Operação criada com sucesso!');
      navigate(`/operations/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao criar operação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Nova Operação</h1>
            <p className="page-subtitle">Preencha os dados para cadastrar uma nova operação</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nome da Operação *</label>
            <input className="form-input" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Ex: Operação Silicone" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nº do Procedimento</label>
              <input className="form-input font-mono" value={form.procedure_number} onChange={(e) => set('procedure_number', e.target.value)} placeholder="0000.000.000/2024" />
            </div>
            <div className="form-group">
              <label className="form-label">Unidade Responsável</label>
              <input className="form-input" value={form.responsible_unit} onChange={(e) => set('responsible_unit', e.target.value)} placeholder="Ex: DPPC / SETEC" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Descreva o contexto e objetivos da operação…" rows={3} />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Data de Início</label>
              <input type="date" className="form-input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data de Encerramento</label>
              <input type="date" className="form-input" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status Inicial</label>
            <select className="form-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="planning">Planejamento</option>
              <option value="active">Em Andamento</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Salvando…</> : <><Save size={14} /> Criar Operação</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
