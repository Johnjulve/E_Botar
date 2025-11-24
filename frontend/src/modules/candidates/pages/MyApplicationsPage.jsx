/**
 * MyApplicationsPage
 * View and manage user's candidate applications
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { candidateService } from '../../../services';
import { formatDate, getApplicationStatus } from '../../../utils/formatters';
import './applications.css';

const MyApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');

  const getPositionLabel = (application) =>
    application?.position?.name ||
    application?.position_name ||
    'Position unavailable';

  const getPartyLabel = (application) =>
    application?.party?.name ||
    application?.party_name ||
    '';

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getMyApplications();
      setApplications(response.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = (application) => {
    setSelectedApp(application);
    setShowWithdrawModal(true);
  };

  const confirmWithdraw = async () => {
    if (!selectedApp) return;

    try {
      setWithdrawing(true);
      setError('');
      await candidateService.withdrawApplication(selectedApp.id);
      
      // Refresh applications
      await fetchMyApplications();
      setShowWithdrawModal(false);
      setSelectedApp(null);
    } catch (error) {
      console.error('Error withdrawing application:', error);
      setError(error.response?.data?.detail || 'Failed to withdraw application');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading your applications..." />;
  }

  return (
    <div className="applications-page">
      <Container>
        <div className="applications-header">
          <div className="applications-header-content">
            <h1>My Applications</h1>
            <p>Track your candidate application status</p>
          </div>
          <Link to="/apply" className="new-application-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Application
          </Link>
        </div>

        {error && (
          <div className="alert-message error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
            <button onClick={() => setError('')} className="alert-close">×</button>
          </div>
        )}

        {applications.length > 0 ? (
          <div className="applications-grid">
            {applications.map((application) => {
              const status = getApplicationStatus(application.status);
              const canWithdraw = application.status === 'pending';
              
              return (
                <div key={application.id} className="application-card">
                  <div className="application-card-header">
                    <div className="application-card-title">
                      <h3>{getPositionLabel(application)}</h3>
                      <p>{application.election?.title}</p>
                    </div>
                    <span className={`status-badge ${application.status}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="application-info">
                    {(application.party || application.party_name) && (
                      <div className="info-row">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                          <line x1="4" y1="22" x2="4" y2="15"/>
                        </svg>
                        <span>{getPartyLabel(application)}</span>
                      </div>
                    )}
                  </div>

                  <div className="info-section">
                    <div className="info-section-label">Submitted</div>
                    <div className="info-section-content">
                      {formatDate(application.submitted_at, 'datetime')}
                    </div>
                  </div>

                  {application.reviewed_at && (
                    <div className="info-section">
                      <div className="info-section-label">Reviewed</div>
                      <div className="info-section-content">
                        {formatDate(application.reviewed_at, 'datetime')}
                      </div>
                    </div>
                  )}

                  {application.review_notes && (
                    <div className="info-section">
                      <div className="info-section-label">Review Notes</div>
                      <div className="info-section-content">
                        {application.review_notes}
                      </div>
                    </div>
                  )}

                  {application.manifesto && (
                    <div className="info-section">
                      <div className="info-section-label">Manifesto</div>
                      <div className="manifesto-preview">
                        {application.manifesto.length > 150 
                          ? `${application.manifesto.substring(0, 150)}...` 
                          : application.manifesto}
                      </div>
                    </div>
                  )}

                  {(canWithdraw || application.status === 'approved') && (
                    <div className="application-actions">
                      {canWithdraw && (
                        <button
                          className="btn-withdraw"
                          onClick={() => handleWithdraw(application)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                          Withdraw
                        </button>
                      )}
                      {application.status === 'approved' && (
                        <Link
                          to={`/candidates?election=${application.election?.id}`}
                          className="btn-view-profile"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          View Profile
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No Applications Yet</h2>
            <p>You haven't submitted any candidate applications. Apply for an upcoming election to get started!</p>
            <Link to="/apply" className="empty-state-action">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Apply Now
            </Link>
          </div>
        )}

        {/* Withdraw Confirmation Modal */}
        {showWithdrawModal && (
          <div className="modal-overlay" onClick={() => !withdrawing && setShowWithdrawModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-header">Withdraw Application</h3>
              
              <div className="modal-body">
                <div className="modal-warning">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div>
                    <strong>Are you sure?</strong> This action cannot be undone.
                  </div>
                </div>
                
                <p>You are about to withdraw your application for:</p>
                <div className="modal-info-box">
                  <strong>Position:</strong> {getPositionLabel(selectedApp)}
                  <br />
                  <strong>Election:</strong> {selectedApp?.election?.title}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="modal-btn cancel"
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={withdrawing}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn confirm"
                  onClick={confirmWithdraw}
                  disabled={withdrawing}
                >
                  {withdrawing ? (
                    <>
                      <span className="spinner"></span>
                      Withdrawing...
                    </>
                  ) : (
                    'Withdraw'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};

export default MyApplicationsPage;
