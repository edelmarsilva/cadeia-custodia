import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield, LayoutDashboard, Briefcase, Users, Cpu,
  Link2, FileText, Hash, BookOpen, UserCog, LogOut,
  ChevronRight, ChevronDown, Gavel, History, Search, BarChart2,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { initials } from '@/utils/format';
import { ROLE_LABELS } from '@/utils/labels';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Operações', icon: Briefcase, to: '/operations' },
  { label: 'Pesquisa de Alvos', icon: Search, to: '/targets/search' },
  { label: 'Relatórios Estatísticos', icon: BarChart2, to: '/relatorios/estatisticos' },
  { label: 'Alvos', icon: Users, to: '/targets', hidden: true },
  { label: 'Dispositivos', icon: Cpu, to: '/devices', hidden: true },
];

const systemItems = [
  { label: 'Log de Auditoria', icon: BookOpen, to: '/audit', roles: ['admin', 'auditor'] },
  { label: 'Usuários', icon: UserCog, to: '/users', roles: ['admin'] },
];

const periciaItems = [
  { label: 'Modelos de Laudo', icon: FileText, to: '/pericia/templates' },
  { label: 'Histórico de Laudos', icon: History, to: '/pericia/historico' },
];

const periciaRoles = ['admin', 'expert', 'analyst'];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [periciaOpen, setPericiaOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNavItems = navItems.filter((i) => !i.hidden);
  const showPericia = periciaRoles.includes(user?.role || '');

  return (
    <aside className="sidebar">
      {/* Logo MPAC */}
      <div className="sidebar-logo" style={{ padding: '16px 18px', gap: 0, flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 10,
          padding: '8px 14px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src="/mpac-logo.png"
            alt="MPAC - Ministério Público do Acre"
            style={{
              width: 140,
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          Cadeia de Custódia Digital
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Principal</div>
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon className="nav-icon" size={18} />
            {item.label}
          </NavLink>
        ))}

        {/* Seção Perícia */}
        {showPericia && (
          <>
            <div className="nav-section-label" style={{ marginTop: 16 }}>Perícia</div>

            {/* Toggleável */}
            <button
              onClick={() => setPericiaOpen(!periciaOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '9px 14px', borderRadius: 8, border: 'none',
                background: 'transparent', color: 'var(--text-secondary)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Gavel size={18} style={{ color: 'var(--color-primary)' }} />
              <span style={{ flex: 1, textAlign: 'left' }}>Laudos Periciais</span>
              {periciaOpen
                ? <ChevronDown size={14} />
                : <ChevronRight size={14} />
              }
            </button>

            {periciaOpen && (
              <div style={{ paddingLeft: 12 }}>
                {periciaItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    style={{ paddingLeft: 22, fontSize: 13 }}
                  >
                    <item.icon className="nav-icon" size={15} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </>
        )}

        {systemItems.some((i) => !i.roles || i.roles.includes(user?.role || '')) && (
          <>
            <div className="nav-section-label" style={{ marginTop: 16 }}>Sistema</div>
            {systemItems.map((item) => {
              if (item.roles && !item.roles.includes(user?.role || '')) return null;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="nav-icon" size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{user ? initials(user.full_name) : '?'}</div>
          <div className="user-info">
            <div className="user-name truncate">{user?.full_name || 'Usuário'}</div>
            <div className="user-role">{user ? ROLE_LABELS[user.role] : ''}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleLogout}
            title="Sair"
            style={{ padding: 6 }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
