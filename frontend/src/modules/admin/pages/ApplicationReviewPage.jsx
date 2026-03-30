/**
 * ApplicationReviewPage
 * Review and manage candidate applications
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Alert, Modal } from '../../../components/common';
import { candidateService } from '../../../services';
import { formatDate, getApplicationStatus } from '../../../utils/formatters';
import { getInitials } from '../../../utils/helpers';
import '../admin.css';

// SVG Icon Component
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    arrow: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    ),
    checkCircle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    xCircle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    fileText: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="13" x2="12" y2="17"/>
        <line x1="9" y1="15" x2="15" y2="15"/>
      </svg>
    ),
    image: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    messageSquare: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  };

  return icons[name] || null;
};

const ApplicationReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [reviewAction, setReviewAction] = useState(''); // 'approve' or 'reject'
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (id) {
      fetchApplication();
    }
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getApplicationById(id);
      setApplication(response.data);
    } catch (error) {
      console.error('Error fetching application:', error);
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (action) => {
    setReviewAction(action);
    setShowModal(true);
  };

  const submitReview = async () => {
    // Validate review notes for rejection
    if (reviewAction === 'reject' && !reviewNotes.trim()) {
      setError('Review notes are required when rejecting an application.');
      return;
    }

    let hasError = false;
    
    try {
      setSubmitting(true);
      setError('');

      await candidateService.reviewApplication(id, {
        action: reviewAction,
        review_notes: reviewNotes.trim() || ''
      });

      // Redirect back to applications list on success
      navigate('/admin/applications');
    } catch (error) {
      hasError = true;
      console.error('Error reviewing application:', error);
      const errorData = error.response?.data || {};
      
      // Handle different error formats
      let errorMessage = 'Failed to submit review';
      
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.review_notes) {
        // Field-specific error
        errorMessage = Array.isArray(errorData.review_notes) 
          ? errorData.review_notes.join(', ') 
          : errorData.review_notes;
      } else if (errorData.non_field_errors) {
        errorMessage = Array.isArray(errorData.non_field_errors)
          ? errorData.non_field_errors.join(', ')
          : errorData.non_field_errors;
      } else if (typeof errorData === 'object') {
        // Try to extract first error message from any field
        const firstError = Object.values(errorData).find(val => val);
        if (firstError) {
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        }
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
      // Don't close modal on error so user can fix and retry
      if (!hasError) {
      setShowModal(false);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading application..." />;
  }

  if (error && !application) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
        <Link to="/admin/applications" className="admin-btn secondary">
          Back to Applications
        </Link>
      </Container>
    );
  }

  if (!application) {
    return null;
  }

  const status = getApplicationStatus(application.status);
  const canReview = application.status === 'pending';

  return (
    <Container>
      <div className="admin-review-page">
      {/* Header */}
      <div className="admin-header admin-review-page-header">
        <div className="admin-review-header-flex">
          <div>
            <h1>Application Review</h1>
            <p>Review candidate application details</p>
          </div>
          <div className="admin-header-actions">
            <Link to="/admin/applications" className="admin-btn secondary">
              <Icon name="arrow" size={16} />
              Back to Applications
            </Link>
            <div
              className={`admin-status-badge admin-review-status-badge ${
                status.variant === 'warning'
                  ? 'admin-status-badge-warning'
                  : status.variant === 'success'
                    ? 'admin-status-badge-success'
                    : 'admin-status-badge-danger'
              }`}
            >
              {status.label}
            </div>
          </div>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <div className="admin-review-layout">
        <div className="admin-review-top-card">
          <div className="admin-review-top-card-left">
            {application.photo ? (
              <img
                src={application.photo}
                alt="Candidate"
                className="admin-review-avatar-photo"
              />
            ) : (
              <div className="admin-avatar primary admin-review-avatar-large">
                {getInitials(`${application.user?.first_name} ${application.user?.last_name}`)}
              </div>
            )}
          </div>

          <div className="admin-review-top-card-center">
            <div className="admin-review-name-xl">
              {application.user?.first_name} {application.user?.last_name}
            </div>
            <div className="admin-review-email">
              {application.user?.email}
            </div>
          </div>

          <div className="admin-review-top-card-right">
            <div className="admin-review-meta-grid">
              <div className="admin-review-meta-item">
                <div className="admin-review-info-label">Position</div>
                <div className="admin-review-info-value">{application.position?.name}</div>
              </div>
              <div className="admin-review-meta-item">
                <div className="admin-review-info-label">Submitted</div>
                <div className="admin-review-info-value-small">
                  {formatDate(application.submitted_at, 'datetime')}
                </div>
              </div>
              <div className="admin-review-meta-item">
                <div className="admin-review-info-label">Election</div>
                <div className="admin-review-info-value">{application.election?.title}</div>
              </div>
              <div className="admin-review-meta-item">
                <div className="admin-review-info-label">Reviewed</div>
                <div className="admin-review-info-value-small">
                  {application.reviewed_at ? formatDate(application.reviewed_at, 'datetime') : '—'}
                </div>
              </div>
            </div>

            {application.party && (
              <div className="admin-review-party">
                <div className="admin-review-info-label">Party</div>
                <div className="admin-review-info-value">{application.party.name}</div>
              </div>
            )}
          </div>
        </div>

        {canReview && (
          <div className="admin-review-actions-row">
            <button
              className="admin-btn success"
              onClick={() => handleReview('approve')}
            >
              <Icon name="checkCircle" size={16} />
              Approve Application
            </button>
            <button
              className="admin-btn danger"
              onClick={() => handleReview('reject')}
            >
              <Icon name="xCircle" size={16} />
              Reject Application
            </button>
          </div>
        )}

        <div className="admin-review-section admin-review-section-wide">
          <h3 className="admin-review-section-title">
            Manifesto
          </h3>
          {application.manifesto ? (
            <div className="admin-review-content-box">
              {application.manifesto}
            </div>
          ) : (
            <p className="admin-empty-state-message admin-review-empty-message">
              No manifesto provided
            </p>
          )}
        </div>

        {application.photo && (
          <div className="admin-review-section admin-review-section-wide">
            <h3 className="admin-review-section-title">
              Candidate Photo
            </h3>
            <img
              src={application.photo}
              alt="Candidate"
              className="admin-review-image"
            />
          </div>
        )}

        {application.review_notes && (
          <div className="admin-review-section admin-review-section-wide">
            <h3 className="admin-review-section-title">
              Review Notes
            </h3>
            <div className="admin-review-notes-box">
              {application.review_notes}
            </div>
            {application.reviewed_by && (
              <p className="admin-review-notes-text">
                Reviewed by: <strong>{application.reviewed_by.first_name} {application.reviewed_by.last_name}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        title={`${reviewAction === 'approve' ? 'Approve' : 'Reject'} Application`}
        confirmText={reviewAction === 'approve' ? 'Approve' : 'Reject'}
        cancelText="Cancel"
        onConfirm={submitReview}
        confirmVariant={reviewAction === 'approve' ? 'success' : 'danger'}
        confirmLoading={submitting}
      >
        <Alert variant={reviewAction === 'approve' ? 'success' : 'warning'}>
          <strong>
            {reviewAction === 'approve'
              ? 'Approve this candidate application?'
              : 'Reject this candidate application?'}
          </strong>
        </Alert>

        <div className="admin-review-modal-field">
          <label className="admin-modal-label">
            Review Notes
            {reviewAction === 'reject' && (
              <span className="admin-modal-required">*</span>
            )}
          </label>
          <textarea
            className="admin-modal-textarea"
            rows="4"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={reviewAction === 'reject' 
              ? 'Please provide a reason for rejecting this application (required)...'
              : `Add notes about why you approved this application (optional)...`}
            required={reviewAction === 'reject'}
          />
          {reviewAction === 'reject' && (
            <p className="admin-modal-help-text">
              Review notes are required when rejecting an application.
            </p>
          )}
        </div>

        <div className="admin-modal-info-box">
          <strong>Applicant:</strong> {application.user?.first_name} {application.user?.last_name}<br />
          <strong>Position:</strong> {application.position?.name}<br />
          <strong>Election:</strong> {application.election?.title}
        </div>
      </Modal>
      </div>
    </Container>
  );
};

export default ApplicationReviewPage;
