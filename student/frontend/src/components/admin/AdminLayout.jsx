/**
 * Chrome for the mess staff dashboard. Uses the same auth context and layout
 * primitives as the student portal, with the dark data-dense skin.
 */

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '📊', title: 'Mess dashboard',
    subtitle: "Today's responses and preparation overview" },
  { to: '/admin/predictions', label: 'Predictions', icon: '🔮', title: 'Expected attendance',
    subtitle: 'Placeholder figures — no ML model is connected yet' },
  { to: '/admin/attendance', label: 'Attendance', icon: '🧾', title: 'Attendance records',
    subtitle: 'Entries recorded at the mess entrance' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📈', title: 'Waste analytics',
    subtitle: 'Prepared against served, over the last week' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const current = ADMIN_NAV.find((item) => pathname.startsWith(item.to)) || ADMIN_NAV[0];

  async function handleLogout() {
    await logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">Skip to main content</a>

      <nav className="admin-sidebar" aria-label="Mess staff dashboard">
        <div className="student-brand">
          <span className="brand-mark" aria-hidden="true">📊</span>
          <span className="brand-text">
            <span className="brand-name">Smart Mess</span>
            <span className="brand-sub">Staff dashboard</span>
          </span>
        </div>

        <ul className="student-nav">
          {ADMIN_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="avatar" aria-hidden="true">{initials(user?.name)}</span>
            <span className="sidebar-user-text">
              <span className="sidebar-user-name">{user?.name || 'Mess Admin'}</span>
              <span className="sidebar-user-role">Admin - {user?.hostel || 'MH-1'}</span>
            </span>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon" aria-hidden="true">⏻</span>
            Log out
          </button>
        </div>
      </nav>

      <div className="admin-main">
        <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="header-titles">
            <h1 className="header-title">{current.title}</h1>
            <p className="header-sub">{current.subtitle}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#1e293b', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <span className="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 600 }} aria-hidden="true">
              {initials(user?.name)}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 500 }}>
              {user?.name || 'Mess Admin'} <span style={{ color: '#94a3b8' }}>| Admin - {user?.hostel || 'MH-1'}</span>
            </span>
          </div>
        </header>

        <main className="admin-content" id="admin-main" key={pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
