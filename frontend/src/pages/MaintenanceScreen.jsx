import { useState, useEffect } from 'react';

export default function MaintenanceScreen({ onStatusChange }) {
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  const checkStatus = async () => {
    try {
      setChecking(true);
      const res = await fetch('/api/system-control/status');
      if (res.ok) {
        const data = await res.json();
        setLastChecked(new Date());
        if (!data.maintenance) {
          // Maintenance mode turned OFF!
          if (onStatusChange) {
            onStatusChange(false);
          } else {
            window.location.reload();
          }
        }
      }
    } catch (e) {
      // ignore network errors during maintenance
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Poll every 8 seconds to automatically restore user when system is back online
    const interval = setInterval(checkStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background soft ambient decoration */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(220, 38, 38, 0.06) 0%, rgba(241, 245, 249, 0) 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: '680px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.12), 0 0 1px 1px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
        textAlign: 'center',
        padding: '36px 28px',
        boxSizing: 'border-box',
        zIndex: 1,
        animation: 'fadeIn 0.4s ease-out'
      }}>
        {/* Maintenance graphic image provided by user */}
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <img
            src="/assets/system-maintenance.jpg"
            alt="System Maintenance"
            style={{
              maxWidth: '100%',
              maxHeight: '360px',
              objectFit: 'contain',
              borderRadius: '16px'
            }}
          />
        </div>

        {/* Live Auto-Refresh Indicator */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          color: '#64748b',
          fontSize: '13px'
        }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: checking ? '#f59e0b' : '#10b981',
            boxShadow: checking ? '0 0 8px #f59e0b' : '0 0 8px #10b981',
            transition: 'background-color 0.3s'
          }} />
          <span>
            {checking ? 'Checking system status...' : `Auto-checking for updates (${lastChecked.toLocaleTimeString()})`}
          </span>
          <button
            onClick={checkStatus}
            disabled={checking}
            style={{
              marginLeft: '8px',
              background: 'none',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#334155'
            }}
          >
            {checking ? '...' : 'Refresh Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
