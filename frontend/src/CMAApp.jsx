import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard_enhanced.jsx'; // Landing page eagerly loaded for instant display
import CMALogin from './pages/Login.jsx';
import WelcomeAlert from './components/WelcomeAlert.jsx';
import PopupAlerts from './components/PopupAlerts.jsx';
import AIChatWidget from './components/AIChatWidget.jsx';
import Logger from './utils/logger.js';
import { syncServerTime } from './utils/serverTime.js';

// Sync server time as early as possible
syncServerTime();


// Lazily load other pages
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'));
const MCManagement = lazy(() => import('./pages/MCManagement'));
const MComManagement = lazy(() => import('./pages/MComManagement')); // Fixed case sensitivity
const CFiles = lazy(() => import('./pages/CFiles'));
const Complaints = lazy(() => import('./pages/Complaints'));
const Discussions = lazy(() => import('./pages/Discussions'));
const Notifications = lazy(() => import('./pages/Notifications'));
const RegistrationForm = lazy(() => import('./pages/RegistrationForm'));
const Records = lazy(() => import('./pages/Records'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const UserAdmin = lazy(() => import('./pages/UserAdmin'));
const MCRenewalPortal = lazy(() => import('./pages/MCRenewalPortal'));
const MCRenewalApproval = lazy(() => import('./pages/MCRenewalApproval'));
const CustomerHistory = lazy(() => import('./pages/CustomerHistory'));

import './CMAStyles.css';
import { ConfirmDialogProvider } from './ConfirmDialogContext.jsx';
import { SettingsProvider } from './SettingsContext.jsx';
import { logout as apiLogout, pingUser } from './api';
import { isViewOnlyRole } from './utils/roleLabel.js';

function buildUserSession(user) {
  if (!user) return null;

  const fullName = String(user.name || user.username || '').trim() || 'Admin User';
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'AD';

  return {
    ...user,
    name: fullName,
    avatar_url: user.avatar_url || null,
    avatar: user.avatar_url ? null : String(user.avatar || initials),
  };
}

function CMAApp() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('cma_currentUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [showWelcome, setShowWelcome] = useState(false);

  const getFirstAvailablePage = (user) => {
    if (!user) return 'dashboard';
    if (user.role?.toLowerCase() === 'admin') return 'dashboard';
    const managedModules = ['dashboard', 'registration', 'renewal_approval', 'mc', 'mcom', 'cfiles', 'complains', 'discussion', 'notifications', 'records', 'customer_history', 'reports', 'users', 'profile'];
    for (const mod of managedModules) {
      if (user.permissions?.[mod]?.includes('view')) return mod;
    }
    return 'notifications';
  };

  const hasAccess = (modId) => {
    if (currentUser?.role?.toLowerCase() === 'admin') return true;
    const managedModules = ['dashboard', 'registration', 'renewal_approval', 'mc', 'mcom', 'cfiles', 'complains', 'discussion', 'notifications', 'records', 'customer_history', 'reports', 'users', 'profile'];
    if (!managedModules.includes(modId)) return true;
    return currentUser?.permissions?.[modId]?.includes('view');
  };

  const [currentPage, setCurrentPage] = useState(() => {
    const saved = sessionStorage.getItem('cma_currentPage');
    const allowed = new Set([
      'dashboard', 'mc', 'mcom', 'cfiles', 'complains', 'discussion',
      'notifications', 'registration', 'records', 'reports', 'users',
      'profile', 'renewal_approval', 'customer_history',
    ]);

    let initialPage = allowed.has(saved) ? saved : 'dashboard';

    if (currentUser) {
      const hasAccessInit = (modId) => {
        if (currentUser.role?.toLowerCase() === 'admin') return true;
        const managedModules = ['dashboard', 'registration', 'renewal_approval', 'mc', 'mcom', 'cfiles', 'complains', 'discussion', 'notifications', 'records', 'customer_history', 'reports', 'users', 'profile'];
        if (!managedModules.includes(modId)) return true;
        return currentUser.permissions?.[modId]?.includes('view');
      };
      if (!hasAccessInit(initialPage)) {
        initialPage = getFirstAvailablePage(currentUser);
      }
    }

    return initialPage;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('cma_sidebar_collapsed') === 'true';
  });
  const [showActivityLogs, setShowActivityLogs] = useState(() => {
    return sessionStorage.getItem('cma_showActivityLogs') === 'true';
  });
  const [pageLoading, setPageLoading] = useState(false);
  const pageLoadTimer = useRef(null);

  const pages = {
    dashboard: Dashboard,
    mc: MCManagement,
    mcom: MComManagement,
    cfiles: CFiles,
    complains: Complaints,
    discussion: Discussions,
    notifications: Notifications,
    registration: RegistrationForm,
    records: Records,
    reports: Reports,
    users: UserAdmin,
    profile: Profile,
    renewal_approval: MCRenewalApproval,
    customer_history: CustomerHistory,
  };

  const CurrentPage = pages[currentPage] || Dashboard;

  const handleNavigate = (page) => {
    if (page === 'activitylogs') {
      setShowActivityLogs(true);
    } else if (page !== currentPage) {
      if (!hasAccess(page)) return;
      // Show page loading bar briefly
      setPageLoading(true);
      if (pageLoadTimer.current) clearTimeout(pageLoadTimer.current);
      pageLoadTimer.current = setTimeout(() => setPageLoading(false), 400);
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('cma_sidebar_collapsed', String(isSidebarCollapsed));
    } catch (e) { }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cma_showActivityLogs', String(showActivityLogs));
    } catch (e) { }
  }, [showActivityLogs]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cma_currentPage', currentPage);
      // Log page navigation
      if (currentUser) {
        Logger.logPageNavigation('(previous)', currentPage, currentUser);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [currentPage, currentUser]);

  const handleLogin = (user) => {
    const sessionUser = buildUserSession(user);
    setCurrentUser(sessionUser);
    sessionStorage.setItem('cma_currentUser', JSON.stringify(sessionUser));
    sessionStorage.removeItem('cma_dashboard_reminder_shown');
    
    // Redirect to the first available page based on permissions
    const firstPage = getFirstAvailablePage(sessionUser);
    setCurrentPage(firstPage);
    
    setShowWelcome(true);

    // Log user login
    Logger.logLogin(sessionUser.username, sessionUser.role);
  };

  const handleUserUpdated = (updatedUser) => {
    if (!updatedUser || !currentUser) return;

    // Match on id first (best), fallback to username.
    const currentId = Number(currentUser.id);
    const updatedId = Number(updatedUser.id);
    const sameUser = (!Number.isNaN(currentId) && !Number.isNaN(updatedId))
      ? currentId === updatedId
      : String(currentUser.username).trim().toLowerCase() === String(updatedUser.username).trim().toLowerCase();

    if (!sameUser) return;

    // Important: avatarUrl refresh must update even if only avatar_url changed.
    // buildUserSession also normalizes avatar_url -> session field.
    const refreshed = buildUserSession({
      ...currentUser,
      ...updatedUser,
    });

    setCurrentUser(refreshed);
    sessionStorage.setItem('cma_currentUser', JSON.stringify(refreshed));
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    const pingAndUpdate = async () => {
      try {
        const res = await pingUser(currentUser.id);
        if (res?.success && res.user) {
          const refreshed = buildUserSession({ ...currentUser, ...res.user });
          if (JSON.stringify(refreshed) !== JSON.stringify(currentUser)) {
            setCurrentUser(refreshed);
            sessionStorage.setItem('cma_currentUser', JSON.stringify(refreshed));
          }
        }
      } catch (e) { }
    };

    pingAndUpdate();
    const interval = setInterval(pingAndUpdate, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const handleLogout = () => {
    const username = currentUser?.username;
    setCurrentUser(null);
    sessionStorage.removeItem('cma_currentUser');
    sessionStorage.removeItem('cma_dashboard_reminder_shown');

    // Log user logout
    if (username) {
      Logger.logLogout(username);
      apiLogout(username).catch(() => { });
    }
  };

  const isPublicPortal = window.location.pathname.toLowerCase().startsWith('/renewal');

  if (isPublicPortal) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <MCRenewalPortal />
      </Suspense>
    );
  }

  if (!currentUser) {
    return <CMALogin onLogin={handleLogin} />;
  }

  return (
    <ConfirmDialogProvider>
      {showWelcome && (
        <WelcomeAlert
          userName={currentUser.name}
          role={currentUser.role}
          duration={4000}
        />
      )}
      <div className={`cma-app ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar currentUser={currentUser} currentPage={currentPage} onNavigate={handleNavigate} onToggleOpen={setSidebarOpen} isOpen={sidebarOpen} isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <div className="cma-main-wrap">
          <Topbar currentUser={currentUser} currentPage={currentPage} onToggleSidebar={() => { if (window.innerWidth <= 768) { setSidebarOpen(!sidebarOpen); } else { setIsSidebarCollapsed(!isSidebarCollapsed); } }} onLogout={handleLogout} onNavigate={handleNavigate} />
          <main className="cma-main">

            <div key={currentPage} style={{ animation: 'fadeIn 0.22s ease' }}>
              <Suspense fallback={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
                  <style>{`
                    @keyframes pageSpin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <i className="fas fa-circle-notch" style={{ fontSize: 32, color: '#1a3a6b', animation: 'pageSpin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: '#5a6478', fontWeight: 500 }}>Loading page...</span>
                </div>
              }>
                <CurrentPage onNavigate={handleNavigate} currentUser={currentUser} onUserUpdated={handleUserUpdated} />
              </Suspense>
            </div>
          </main>
        </div>
        {showActivityLogs && (
          <Suspense fallback={null}>
            <ActivityLogs onClose={() => setShowActivityLogs(false)} />
          </Suspense>
        )}
        <PopupAlerts currentUser={currentUser} onNavigate={handleNavigate} />
        <AIChatWidget />
      </div>
    </ConfirmDialogProvider>
  );
}

export default function CMAAppWithSettings() {
  return (
    <SettingsProvider>
      <CMAApp />
    </SettingsProvider>
  );
}

