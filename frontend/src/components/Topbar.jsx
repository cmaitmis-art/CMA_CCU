import { useState, useEffect, useRef } from 'react';
import './Topbar.css';
import { getRoleLabel } from '../utils/roleLabel.js';

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    let hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
  }
  const normalized = String(value).trim().replace(/\./g, '-');
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return value;
  let [, year, month, day, hourRaw, minute, ampmRaw] = match;
  let hourNum = parseInt(hourRaw, 10);
  const ampm = (ampmRaw || '').toUpperCase();
  if (ampm === 'PM' && hourNum < 12) hourNum += 12;
  if (ampm === 'AM' && hourNum === 12) hourNum = 0;
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day), hourNum, Number(minute));
  if (Number.isNaN(dateObj.getTime())) return value;
  hour = dateObj.getHours();
  const minuteStr = String(dateObj.getMinutes()).padStart(2, '0');
  const suffix = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(hour).padStart(2, '0')}:${minuteStr} ${suffix}`;
}

function Topbar({ currentUser, currentPage, onToggleSidebar, onLogout, onNavigate }) {


  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser?.avatar_url]);

  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  const dismissKey = () => `cma_dismissed_topbar_notifications_${String(currentUser?.username || currentUser?.id || 'anon')}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(dismissKey());
      if (saved) setDismissedIds(JSON.parse(saved));
    } catch (e) {
      setDismissedIds([]);
    }
  }, [currentUser]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const { fetchDiscussions } = await import('../api');
        const res = await fetchDiscussions(1, 1000);
        const allDiscs = res?.discussions || [];
        
        // Filter discussions to find the ones with active reminders (due today)
        const due = allDiscs.filter((d) => {
          if (d.status === 'Completed' || d.status === 'Cancelled') return false;
          
          let targetMs = null;
          if (d.reminder_date) {
            const parsed = new Date(d.reminder_date);
            parsed.setHours(0, 0, 0, 0);
            if (!isNaN(parsed.getTime())) targetMs = parsed.getTime();
          } 
          if (targetMs === null && d.meeting_date_time) {
            const rawMeeting = String(d.meeting_date_time).trim();
            const parsed = new Date(rawMeeting);
            if (!isNaN(parsed.getTime())) {
              parsed.setHours(0, 0, 0, 0);
              targetMs = parsed.getTime();
            } else {
              const ddmmMatch = rawMeeting.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
              if (ddmmMatch) {
                const [, dd, mm, yyyy] = ddmmMatch;
                const parsedDate = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
                parsedDate.setHours(0, 0, 0, 0);
                targetMs = parsedDate.getTime();
              }
            }
          }
          if (targetMs === null && d.date) {
              const parsed = new Date(d.date);
              parsed.setHours(0, 0, 0, 0);
              if (!isNaN(parsed.getTime())) targetMs = parsed.getTime();
          }

          const todayMs = new Date().setHours(0, 0, 0, 0);
          
          // Match if it is today or in the future, OR if the status is explicitly 'In Progress'
          return (targetMs !== null && targetMs >= todayMs) || d.status === 'In Progress';
        });

        const list = due.map((d) => ({
          id: d.id,
          title: d.appointment || 'Discussion Meeting',
          subtitle: `${d.file_no || 'No File'} • ${d.meeting_date_time ? formatDateTime(d.meeting_date_time) : 'No Time'} • ${d.venue || 'No Venue'}`,
          notes: d.reminder_notes || '',
          time: d.date ? new Date(d.date).toLocaleDateString() : '',
          link: 'discussion',
        }));

        setNotifications(list.filter((n) => !dismissedIds.includes(n.id)));
      } catch (err) {
        // Silently ignore background polling errors (e.g. during dev server restarts)
        // to prevent console clutter.
      }
    }

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.length;

  const pageNames = {
    dashboard: 'Dashboard',
    mc: 'MC Management',
    mcom: 'M.Com Management',
    cfiles: 'C Files',
    complains: 'Complaints',
    registration: 'Registration Form',
    records: 'Records',
    reports: 'Report Generate',
    profile: 'My Profile',
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="cma-topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onToggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
        <div>
          <div className="page-title">{pageNames[currentPage] || 'Dashboard'}</div>
          <div className="breadcrumb">Home / {pageNames[currentPage] || 'Dashboard'}</div>
        </div>
      </div>
      <div className="topbar-right">
        {currentUser?.role?.toLowerCase() === 'admin' && (
          <button 
            className="topbar-btn" 
            style={{ marginRight: '8px', fontSize: '12px', padding: '0 12px', fontWeight: 'bold', width: 'auto', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={() => window.open('/renewal', '_blank')}
            title="Open MC Renewal Portal"
          >
            <i className="fas fa-globe" style={{ marginRight: '6px' }}></i> Web
          </button>
        )}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button className="topbar-btn" onClick={() => setShowNotif((prev) => !prev)}>
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 3, right: 3, background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: '0 4px', border: '2px solid white' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {showNotif && (
            <div className="notif-dd" style={{ width: '320px', maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: '600', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Discussion Reminders</span>
                <span style={{ fontSize: '11px', background: 'var(--navy)', color: '#fff', padding: '2px 6px', borderRadius: '10px' }}>
                  {notifications.length}
                </span>
              </div>
              {notifications.map((item) => (
                <div 
                  key={item.id} 
                  className="notif-item"
                  onClick={() => {
                    if (item.link) {
                      if (item.link === 'mc') {
                        try { localStorage.setItem('cma_mc_filter', 'Pending'); } catch (e) {}
                        onNavigate?.('mc');
                      } else {
                        onNavigate?.(item.link);
                      }
                    } else {
                      onNavigate?.('discussion');
                    }
                    setShowNotif(false);
                  }}
                  style={{ cursor: 'pointer', padding: '12px 14px', borderBottom: '1px solid var(--border)', position: 'relative' }}
                >
                  <div className="notif-title" style={{ fontWeight: '700', fontSize: '13px', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-calendar-check" style={{ color: 'var(--gold)', fontSize: '12px' }}></i>
                    {item.title}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          const next = [...dismissedIds, item.id];
                          setDismissedIds(next);
                          localStorage.setItem(dismissKey(), JSON.stringify(next));
                          setNotifications((prev) => prev.filter((n) => n.id !== item.id));
                        } catch (err) {
                          console.error('Failed to dismiss notification', err);
                        }
                      }}
                      title="Dismiss"
                      style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                    >
                      <i className="fas fa-times" style={{ fontSize: 12 }}></i>
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '3px', lineHeight: '1.4' }}>
                    {item.subtitle}
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: '11px', color: '#b45309', background: '#fffbeb', padding: '5px 8px', borderRadius: '6px', marginTop: '5px', borderLeft: '2.5px solid #d97706', lineHeight: '1.3' }}>
                      {item.notes}
                    </div>
                  )}
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="notif-item" style={{ cursor: 'default', padding: '20px 14px', textAlign: 'center', color: 'var(--text3)' }}>
                  <i className="fas fa-bell-slash" style={{ fontSize: '20px', display: 'block', marginBottom: '8px', opacity: 0.5 }}></i>
                  <div className="notif-title" style={{ fontSize: '12px' }}>No discussion reminders due today</div>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div className="profile-trigger" onClick={() => setShowProfile((prev) => !prev)}>
            <div className="avatar">
              {currentUser?.avatar_url && !avatarError ? (
                <img
                  key={currentUser.avatar_url || ''}
                  src={currentUser.avatar_url}
                  alt="Avatar"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                currentUser?.avatar || 'AD'
              )}
            </div>
            <span className="pname" title={currentUser?.name || 'Admin'}>{currentUser?.name || 'Admin'}</span>
            <i className="fas fa-chevron-down"></i>
          </div>
          {showProfile && (
            <div className="profile-dd">
              <div className="profile-dd-head">
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{currentUser?.name || 'Admin User'}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                  {getRoleLabel(currentUser?.role)}
                </div>

              </div>
              
           
              <div className="profile-dd-item danger" onClick={onLogout}>
                <i className="fas fa-sign-out-alt"></i>Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;
