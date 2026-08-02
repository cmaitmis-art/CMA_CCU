import { useEffect, useState } from 'react';
import './Sidebar.css';
import { getRoleLabel } from '../utils/roleLabel.js';
import { CMA_LOGO_BASE64 } from '../utils/logoBase64.js';

function Sidebar({ currentUser, currentPage, onNavigate, isOpen, onToggleOpen, isCollapsed, onToggleCollapse }) {
  const [avatarError, setAvatarError] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState(null);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser?.avatar_url]);

  // Clear navigating state when page actually changes
  useEffect(() => {
    setNavigatingTo(null);
  }, [currentPage]);

  const navItems = [
    { id: 'dashboard', icon: 'fas fa-th-large', label: 'Dashboard', section: 'Main' },
    { id: 'registration', icon: 'fas fa-file-signature', label: 'Registration Form', section: 'Main' },
    { id: 'mc', icon: 'fas fa-building', label: 'MC Management', section: 'Modules' },
    { id: 'mcom', icon: 'fas fa-city', label: 'M.Com Management', section: 'Modules' },
    { id: 'cfiles', icon: 'fas fa-folder-open', label: 'C Files', section: 'Modules' },
    { id: 'complains', icon: 'fas fa-clipboard-list', label: 'Complaints/Issues', section: 'Modules' },
    { id: 'discussion', icon: 'fas fa-comments', label: 'Discussions', section: 'Reminder' },
    { id: 'records', icon: 'fas fa-database', label: 'Records', section: 'Data' },
    { id: 'renewal_approval', icon: 'fas fa-check-circle', label: 'Renewal Approvals', section: 'Data' },
    { id: 'reports', icon: 'fas fa-chart-bar', label: 'Report Generate', section: 'Reports' },
    ...(currentUser?.role?.toLowerCase() === 'admin'
      ? [{ id: 'users', icon: 'fas fa-users-cog', label: 'User Admin', section: 'Settings' }]
      : []),
    { id: 'profile', icon: 'fas fa-user-circle', label: 'My Profile', section: 'Settings' },
  ];

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
            style={{ opacity: isNavigating ? 0.75 : 1 }}
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
          <div className="user-pill" title={isCollapsed ? "My Profile" : undefined} onClick={() => onNavigate('profile')}>
            <div className="user-avatar">
              {currentUser?.avatar_url && !avatarError ? (
                <img
                  key={currentUser.avatar_url || ''}
                  src={currentUser.avatar_url}
                  alt={currentUser.name || currentUser.username || 'User'}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                currentUser?.avatar || 'AD'
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{currentUser?.name || 'Admin User'}</div>
              <div className="user-role">{getRoleLabel(currentUser?.role)}</div>
            </div>
          </div>
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
