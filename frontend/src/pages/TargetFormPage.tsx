import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { targetsApi } from '@/api/endpoints';
import toast from 'react-hot-toast';

export default function TargetFormPage() {
  const { operationId } = useParams<{ operationId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '', social_name: '', nickname: '', cpf: '',
    rg: '', person_type: 'individual', birth_date: '',
    address: '', observations: '',
  });

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operationId) return;
    setLoading(true);
    try {
      const payload = {
        ...form,
        birth_date: form.birth_date || null,
        social_name: form.social_name || null,
        nickname: form.nickname || null,
        cpf: form.cpf || null,
        rg: form.rg || null,
        address: form.address || null,
        observations: form.observations || null,
      };
      const res = await targetsApi.create(operationId, payload);
      toast.success('Alvo cadastrado com sucesso!');
      navigate(`/targets/${res.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao cadastrar alvo.');
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
            <h1 className="page-title">Novo Alvo</h1>
            <p className="page-subtitle">Cadastre um alvo na operação</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 760 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tipo *</label>
            <select className="form-select" value={form.person_type} onChange={(e) => set('person_type', e.target.value)}>
              <option value="individual">Pessoa Física</option>
              <option value="legal_entity">Pessoa Jurídica</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input className="form-input" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required placeholder="Nome completo conforme documento" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nome Social</label>
              <input className="form-input" value={form.social_name} onChange={(e) => set('social_name', e.target.value)} placeholder="Nome social (se houver)" />
            </div>
            <div className="form-group">
              <label className="form-label">Apelido</label>
              <input className="form-input" value={form.nickname} onChange={(e) => set('nickname', e.target.value)} placeholder="Apelido ou alcunha" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">CPF</label>
              <input className="form-input font-mono" value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" maxLength={14} />
            </div>
            <div className="form-group">
              <label className="form-label">RG</label>
              <input className="form-input font-mono" value={form.rg} onChange={(e) => set('rg', e.target.value)} placeholder="0000000-0 SSP/UF" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Data de Nascimento</label>
            <input type="date" className="form-input" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Endereço</label>
            <textarea className="form-textarea" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Endereço completo do alvo" rows={2} />
          </div>

          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={form.observations} onChange={(e) => set('observations', e.target.value)} placeholder="Informações adicionais relevantes…" rows={3} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Salvando…</> : <><Save size={14} /> Cadastrar Alvo</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
