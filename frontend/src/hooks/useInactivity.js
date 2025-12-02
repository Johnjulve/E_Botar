/**
 * useInactivity Hook
 * Tracks user activity and automatically logs out after a period of inactivity
 * 
 * @param {Function} onInactive - Callback function to execute when user becomes inactive
 * @param {number} timeoutMinutes - Minutes of inactivity before triggering logout (default: 5)
 * @param {boolean} enabled - Whether inactivity detection is enabled (default: true)
 */

import { useEffect, useRef, useCallback } from 'react';

const useInactivity = (onInactive, timeoutMinutes = 5, enabled = true) => {
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const enabledRef = useRef(enabled);

  // Update enabled ref when it changes
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    if (!enabledRef.current) {
      // Clear timeout if disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Set logout timeout
    const timeoutMs = timeoutMinutes * 60 * 1000; // Convert minutes to milliseconds
    timeoutRef.current = setTimeout(() => {
      // Check if still inactive and enabled (double-check to avoid race conditions)
      if (!enabledRef.current) return;
      
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= timeoutMs) {
        onInactive();
      }
    }, timeoutMs);
  }, [onInactive, timeoutMinutes]);

  // Handle user activity events
  const handleActivity = useCallback(() => {
    if (enabledRef.current) {
      resetTimer();
    }
  }, [resetTimer]);

  // Handle visibility change (tab/window focus)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab is hidden, pause timer (don't reset, just pause)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      // Tab is visible again, check if we should reset timer
      if (enabledRef.current) {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        const timeoutMs = timeoutMinutes * 60 * 1000;
        
        // If inactive time exceeds timeout, logout immediately
        if (timeSinceLastActivity >= timeoutMs) {
          onInactive();
        } else {
          // Otherwise, reset timer with remaining time
          resetTimer();
        }
      }
    }
  }, [onInactive, timeoutMinutes, resetTimer]);

  useEffect(() => {
    // List of events that indicate user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ];

    // Add event listeners for user activity
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize timer if enabled
    if (enabled) {
      resetTimer();
    }

    // Cleanup function
    return () => {
      // Remove event listeners
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, handleActivity, handleVisibilityChange, resetTimer]);

  // Expose manual reset function
  return {
    resetTimer,
    getLastActivity: () => lastActivityRef.current,
  };
};

export default useInactivity;

