import React, { useState, useMemo, useEffect, useCallback } from 'react';
import '../CMAStyles.css';
import { useAutoRefresh } from '../utils/useAutoRefresh';
const THEME = {
  navy: '#1a3a6b',
  border: '#e2e8f0',
  text: '#1a1a2e',
  text2: '#5a6478',
  text3: '#94a0b4',
  blue: '#2563eb',
  orange: '#ea580c',
  teal: '#0d9488',
  bg: '#f5f7fa',
};

function extractUserAndRole(fullStr) {
  if (!fullStr) return { name: '—', role: '—' };
  const match = fullStr.match(/^(.*?)(?:\s*\((.*?)\))?$/);
  return {
    name: match[1] ? match[1].trim() : fullStr,
    role: match[2] ? match[2].toUpperCase() : '—'
  };
}

// Get proper initials from a name string (up to 2 letters)
function getInitials(name) {
  if (!name) return '—';
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase() || name.charAt(0).toUpperCase();
}

// Avatar background colors based on first letter
const AVATAR_COLORS = [
  '#1a3a6b', '#2563eb', '#0d9488', '#ea580c', '#7c3aed',
  '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2',
];

function getAvatarColor(name) {
  const char = (name || '').charCodeAt(0) || 0;
  return AVATAR_COLORS[char % AVATAR_COLORS.length];
}

// ─────────────────────────────────────────────────────────
// NEW: 3D-style animated monthly bar chart. Each bar is built
// from three faces (front / top / side) using CSS skew/perspective
// transforms to fake an isometric 3D box. Bars grow in with a
// staggered ease, tilt slightly more + brighten on hover, and the
// whole chart can be clicked to replay the grow-in animation.
// ─────────────────────────────────────────────────────────
function MonthlyWorkChart({ monthlyStats, maxCount, isLoading }) {
  const [grown, setGrown] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const BAR_W = 26;
  const DEPTH = 9;

  useEffect(() => {
    setGrown(false);
    const t = setTimeout(() => setGrown(true), 100);
    return () => clearTimeout(t);
  }, [monthlyStats]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: THEME.text, letterSpacing: '-0.2px' }}>
          Monthly Work Chart
        </div>
      </div>

      {isLoading ? (
        <div style={{ color: THEME.text3, fontSize: '12px', textAlign: 'center', paddingTop: '20px' }}>
          Loading…
        </div>
      ) : monthlyStats.length === 0 ? (
        <div style={{ color: THEME.text3, fontSize: '12px', textAlign: 'center', paddingTop: '20px' }}>
          No data
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              height: '170px',
              gap: '14px',
              padding: '40px 16px 8px 6px',
              borderRadius: '10px',
              background: 'linear-gradient(180deg, #eef2f9 0%, #dfe6f0 100%)',
              border: `1px solid ${THEME.border}`,
              boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.05)',
              overflowX: 'auto',
              overflowY: 'visible',
              position: 'relative',
              boxSizing: 'content-box',
            }}
          >
            {/* Faint horizontal guide lines */}
            {[0.25, 0.5, 0.75].map((r) => (
              <div
                key={r}
                style={{
                  position: 'absolute',
                  left: 6,
                  right: 16,
                  bottom: `${8 + r * 130}px`,
                  borderTop: '1px dashed #ccd5e3',
                  pointerEvents: 'none',
                }}
              />
            ))}

            {monthlyStats.map((stat, idx) => {
              const h = Math.max((stat.count / maxCount) * 128, 6);
              const isHovered = hoveredIdx === idx;
              const lift = isHovered ? -4 : 0;

              return (
                <div
                  key={stat.label}
                  onMouseEnter={(e) => { e.stopPropagation(); setHoveredIdx(idx); }}
                  onMouseLeave={(e) => { e.stopPropagation(); setHoveredIdx(null); }}
                  style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    height: '100%',
                    gap: '6px',
                    position: 'relative',
                    zIndex: isHovered ? 2 : 1,
                  }}
                >
                  {/* Floating tooltip */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: `calc(${h}px + ${DEPTH}px + 22px)`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: THEME.navy,
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 10px rgba(26,58,107,0.3)',
                        animation: 'chartTooltipIn 0.15s ease-out',
                        zIndex: 3,
                      }}
                    >
                      {stat.label}: {stat.count}
                    </div>
                  )}

                  <span
                    style={{
                      fontSize: '10px',
                      color: isHovered ? THEME.navy : THEME.text2,
                      fontWeight: '700',
                      opacity: grown ? 1 : 0,
                      transform: grown ? 'translateY(0)' : 'translateY(6px)',
                      transition: `opacity 0.35s ease ${idx * 0.06 + 0.35}s, transform 0.35s ease ${idx * 0.06 + 0.35}s, color 0.15s`,
                    }}
                  >
                    {stat.count}
                  </span>

                  {/* ── 3D box ──────────────────────── */}
                  <div
                    style={{
                      position: 'relative',
                      width: `${BAR_W}px`,
                      height: grown ? `${h}px` : '0px',
                      marginRight: `${DEPTH}px`,
                      transform: `translateY(${lift}px)`,
                      transition: `height 0.7s cubic-bezier(0.34,1.35,0.64,1) ${idx * 0.06}s, transform 0.2s ease`,
                    }}
                  >
                    {/* front face */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        bottom: 0,
                        width: `${BAR_W}px`,
                        height: '100%',
                        background: isHovered
                          ? `linear-gradient(180deg, #7db2ff 0%, ${THEME.blue} 55%, ${THEME.navy} 100%)`
                          : `linear-gradient(180deg, #5b93ea 0%, ${THEME.blue} 55%, ${THEME.navy} 100%)`,
                        borderRadius: '2px 0 0 0',
                        boxShadow: isHovered ? `0 6px 14px ${THEME.blue}55` : '0 2px 6px rgba(37,99,235,0.15)',
                        transition: 'background 0.2s ease, box-shadow 0.2s ease',
                      }}
                    />
                    {/* top face */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: `-${DEPTH}px`,
                        width: `${BAR_W}px`,
                        height: `${DEPTH}px`,
                        background: isHovered ? '#bcd6ff' : '#a9c6f5',
                        transform: 'skewX(-45deg)',
                        transformOrigin: 'bottom left',
                        borderRadius: '2px 2px 0 0',
                        transition: 'background 0.2s ease',
                      }}
                    />
                    {/* side face */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: `${BAR_W}px`,
                        width: `${DEPTH}px`,
                        height: '100%',
                        background: isHovered ? THEME.navy : '#152f57',
                        transform: 'skewY(-45deg)',
                        transformOrigin: 'top left',
                        transition: 'background 0.2s ease',
                      }}
                    />
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      color: isHovered ? THEME.navy : THEME.text3,
                      fontWeight: isHovered ? '700' : '500',
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                      transition: 'color 0.15s, font-weight 0.15s',
                    }}
                  >
                    {stat.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '11px', color: THEME.text3, textAlign: 'center', marginTop: '8px' }}>
            Activities per month · click chart to replay
          </div>
        </>
      )}
    </>
  );
}

