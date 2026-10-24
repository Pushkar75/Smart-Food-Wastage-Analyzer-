import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config/api';

export default function TodaysMeals() {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(() => {
    fetch(`${API_BASE_URL}/api/meals/today`)
      .then(res => res.json())
      .then(data => {
        setMeals(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching today\'s meals:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchMeals();

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('[todays meals] Connected to real-time socket server');
    });

    const handleUpdate = () => {
      console.log('[todays meals] Live event received; refreshing snapshot');
      fetchMeals();
    };

    socket.on('intent:update', handleUpdate);
    socket.on('attendance:update', handleUpdate);
    socket.on('dashboard:stats_changed', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [fetchMeals]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>Today's Meals</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Live sync with SQLite database & gate biometric readers
          </p>
        </div>
        <span className="badge badge-success">Live Database Sync</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {meals.map(meal => (
          <div key={meal.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{meal.type || meal.name}</h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{meal.time}</div>
              </div>
              <span className={`badge ${meal.status === 'Completed' ? 'badge-success' : meal.status === 'Serving' ? 'badge-warning' : 'badge-neutral'}`}>
                {meal.status}
              </span>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="flex justify-between items-center" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Predicted / Prepared</span>
                <span style={{ fontWeight: 600 }}>{meal.predicted}</span>
              </div>
              
              <div className="flex justify-between items-center" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Confirmed Intentions</span>
                <span style={{ fontWeight: 600, color: 'var(--success-color)' }}>{meal.confirmed}</span>
              </div>
              
              <div className="flex justify-between items-center" style={{ paddingBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Actual Attendance</span>
                <span style={{ fontWeight: 600, color: meal.actual ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                  {meal.actual ? meal.actual : '0'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
