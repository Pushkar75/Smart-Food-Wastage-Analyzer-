import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, MapPin, Building, Shield } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/profile`)
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching profile:', err);
        setLoading(false);
      });
  }, []);

  if (authLoading && loading) return <div>Loading...</div>;

  const staffName = user?.name || profile?.staffName || 'Mess Administrator';
  const email = user?.email || profile?.email || 'N/A';
  const hostel = user?.hostel || 'MH-1';
  const roleDisplay = user?.hostel ? `Mess Administrator — ${user.hostel}` : (profile?.role || 'Mess Administrator');
  const messName = user?.messName || (user?.hostel ? `Mess - ${user.hostel}` : (profile?.name || 'VIT Central Mess'));
  const location = user?.hostel ? `VIT-AP Campus — ${user.hostel} Block` : (profile?.location || 'VIT-AP Campus — Central Hostel');
  const capacity = profile?.capacity ? `${profile.capacity.toLocaleString()} students` : '1,200 students';

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Mess Administrator Profile</h2>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="flex items-center gap-6" style={{ marginBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600 }}>
            {staffName.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{staffName}</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>{roleDisplay}</div>
            <span className="badge badge-success" style={{ marginTop: '0.5rem' }}>Active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <Mail size={16} /> Email Address
            </div>
            <div style={{ fontWeight: 500 }}>{email}</div>
          </div>

          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <Shield size={16} /> Assigned Hostel
            </div>
            <div style={{ fontWeight: 500 }}>{hostel}</div>
          </div>
          
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <Building size={16} /> Mess Facility
            </div>
            <div style={{ fontWeight: 500 }}>{messName}</div>
          </div>
          
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <MapPin size={16} /> Campus Location
            </div>
            <div style={{ fontWeight: 500 }}>{location}</div>
          </div>
          
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <Users size={16} /> Seating Capacity
            </div>
            <div style={{ fontWeight: 500 }}>{capacity}</div>
          </div>

          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <User size={16} /> Account Role
            </div>
            <div style={{ fontWeight: 500 }}>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin'}</div>
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-outline" style={{ marginRight: '1rem' }}>Edit Profile</button>
          <button className="btn btn-primary">Change Password</button>
        </div>
      </div>
    </div>
  );
}

// Missing icon import hack
function Users(props) {
  return <User {...props} />;
}
