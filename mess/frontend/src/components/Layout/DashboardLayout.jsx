import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <header className="top-header">
          <div>
            <h1 style={{ fontSize: '1.25rem' }}>{user?.messName || 'Mess Dashboard'}</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{today}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="btn btn-outline" style={{ padding: '0.5rem', borderRadius: '50%', border: 'none' }}>
              <Bell size={20} color="var(--text-muted)" />
            </button>
            <div className="flex items-center gap-2" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div style={{ marginRight: '1rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.name || 'Admin'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Admin - {user?.hostel || 'MH-1'}
                </div>
              </div>
              <button onClick={logout} className="btn btn-outline" style={{ padding: '0.5rem', border: 'none' }} title="Logout">
                <LogOut size={20} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        </header>
        
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
