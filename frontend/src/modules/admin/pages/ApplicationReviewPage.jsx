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
import '../../../assets/styles/admin.css';

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
      {/* Header */}
      <div className="admin-header">
        <Link to="/admin/applications" className="admin-btn secondary" style={{ marginBottom: '1rem' }}>
          <Icon name="arrow" size={16} />
          Back to Applications
        </Link>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '2rem'
        }}>
          <div>
            <h1>Application Review</h1>
            <p>Review candidate application details</p>
          </div>
          <div className="admin-status-badge" style={{
            background: status.variant === 'warning' ? 'rgba(234, 179, 8, 0.15)' :
                       status.variant === 'success' ? 'rgba(34, 197, 94, 0.15)' :
                       'rgba(239, 68, 68, 0.15)',
            color: status.variant === 'warning' ? '#b45309' :
                   status.variant === 'success' ? '#166534' :
                   '#991b1b',
            padding: '0.5rem 1rem'
          }}>
            {status.label}
          </div>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Applicant Info */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div className="admin-avatar primary" style={{
            width: '100px',
            height: '100px',
            fontSize: '2.5rem',
            margin: '0 auto 1rem'
          }}>
            {getInitials(`${application.user?.first_name} ${application.user?.last_name}`)}
          </div>

          <h4 style={{
            margin: '0 0 0.5rem',
            color: '#1f2937',
            fontWeight: 600
          }}>
            {application.user?.first_name} {application.user?.last_name}
          </h4>

          <p style={{
            margin: '0 0 1.5rem',
            color: '#6b7280',
            fontSize: '0.9rem',
            wordBreak: 'break-word'
          }}>
            {application.user?.email}
          </p>

          <div style={{
            borderTop: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
            padding: '1.5rem 0',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div>
                <div style={{
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  fontWeight: 600,
                  marginBottom: '0.25rem'
                }}>
                  Position
                </div>
                <div style={{
                  fontWeight: 600,
                  color: '#1f2937'
                }}>
                  {application.position?.name}
                </div>
              </div>

              <div>
                <div style={{
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  fontWeight: 600,
                  marginBottom: '0.25rem'
                }}>
                  Election
                </div>
                <div style={{
                  fontWeight: 600,
                  color: '#1f2937'
                }}>
                  {application.election?.title}
                </div>
              </div>

              {application.party && (
                <div>
                  <div style={{
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    color: '#6b7280',
                    fontWeight: 600,
                    marginBottom: '0.25rem'
                  }}>
                    Party
                  </div>
                  <div style={{
                    fontWeight: 600,
                    color: '#1f2937'
                  }}>
                    {application.party.name}
                  </div>
                </div>
              )}

              <div>
                <div style={{
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  fontWeight: 600,
                  marginBottom: '0.25rem'
                }}>
                  Submitted
                </div>
                <div style={{
                  fontWeight: 600,
                  color: '#1f2937',
                  fontSize: '0.9rem'
                }}>
                  {formatDate(application.submitted_at, 'datetime')}
                </div>
              </div>

              {application.reviewed_at && (
                <div>
                  <div style={{
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    color: '#6b7280',
                    fontWeight: 600,
                    marginBottom: '0.25rem'
                  }}>
                    Reviewed
                  </div>
                  <div style={{
                    fontWeight: 600,
                    color: '#1f2937',
                    fontSize: '0.9rem'
                  }}>
                    {formatDate(application.reviewed_at, 'datetime')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {canReview && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <button
                className="admin-btn success"
                onClick={() => handleReview('approve')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Icon name="checkCircle" size={16} />
                Approve Application
              </button>
              <button
                className="admin-btn danger"
                onClick={() => handleReview('reject')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Icon name="xCircle" size={16} />
                Reject Application
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div>
          {/* Campaign Manifesto */}
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h5 style={{
              margin: '0 0 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#1f2937',
              fontWeight: 600
            }}>
              <Icon name="fileText" size={20} style={{ color: '#2563eb' }} />
              Campaign Manifesto
            </h5>
            {application.manifesto ? (
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                whiteSpace: 'pre-wrap',
                color: '#374151',
                lineHeight: 1.6,
                fontSize: '0.95rem',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {application.manifesto}
              </div>
            ) : (
              <p style={{
                color: '#6b7280',
                margin: 0
              }}>
                No manifesto provided
              </p>
            )}
          </div>

          {/* Candidate Photo */}
          {application.photo && (
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h5 style={{
                margin: '0 0 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#1f2937',
                fontWeight: 600
              }}>
                <Icon name="image" size={20} style={{ color: '#2563eb' }} />
                Candidate Photo
              </h5>
              <img
                src={application.photo}
                alt="Candidate"
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  borderRadius: '0.5rem',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
          )}

          {/* Review Notes */}
          {application.review_notes && (
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '1.5rem'
            }}>
              <h5 style={{
                margin: '0 0 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#1f2937',
                fontWeight: 600
              }}>
                <Icon name="messageSquare" size={20} style={{ color: '#eab308' }} />
                Review Notes
              </h5>
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                color: '#374151',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                marginBottom: '1rem'
              }}>
                {application.review_notes}
              </div>
              {application.reviewed_by && (
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: '#6b7280'
                }}>
                  Reviewed by: <strong>{application.reviewed_by.first_name} {application.reviewed_by.last_name}</strong>
                </p>
              )}
            </div>
          )}
        </div>
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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: '#1f2937'
          }}>
            Review Notes
            {reviewAction === 'reject' && (
              <span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>*</span>
            )}
          </label>
          <textarea
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              color: '#374151'
            }}
            rows="4"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder={reviewAction === 'reject' 
              ? 'Please provide a reason for rejecting this application (required)...'
              : `Add notes about why you approved this application (optional)...`}
            required={reviewAction === 'reject'}
          />
          {reviewAction === 'reject' && (
            <p style={{
              margin: '0.5rem 0 0',
              fontSize: '0.85rem',
              color: '#6b7280'
            }}>
              Review notes are required when rejecting an application.
            </p>
          )}
        </div>

        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.9rem',
          color: '#374151',
          lineHeight: 1.8
        }}>
          <strong>Applicant:</strong> {application.user?.first_name} {application.user?.last_name}<br />
          <strong>Position:</strong> {application.position?.name}<br />
          <strong>Election:</strong> {application.election?.title}
        </div>
      </Modal>
    </Container>
  );
};

export default ApplicationReviewPage;
