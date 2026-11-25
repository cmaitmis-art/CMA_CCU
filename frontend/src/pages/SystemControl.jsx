import { useState, useEffect } from 'react';

export default function SystemControl() {
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState({ maintenance: false, isConfigured: false });
  // Always start locked so every fresh visit / page reload requires the Master Password
  const [token, setToken] = useState('');
  
  // Login / Setup Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Toggle Action states
  const [toggling, setToggling] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [enteringSystem, setEnteringSystem] = useState(false);

  // Change Password states
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmNewPw, setConfirmNewPw] = useState('');
  const [pwModalError, setPwModalError] = useState('');
  const [pwModalSuccess, setPwModalSuccess] = useState('');
  const [pwModalLoading, setPwModalLoading] = useState(false);

  // Load initial status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system-control/status');
      if (res.ok) {
        const data = await res.json();
        setSystemStatus({
          maintenance: Boolean(data.maintenance),
          isConfigured: Boolean(data.isConfigured),
        });
      }
    } catch (e) {
      console.error('Failed to load system control status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const origBodyBg = document.body.style.backgroundColor;
    const origHtmlBg = document.documentElement.style.backgroundColor;
    document.body.style.backgroundColor = '#090d16';
    document.documentElement.style.backgroundColor = '#090d16';
    return () => {
      document.body.style.backgroundColor = origBodyBg;
      document.documentElement.style.backgroundColor = origHtmlBg;
    };
  }, []);

  // Auto-lock when inactive or when leaving the tab/window
  useEffect(() => {
    if (!token) return;

    let timeoutId;
    const LOCK_IDLE_TIMEOUT_MS = 25000; // 25 seconds idle auto-lock

    const lock = () => {
      setToken('');
      setAuthError('Screen auto-locked for security. Please re-enter your Master Password.');
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(lock, LOCK_IDLE_TIMEOUT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lock();
      }
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  // Handle Initial Setup (when no master password has been configured)
  const handleSetup = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!password || password.length < 6) {
      setAuthError('Master Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch('/api/system-control/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Setup failed.');
        return;
      }
      sessionStorage.setItem('super_admin_token', data.token);
      setToken(data.token);
      setSystemStatus((prev) => ({ ...prev, isConfigured: true, maintenance: data.maintenance }));
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setAuthError('Connection error during setup: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!password) {
      setAuthError('Please enter your Master Password.');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch('/api/system-control/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      sessionStorage.setItem('super_admin_token', data.token);
      setToken(data.token);
      setSystemStatus((prev) => ({ ...prev, maintenance: data.maintenance }));
      setPassword('');
    } catch (err) {
      setAuthError('Connection error: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/system-control/logout', {
        method: 'POST',
        headers: { 'x-super-admin-token': token },
      });
    } catch (e) {}
    sessionStorage.removeItem('super_admin_token');
    setToken('');
  };

  // Handle Toggle Maintenance Mode
  const executeToggle = async () => {
    try {
      setToggling(true);
      const nextState = !systemStatus.maintenance;
      const res = await fetch('/api/system-control/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': token,
        },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem('super_admin_token');
        setToken('');
        setShowConfirmModal(false);
        setAuthError('Your master session has expired. Please re-enter your Master Password.');
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to update system status.');
        return;
      }
      setSystemStatus((prev) => ({ ...prev, maintenance: data.maintenance }));
      setShowConfirmModal(false);
      setActionSuccessMsg(
        data.maintenance
          ? 'System is now SHUT DOWN (Maintenance Active).'
          : 'System is now ONLINE (Normal Operations Restored).'
      );
      setTimeout(() => setActionSuccessMsg(''), 5000);
    } catch (err) {
      alert('Error changing status: ' + err.message);
    } finally {
      setToggling(false);
    }
  };

  // Handle Entering Full System (Super Admin Direct Access)
  const handleEnterSystem = async () => {
    try {
      setEnteringSystem(true);
      const res = await fetch('/api/system-control/enter-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': token,
        },
      });
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem('super_admin_token');
        setToken('');
        setAuthError('Your master session has expired. Please re-enter your Master Password.');
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to enter system.');
        return;
      }
      sessionStorage.setItem('cma_currentUser', JSON.stringify(data.user));
      sessionStorage.setItem('cma_super_admin_bypass', 'true');
      sessionStorage.setItem('super_admin_token', token);
      window.location.href = '/';
    } catch (err) {
      alert('Error entering system: ' + err.message);
    } finally {
      setEnteringSystem(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwModalError('');
    setPwModalSuccess('');

    if (!currentPw) {
      setPwModalError('Please enter your current password.');
      return;
    }
    if (!newPw || newPw.length < 6) {
      setPwModalError('New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmNewPw) {
      setPwModalError('New passwords do not match.');
      return;
    }

    try {
      setPwModalLoading(true);
      const res = await fetch('/api/system-control/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': token,
        },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem('super_admin_token');
        setToken('');
        setShowPwModal(false);
        setAuthError('Your master session has expired. Please re-enter your Master Password.');
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPwModalError(data.error || 'Failed to change password.');
        return;
      }
      if (data.token) {
        sessionStorage.setItem('super_admin_token', data.token);
        setToken(data.token);
      }
      setPwModalSuccess('Password changed successfully!');
      setCurrentPw('');
      setNewPw('');
      setConfirmNewPw('');
      setTimeout(() => {
        setShowPwModal(false);
        setPwModalSuccess('');
      }, 2000);
    } catch (err) {
      setPwModalError('Error: ' + err.message);
    } finally {
      setPwModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100%',
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090d16',
        color: '#94a3b8',
        fontFamily: 'sans-serif',
      }}>
        Loading Master Control...
      </div>
    );
  }

  // SCREEN 1 & 2: Not logged in (Show Setup or Login)
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          backgroundColor: '#1e293b',
          borderRadius: '20px',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '40px 32px',
          color: '#f8fafc',
          boxSizing: 'border-box',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px', color: '#ffffff' }}>
              {systemStatus.isConfigured ? 'Master System Control' : 'Initial Master Setup'}
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {systemStatus.isConfigured
                ? 'Enter your private Super Admin credentials'
                : 'Set your secure Master Password to protect the system switch'}
            </p>
          </div>

          {authError && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '12px 14px',
              color: '#fca5a5',
              fontSize: '13px',
              marginBottom: '20px',
            }}>
              {authError}
            </div>
          )}

          <form onSubmit={systemStatus.isConfigured ? handleLogin : handleSetup}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {systemStatus.isConfigured ? 'Master Password' : 'Create Master Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e) => (e.target.style.borderColor = '#475569')}
              />
            </div>

            {!systemStatus.isConfigured && (
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Confirm Master Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '15px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.target.style.borderColor = '#475569')}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: authLoading ? 'not-allowed' : 'pointer',
                opacity: authLoading ? 0.7 : 1,
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                transition: 'background-color 0.2s, transform 0.1s',
              }}
              onMouseEnter={(e) => !authLoading && (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={(e) => !authLoading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              {authLoading ? 'Verifying...' : systemStatus.isConfigured ? 'Access Control' : 'Set Master Password & Enter'}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <a
              href="/"
              style={{
                color: '#64748b',
                fontSize: '12px',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              ← Return to Main Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 3: Authenticated Super Admin Dashboard
  const isOff = systemStatus.maintenance;

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#090d16',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box',
      paddingBottom: '80px',
      margin: 0,
    }}>
      {/* Top Navigation */}
      <header style={{
        backgroundColor: '#111827',
        borderBottom: '1px solid #1f2937',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: isOff ? '#dc2626' : '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isOff ? '0 0 15px rgba(220, 38, 38, 0.4)' : '0 0 15px rgba(16, 185, 129, 0.4)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              SUPER ADMIN — MASTER SYSTEM SWITCH
            </h1>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>Confidential Control Panel</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleEnterSystem}
            disabled={enteringSystem}
            title="Directly enter full system as Master Administrator"
            style={{
              backgroundColor: '#1d4ed8',
              border: '1px solid #3b82f6',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: enteringSystem ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            <span>{enteringSystem ? 'Opening...' : 'Full System'}</span>
          </button>

          <button
            onClick={() => setShowPwModal(true)}
            style={{
              background: 'none',
              border: '1px solid #374151',
              color: '#d1d5db',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Change Password</span>
          </button>

          <button
            onClick={() => {
              setToken('');
              setAuthError('Screen locked. Please enter your Master Password.');
            }}
            title="Lock Control Screen"
            style={{
              background: 'none',
              border: '1px solid #374151',
              color: '#9ca3af',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Lock</span>
          </button>

          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#dc2626',
              border: 'none',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Control Area */}
      <main style={{ maxWidth: '800px', margin: '48px auto', padding: '0 24px' }}>
        {actionSuccessMsg && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            borderRadius: '12px',
            padding: '14px 18px',
            color: '#6ee7b7',
            fontSize: '14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span>✓</span>
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Central Card */}
        <div style={{
          backgroundColor: '#111827',
          borderRadius: '24px',
          border: `2px solid ${isOff ? '#dc2626' : '#10b981'}`,
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: isOff ? '0 20px 40px rgba(220, 38, 38, 0.15)' : '0 20px 40px rgba(16, 185, 129, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 18px',
            borderRadius: '9999px',
            backgroundColor: isOff ? 'rgba(220, 38, 38, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: isOff ? '#fca5a5' : '#86efac',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '1px',
            marginBottom: '20px',
          }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isOff ? '#ef4444' : '#10b981',
              boxShadow: isOff ? '0 0 10px #ef4444' : '0 0 10px #10b981',
            }} />
            <span>{isOff ? 'SYSTEM IS OFFLINE (MAINTENANCE ACTIVE)' : 'SYSTEM IS ONLINE (NORMAL OPERATIONS)'}</span>
          </div>

          <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 12px', color: '#ffffff' }}>
            {isOff ? 'System Access is Currently Blocked' : 'System is Live for All Users'}
          </h2>

          <p style={{ fontSize: '15px', color: '#9ca3af', maxWidth: '580px', margin: '0 auto 36px', lineHeight: 1.6 }}>
            {isOff
              ? 'All normal users and staff are seeing the System Maintenance screen. API endpoints are safeguarded, and no regular logins can occur until you turn the system back ON.'
              : 'All staff and administrators can access their dashboards, submit records, and use the system as intended. Clicking the button below will immediately shut down access for maintenance.'}
          </p>

          {/* Master Switch Button */}
          <div>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={toggling}
              style={{
                backgroundColor: isOff ? '#10b981' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '16px',
                padding: '20px 44px',
                fontSize: '18px',
                fontWeight: 700,
                cursor: toggling ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '14px',
                boxShadow: isOff
                  ? '0 10px 30px rgba(16, 185, 129, 0.4)'
                  : '0 10px 30px rgba(220, 38, 38, 0.4)',
                transition: 'transform 0.15s, opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                <line x1="12" y1="2" x2="12" y2="12"></line>
              </svg>
              <span>{isOff ? 'TURN SYSTEM ON (Restore Normal)' : 'TURN SYSTEM OFF (Shut Down / Maintenance)'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            backgroundColor: '#1f2937',
            borderRadius: '20px',
            border: '1px solid #374151',
            padding: '32px',
            color: '#ffffff',
            boxSizing: 'border-box',
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px', color: isOff ? '#86efac' : '#fca5a5' }}>
              {isOff ? 'Confirm: Bring System Online?' : 'Confirm: Shut Down System?'}
            </h3>
            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 24px' }}>
              {isOff
                ? 'This will immediately restore access for all staff and normal users. The maintenance block will be lifted.'
                : 'This will put the system into Maintenance Mode. All current user sessions will be blocked and everyone will see the System Maintenance screen.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={toggling}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #4b5563',
                  color: '#d1d5db',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeToggle}
                disabled={toggling}
                style={{
                  backgroundColor: isOff ? '#10b981' : '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: toggling ? 'not-allowed' : 'pointer',
                }}
              >
                {toggling ? 'Updating...' : isOff ? 'Yes, Bring Online' : 'Yes, Shut Down'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#1f2937',
            borderRadius: '20px',
            border: '1px solid #374151',
            padding: '32px',
            color: '#ffffff',
            boxSizing: 'border-box',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 16px' }}>
              Change Super Admin Password
            </h3>

            {pwModalError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {pwModalError}
              </div>
            )}

            {pwModalSuccess && (
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#6ee7b7',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                {pwModalSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPw}
                  onChange={(e) => setConfirmNewPw(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowPwModal(false)}
                  disabled={pwModalLoading}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #4b5563',
                    color: '#d1d5db',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwModalLoading}
                  style={{
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: pwModalLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {pwModalLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
