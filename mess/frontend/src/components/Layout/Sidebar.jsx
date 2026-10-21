import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Utensils, LineChart, Users, Clock, User } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: "Today's Meals", path: '/todays-meals', icon: Utensils },
    { name: 'Predictions', path: '/predictions', icon: LineChart },
    { name: 'Attendance', path: '/attendance', icon: Users },
    { name: 'History', path: '/history', icon: Clock },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Utensils size={24} />
          SmartMess
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>Food Wastage Analyser</p>
      </div>
      
      <div className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink 
              key={item.name} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
      
      <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'white' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning-color)' }}></div>
          Prototype &bull; Demo Data
        </div>
      </div>
    </div>
  );
}
