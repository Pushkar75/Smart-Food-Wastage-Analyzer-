import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, MapPin, Building, Shield } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/profile')
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

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: '800px' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Mess Administrator Profile</h2>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="flex items-center gap-6" style={{ marginBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 600 }}>
            {profile?.staffName?.charAt(0) || 'U'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile?.staffName}</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>{profile?.role}</div>
            <span className="badge badge-success" style={{ marginTop: '0.5rem' }}>{profile?.status}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <Mail size={16} /> Email
            </div>
            <div style={{ fontWeight: 500 }}>{profile?.email}</div>
          </div>
          
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <Building size={16} /> Mess Name
            </div>
            <div style={{ fontWeight: 500 }}>{profile?.name}</div>
          </div>
          
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <MapPin size={16} /> Location
            </div>
            <div style={{ fontWeight: 500 }}>{profile?.location}</div>
          </div>
          
          <div>
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <Users size={16} /> Capacity
            </div>
            <div style={{ fontWeight: 500 }}>{profile?.capacity.toLocaleString()} students</div>
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
