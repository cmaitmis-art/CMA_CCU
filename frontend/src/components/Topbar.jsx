import { useState, useEffect, useRef } from 'react';
import './Topbar.css';
import { getRoleLabel } from '../utils/roleLabel.js';
import { fetchCalendarEvents, createCalendarEvent, deleteCalendarEvent, fetchUserPreferences, setUserPreference } from '../api.js';

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
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const calendarRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: new Date().toISOString().slice(0,10), visibility: 'Everyone' });

  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await fetchCalendarEvents();
        if (Array.isArray(data)) setEvents(data);
      } catch (e) {
        console.error('Failed to load calendar events', e);
      }
    }
    loadEvents();
  }, []);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    const authorId = currentUser?.username || currentUser?.id || 'anon';
    try {
      const e = await createCalendarEvent({ ...newEvent, authorId });
      setEvents(prev => [...prev, e]);
      setNewEvent(prev => ({ title: '', date: prev.date, visibility: 'Everyone' }));
    } catch (e) {
      console.error('Failed to create calendar event', e);
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await deleteCalendarEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error('Failed to delete calendar event', e);
    }
  };

  const visibleEvents = events.filter(e => {
    if (e.visibility === 'Everyone') return true;
    const dept = String(currentUser?.department || '').toUpperCase();
    const role = String(currentUser?.role || '').toLowerCase();
    if (e.visibility === 'CCU') {
      if (role === 'admin' || role.includes('ccu') || dept === 'CCU') return true;
    }
    if (e.visibility === 'Legal') {
      if (dept === 'LEGAL' || role === 'admin') return true;
    }
    if (e.visibility === 'Technical') {
      if (dept === 'TECHNICAL' || role === 'admin') return true;
    }
    return e.authorId === (currentUser?.username || currentUser?.id || 'anon');
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // --- Auto popup for today's / upcoming events ---
  const [showEventPopup, setShowEventPopup] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);
  const in3DaysStr = in3Days.toISOString().slice(0, 10);

  const popupEvents = visibleEvents.filter(e => e.date >= todayStr && e.date <= in3DaysStr);

  const popupDismissKey = `cma_cal_popup_dismissed_${todayStr}_${currentUser?.username || currentUser?.id || 'anon'}`;

  useEffect(() => {
    if (popupEvents.length === 0) return;
    async function checkDismiss() {
      try {
        const userId = currentUser?.username || currentUser?.id || 'anon';
        const prefs = await fetchUserPreferences(userId);
        if (!prefs[popupDismissKey]) setShowEventPopup(true);
      } catch(e) {
        setShowEventPopup(true);
      }
    }
    checkDismiss();
  }, [popupEvents.length, currentUser]);

  const handleDismissEventPopup = async () => {
    setShowEventPopup(false);
    try { 
      const userId = currentUser?.username || currentUser?.id || 'anon';
      await setUserPreference(userId, popupDismissKey, '1'); 
    } catch(e) {}
  };

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser?.avatar_url]);

  const [notifications, setNotifications] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  const dismissKey = () => `cma_dismissed_topbar_notifications_${String(currentUser?.username || currentUser?.id || 'anon')}`;

  useEffect(() => {
    async function loadDismissed() {
      try {
        const userId = currentUser?.username || currentUser?.id || 'anon';
        const prefs = await fetchUserPreferences(userId);
        const saved = prefs[dismissKey()];
        if (saved) setDismissedIds(typeof saved === 'string' ? JSON.parse(saved) : saved);
      } catch (e) {
        setDismissedIds([]);
      }
    }
    loadDismissed();
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
    registration: 'Registration Form',
    renewal_approval: 'Renewal Approvals',
    mc: 'MC Management',
    mcom: 'M.Com Management',
    cfiles: 'C Files',
    complains: 'Complaints/Issues',
    discussion: 'Discussions',
    notifications: 'Notifications',
    records: 'Records',
    customer_history: 'Customer History',
    reports: 'Report Generate',
    users: 'User Admin',
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
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
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

        <div style={{ position: 'relative', marginRight: '4px' }} ref={calendarRef}>
          <button className="topbar-btn" onClick={() => setShowCalendar((prev) => !prev)} title="Calendar Events">
            <i className="fas fa-calendar-alt"></i>
            {visibleEvents.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).length > 0 && (
              <span style={{ position: 'absolute', top: 3, right: 3, background: '#10b981', color: 'white', fontSize: '10px', fontWeight: 'bold', minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: '0 4px', border: '2px solid white' }}>
                {visibleEvents.filter(e => new Date(e.date).toDateString() === new Date().toDateString()).length}
              </span>
            )}
          </button>

          {/* Auto-popup for today's / upcoming events */}
          {showEventPopup && !showCalendar && popupEvents.length > 0 && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 9999,
              width: '260px', background: 'white', borderRadius: '12px',
              boxShadow: '0 16px 40px -8px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.06)',
              border: '1px solid #e2e8f0',
              animation: 'calSlideDown 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
              overflow: 'hidden'
            }}>
              <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fas fa-calendar-check" style={{ color: '#93c5fd', fontSize: 12 }}></i>
                  <span style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Upcoming Events</span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 10, fontWeight: '700', padding: '1px 6px', borderRadius: 10 }}>{popupEvents.length}</span>
                </div>
                <button onClick={handleDismissEventPopup} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-times" style={{ fontSize: 9 }}></i>
                </button>
              </div>
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                {popupEvents.map(e => {
                  const isToday = e.date === todayStr;
                  const dDate = new Date(e.date);
                  const label = isToday ? 'Today' : dDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                  const dotColor = e.visibility === 'Everyone' ? '#10b981' : e.visibility === 'CCU' ? '#3b82f6' : e.visibility === 'Legal' ? '#8b5cf6' : e.visibility === 'Technical' ? '#f59e0b' : '#94a3b8';
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: isToday ? '#eff6ff' : '#f8fafc', padding: '6px 8px', borderRadius: 7, border: isToday ? '1px solid #bfdbfe' : '1px solid #e2e8f0' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: 11, fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>{label} · {e.visibility}</div>
                      </div>
                      {isToday && <span style={{ background: '#2563eb', color: 'white', fontSize: 8, fontWeight: '800', padding: '2px 5px', borderRadius: 5, flexShrink: 0 }}>TODAY</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '8px 10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => { handleDismissEventPopup(); setShowCalendar(true); }} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 11, fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className="fas fa-calendar-alt" style={{ fontSize: 10 }}></i> Open Calendar
                </button>
                <button onClick={handleDismissEventPopup} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 10, cursor: 'pointer' }}>Dismiss</button>
              </div>
            </div>
          )}

          {showCalendar && (
            <div className="notif-dd modern-cal-dd" style={{ width: '300px', overflowY: 'visible', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)' }}>
              <style>{`
                @keyframes calSlideDown {
                  from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes panelReveal {
                  from { opacity: 0; max-height: 0; transform: translateY(-6px); }
                  to { opacity: 1; max-height: 300px; transform: translateY(0); }
                }
                .modern-cal-dd {
                  animation: calSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                  box-shadow: 0 16px 40px -8px rgba(0,0,0,0.18), 0 4px 8px rgba(0,0,0,0.04) !important;
                }
                .cal-day-cell {
                  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s cubic-bezier(0.4,0,0.2,1), box-shadow 0.15s ease;
                  position: relative;
                }
                .cal-day-cell:hover {
                  background: #eff6ff !important;
                  transform: scale(1.08);
                  z-index: 5;
                }
                .cal-event-panel {
                  animation: panelReveal 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
                  overflow: hidden;
                }
                .cal-input:focus {
                  outline: none;
                  border-color: #3b82f6 !important;
                  box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
                }
                .cal-btn {
                  transition: all 0.18s ease;
                }
                .cal-btn:hover {
                  background: #2563eb !important;
                  transform: translateY(-1px);
                  box-shadow: 0 4px 8px rgba(59,130,246,0.35);
                }
                .cal-nav-btn {
                  transition: all 0.18s ease;
                }
                .cal-nav-btn:hover {
                  background: #e0e7ff !important;
                }
              `}</style>

              {/* Header */}
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', borderRadius: '14px 14px 0 0' }}>
                <button className="cal-nav-btn" onClick={handlePrevMonth} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-chevron-left" style={{fontSize: 9}}></i></button>
                <span style={{ fontWeight: '800', fontSize: 13, color: 'white', letterSpacing: '0.5px' }}>{monthNames[currentMonth.getMonth()].toUpperCase()} {currentMonth.getFullYear()}</span>
                <button className="cal-nav-btn" onClick={handleNextMonth} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-chevron-right" style={{fontSize: 9}}></i></button>
              </div>

              {/* Day labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '10px 10px 4px 10px' }}>
                {dayNames.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#94a3b8', paddingBottom: 4 }}>{d}</div>)}
              </div>

              {/* Calendar Grid — compact */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: '0 10px 10px 10px' }}>
                {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDate != null && selectedDate.toDateString() === new Date(dateStr).toDateString();
                  const dayEvents = visibleEvents.filter(e => e.date === dateStr);
                  const isToday = new Date().toDateString() === new Date(dateStr).toDateString();

                  return (
                    <div
                      key={day}
                      className="cal-day-cell"
                      title={dayEvents.length > 0 ? dayEvents.map(e => e.title).join('\n') : undefined}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedDate(null);
                        } else {
                          setSelectedDate(new Date(dateStr));
                          setNewEvent({...newEvent, date: dateStr});
                        }
                      }}
                      style={{
                        textAlign: 'center', cursor: 'pointer', padding: '5px 2px',
                        background: isSelected ? '#3b82f6' : (isToday ? '#eff6ff' : 'transparent'),
                        color: isSelected ? 'white' : (isToday ? '#1d4ed8' : '#374151'),
                        borderRadius: 7,
                        border: isToday && !isSelected ? '1.5px solid #93c5fd' : '1.5px solid transparent',
                        fontWeight: (isSelected || isToday) ? '800' : '500',
                        fontSize: 12,
                        boxSizing: 'border-box',
                      }}
                    >
                      {day}
                      {dayEvents.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                          {dayEvents.slice(0, 3).map(e => (
                            <div key={e.id} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : (e.visibility === 'Everyone' ? '#10b981' : e.visibility === 'CCU Team' ? '#3b82f6' : '#f59e0b') }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Event Panel — slides in on date click */}
              {selectedDate && (() => {
                const selDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                const selEvents = visibleEvents.filter(e => e.date === selDateStr);
                return (
                  <div className="cal-event-panel" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '12px 14px', borderRadius: '0 0 14px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="fas fa-calendar-day" style={{ color: '#3b82f6', fontSize: 11 }}></i>
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <span style={{ fontSize: 10, background: selEvents.length > 0 ? '#dbeafe' : '#f1f5f9', color: selEvents.length > 0 ? '#1d4ed8' : '#64748b', padding: '2px 8px', borderRadius: 10, fontWeight: '700' }}>
                        {selEvents.length} event{selEvents.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {selEvents.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, maxHeight: 100, overflowY: 'auto' }}>
                        {selEvents.map(e => (
                          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: e.visibility === 'Everyone' ? '#10b981' : e.visibility === 'CCU Team' ? '#3b82f6' : '#f59e0b' }} />
                            <span style={{ flex: 1, fontSize: 11, color: '#1e293b', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>
                            <span style={{ fontSize: 9, color: '#94a3b8', background: '#f8fafc', padding: '1px 5px', borderRadius: 6, flexShrink: 0 }}>{e.visibility === 'Only Me' ? 'Me' : e.visibility === 'CCU Team' ? 'CCU' : 'All'}</span>
                            {(e.authorId === (currentUser?.username || currentUser?.id || 'anon') || currentUser?.role?.toLowerCase() === 'admin') && (
                              <i className="fas fa-trash" style={{ color: '#fca5a5', cursor: 'pointer', fontSize: 10, transition: 'color 0.15s', flexShrink: 0 }} onClick={() => handleDeleteEvent(e.id)} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#fca5a5'}></i>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <input className="cal-input" type="text" placeholder="Add an event..." value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} onKeyDown={e => { if(e.key === 'Enter') handleAddEvent(); }} style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 11, boxSizing: 'border-box', background: 'white', transition: 'border-color 0.2s' }} />
                      <select className="cal-input" value={newEvent.visibility} onChange={e => setNewEvent({...newEvent, visibility: e.target.value})} style={{ width: 80, padding: '6px 3px', border: '1px solid #cbd5e1', borderRadius: 7, fontSize: 10, boxSizing: 'border-box', background: 'white' }}>
                        <option value="Only Me">Only Me</option>
                        <option value="CCU">CCU</option>
                        <option value="Legal">Legal</option>
                        <option value="Technical">Technical</option>
                        <option value="Everyone">Everyone</option>
                      </select>
                      <button className="cal-btn" onClick={handleAddEvent} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: '700' }}>+</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
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
                        try { localStorage.setItem('cma_mc_filter', 'Pending'); } catch (e) { }
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
                          const newIds = [...dismissedIds, item.id];
                          setDismissedIds(newIds);
                          try {
                            const userId = currentUser?.username || currentUser?.id || 'anon';
                            setUserPreference(userId, dismissKey(), newIds);
                          } catch(e) {}
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
          <div className="profile-trigger" style={{ gap: 0 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}
              title={[
                currentUser?.name,
                currentUser?.designation,
                getRoleLabel(currentUser?.role)
              ].filter(Boolean).join('\n')}
              onClick={() => { onNavigate('profile'); }}
            >
              <div
                className="avatar"
                onClick={(e) => {
                  if (currentUser?.avatar_url && !avatarError) {
                    e.stopPropagation();
                    setShowAvatarViewer(true);
                  }
                }}
                style={currentUser?.avatar_url && !avatarError ? { cursor: 'zoom-in' } : {}}
              >
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
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <span className="pname" title={currentUser?.name || 'Admin'} style={{ fontSize: '13px', fontWeight: 600 }}>{currentUser?.name || 'Admin'}</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>{getRoleLabel(currentUser?.role)}</span>
              </div>
            </div>
            <i className="fas fa-chevron-down" style={{ fontSize: '10px', cursor: 'pointer', padding: '4px 4px 4px 8px' }} onClick={(e) => { e.stopPropagation(); setShowProfile((prev) => !prev); }}></i>
          </div>
          {showProfile && (
            <div className="profile-dd">
              <div className="profile-dd-head">
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{currentUser?.name || 'Admin User'}</div>
                {currentUser?.designation && (
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{currentUser.designation}</div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text3)', opacity: currentUser?.designation ? 0.65 : 1, marginTop: '2px' }}>
                  {getRoleLabel(currentUser?.role)}
                </div>
              </div>
              <div className="profile-dd-item" onClick={() => { onNavigate('profile'); setShowProfile(false); }}>
                <i className="fas fa-user-circle"></i>My Profile
              </div>
              <div className="profile-dd-item danger" onClick={onLogout}>
                <i className="fas fa-sign-out-alt"></i>Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Avatar / Profile Photo Viewer */}
    {showAvatarViewer && currentUser?.avatar_url && (
      <div
        onClick={() => setShowAvatarViewer(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease',
          cursor: 'zoom-out',
        }}
      >
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes zoomIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}</style>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            animation: 'zoomIn 0.22s cubic-bezier(0.34,1.2,0.64,1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}
        >
          <img
            src={currentUser.avatar_url}
            alt={currentUser?.name || 'Profile'}
            style={{
              maxWidth: '80vw', maxHeight: '80vh',
              borderRadius: 16,
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
              objectFit: 'contain',
              border: '3px solid rgba(255,255,255,0.15)',
            }}
          />
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>{currentUser?.name}</div>
          <button
            onClick={() => setShowAvatarViewer(false)}
            style={{
              position: 'absolute', top: -14, right: -14,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', width: 32, height: 32,
              color: 'white', fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
          >
            <i className="fas fa-times" />
          </button>
        </div>
      </div>
    )}
    </>
  );
}

export default Topbar;