export default function ActivityLogs({ onClose }) {
  const [logsData, setLogsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState('All Users');
  const [refreshTick, setRefreshTick] = useState(0);

  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const fetchLogsAndUsers = async () => {
      try {
        setIsLoading(true);
        const API_BASE = (import.meta.env.VITE_API_URL || '/api').trim();

        const [resLogs, resUsers] = await Promise.all([
          fetch(`${API_BASE}/daily-activities/user-timeline?limit=1000`),
          fetch(`${API_BASE}/users`)
        ]);

        if (resLogs.ok) {
          const json = await resLogs.json();
          if (json.items && Array.isArray(json.items)) {
            const mappedLogs = json.items.map((item, index) => ({
              id: item.id || `log-${index}`,
              date: item.time,
              user: item.user || 'System',
              action: item.action || item.text,
            }));
            setLogsData(mappedLogs);
          }
        }

        if (resUsers.ok) {
          const users = await resUsers.json();
          setAllUsers(users);
        }
      } catch (err) {
        console.error('Failed to fetch:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogsAndUsers();

    // Close modal on Escape key
    const handleEsc = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose, refreshTick]);

  // Auto-refresh every 30 seconds
  const triggerRefresh = useCallback(() => setRefreshTick(t => t + 1), []);
  useAutoRefresh(triggerRefresh, 30000);

  const uniqueUsers = useMemo(() => {
    const usersSet = new Set(logsData.map((log) => log.user));
    allUsers.forEach(u => {
      if (u.name) {
        const role = (u.role || '').toLowerCase();
        usersSet.add(`${u.name}${role ? ` (${role})` : ''}`);
      }
    });
    return ['All Users', ...Array.from(usersSet)];
  }, [logsData, allUsers]);

  const filteredLogs = useMemo(() => {
    let logs = [...logsData];
    if (userFilter !== 'All Users') {
      logs = logs.filter((log) => log.user === userFilter);
    }
    if (dateFilter) {
      if (dateFilter.length === 10) {
        const [y, m, d] = dateFilter.split('-');
        logs = logs.filter((log) => {
          const logDate = new Date(log.date);
          return logDate.getFullYear() === parseInt(y, 10) &&
            logDate.getMonth() + 1 === parseInt(m, 10) &&
            logDate.getDate() === parseInt(d, 10);
        });
      }
    }
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [dateFilter, userFilter, logsData]);

  const monthlyStats = useMemo(() => {
    const stats = {};
    logsData.forEach((log) => {
      if (userFilter !== 'All Users' && log.user !== userFilter) return;
      const date = new Date(log.date);
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      stats[monthYear] = (stats[monthYear] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => new Date(`1 ${a.label}`) - new Date(`1 ${b.label}`));
  }, [userFilter, logsData]);

  const maxCount = Math.max(...monthlyStats.map((s) => s.count), 1);

  const isModal = !!onClose;

  const innerContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: "var(--font-sans)",
        background: '#fff',
        borderRadius: isModal ? '16px' : 0,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes chartTooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px) }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) }
        }
      `}</style>
      {/* ── Header ────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${THEME.border}`,
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `${THEME.navy}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fas fa-history" style={{ color: THEME.navy, fontSize: '15px' }} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '700',
                  color: THEME.text,
                  letterSpacing: '-0.3px',
                  lineHeight: 1.2,
                }}
              >
                Activity Logs
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: THEME.text3, marginTop: '2px' }}>
                All system activities and user workload
              </p>
            </div>
          </div>
        </div>

        {isModal && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: `1px solid ${THEME.border}`,
              background: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: THEME.text2,
              transition: 'background 0.15s, color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = THEME.text2;
            }}
          >
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      {/* ── Filters ───────────────────────────── */}
      <div
        style={{
          padding: '14px 24px',
          borderBottom: `1px solid ${THEME.border}`,
          background: '#f8fafc',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          flexShrink: 0,
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '600',
              color: THEME.text3,
              marginBottom: '5px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Date Range
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ minWidth: '140px', fontSize: '13px' }}
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="btn btn-outline"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                title="Clear date filter"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '600',
              color: THEME.text3,
              marginBottom: '5px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            User
          </label>
          <select
            className="form-control"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            style={{ minWidth: '200px', fontSize: '13px' }}
          >
            {uniqueUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
          <span
            style={{
              fontSize: '12px',
              color: THEME.navy,
              background: `${THEME.navy}12`,
              padding: '5px 12px',
              borderRadius: '20px',
              fontWeight: '600',
            }}
          >
            {filteredLogs.length} Records
          </span>
        </div>
      </div>

      {/* ── Body ──────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Chart panel */}
        <div
          style={{
            borderRight: `1px solid ${THEME.border}`,
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#fafbfc',
          }}
        >
          <MonthlyWorkChart monthlyStats={monthlyStats} maxCount={maxCount} isLoading={isLoading} />
        </div>

        {/* Table panel */}
        <div style={{ overflow: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: THEME.text3 }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px', display: 'block' }} />
              Loading activity logs…
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: THEME.text3 }}>
              <i className="fas fa-inbox" style={{ fontSize: '28px', marginBottom: '12px', display: 'block', opacity: 0.4 }} />
              No activities found
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: `2px solid ${THEME.border}`,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <th
                    style={{
                      padding: '11px 16px',
                      color: THEME.text3,
                      fontWeight: '600',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Date & Time
                  </th>
                  <th
                    style={{
                      padding: '11px 16px',
                      color: THEME.text3,
                      fontWeight: '600',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      textAlign: 'left',
                    }}
                  >
                    User
                  </th>
                  <th
                    style={{
                      padding: '11px 16px',
                      color: THEME.text3,
                      fontWeight: '600',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      textAlign: 'left',
                    }}
                  >
                    Job Role
                  </th>
                  <th
                    style={{
                      padding: '11px 16px',
                      color: THEME.text3,
                      fontWeight: '600',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      textAlign: 'left',
                    }}
                  >
                    Activity
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: `1px solid ${THEME.border}`,
                      background: idx % 2 === 0 ? '#fff' : '#fafbfc',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = `${THEME.navy}06`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafbfc')}
                  >
                    <td
                      style={{
                        padding: '11px 16px',
                        color: THEME.text3,
                        whiteSpace: 'nowrap',
                        fontSize: '12px',
                      }}
                    >
                      {log.date
                        ? new Date(log.date).toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                        : '—'}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span
                        style={{
                          color: THEME.text2,
                          fontWeight: '500',
                          fontSize: '13px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserFilter(log.user);
                        }}
                        title={`Filter by ${log.user}`}
                      >
                        {extractUserAndRole(log.user).name}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', color: THEME.text2, fontSize: '12px', fontWeight: '500' }}>
                      {extractUserAndRole(log.user).role}
                    </td>
                    <td style={{ padding: '11px 16px', color: THEME.text2, fontSize: '13px' }}>
                      {log.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // ── Modal / popup mode (when onClose prop passed) ──
  if (isModal) {
    return (
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(10,20,50,0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          animation: 'fadeInOverlay 0.18s ease',
        }}
      >
        <style>{`
          @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideInModal {
            from { transform: translateY(24px) scale(0.97); opacity: 0 }
            to   { transform: translateY(0) scale(1); opacity: 1 }
          }
        `}</style>
        <div
          style={{
            width: '100%',
            maxWidth: '1100px',
            height: '82vh',
            maxHeight: '780px',
            borderRadius: '16px',
            boxShadow: '0 32px 80px rgba(10,20,50,0.28), 0 8px 24px rgba(10,20,50,0.14)',
            overflow: 'hidden',
            animation: 'slideInModal 0.22s cubic-bezier(0.34,1.2,0.64,1)',
          }}
        >
          {innerContent}
        </div>
      </div>
    );
  }

  // ── Standalone page mode (no onClose) ──
  return (
    <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
      {innerContent}
    </div>
  );
}