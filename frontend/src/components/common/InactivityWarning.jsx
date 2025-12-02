/**
 * InactivityWarning Component
 * Displays a warning to users when they're about to be logged out due to inactivity
 */

import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import './InactivityWarning.css';

const InactivityWarning = () => {
  const { showInactivityWarning, dismissInactivityWarning } = useContext(AuthContext);

  if (!showInactivityWarning) {
    return null;
  }

  return (
    <div className="inactivity-warning-overlay">
      <div className="inactivity-warning-modal">
        <div className="inactivity-warning-header">
          <svg
            className="inactivity-warning-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Session Timeout Warning</h3>
        </div>
        <div className="inactivity-warning-body">
          <p>
            You have been inactive for a while. You will be automatically logged out in{' '}
            <strong>1 minute</strong> for security reasons.
          </p>
          <p className="inactivity-warning-hint">
            Move your mouse or click anywhere to stay logged in.
          </p>
        </div>
        <div className="inactivity-warning-footer">
          <button
            className="btn btn-primary"
            onClick={() => {
              dismissInactivityWarning();
            }}
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
};

export default InactivityWarning;

