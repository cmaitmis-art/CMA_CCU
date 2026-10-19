import React, { useState, useMemo, useEffect } from 'react';
import '../CMAStyles.css';
import { fetchNotifications, fetchAllNotifications, dismissNotification, undismissNotification } from '../api';

const theme = {
  navy: '#1a3a6b',
  blue: '#2563eb',
  bg: '#f5f6f8',
  card: '#ffffff',
  text: '#1f2937',
  text2: '#5b6472',
  text3: '#8a9099',
  border: '#e2e8f0',
  maroon: '#800000',
  gold: '#c9a84c',
};

// Map database types/categories to UI icons and colors
const getNotificationMeta = (type) => {
  switch (type) {
    case 'success':
      return { icon: 'fa-check-circle', color: '#16a34a' };
    case 'action_required':
      return { icon: 'fa-clock', color: '#f59e0b' };
    case 'alert':
      return { icon: 'fa-exclamation-triangle', color: '#dc2626' };
    default:
      return { icon: 'fa-bell', color: '#3b82f6' };
  }
};

export default function Notifications({ currentUser, onNavigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [showApprovalsOnly, setShowApprovalsOnly] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const dept = String(currentUser?.department || '').trim().toLowerCase();
  const effectiveRole = dept === 'legal' ? 'LEGAL' : dept === 'technical' ? 'TECHNICAL' : currentUser?.role;

  const loadDbNotifications = async (all) => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const fetchFn = all ? fetchAllNotifications : fetchNotifications;
      const res = await fetchFn({ user_id: currentUser.id, role: effectiveRole });
      if (res?.success) {
        setNotifications(res.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDbNotifications(showAll);

    // Re-fetch when new notification arrives via SSE
    const handleNewNotif = () => loadDbNotifications(showAll);
    window.addEventListener('cma:new-notification', handleNewNotif);

    // Re-fetch when dismissed from another component (e.g. popup)
    const handleUpdated = () => loadDbNotifications(showAll);
    window.addEventListener('cma:notifications_updated', handleUpdated);

    // Instantly remove dismissed items from list (no round-trip) — only when not in showAll mode
    const handleDismissed = (e) => {
      if (showAll) return; // keep showing in showAll mode
      const { id, ids } = e.detail || {};
      if (id) setNotifications(prev => prev.filter(n => n.id !== id));
      if (ids && Array.isArray(ids)) setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    };
    window.addEventListener('cma:notification_dismissed', handleDismissed);

    return () => {
      window.removeEventListener('cma:new-notification', handleNewNotif);
      window.removeEventListener('cma:notifications_updated', handleUpdated);
      window.removeEventListener('cma:notification_dismissed', handleDismissed);
    };
  }, [currentUser?.id, currentUser?.role, showAll]);

  // Helper to categorize notifications by Page/Module
  const getNotificationCategory = (n) => {
    const link = String(n.link || '').toLowerCase();
    const title = String(n.title || '').toLowerCase();
    const msg = String(n.message || '').toLowerCase();
    
    if (link.startsWith('mc:') || link === 'mc' || title.includes('management corporation') || msg.includes('management corporation')) {
      return 'MC Management';
    }
    if (link.startsWith('mcom:') || link === 'mcom' || title.includes('m.com') || title.includes('mcom')) {
      return 'M.Com Management';
    }
    if (link.startsWith('discussion') || link === 'discussion' || title.includes('discussion') || title.includes('meeting')) {
      return 'Discussions';
    }
    return 'General';
  };

  // Helper to detect if a notification is an approval request
  const isApprovalNotification = (n) => {
    const title = String(n.title || '').toLowerCase();
    const msg = String(n.message || '').toLowerCase();
    const link = String(n.link || '').toLowerCase();
    
    return title.includes('pending approval') ||
           title.includes('awaiting approval') ||
           title.includes('new renewal') ||
           msg.includes('review and approve') ||
           link.includes('approval');
  };

  // Active pending approvals count
  const pendingApprovalsCount = useMemo(() => {
    return notifications.filter(isApprovalNotification).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // 1. Search term match
      const matchesSearch = (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.message || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Module Category match
      const category = getNotificationCategory(n);
      const matchesCategory = filterCategory === 'All' || category === filterCategory;
      
      // 3. Date match
      const matchesDate = !filterDate || (n.created_at || '').startsWith(filterDate);
      
      // 4. Approvals Only match
      const matchesApprovals = !showApprovalsOnly || isApprovalNotification(n);
      
      return matchesSearch && matchesCategory && matchesDate && matchesApprovals;
    });
  }, [notifications, searchTerm, filterCategory, filterDate, showApprovalsOnly]);

  const handleMarkAsRead = async (id) => {
    if (currentUser?.id) {
      // Optimistic state update
      setNotifications(prev => prev.filter(n => n.id !== id));
      try {
        await dismissNotification(id, currentUser.id);
        window.dispatchEvent(new CustomEvent('cma:notification_dismissed', { detail: { id } }));
        window.dispatchEvent(new Event('cma:notifications_updated'));
      } catch (err) {
        console.error('Failed to dismiss notification:', err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const undismissed = filteredNotifications.filter(n => !n.dismissed);
    if (currentUser?.id && undismissed.length > 0) {
      const idsToDismiss = undismissed.map(n => n.id);
      if (!showAll) setNotifications(prev => prev.filter(n => !idsToDismiss.includes(n.id)));
      else setNotifications(prev => prev.map(n => idsToDismiss.includes(n.id) ? { ...n, dismissed: true } : n));
      try {
        await Promise.all(idsToDismiss.map(id => dismissNotification(id, currentUser.id)));
        window.dispatchEvent(new CustomEvent('cma:notification_dismissed', { detail: { ids: idsToDismiss } }));
        window.dispatchEvent(new Event('cma:notifications_updated'));
      } catch (err) {
        console.error('Failed to dismiss all notifications:', err);
      }
    }
  };

  const handleRestore = async (id) => {
    if (!currentUser?.id) return;
    // Optimistic: mark as not dismissed
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: false } : n));
    try {
      await undismissNotification(id, currentUser.id);
      window.dispatchEvent(new Event('cma:notifications_updated'));
    } catch (err) {
      console.error('Failed to restore notification:', err);
      // Revert
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
    }
  };

  const handleView = (notif) => {
    handleMarkAsRead(notif.id);

    const openMcRow = (mcId) => {
      if (!mcId) return false;
      try {
        sessionStorage.setItem('cma_open_mc_id', String(mcId));
      } catch (e) { }
      window.dispatchEvent(new CustomEvent('cma:open-mc-id', { detail: String(mcId) }));
      if (onNavigate) onNavigate('mc');
      return true;
    };

    if (typeof notif.link === 'string') {
      let targetLink = notif.link;
      if (targetLink === '/mc-renewal-approval') targetLink = 'renewal_approval';
      if (targetLink === '/mc-management') targetLink = 'mc';

      if (targetLink === 'mc') {
        if (onNavigate) onNavigate('mc');
        return;
      }
      if (targetLink.startsWith('mc-renewal:')) {
        const id = targetLink.split(':')[1];
        if (id) {
          try { sessionStorage.setItem('cma_open_mc_renewal_id', String(id)); } catch (e) { }
          window.dispatchEvent(new CustomEvent('cma:open-mc-renewal', { detail: String(id) }));
          if (onNavigate) onNavigate('mc');
          return;
        }
      }
      if (targetLink.startsWith('mcom-renewal:')) {
        const id = targetLink.split(':')[1];
        if (id) {
          try { sessionStorage.setItem('cma_open_mcom_renewal_id', String(id)); } catch (e) { }
          window.dispatchEvent(new CustomEvent('cma:open-mcom-renewal', { detail: String(id) }));
          if (onNavigate) onNavigate('mcom');
          return;
        }
      }
      if (targetLink.startsWith('mc:')) {
        const id = targetLink.split(':')[1];
        if (id === 'pending') {
          try { sessionStorage.removeItem('cma_open_mc_id'); } catch (e) { }
          window.dispatchEvent(new CustomEvent('cma:filter-mc', { detail: 'Pending' }));
          if (onNavigate) onNavigate('mc');
          return;
        }
        if (id) return openMcRow(id);
      }
      if (targetLink.startsWith('mcom:')) {
        const id = targetLink.split(':')[1];
        if (id === 'pending') {
          try { sessionStorage.removeItem('cma_open_mcom_id'); } catch (e) { }
          window.dispatchEvent(new CustomEvent('cma:filter-mcom', { detail: 'Pending' }));
          if (onNavigate) onNavigate('mcom');
          return;
        }
        if (id) {
          try { sessionStorage.setItem('cma_open_mcom_id', String(id)); } catch (e) { }
          window.dispatchEvent(new CustomEvent('cma:open-mcom-id', { detail: String(id) }));
          if (onNavigate) onNavigate('mcom');
          return;
        }
      }
      if (targetLink.startsWith('renewal_approval:')) {
        const refNo = targetLink.split(':')[1];
        if (refNo) {
          try { sessionStorage.setItem('cma_open_renewal_ref', refNo); } catch (e) { }
          window.dispatchEvent(new CustomEvent('cma:open-renewal-ref', { detail: refNo }));
          if (onNavigate) onNavigate('renewal_approval');
          return;
        }
      }
      if (targetLink.startsWith('cfiles:')) {
        const id = targetLink.split(':')[1];
        if (id) {
          try { sessionStorage.setItem('cma_open_cfile_id', String(id)); } catch (e) { }
          window.dispatchEvent(new CustomEvent('cma:open-cfile-id', { detail: String(id) }));
          if (onNavigate) onNavigate('cfiles');
          return;
        }
      }
      if (targetLink.startsWith('complains:')) {
        const id = targetLink.split(':')[1];
        if (id) {
          try { sessionStorage.setItem('cma_open_complaint_id', String(id)); } catch (e) { }
          window.dispatchEvent(new CustomEvent('cma:open-complaint-id', { detail: String(id) }));
          if (onNavigate) onNavigate('complains');
          return;
        }
      }
      if (onNavigate) {
        onNavigate(targetLink);
      }
    }
  };

  const unreadCount = filteredNotifications.length;

  return (
    <div style={{ padding: 20, fontFamily: "var(--font-sans)", background: theme.bg, minHeight: '100vh' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
        <span>Home</span> / <span>Notifications</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, margin: 0, color: theme.text }}>
            System Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: 12, fontSize: 12, background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 999, verticalAlign: 'middle' }}>
                {unreadCount} Active
              </span>
            )}
          </h2>
          <p style={{ color: theme.text3, fontSize: 13, margin: '4px 0 0 0' }}>Stay updated with recent activities, approvals, and messages.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle: Active / Show All */}
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6,
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              border: showAll ? '1px solid #bae6fd' : `1px solid ${theme.border}`,
              background: showAll ? '#e0f2fe' : '#fff',
              color: showAll ? '#0369a1' : theme.text2,
              transition: 'all 0.2s'
            }}
          >
            <i className={`fas ${showAll ? 'fa-eye' : 'fa-eye-slash'}`} />
            {showAll ? 'Showing All' : 'Show All'}
          </button>
          <button
            onClick={handleMarkAllAsRead}
            disabled={(showAll ? filteredNotifications.filter(n => !n.dismissed).length : unreadCount) <= 0 || loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6,
              fontSize: 12.5, fontWeight: 600,
              cursor: (showAll ? filteredNotifications.filter(n => !n.dismissed).length : unreadCount) <= 0 ? 'not-allowed' : 'pointer',
              border: `1px solid ${theme.border}`,
              background: '#fff',
              color: (showAll ? filteredNotifications.filter(n => !n.dismissed).length : unreadCount) <= 0 ? theme.text3 : theme.blue,
              opacity: (showAll ? filteredNotifications.filter(n => !n.dismissed).length : unreadCount) <= 0 ? 0.6 : 1
            }}
          >
            <i className="fas fa-check-double" /> Dismiss All
          </button>
        </div>
      </div>

      {/* Filters & Search Container */}
      <div style={{ background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}`, padding: '16px 20px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,.03)' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: 13 }}></i>
          <input
            id="searchNotifications"
            name="searchNotifications"
            aria-label="Search notifications"
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px 12px 8px 32px', height: 36, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }}
            onFocus={(e) => e.target.style.borderColor = theme.blue}
            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
          />
        </div>

        <div style={{ width: '1px', height: 24, background: theme.border, display: 'none' }} className="hide-on-mobile"></div>

        {/* Page/Module Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 180px', minWidth: 160 }}>
          <label htmlFor="pageFilter" style={{ fontSize: 12, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}><i className="fas fa-layer-group" style={{ marginRight: 4 }} /> Page:</label>
          <select
            id="pageFilter"
            name="pageFilter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '6px 10px', height: 36, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, flex: 1, outline: 'none', cursor: 'pointer', background: '#fff' }}
          >
            <option value="All">All Pages</option>
            <option value="MC Management">MC Management</option>
            <option value="M.Com Management">M.Com Management</option>
            <option value="Discussions">Discussions</option>
            <option value="General">General</option>
          </select>
        </div>

        {/* Approvals Filter Toggle Button */}
        <button
          onClick={() => setShowApprovalsOnly(!showApprovalsOnly)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            height: 36,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: showApprovalsOnly ? '1px solid #fed7aa' : `1px solid ${theme.border}`,
            background: showApprovalsOnly ? '#fff7ed' : '#fff',
            color: showApprovalsOnly ? '#ea580c' : theme.text2,
            transition: 'all 0.2s ease',
            boxShadow: showApprovalsOnly ? '0 1px 2px rgba(234, 88, 12, 0.05)' : 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-clipboard-check" style={{ color: showApprovalsOnly ? '#ea580c' : '#94a3b8' }} />
          Awaiting Approval
          {pendingApprovalsCount > 0 && (
            <span style={{
              marginLeft: 4,
              background: showApprovalsOnly ? '#ea580c' : '#94a3b8',
              color: '#fff',
              padding: '1px 6px',
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 700
            }}>
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        {/* Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 150px' }}>
          <label htmlFor="dateFilter" style={{ fontSize: 12, fontWeight: 600, color: theme.text2, whiteSpace: 'nowrap' }}><i className="far fa-calendar-alt" style={{ marginRight: 4 }} /> Date:</label>
          <input
            id="dateFilter"
            name="dateFilter"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ padding: '6px 10px', height: 36, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, flex: 1, outline: 'none', cursor: 'pointer', background: '#fff' }}
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}
              title="Clear Date"
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading && filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.text3 }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginRight: 8 }} /> Loading...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: theme.card, borderRadius: 12, border: `1px dashed ${theme.border}`, color: theme.text3 }}>
            <i className="fas fa-bell-slash" style={{ fontSize: 32, marginBottom: 12, color: '#cbd5e1' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text2 }}>No notifications found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>All caught up! New events will show up here.</div>
          </div>
        ) : (
          filteredNotifications.map(n => {
            const meta = getNotificationMeta(n.type);
            return (
              <div
                key={n.id}
                onClick={() => !n.dismissed && handleView(n)}
                style={{
                  background: n.dismissed ? '#f8fafc' : '#fff',
                  borderRadius: 12,
                  border: `1px solid ${n.dismissed ? '#e2e8f0' : theme.border}`,
                  padding: '16px 20px',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                  cursor: n.dismissed ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,.02)',
                  position: 'relative',
                  opacity: n.dismissed ? 0.65 : 1,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: `${meta.color}15`,
                  color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
                }}>
                  <i className={`fas ${meta.icon}`} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: theme.navy }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: theme.text3, whiteSpace: 'nowrap' }}>
                      <i className="far fa-clock" style={{ marginRight: 4 }} />
                      {new Date(n.created_at || n.date).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, marginBottom: 8 }}>
                    {n.message}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, color: theme.text3, textTransform: 'uppercase', letterSpacing: '.5px', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                      {getNotificationCategory(n)}
                    </div>
                    {n.dismissed && (
                      <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: 4 }}>
                        <i className="fas fa-check" style={{ marginRight: 4, fontSize: 9 }} />Dismissed
                      </span>
                    )}
                  </div>
                </div>
                {n.dismissed ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRestore(n.id); }}
                    title="Restore"
                    style={{ background: 'none', border: '1px solid #bae6fd', borderRadius: 6, color: '#0369a1', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '3px 8px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <i className="fas fa-undo" style={{ fontSize: 10 }} /> Restore
                  </button>
                ) : (
                  <button
                    className="popup-alert-close"
                    onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n.id); }}
                    title="Dismiss"
                    style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14 }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
