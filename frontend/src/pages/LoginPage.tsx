import React, { useState } from 'react';
import { authApi } from '@/api/endpoints';
import { useAuthStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      const { access_token, refresh_token } = res.data;
      // Salva o token ANTES de chamar /me para o interceptor do Axios poder usá-lo
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      const meRes = await authApi.me();
      login(meRes.data, access_token, refresh_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-bg-glow" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Shield size={26} color="#0a0e1a" />
          </div>
          <div>
            <div className="login-title">Cadeia de Custódia</div>
            <div className="login-sub">Sistema Forense de Evidências Digitais</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="login-username"
                type="text"
                className="form-input"
                style={{ paddingLeft: 34 }}
                placeholder="seu.usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="login-password"
                type="password"
                className="form-input"
                style={{ paddingLeft: 34 }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--bg-danger)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--color-danger)',
              fontSize: 13,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', padding: '11px 0' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                Autenticando...
              </>
            ) : 'Entrar no Sistema'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '14px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          🔒 Acesso restrito a usuários autorizados.<br />
          Todas as ações são registradas e auditáveis.
        </div>
      </div>
    </div>
  );
}
