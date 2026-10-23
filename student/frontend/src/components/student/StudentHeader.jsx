/** Sticky page header: current page title, notification bell, account chip. */

import { Link } from 'react-router-dom';
import { initials } from '../../utils/format';

export default function StudentHeader({ title, subtitle, user, unreadCount }) {
  return (
    <header className="student-header">
      <div className="header-titles">
        <h1 className="header-title">{title}</h1>
        {subtitle && <p className="header-sub">{subtitle}</p>}
      </div>

      <div className="header-actions">
        <Link
          to="/student/notifications"
          className="bell"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications, none unread'
          }
        >
          <span aria-hidden="true">🔔</span>
          {unreadCount > 0 && <span className="bell-dot" aria-hidden="true">{unreadCount}</span>}
        </Link>

        <div className="header-chip">
          <span className="avatar" aria-hidden="true">{initials(user?.name)}</span>
          <span>
            <span className="header-chip-name" style={{ display: 'block' }}>{user?.name || 'Student'}</span>
            <span className="header-chip-role" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {user?.studentId || user?.regNo || 'Student'}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
