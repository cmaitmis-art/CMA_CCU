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
  const configuredApiBase = (import.meta.env.VITE_API_URL || '/api').trim();
  const apiBase = configuredApiBase.startsWith('http')
    ? '/api'
    : configuredApiBase.startsWith('/api')
      ? configuredApiBase
      : '/api';

  // ── Load notifications from server (server handles role + dismiss filtering) ──
  useEffect(() => {
    if (!userId) return;

    async function loadNotifications() {
      try {
        const res = await fetchNotifications({ user_id: userId, role: userRole });
        if (res?.success) {
          // Also filter out any that were dismissed in this session (instant UX)
          const active = (res.notifications || []).filter(
            (n) => !localDismissed.current.has(n.id)
          );
          setNotifications(active);
        }
      } catch (err) {
        // Silently ignore background polling errors (e.g. during dev server restarts)
        // to prevent console clutter.
      }
    }

    loadNotifications();

    // ── Establish Real-Time SSE connection instead of polling ──
    const sseUrl = `${apiBase}/notifications/stream`;
    const sse = new EventSource(sseUrl);
    
    sse.onmessage = (e) => {
      try {
        const n = JSON.parse(e.data);
        if (!n || !n.id) return;
        if (localDismissed.current.has(n.id)) return;
        
        // Role check: only show if broadcast (no target_role) or role matches
        if (n.target_role && userRole &&
          String(n.target_role).toUpperCase() !== String(userRole).toUpperCase()) return;
        
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

  // ── Dismiss a notification — stores in DB, removes from view instantly ──
  const handleDismiss = async (id) => {
    // Immediately hide from UI (optimistic update)
    localDismissed.current.add(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // Persist to database so it's dismissed for this user everywhere
    if (userId) {
      try {
        await dismissNotification(id, userId);
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
      if (notif.link === 'mc') {
        if (onNavigate) onNavigate('mc');
        return;
      }
      if (notif.link.startsWith('mc:')) {
        const id = notif.link.split(':')[1];
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
      if (notif.link.startsWith('mcom:')) {
        const id = notif.link.split(':')[1];
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
      if (onNavigate) {
        onNavigate(notif.link);
      }
    }
  };

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
