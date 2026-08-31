import { useEffect, useState } from 'react';
import './Sidebar.css';
import { getRoleLabel } from '../utils/roleLabel.js';
import { CMA_LOGO_BASE64 } from '../utils/logoBase64.js';
import { fetchNotifications } from '../api';

function Sidebar({ currentUser, currentPage, onNavigate, isOpen, onToggleOpen, isCollapsed, onToggleCollapse }) {
  const [avatarError, setAvatarError] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState(null);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser?.avatar_url]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [cfilesCount, setCfilesCount] = useState(0);
  const [complaintsCount, setComplaintsCount] = useState(0);

  useEffect(() => {
    if (currentUser?.id) {
      const loadCount = async () => {
        try {
          const isLegal2 = String(currentUser?.department || '').trim().toLowerCase() === 'legal';
          const isTechnical2 = String(currentUser?.department || '').trim().toLowerCase() === 'technical';
          const effectiveRole = isLegal2 ? 'LEGAL' : isTechnical2 ? 'TECHNICAL' : currentUser.role;
          const res = await fetchNotifications({ user_id: currentUser.id, role: effectiveRole });
          if (res?.success) {
            setUnreadCount(res.notifications?.length || 0);
          }
        } catch (err) {}
      };
      
      loadCount();
      
      const handleUpdate = () => loadCount();
      window.addEventListener('cma:new-notification', handleUpdate);
      window.addEventListener('cma:notifications_updated', handleUpdate);
      
      return () => {
        window.removeEventListener('cma:new-notification', handleUpdate);
        window.removeEventListener('cma:notifications_updated', handleUpdate);
      };
    }
  }, [currentUser?.id, currentUser?.role]);

  // Clear navigating state when page actually changes
  useEffect(() => {
    setNavigatingTo(null);
  }, [currentPage]);

  useEffect(() => {
    if (currentUser?.id) {
      const isLegal = String(currentUser?.department || '').trim().toLowerCase() === 'legal';
      const isTechnical = String(currentUser?.department || '').trim().toLowerCase() === 'technical';
      const isDeptUser = isLegal ? 'LEGAL' : isTechnical ? 'TECHNICAL' : null;

      if (isDeptUser) {
        const loadDeptCounts = async () => {
          try {
            const apiBase = (import.meta.env.VITE_API_URL || '').trim() || '/api';
            const cleanBase = apiBase.startsWith('http') ? '/api' : apiBase;
            const [cf, comp] = await Promise.all([
              fetch(`${cleanBase}/cfiles?department=${isDeptUser}&exclude_closed=true&limit=1`).then(r => r.json()),
              fetch(`${cleanBase}/complaints?department=${isDeptUser}&exclude_closed=true&limit=1`).then(r => r.json())
            ]);
            setCfilesCount(cf?.total || 0);
            setComplaintsCount(comp?.total || 0);
          } catch (e) {}
        };
        loadDeptCounts();
        window.addEventListener('cma:new-notification', loadDeptCounts);
        return () => window.removeEventListener('cma:new-notification', loadDeptCounts);
      }
    }
  }, [currentUser?.id, currentUser?.department]);

  const hasAccess = (modId) => {
    if (currentUser?.role?.toLowerCase() === 'admin') return true;
    const managedModules = ['dashboard', 'registration', 'renewal_approval', 'mc', 'mcom', 'cfiles', 'complains', 'discussion', 'notifications', 'records', 'customer_history', 'reports', 'users', 'profile'];
    if (!managedModules.includes(modId)) return true; // e.g. anything else not in the list
    return currentUser?.permissions?.[modId]?.includes('view');
  };

  const navItems = [
    { id: 'dashboard', icon: 'fas fa-th-large', label: 'Dashboard', section: 'Main' },
    { id: 'registration', icon: 'fas fa-file-signature', label: 'Registration Form', section: 'Main' },
    { id: 'renewal_approval', icon: 'fas fa-check-circle', label: 'Renewal Approvals', section: 'Main' },
    { id: 'mc', icon: 'fas fa-building', label: 'MC Management', section: 'Modules' },
    { id: 'mcom', icon: 'fas fa-city', label: 'M.Com Management', section: 'Modules' },
    { id: 'cfiles', icon: 'fas fa-folder-open', label: 'C Files', section: 'Modules', badge: cfilesCount > 0 ? cfilesCount : null },
    { id: 'complains', icon: 'fas fa-clipboard-list', label: 'Complaints/Issues', section: 'Modules', badge: complaintsCount > 0 ? complaintsCount : null },
    { id: 'discussion', icon: 'fas fa-comments', label: 'Discussions', section: 'Reminder' },
    { id: 'notifications', icon: 'fas fa-bell', label: 'Notifications', section: 'Reminder', badge: unreadCount > 0 ? unreadCount : null },
    { id: 'records', icon: 'fas fa-database', label: 'Records', section: 'Data' },
    { id: 'customer_history', icon: 'fas fa-history', label: 'Customer History', section: 'Data' },
    { id: 'reports', icon: 'fas fa-chart-bar', label: 'Report Generate', section: 'Reports' },
    { id: 'users', icon: 'fas fa-users-cog', label: 'User Admin', section: 'Settings' },
    { id: 'profile', icon: 'fas fa-user-circle', label: 'My Profile', section: 'Settings' },
  ].filter(item => hasAccess(item.id));

  const renderSections = () => {
    let currentSection = '';
    return navItems.map((item) => {
      const showSection = currentSection !== item.section;
      currentSection = item.section;
      const isActive = currentPage === item.id;
      const isNavigating = navigatingTo === item.id && !isActive;
      return (
        <div key={item.id}>
          {showSection && <div className="nav-section">{item.section}</div>}
          <div
            className={`nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.label : undefined}
            style={{ opacity: isNavigating ? 0.75 : 1, position: 'relative' }}
            onClick={() => {
              if (item.id !== currentPage) {
                setNavigatingTo(item.id);
              }
              onNavigate(item.id);
              onToggleOpen(false);
            }}
          >
            <div className="nav-icon-wrap">
              <i className={isNavigating ? 'fas fa-circle-notch fa-spin' : item.icon} />
            </div>
            <span className="nav-label">{item.label}</span>
            {item.badge && !isCollapsed && (
              <span style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 10,
                lineHeight: 1
              }}>
                {item.badge}
              </span>
            )}
            {item.badge && isCollapsed && (
              <span style={{
                position: 'absolute',
                right: 8,
                top: 8,
                background: '#ef4444',
                color: '#ffffff',
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 10,
                lineHeight: 1
              }}>
                {item.badge}
              </span>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      <nav className={`cma-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-area">
            <div className="cma-emblem">
              <img src={CMA_LOGO_BASE64} alt="CMA Logo" className="logo-image" />
            </div>
            <div className="logo-text">
              <div className="brand">Condominium Management Authority</div>
              <div className="sub">Sri Lanka</div>
            </div>
          </div>
        </div>
        <div className="sidebar-nav">{renderSections()}</div>
        <div className="sidebar-bottom">
          <div className="sidebar-footer">
            {!isCollapsed && (
              <>
                <span className="footer-team"> Custome Care Unit - CMA</span>

              </>
            )}
            <button className="collapse-btn" onClick={onToggleCollapse} title="Toggle Sidebar">
              <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
            </button>
          </div>
        </div>
      </nav>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={() => onToggleOpen(false)}></div>
    </>
  );
}

export default Sidebar;
