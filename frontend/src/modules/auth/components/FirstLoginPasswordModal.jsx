/**
 * FirstLoginPasswordModal.jsx
 * Mandatory first-login password update modal for student accounts
 * provisioned via university registrar roster sync (must_change_password=True).
 */

import React, { useState } from 'react';
import { Modal, Button, Icon, LoadingSpinner } from '../../../components/common';
import { useAuth } from '../../../hooks/useAuth';
import { authService } from '../../../services';

export const FirstLoginPasswordModal = () => {
  const { user, logout, refreshCurrentUser } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mustChange = Boolean(user && user.must_change_password);

  if (!mustChange) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!oldPassword) {
      setErrorMsg('Please enter your temporary or default password.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword(oldPassword, newPassword);
      setSuccessMsg('Password successfully updated! Logging you in...');
      setTimeout(async () => {
        await refreshCurrentUser();
      }, 800);
    } catch (err) {
      const respData = err.response?.data;
      const msg =
        respData?.error ||
        respData?.detail ||
        (typeof respData === 'object' ? Object.values(respData).flat().join('\n') : null) ||
        err.message ||
        'Failed to update password. Please check your current password.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop show d-flex align-items-center justify-content-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="card shadow-lg border-0 rounded-4"
        style={{
          width: '100%',
          maxWidth: '480px',
          margin: '1rem',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <div className="card-header bg-white border-bottom-0 pt-4 px-4 pb-0 text-center">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: 'rgba(14, 159, 110, 0.1)',
              color: '#0e9f6e',
            }}
          >
            <Icon name="lock" size={28} />
          </div>
          <h4 className="fw-bold text-dark mb-1">Set Your Permanent Password</h4>
          <p className="text-muted small mb-0">
            Welcome, <strong>{user?.user?.first_name || user?.user?.username}</strong>! Your account was pre-registered
            from the official university student roster. Please set a secure password to activate your account.
          </p>
        </div>

        <div className="card-body px-4 py-3">
          {errorMsg && (
            <div className="alert alert-danger d-flex align-items-start gap-2 py-2 small mb-3">
              <Icon name="alertTriangle" size={16} className="text-danger flex-shrink-0 mt-1" />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success d-flex align-items-center gap-2 py-2 small mb-3">
              <Icon name="checkCircle" size={16} className="text-success flex-shrink-0" />
              <div>{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">
                Temporary / Current Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="form-control"
                placeholder="e.g. Univ@<student-id>"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <div className="form-text small text-muted">
                Default password format is typically <code>Univ@&lt;numbers&gt;</code>.
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">
                New Password (minimum 8 characters)
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="form-control"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">
                Confirm New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="form-control"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-check mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="showPasswordToggle"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              <label className="form-check-label small text-muted cursor-pointer" htmlFor="showPasswordToggle">
                Show passwords
              </label>
            </div>

            <div className="d-grid gap-2 mt-4">
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ms-2">Setting Password...</span>
                  </>
                ) : (
                  'Activate Account & Continue'
                )}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={logout}
                disabled={loading}
                className="text-muted"
              >
                Log Out
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FirstLoginPasswordModal;
