import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchDashboardStats,
  fetchPendingComplaints,
  fetchPendingCfiles,
  fetchPendingDiscussions,
  fetchActiveUsers,
} from '../api';
import '../CMAStyles.css';
import { useAutoRefresh } from '../utils/useAutoRefresh';

function FadeIn({ children, delay = 0 }) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    if (domRef.current) observer.observe(domRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {children}
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function formatDateTime(value) {
  if (!value) return '—';
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

const theme = {
  navy: '#1a3a6b',
  border: '#e2e8f0',
  text: '#1a1a2e',
  text2: '#5a6478',
  text3: '#94a0b4',
  blue: '#2563eb',
  orange: '#ea580c',
  red: '#dc2626',
  teal: '#0d9488',
};

// Smoothly counts up from 0 to `value` whenever `value` changes — used for the
// stat-card numbers so they animate in nicely once data has loaded.
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) { setDisplay(0); return; }
    let raf;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      // ease-out cubic for a natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
}

function DoughnutChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 60);
    return () => clearTimeout(t);
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: theme.text3, fontSize: 13 }}>
        No data to display
      </div>
    );
  }

  const radius = 38;
  const strokeWidth = 10;
  const circ = 2 * Math.PI * radius; // 238.76

  let currentOffset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
      {/* SVG Doughnut */}
      <div style={{ position: 'relative', width: 110, height: 110 }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          {data.map((item, idx) => {
            if (item.value === 0) return null;
            const pct = (item.value / total) * 100;
            const strokeLength = (pct * circ) / 100;
            const strokeOffset = circ - currentOffset;
            currentOffset += strokeLength;

            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={item.name}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={`${grown ? strokeLength : 0} ${circ}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                style={{
                  transition: `stroke-dasharray 0.9s cubic-bezier(0.4, 0, 0.2, 1) ${idx * 0.12}s, stroke-width 0.3s`,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
        {/* Central Text */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>
            {hoveredIdx !== null ? data[hoveredIdx].value : total}
          </span>
          <span style={{ fontSize: 9, color: theme.text3, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            {hoveredIdx !== null ? data[hoveredIdx].name.split(' ')[0] : 'Total'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
        {data.map((item, idx) => {
          if (item.value === 0) return null;
          const pct = ((item.value / total) * 100).toFixed(1);
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={item.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                opacity: hoveredIdx === null || isHovered ? 1 : 0.6,
                transform: isHovered ? 'translateX(4px)' : 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
              <div style={{ flex: 1, color: theme.text2, fontWeight: isHovered ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
              <div style={{ fontWeight: 600, color: theme.text }}>{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OperationBarChart({ stats }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 80);
    return () => clearTimeout(t);
  }, []);

  const data = [
    {
      module: 'MC Registry',
      active: stats.mc,
      pending: stats.pendingMc || 0,
      colorActive: theme.navy,
      colorPending: theme.orange,
    },
    {
      module: 'M.Com Registry',
      active: stats.mcom,
      pending: stats.pendingMcom || 0,
      colorActive: theme.teal,
      colorPending: theme.red,
    },
    {
      module: 'C-Files',
      active: Math.max(0, stats.cfiles - (stats.pendingCfiles || 0)),
      pending: stats.pendingCfiles || 0,
      colorActive: theme.blue,
      colorPending: theme.orange,
    },
    {
      module: 'Complaints',
      active: 0,
      pending: stats.pendingComplaints || 0,
      colorActive: theme.teal,
      colorPending: theme.red,
    },
  ];

  const maxVal = Math.max(...data.map(d => d.active + d.pending), 10);

  const height = 150;
  const barWidth = 32;
  const gap = 60;
  const paddingLeft = 40;
  const paddingTop = 20;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>Registry Workload Status</span>
        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.navy }} />
            <span style={{ color: theme.text2 }}>Active / Completed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: theme.orange }} />
            <span style={{ color: theme.text2 }}>Pending / Overdue</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto', background: '#fafbfc', borderRadius: 12, border: `1px solid ${theme.border}`, padding: '16px 12px' }}>
        <svg width="100%" height={height + 40} viewBox={`0 0 460 ${height + 40}`} style={{ display: 'block', margin: '0 auto' }}>
          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
            const y = paddingTop + height * (1 - r);
            const labelVal = Math.round(maxVal * r);
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2="430" y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                <text x={paddingLeft - 8} y={y + 4} fill={theme.text3} fontSize="9" textAnchor="end">{labelVal}</text>
              </g>
            );
          })}

          {/* Render Bars */}
          {data.map((d, idx) => {
            const x = paddingLeft + idx * (barWidth + gap) + 15;

            const activeHeight = d.active > 0 ? (d.active / maxVal) * height : 0;
            const pendingHeight = d.pending > 0 ? (d.pending / maxVal) * height : 0;

            const activeY = paddingTop + height - activeHeight;
            const pendingY = activeY - pendingHeight;

            const isHovered = hoveredBar === idx;

            return (
              <g key={d.module}
                onMouseEnter={() => setHoveredBar(idx)}
                onMouseLeave={() => setHoveredBar(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Active Stack */}
                {d.active > 0 && (
                  <rect
                    x={x}
                    y={grown ? activeY : paddingTop + height}
                    width={barWidth}
                    height={grown ? activeHeight : 0}
                    fill={d.colorActive}
                    rx="3"
                    style={{ transition: `y 0.7s cubic-bezier(0.4,0,0.2,1) ${idx * 0.08}s, height 0.7s cubic-bezier(0.4,0,0.2,1) ${idx * 0.08}s, opacity 0.2s`, opacity: isHovered ? 0.85 : 1 }}
                  />
                )}

                {/* Pending Stack */}
                {d.pending > 0 && (
                  <rect
                    x={x}
                    y={grown ? pendingY : paddingTop + height}
                    width={barWidth}
                    height={grown ? pendingHeight : 0}
                    fill={d.colorPending}
                    rx="3"
                    style={{ transition: `y 0.7s cubic-bezier(0.4,0,0.2,1) ${idx * 0.08 + 0.1}s, height 0.7s cubic-bezier(0.4,0,0.2,1) ${idx * 0.08 + 0.1}s, opacity 0.2s`, opacity: isHovered ? 0.85 : 1 }}
                  />
                )}

                {/* Hover Tooltip Overlay */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 22}
                      y={Math.min(activeY, pendingY) - 34}
                      width={barWidth + 44}
                      height={28}
                      fill="#1e293b"
                      rx="6"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={Math.min(activeY, pendingY) - 16}
                      fill="#fff"
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {d.active > 0 ? `Act: ${d.active} ` : ''}{`Pend: ${d.pending}`}
                    </text>
                  </g>
                )}

                {/* Label */}
                <text
                  x={x + barWidth / 2}
                  y={paddingTop + height + 18}
                  fill={theme.text2}
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {d.module}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Shows the list of users currently logged in to the system, each with their
// profile image, job role and online/offline status.
function ActiveUsersPanel({ users }) {
  const list = Array.isArray(users) ? users : [];

  // Try a few likely field names so this works whichever shape the API returns.
  const getName = (u) => u.name || u.full_name || u.fullName || u.username || 'Unknown User';
  const getRole = (u) => u.role || u.job_role || u.jobRole || u.designation || u.position || '—';
  const getAvatar = (u) => u.avatar_url || u.avatarUrl || u.profile_image || u.profileImage || u.image || u.photo || null;
  const getLastSeen = (u) => u.last_login || u.lastLogin || u.last_active || u.lastActive || u.last_seen || u.lastSeen || null;
  const getOnline = (u) => {
    const isFlaggedOnline = Boolean(u.is_online ?? u.isOnline ?? u.online ?? false);
    if (!isFlaggedOnline) return false;
    const lastSeen = getLastSeen(u);
    if (!lastSeen) return isFlaggedOnline;
    const diff = new Date() - new Date(lastSeen);
    return diff < 3 * 60 * 1000; // 3 minutes timeout
  };

  const initials = (name) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase();

  const avatarColors = ['#1a3a6b', '#0d9488', '#ea580c', '#2563eb', '#7c3aed', '#dc2626'];
  const colorFor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const onlineCount = list.filter(getOnline).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: theme.text }}>Active Users</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16a34a' }} />
          <span style={{ color: theme.text2 }}>{onlineCount} online</span>
        </div>
      </div>

      <div
        style={{
          background: '#fafbfc',
          borderRadius: 12,
          border: `1px solid ${theme.border}`,
          padding: '8px 12px',
          maxHeight: 260,
          overflowY: 'auto',
        }}
      >
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: theme.text3, fontSize: 13 }}>
            <i className="fas fa-users" style={{ fontSize: 20, marginBottom: 6, display: 'block', opacity: 0.5 }} />
            No users currently logged in.
          </div>
        ) : (
          list.map((u, idx) => {
            const name = getName(u);
            const role = getRole(u);
            const avatar = getAvatar(u);
            const online = getOnline(u);
            const lastSeen = getLastSeen(u);

            return (
              <div
                key={u.id || u.user_id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 4px',
                  borderBottom: idx < list.length - 1 ? '1px solid #eef1f5' : 'none',
                }}
              >
                {/* Avatar with online-status dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div
                    style={{
                      display: avatar ? 'none' : 'flex',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: colorFor(name),
                      color: '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {initials(name)}
                  </div>
                  <div
                    title={online ? 'Online' : 'Offline'}
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      right: -1,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: online ? '#16a34a' : '#94a0b4',
                      border: '2px solid #fafbfc',
                    }}
                  />
                </div>

                {/* Name + role */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name}
                  </div>
                  <div style={{ fontSize: 11, color: theme.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {role}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      backgroundColor: online ? '#e8f8ef' : '#f1f5f9',
                      color: online ? '#16a34a' : '#5a6478',
                    }}
                  >
                    {online ? 'Online' : 'Offline'}
                  </span>
                  {!online && lastSeen && (
                    <div style={{ fontSize: 10, color: theme.text3, marginTop: 3 }}>{formatDateTime(lastSeen)}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Dashboard({ onNavigate, currentUser }) {
  const hasAccess = (modId) => {
    if (currentUser?.role?.toLowerCase() === 'admin') return true;
    const managedModules = ['dashboard', 'registration', 'renewal_approval', 'mc', 'mcom', 'cfiles', 'complains', 'discussion', 'notifications', 'records', 'customer_history', 'reports', 'users', 'profile'];
    if (!managedModules.includes(modId)) return true;
    return currentUser?.permissions?.[modId]?.includes('view');
  };
  const [stats, setStats] = useState({
    mc: 0,
    mcom: 0,
    cfiles: 0,
    pendingCfiles: 0,
    pendingComplaints: 0,
    pendingMc: 0,
    pendingMcom: 0,
    pendingComplaintsOverdue: 0,
    complaints: 0,
  });
  const [animateCounts, setAnimateCounts] = useState(false);
  const [pendingComplaints, setPendingComplaints] = useState([]);
  const [pendingCfiles, setPendingCfiles] = useState([]);
  const [reminderDiscussions, setReminderDiscussions] = useState([]);
  const [newDiscussions, setNewDiscussions] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activityItems, setActivityItems] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);


  const loadDashboardDataCb = useCallback(loadDashboardData, []);
  useAutoRefresh(loadDashboardDataCb, 30000);

  useEffect(() => {
    loadDashboardDataCb();
  }, [loadDashboardDataCb]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const clockTime = document.getElementById('clockTimeDisplay');
      if (clockTime) clockTime.textContent = now.toLocaleTimeString();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatActivityTime = (timeStr) => {
    if (!timeStr) return '—';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;

      const now = new Date();
      const diffMs = now - d;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          return 'Today';
        }
        return 'Yesterday';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      }
    } catch (e) {
      return timeStr;
    }
  };

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [dashStats, pendingComplaintsData, pendingCfilesData, discussionsData, activeUsersData] = await Promise.all([
        fetchDashboardStats().catch(() => ({
          mc: 0,
          mcTotal: 0,
          mcom: 0,
          cfiles: 0,
          pendingCfiles: 0,
          pendingComplaints: 0,
          pendingMc: 0,
          pendingMcom: 0,
          pendingComplaintsOverdue: 0,
          complaints: 0,
          closedCfiles: 0,
          resolvedComplaints: 0,
        })),
        fetchPendingComplaints(5).catch(() => ([])),
        fetchPendingCfiles(5).catch(() => ([])),
        fetchPendingDiscussions().catch(() => ({ due: [], newDiscs: [] })),
        fetchActiveUsers().catch(() => ([])),
      ]);

      setStats(dashStats);
      setPendingComplaints(pendingComplaintsData || []);
      setPendingCfiles(pendingCfilesData || []);
      setActiveUsers(activeUsersData || []);

      const due = discussionsData?.due || [];
      const newDiscs = discussionsData?.newDiscs || [];

      setReminderDiscussions(due);
      setNewDiscussions(newDiscs);

      // Fetch dynamic timeline activity logs
      try {
        const configuredApiBase = (import.meta.env.VITE_API_URL || '/api').trim();
        const API_BASE = configuredApiBase.startsWith('http')
          ? '/api'
          : configuredApiBase.startsWith('/api')
            ? configuredApiBase
            : '/api';
        // Show activity from ALL users (shared, server-side) — not only the current user
        const params = new URLSearchParams({ limit: 10 });
        const actRes = await fetch(`${API_BASE}/daily-activities/user-timeline?${params}`);
        if (actRes.ok) {
          const actJson = await actRes.json();
          if (actJson.items && Array.isArray(actJson.items)) {
            const formatted = actJson.items.map((item) => ({
              date: formatActivityTime(item.time),
              activity: item.text,
            }));
            setActivityItems(formatted);
          }
        }
      } catch (e) {
        console.error('Failed to load real timeline activities:', e);
      }

      if (due.length > 0) {
        const hasShown = sessionStorage.getItem('cma_dashboard_reminder_shown');
        if (!hasShown) {
          setShowReminderModal(true);
          sessionStorage.setItem('cma_dashboard_reminder_shown', 'true');
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      // trigger entry animations after data loads
      setTimeout(() => setAnimateCounts(true), 120);
    }
  };

  return (
    <div className="cma-page">
      <div className="page-header-banner">
        <div>
          <div className="title">CMA_CCU</div>
          <div className="sub">Management System</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,.7)' }} id="clockDisplay">
          <div>{new Date().toLocaleDateString('en-GB')}</div>
          <div id="clockTimeDisplay">{new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="stats-grid">
        {hasAccess('mc') && (
        <FadeIn delay={50}>
          <div className="stat-card" style={{ border: `1px solid ${theme.border}`, borderRadius: 12 }}>
            <div className="stat-icon si-blue shimmer"><i className="fas fa-building"></i></div>
            <div className="stat-label">MC Records</div>
            <div className={`stat-value ${animateCounts ? 'count-animate' : ''}`}><AnimatedNumber value={stats.mcTotal || stats.mc} /></div>
            <div className="stat-change up"><i className="fas fa-check"></i> {stats.mc} Active MCs</div>
          </div>
        </FadeIn>
        )}
        {hasAccess('mcom') && (
        <FadeIn delay={100}>
          <div className="stat-card" style={{ border: `1px solid ${theme.border}`, borderRadius: 12 }}>
            <div className="stat-icon si-teal shimmer"><i className="fas fa-city"></i></div>
            <div className="stat-label">M.Com Records</div>
            <div className={`stat-value ${animateCounts ? 'count-animate' : ''}`}><AnimatedNumber value={stats.mcom} /></div>
            <div className="stat-change up"><i className="fas fa-arrow-up"></i> Registered</div>
          </div>
        </FadeIn>
        )}
        {hasAccess('cfiles') && (
        <FadeIn delay={150}>
          <div className="stat-card" style={{ border: `1px solid ${theme.border}`, borderRadius: 12 }}>
            <div className="stat-icon si-amber shimmer"><i className="fas fa-folder-open"></i></div>
            <div className="stat-label">C Files</div>
            <div className={`stat-value ${animateCounts ? 'count-animate' : ''}`}><AnimatedNumber value={stats.cfiles} /></div>
            <div className="stat-change up"><i className="fas fa-arrow-up"></i> +5 this week</div>
          </div>
        </FadeIn>
        )}
        {hasAccess('cfiles') && (
        <FadeIn delay={200}>
          <div className="stat-card" style={{ border: `1px solid ${theme.border}`, borderRadius: 12 }}>
            <div className="stat-icon si-orange shimmer"><i className="fas fa-exclamation-circle"></i></div>
            <div className="stat-label">Pending C-Files</div>
            <div
              className={`stat-value ${animateCounts ? 'count-animate' : ''}`}
              style={{ color: stats.pendingCfiles > 5 ? '#dc2626' : '#f59e0b' }}
            ><AnimatedNumber value={stats.pendingCfiles} /></div>
            <div className="stat-change up"><i className="fas fa-arrow-up"></i> 15+ Days Overdue</div>
          </div>
        </FadeIn>
        )}
        {hasAccess('complains') && (
        <FadeIn delay={225}>
          <div className="stat-card" style={{ border: `1px solid ${theme.border}`, borderRadius: 12 }}>
            <div className="stat-icon si-red shimmer"><i className="fas fa-comments"></i></div>
            <div className="stat-label">Complaints</div>
            <div className={`stat-value ${animateCounts ? 'count-animate' : ''}`}><AnimatedNumber value={stats.complaints} /></div>
            <div className="stat-change up"><i className="fas fa-arrow-up"></i> All Records</div>
          </div>
        </FadeIn>
        )}
        {hasAccess('complains') && (
        <FadeIn delay={250}>
          <div className="stat-card complaints-card" style={{ border: `1px solid ${theme.border}`, borderRadius: 12 }}>
            <div className="stat-icon si-red shimmer"><i className="fas fa-comment-dots"></i></div>
            <div className="stat-label">Pending Complaints</div>
            <div
              className={`stat-value ${animateCounts ? 'count-animate' : ''}`}
              style={{ color: stats.pendingComplaints > 5 ? '#dc2626' : '#f59e0b' }}
            ><AnimatedNumber value={stats.pendingComplaints} /></div>
            <div className="stat-change up"><i className="fas fa-arrow-up"></i> Requires Action</div>
          </div>
        </FadeIn>
        )}
      </div>

      {/* PENDING TASKS CARDS */}
      <div className="cma-dashboard-grid dash-pending-grid" style={{ marginBottom: '25px' }}>
        {hasAccess('mc') && (
        <FadeIn delay={300}>
          <div className="dashboard-pending-card mc-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#eef2ff',
                    color: '#1a3a6b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  <i className="fas fa-building"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14.5px', color: '#1a1a2e' }}>MC Management</h3>
                  <span style={{ fontSize: '12px', color: '#5a6478' }}>Pending Tasks</span>
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: stats.pendingMc > 0 ? '#d32f2f' : '#16a34a', marginBottom: '10px' }}>
                <AnimatedNumber value={stats.pendingMc} />
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('cma_mc_filter', 'Pending');
                onNavigate?.('mc');
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f4f6fb',
                color: '#1a3a6b',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#e2e8f0')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
            >
              View Pending Tasks <i className="fas fa-arrow-right" style={{ marginLeft: '5px' }}></i>
            </button>
          </div>
        </FadeIn>
        )}

        {hasAccess('mcom') && (
        <FadeIn delay={325}>
          <div className="dashboard-pending-card mcom-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#e0f2f1',
                    color: '#00796b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  <i className="fas fa-city"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14.5px', color: '#1a1a2e' }}>M.Com Management</h3>
                  <span style={{ fontSize: '12px', color: '#5a6478' }}>Pending Tasks</span>
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: stats.pendingMcom > 0 ? '#d32f2f' : '#16a34a', marginBottom: '10px' }}>
                <AnimatedNumber value={stats.pendingMcom} />
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('cma_mcom_filter', 'Pending');
                onNavigate?.('mcom');
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f4f6fb',
                color: '#00796b',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#e2e8f0')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
            >
              View Pending Tasks <i className="fas fa-arrow-right" style={{ marginLeft: '5px' }}></i>
            </button>
          </div>
        </FadeIn>
        )}

        {hasAccess('cfiles') && (
        <FadeIn delay={350}>
          <div className="dashboard-pending-card cfiles-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#fff3e0',
                    color: '#f57c00',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  <i className="fas fa-folder-open"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14.5px', color: '#1a1a2e' }}>C Files</h3>
                  <span style={{ fontSize: '12px', color: '#5a6478' }}>Pending Tasks {'>'}15 Days</span>
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: stats.pendingCfiles > 0 ? '#d32f2f' : '#16a34a', marginBottom: '10px' }}>
                <AnimatedNumber value={stats.pendingCfiles} />
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('cma_cfiles_filter', 'pending_overdue_15');
                onNavigate?.('cfiles');
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f4f6fb',
                color: '#f57c00',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#e2e8f0')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
            >
              View Pending Tasks <i className="fas fa-arrow-right" style={{ marginLeft: '5px' }}></i>
            </button>
          </div>
        </FadeIn>
        )}

        {hasAccess('complains') && (
        <FadeIn delay={375}>
          <div className="dashboard-pending-card complaints-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  <i className="fas fa-comment-dots"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14.5px', color: '#1a1a2e' }}>Complaints</h3>
                  <span style={{ fontSize: '12px', color: '#5a6478' }}>Pending Tasks {'>'}15 Days</span>
                </div>
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: stats.pendingComplaintsOverdue > 0 ? '#d32f2f' : '#16a34a', marginBottom: '10px' }}>
                <AnimatedNumber value={stats.pendingComplaintsOverdue} />
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem('cma_complaints_filter', 'pending_overdue_15');
                onNavigate?.('complains');
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f4f6fb',
                color: '#dc2626',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#e2e8f0')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#ffffff')}
            >
              View Pending Tasks <i className="fas fa-arrow-right" style={{ marginLeft: '5px' }}></i>
            </button>
          </div>
        </FadeIn>
        )}
      </div>


      <div className="two-col">
        <FadeIn delay={400}>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <span className="card-title">Recent Activity</span>
              <button className="btn btn-link" onClick={() => onNavigate?.('activitylogs')}>View All</button>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 320, overflowY: 'auto' }}>
                {activityItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: '13px' }}>
                    <i className="fas fa-info-circle" style={{ fontSize: '20px', marginBottom: '6px', display: 'block', opacity: 0.5 }} />
                    No recent activities recorded.
                  </div>
                ) : (
                  activityItems.map((item, idx) => (
                    <div key={idx} style={{ paddingBottom: '10px', borderBottom: '1px solid #e0e0e0' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '4px' }}>{item.date}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text2)' }}>{item.activity}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={450}>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-header">
              <span className="card-title">System Summary</span>
            </div>
            <div className="card-body">
              <div className="dash-main-grid" style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ color: '#1976d2' }}><AnimatedNumber value={stats.mc} /></div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Active MCs</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ color: '#d32f2f' }}><AnimatedNumber value={stats.closedCfiles || 0} /></div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Closed Files</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ color: '#f57c00' }}><AnimatedNumber value={stats.pendingComplaints || 0} /></div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Pending</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-value" style={{ color: '#388e3c' }}><AnimatedNumber value={stats.resolvedComplaints || 0} /></div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Resolved</div>
                </div>
              </div>

              <DoughnutChart
                data={[
                  { name: 'Active MCs', value: stats.mc, color: theme.navy },
                  { name: 'Active M.Coms', value: stats.mcom, color: theme.teal },
                  { name: 'Total C-Files', value: stats.cfiles, color: theme.blue },
                  { name: 'Pending Complaints', value: stats.pendingComplaints, color: theme.orange },
                ]}
              />
            </div>
          </div>
        </FadeIn>
      </div>

      <div className="two-col" style={{ marginTop: 24 }}>
        <FadeIn delay={500}>
          <div className="card" style={{ padding: 20, height: '100%' }}>
            <OperationBarChart stats={stats} />
          </div>
        </FadeIn>

        <FadeIn delay={525}>
          <div className="card" style={{ padding: 20, height: '100%' }}>
            <ActiveUsersPanel users={activeUsers} />
          </div>
        </FadeIn>
      </div>

      {/* Due Reminder Alert Modal */}
      {showReminderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 12,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowReminderModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '360px',
              boxShadow: '0 16px 32px rgba(0, 0, 0, 0.18)',
              maxHeight: '72vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              animation: 'slideUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 18px',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '700',
                }}
              >
                <i className="fas fa-bell" style={{ color: '#d97706' }}></i>
                Active Discussion Reminders
              </h3>
              <button
                onClick={() => setShowReminderModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#92400e',
                  lineHeight: 1,
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(217, 119, 6, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '16px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                You have <strong>{reminderDiscussions.length}</strong> discussion meeting(s) with active reminders due today or pending action:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reminderDiscussions.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: '#fefcf6',
                      border: '1.5px solid #fde68a',
                      borderRadius: '12px',
                      padding: '14px',
                      boxShadow: '0 2px 4px rgba(217,119,6,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#d97706',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {d.file_no || 'NO FILE NO.'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          background: '#fff3e0',
                          color: '#e65100',
                          fontWeight: '700',
                        }}
                      >
                        {d.status || 'New'}
                      </span>
                    </div>
                    <h4 style={{ margin: '6px 0 4px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      {d.appointment || 'Untitled Meeting'}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      {d.meeting_date_time && (
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-clock" style={{ fontSize: '11px', color: '#94a3b8' }}></i>
                          <span>{formatDateTime(d.meeting_date_time)}</span>
                        </div>
                      )}
                      {d.venue && (
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-map-marker-alt" style={{ fontSize: '11px', color: '#94a3b8' }}></i>
                          <span>{d.venue}</span>
                        </div>
                      )}
                    </div>
                    {d.reminder_notes && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#78350f',
                          background: '#fef9ec',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          marginTop: '8px',
                          borderLeft: '3px solid #f59e0b',
                        }}
                      >
                        <strong>Notes:</strong> {d.reminder_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <button
                onClick={() => setShowReminderModal(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  localStorage.setItem('cma_discussion_filter', 'New');
                  onNavigate?.('discussion');
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1a3a6b 0%, #102a52 100%)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(26,58,107,0.2)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(26,58,107,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(26,58,107,0.2)';
                }}
              >
                Go to Discussions
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Due Reminder Alert Modal */}
      {showReminderModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 12,
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowReminderModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '360px',
              boxShadow: '0 16px 32px rgba(0, 0, 0, 0.18)',
              maxHeight: '70vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              animation: 'slideUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 18px',
                borderBottom: '1px solid #f1f5f9',
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: '17px',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '700',
                }}
              >
                <i className="fas fa-bell" style={{ color: '#d97706' }}></i>
                Active Discussion Reminders
              </h3>
              <button
                onClick={() => setShowReminderModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#92400e',
                  lineHeight: 1,
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(217, 119, 6, 0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                You have <strong>{reminderDiscussions.length}</strong> discussion meeting(s) with active reminders due today or pending action:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reminderDiscussions.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: '#fefcf6',
                      border: '1.5px solid #fde68a',
                      borderRadius: '12px',
                      padding: '14px',
                      boxShadow: '0 2px 4px rgba(217,119,6,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          color: '#d97706',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {d.file_no || 'NO FILE NO.'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          background: '#fff3e0',
                          color: '#e65100',
                          fontWeight: '700',
                        }}
                      >
                        {d.status || 'New'}
                      </span>
                    </div>
                    <h4 style={{ margin: '6px 0 4px', fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                      {d.appointment || 'Untitled Meeting'}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                      {d.meeting_date_time && (
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-clock" style={{ fontSize: '11px', color: '#94a3b8' }}></i>
                          <span>{formatDateTime(d.meeting_date_time)}</span>
                        </div>
                      )}
                      {d.venue && (
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-map-marker-alt" style={{ fontSize: '11px', color: '#94a3b8' }}></i>
                          <span>{d.venue}</span>
                        </div>
                      )}
                    </div>
                    {d.reminder_notes && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#78350f',
                          background: '#fef9ec',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          marginTop: '8px',
                          borderLeft: '3px solid #f59e0b',
                        }}
                      >
                        <strong>Notes:</strong> {d.reminder_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                borderBottomLeftRadius: '16px',
                borderBottomRightRadius: '16px',
              }}
            >
              <button
                onClick={() => setShowReminderModal(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowReminderModal(false);
                  localStorage.setItem('cma_discussion_filter', 'New');
                  onNavigate?.('discussion');
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1a3a6b 0%, #102a52 100%)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(26,58,107,0.2)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(26,58,107,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(26,58,107,0.2)';
                }}
              >
                Go to Discussions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;