/**
 * MyApplicationsPage
 * View and manage user's candidate applications
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Badge, LoadingSpinner, EmptyState, Button, Modal, Alert } from '../../../components/common';
import { candidateService } from '../../../services';
import { formatDate, getApplicationStatus } from '../../../utils/formatters';

const MyApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState('');

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
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>
            <i className="fas fa-file-alt me-2 text-primary"></i>
            My Applications
          </h1>
          <p className="text-muted mb-0">Track your candidate application status</p>
        </div>
        <Link to="/apply" className="btn btn-primary">
          <i className="fas fa-plus me-2"></i>
          New Application
        </Link>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {applications.length > 0 ? (
        <div className="row g-4">
          {applications.map((application) => {
            const status = getApplicationStatus(application.status);
            const canWithdraw = application.status === 'pending';
            
            return (
              <div key={application.id} className="col-md-6 col-lg-4">
                <Card hoverable className="h-100">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="mb-1">{application.position?.name}</h5>
                      <small className="text-muted">{application.election?.title}</small>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  {application.party && (
                    <div className="mb-2">
                      <i className="fas fa-flag me-2 text-primary"></i>
                      <span>{application.party.name}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <small className="text-muted d-block">Submitted:</small>
                    <strong>{formatDate(application.submitted_at, 'datetime')}</strong>
                  </div>

                  {application.reviewed_at && (
                    <div className="mb-3">
                      <small className="text-muted d-block">Reviewed:</small>
                      <strong>{formatDate(application.reviewed_at, 'datetime')}</strong>
                    </div>
                  )}

                  {application.review_notes && (
                    <div className="mb-3">
                      <small className="text-muted d-block">Review Notes:</small>
                      <p className="small mb-0">{application.review_notes}</p>
                    </div>
                  )}

                  {application.manifesto && (
                    <div className="mb-3">
                      <small className="text-muted d-block">Manifesto:</small>
                      <p className="small text-truncate mb-0">
                        {application.manifesto.substring(0, 100)}...
                      </p>
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-auto">
                    {canWithdraw && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleWithdraw(application)}
                        className="flex-grow-1"
                      >
                        <i className="fas fa-times me-1"></i>
                        Withdraw
                      </Button>
                    )}
                    {application.status === 'approved' && (
                      <Link
                        to={`/candidates?election=${application.election?.id}`}
                        className="btn btn-sm btn-success flex-grow-1"
                      >
                        <i className="fas fa-eye me-1"></i>
                        View Profile
                      </Link>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="fas fa-inbox"
          title="No Applications Yet"
          message="You haven't submitted any candidate applications. Apply for an upcoming election to get started!"
          actionText="Apply Now"
          onAction={() => window.location.href = '/apply'}
        />
      )}

      {/* Withdraw Confirmation Modal */}
      <Modal
        show={showWithdrawModal}
        onHide={() => setShowWithdrawModal(false)}
        title="Withdraw Application"
        confirmText="Withdraw"
        cancelText="Cancel"
        onConfirm={confirmWithdraw}
        confirmVariant="danger"
        confirmLoading={withdrawing}
      >
        <Alert variant="warning">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <strong>Are you sure?</strong> This action cannot be undone.
        </Alert>
        <p>You are about to withdraw your application for:</p>
        <div className="bg-light p-3 rounded">
          <strong>Position:</strong> {selectedApp?.position?.name}<br />
          <strong>Election:</strong> {selectedApp?.election?.title}
        </div>
      </Modal>
    </Container>
  );
};

export default MyApplicationsPage;
