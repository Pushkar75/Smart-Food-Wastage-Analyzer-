import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/attendance`)
      .then(res => res.json())
      .then(data => {
        setAttendance(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching attendance:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Attendance Comparison</h2>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Meal</th>
                <th>Predicted</th>
                <th>Actual</th>
                <th>Difference</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.id}>
                  <td style={{ fontWeight: 500 }}>{record.date}</td>
                  <td>{record.meal}</td>
                  <td>{record.predicted}</td>
                  <td>{record.actual}</td>
                  <td>
                    <span className={`badge ${Math.abs(record.diff) < 10 ? 'badge-success' : Math.abs(record.diff) < 30 ? 'badge-warning' : 'badge-danger'}`}>
                      {record.diff > 0 ? '+' : ''}{record.diff}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: record.accuracy >= 98 ? 'var(--success-color)' : 'var(--text-main)', fontWeight: 600 }}>
                      {record.accuracy}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
