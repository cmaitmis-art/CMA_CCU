/**
 * useAutoRefresh — Shared auto-refresh hook
 *
 * Calls `callback` immediately on mount, then on a fixed interval.
 * Also refreshes when the tab becomes visible again after being hidden.
 *
 * @param {Function} callback  - async function that fetches/loads data
 * @param {number}   interval  - polling interval in milliseconds (default 30s)
 * @param {boolean}  enabled   - set false to pause polling (default true)
 */
import { useEffect, useRef, useCallback } from 'react';

export function useAutoRefresh(callback, interval = 30000, enabled = true) {
  const savedCallback = useRef(callback);
  const timerRef = useRef(null);

  // Always keep the latest callback without restarting the timer
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!enabled) return;
    timerRef.current = setInterval(() => {
      savedCallback.current();
    }, interval);
  }, [interval, enabled]);

  // Start interval
  useEffect(() => {
    if (!enabled) return;
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, startTimer]);

  // Refresh when tab becomes visible again (user switched tabs and came back)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        savedCallback.current();
        startTimer(); // restart timer to avoid double-firing
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, startTimer]);
}
