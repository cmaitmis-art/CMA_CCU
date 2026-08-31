import { useState, useEffect, useRef } from 'react';
import { fetchNotifications, dismissNotification } from '../api';
import './PopupAlerts.css';

/**
 * PopupAlerts — Role-aware, per-user, database-backed notification popups.
 *
 * Dismiss state is stored in the database (notification_reads table),
 * NOT in localStorage. This means:
 *  - Each user has their own dismiss state globally
 *  - Closing a notification on one device dismisses it on all devices
 *  - Switching users on the same browser shows the correct alerts for each user
 */
export default function PopupAlerts({ currentUser, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  // Track locally-dismissed IDs in this session to avoid re-showing before next poll
  const localDismissed = useRef(new Set());

  const userId = currentUser?.id;
  const userRole = currentUser?.role;
  const dept = String(currentUser?.department || '').trim().toLowerCase();
  const effectiveRole = dept === 'legal' ? 'LEGAL' : dept === 'technical' ? 'TECHNICAL' : userRole;
  const configuredApiBase = (import.meta.env.VITE_API_URL || '/api').trim();
  const apiBase = configuredApiBase.startsWith('http')
    ? '/api'
    : configuredApiBase.startsWith('/api')
      ? configuredApiBase
      : '/api';

  // ── Establish Real-Time SSE connection and load initial notifications ──
  useEffect(() => {
    if (!userId) return;

    async function loadNotifications() {
      try {
        const res = await fetchNotifications({ user_id: userId, role: effectiveRole });
        if (res?.success) {
          const active = (res.notifications || []).filter(
            (n) => !localDismissed.current.has(n.id) && n.title !== 'Discussion Reminder'
          );
          setNotifications(active);
        }
      } catch (err) { }
    }
    // loadNotifications(); // Disabled to prevent showing backlog popups on page load

    const sseUrl = `${apiBase}/notifications/stream`;
    const sse = new EventSource(sseUrl);

    sse.onmessage = (e) => {
      try {
        const n = JSON.parse(e.data);
        if (!n || !n.id) return;
        if (localDismissed.current.has(n.id)) return;

        // Emit event so Sidebar and Notifications page can update
        window.dispatchEvent(new CustomEvent('cma:new-notification', { detail: n }));

        // Role check for popup display: only show if broadcast (no target_role) or role matches (Admin sees all)
        if (n.target_role && effectiveRole &&
          String(effectiveRole).toUpperCase() !== 'ADMIN' &&
          String(n.target_role).toUpperCase() !== String(effectiveRole).toUpperCase()) return;

        if (n.title === 'Discussion Reminder') return;

        setNotifications((prev) => {
          if (prev.some((p) => String(p.id) === String(n.id))) return prev;
          return [...prev, n];
        });

        // Auto-refresh logic for MC lists when approval notifications arrive
        const link = typeof n.link === 'string' ? n.link : '';
        if (link === 'mc' || link.startsWith('mc:')) {
          window.dispatchEvent(new CustomEvent('cma:refresh-mc'));
        }
      } catch (err) {
        console.error('SSE Error parsing notification', err);
      }
    };

    sse.onerror = (err) => {
      // Reconnect handled automatically by EventSource
    };

    return () => sse.close();
  }, [userId, userRole]);

  // ── Listen for notifications dispatched in-process (immediate, same session) ──
  useEffect(() => {
    function handleNewNotification(e) {
      const n = e?.detail;
      if (!n) return;
      if (localDismissed.current.has(n.id)) return;
      // Role check: only show if broadcast (no target_role) or role matches
      if (n.target_role && userRole &&
        String(n.target_role).toUpperCase() !== String(userRole).toUpperCase()) return;
      setNotifications((prev) => {
        if (prev.some((p) => String(p.id) === String(n.id))) return prev;
        return [...prev, n];
      });
    }
    window.addEventListener('cma:new-notification', handleNewNotification);
    return () => window.removeEventListener('cma:new-notification', handleNewNotification);
  }, [userRole]);

  // ── Auto-refresh MC list when an approval notification arrives ──
  useEffect(() => {
    function handleNewNotification(e) {
      const n = e?.detail;
      if (!n) return;
      const link = typeof n.link === 'string' ? n.link : '';
      if (link === 'mc' || link.startsWith('mc:')) {
        // Trigger MC page to refresh its data
        window.dispatchEvent(new CustomEvent('cma:refresh-mc'));
      }
    }
    window.addEventListener('cma:new-notification', handleNewNotification);
    return () => window.removeEventListener('cma:new-notification', handleNewNotification);
  }, []);
  // ── Listen for notification dismiss/read updates from other components ──
  useEffect(() => {
    const handleNotificationDismissed = (e) => {
      const { id, ids } = e.detail || {};
      if (id) {
        localDismissed.current.add(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
      if (ids && Array.isArray(ids)) {
        ids.forEach(x => localDismissed.current.add(x));
        setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      }
    };
    window.addEventListener('cma:notification_dismissed', handleNotificationDismissed);
    return () => window.removeEventListener('cma:notification_dismissed', handleNotificationDismissed);
  }, []);

  // ── Dismiss a notification — stores in DB, removes from view instantly ──
  const handleDismiss = async (id) => {
    // Immediately hide from UI (optimistic update)
    localDismissed.current.add(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // Persist to database so it's dismissed for this user everywhere
    if (userId) {
      try {
        await dismissNotification(id, userId);
        window.dispatchEvent(new CustomEvent('cma:notification_dismissed', { detail: { id } }));
        window.dispatchEvent(new Event('cma:notifications_updated'));
      } catch (err) {
        console.error('Failed to persist notification dismiss:', err);
        // Non-fatal: still hidden in UI for this session
      }
    }
  };

  // ── View navigates to the linked page and dismisses ──
  const handleView = (notif) => {
    handleDismiss(notif.id);

    const openMcRow = (mcId) => {
      if (!mcId) return false;
      try {
        sessionStorage.setItem('cma_open_mc_id', String(mcId));
      } catch (e) {
        // ignore storage errors
      }
      window.dispatchEvent(new CustomEvent('cma:open-mc-id', { detail: String(mcId) }));
      if (onNavigate) onNavigate('mc');
      return true;
    };

    if (typeof notif.link === 'string') {
      // Backward compatibility for old database notifications
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
          try {
            sessionStorage.removeItem('cma_open_mc_id'); // ensure we don't open a specific record
          } catch (e) { /* ignore */ }
          window.dispatchEvent(new CustomEvent('cma:filter-mc', { detail: 'Pending' }));
          if (onNavigate) onNavigate('mc');
          return;
        }
        if (id) return openMcRow(id);
      }
      if (targetLink.startsWith('mcom:')) {
        const id = targetLink.split(':')[1];
        if (id === 'pending') {
          try {
            sessionStorage.removeItem('cma_open_mcom_id');
          } catch (e) { /* ignore */ }
          window.dispatchEvent(new CustomEvent('cma:filter-mcom', { detail: 'Pending' }));
          if (onNavigate) onNavigate('mcom');
          return;
        }
        if (id) {
          try {
            sessionStorage.setItem('cma_open_mcom_id', String(id));
          } catch (e) { /* ignore */ }
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
      if (onNavigate) {
        onNavigate(targetLink);
      }
    }
  };

  const userDept = String(currentUser?.department || '').toUpperCase();

  if (!notifications.length) return null;

  return (
    <div className="popup-alerts-container">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`popup-alert-row popup-${notif.type || 'info'} ${notif.type === 'mc' || notif.link === 'mc' ? 'pulse' : ''}`}
        >
          <i className="fas fa-bell row-icon"></i>
          <div className="popup-alert-text">
            <span className="popup-alert-title">{notif.title}</span>
            <span className="popup-alert-message">{notif.message}</span>
          </div>
          {notif.link && (
            <button className="popup-view-btn" onClick={() => handleView(notif)}>
              View
            </button>
          )}
          <button className="popup-alert-close" onClick={() => handleDismiss(notif.id)} title="Close">
            <i className="fas fa-times"></i>
          </button>
        </div>
      ))}
    </div>
  );
}
