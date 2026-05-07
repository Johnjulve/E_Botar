/**
 * Temporary feature switches (superuser): exports, registration, optional Google sign-in, staff preview.
 * Password sign-in is always on; disabling Google greys out that option on Login.
 * Persists via PATCH /api/common/feature-flags/ (partial — only maintenance keys below).
 */

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Button, Form } from 'react-bootstrap';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import systemService, { DEFAULT_FEATURE_FLAGS } from '../../../services/systemService';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../hooks/useBranding';
import '../admin.css';
import './maintenance-features.css';

/** Persisted toggles — password login is never disabled; Google can be switched off below. */
const MAINTENANCE_FLAG_KEYS = [
  'data_export',
  'user_registration',
  'google_login',
  'staff_preview_disabled_features',
];

const TOGGLE_ROWS = [
  {
    key: 'data_export',
    label: 'Data export',
    caption: 'PDF exports on the admin Data Export page (staff).',
  },
  {
    key: 'user_registration',
    label: 'Public registration',
    caption: 'Hides /register and bars new account sign-ups. Username/password sign-in stays available.',
  },
  {
    key: 'google_login',
    label: 'Google sign-in',
    caption:
      'When OFF, “Continue with Google” on Login is shown grayed out and cannot be used.',
  },
  {
    key: 'staff_preview_disabled_features',
    label: 'Staff preview for disabled items',
    caption:
      'When ON, disabled admin links stay visible (grayed) for staff until you turn features back on.',
  },
];

const MaintenanceFeaturesPage = () => {
  const { isAdmin } = useAuth();
  const { feature_flags: featureFlags, loading: brandingLoading, refreshBranding } = useBranding();
  const [draft, setDraft] = useState(() => ({ ...DEFAULT_FEATURE_FLAGS }));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    if (brandingLoading) {
      return;
    }
    setDraft({ ...DEFAULT_FEATURE_FLAGS, ...(featureFlags || {}) });
  }, [featureFlags, brandingLoading]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (brandingLoading) {
    return <LoadingSpinner fullScreen text="Loading settings..." />;
  }

  const toggleKey = (key, nextChecked) => {
    setDraft((previous) => ({ ...previous, [key]: nextChecked }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setErrorDetail(null);

    try {
      const patchPayload = MAINTENANCE_FLAG_KEYS.reduce((accumulator, flagKey) => {
        accumulator[flagKey] = draft[flagKey] !== false;
        return accumulator;
      }, {});
      await systemService.patchFeatureFlags(patchPayload);
      setMessage('Feature availability updated.');
      await refreshBranding();
    } catch (error) {
      const responseData = error?.response?.data;
      let detail =
        typeof responseData?.detail === 'string'
          ? responseData.detail
          : '';
      if (typeof responseData === 'object' && responseData) {
        const combined = Object.values(responseData)
          .flat()
          .filter((item) => typeof item === 'string')
          .join(' ');
        if (combined.length > 0) {
          detail = combined;
        }
      }
      if (!detail) {
        detail = error?.message || 'Could not save feature flags.';
      }
      setErrorDetail(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="maintenance-features-page py-4">
      <Container>
        <header className="maintenance-features-header mb-4">
          <p className="text-uppercase text-muted small fw-semibold mb-1 eyebrow-muted">Maintenance</p>
          <h1 className="h3 mb-1 text-selectable">Feature availability</h1>
          <p className="text-muted mb-0 maintenance-features-intro">
            Turn registration, Google sign-in, or staff-only exports off during incidents — username/password sign-in stays
            available so administrators can always sign in. Staff may see muted entries when preview is enabled;
            superusers bypass route blocks on admin tools.
          </p>
        </header>

        {message && (
          <Alert variant="success" dismissible onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        {errorDetail && (
          <Alert variant="danger" dismissible onClose={() => setErrorDetail(null)}>
            {errorDetail}
          </Alert>
        )}

        <Form className="maintenance-features-form shadow-sm rounded-3 bg-white border p-3 p-md-4" onSubmit={handleSave}>
          {TOGGLE_ROWS.map((item) => (
            <div key={item.key} className="maintenance-features-row pb-3 mb-3 border-bottom border-light">
              <Form.Check
                type="switch"
                id={`maintenance-flag-${item.key}`}
                className="feature-toggle-switch"
                checked={draft[item.key] !== false}
                onChange={(event) => toggleKey(item.key, event.target.checked)}
                label={<span className="fw-semibold text-selectable">{item.label}</span>}
              />
              <p className="text-muted small mb-0 mt-2 ps-1">{item.caption}</p>
            </div>
          ))}

          <div className="d-flex gap-2 flex-wrap align-items-center">
            <Button type="submit" variant="dark" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </Form>
      </Container>
    </div>
  );
};

export default MaintenanceFeaturesPage;
