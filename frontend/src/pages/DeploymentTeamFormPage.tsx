import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Users } from 'lucide-react';
import { deploymentTeamsApi, usersApi } from '@/api/endpoints';
import type { DeploymentTeam, User } from '@/types';
import toast from 'react-hot-toast';

export default function DeploymentTeamFormPage() {
  const { operationId, teamId } = useParams<{ operationId: string; teamId?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(teamId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    usersApi.listAll().then((r) => setUsers(r.data.items || []));
    if (isEdit && operationId && teamId) {
      deploymentTeamsApi.get(operationId, teamId)
        .then((r) => {
          const t: DeploymentTeam = r.data;
          setName(t.name);
          setDescription(t.description || '');
          setLeaderId(t.leader_id || '');
        })
        .catch(() => toast.error('Erro ao carregar equipe.'))
        .finally(() => setLoading(false));
    }
  }, [isEdit, operationId, teamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Nome da equipe é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        leader_id: leaderId || undefined,
      };
      if (isEdit && operationId && teamId) {
        await deploymentTeamsApi.update(operationId, teamId, payload);
        toast.success('Equipe atualizada com sucesso.');
      } else if (operationId) {
        await deploymentTeamsApi.create(operationId, payload);
        toast.success('Equipe criada com sucesso.');
      }
      navigate(`/operations/${operationId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao salvar equipe.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">{isEdit ? 'Editar Equipe' : 'Nova Equipe de Deflagração'}</h1>
            <p className="page-subtitle">
              {isEdit ? 'Atualize os dados da equipe.' : 'Cadastre uma nova equipe operacional.'}
            </p>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} /> Dados da Equipe
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="team-name">Nome da Equipe *</label>
            <input
              id="team-name"
              className="form-input"
              type="text"
              placeholder="Ex: Grupo Alfa, Equipe 1..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="team-description">Descrição</label>
            <textarea
              id="team-description"
              className="form-input"
              rows={3}
              placeholder="Descreva a função ou características desta equipe..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="team-leader">Líder da Equipe</label>
            <select
              id="team-leader"
              className="form-input"
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
            >
              <option value="">— Selecione um líder (opcional) —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} {u.badge_number ? `(Mat. ${u.badge_number})` : ''} — {u.unit || u.role}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Salvando...</> : <><Save size={14} /> {isEdit ? 'Salvar Alterações' : 'Criar Equipe'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
