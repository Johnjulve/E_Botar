/**
 * CandidateProfilePage
 * View candidate profile and manifesto
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Badge, LoadingSpinner, EmptyState } from '../../../components/common';
import { candidateService } from '../../../services';
import { getInitials } from '../../../utils/helpers';

const CandidateProfilePage = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getById(id);
      setCandidate(response.data);
    } catch (error) {
      console.error('Error fetching candidate:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading candidate profile..." />;
  }

  if (!candidate) {
    return (
      <Container>
        <EmptyState
          icon="fas fa-user-slash"
          title="Candidate Not Found"
          message="The candidate profile you're looking for doesn't exist."
          actionText="Back to Candidates"
          onAction={() => window.location.href = '/candidates'}
        />
      </Container>
    );
  }

  return (
    <Container>
      {/* Back Button */}
      <div className="mb-4">
        <Link to="/candidates" className="btn btn-outline-secondary">
          <i className="fas fa-arrow-left me-2"></i>
          Back to Candidates
        </Link>
      </div>

      <div className="row g-4">
        {/* Profile Card */}
        <div className="col-lg-4">
          <Card>
            <div className="text-center">
              <div 
                className="rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold mb-3"
                style={{
                  width: '120px',
                  height: '120px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  fontSize: '3rem'
                }}
              >
                {getInitials(`${candidate.user?.first_name} ${candidate.user?.last_name}`)}
              </div>
              
              <h3 className="mb-2">
                {candidate.user?.first_name} {candidate.user?.last_name}
              </h3>
              
              <Badge variant="success" className="mb-3">Candidate</Badge>
              
              {candidate.party && (
                <div className="mb-3">
                  <i className="fas fa-flag me-2 text-primary"></i>
                  <strong>{candidate.party.name}</strong>
                </div>
              )}

              <hr />

              <div className="text-start">
                <h6 className="text-muted mb-3">Running For:</h6>
                <div className="mb-2">
                  <i className="fas fa-briefcase me-2 text-primary"></i>
                  <strong>{candidate.position?.name}</strong>
                </div>
                <div className="mb-2">
                  <i className="fas fa-calendar me-2 text-info"></i>
                  {candidate.election?.title}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Manifesto & Details */}
        <div className="col-lg-8">
          <Card>
            <h4 className="mb-3">
              <i className="fas fa-file-alt me-2 text-primary"></i>
              Campaign Manifesto
            </h4>
            
            {candidate.manifesto ? (
              <div className="manifesto-content">
                <p className="text-justify" style={{ whiteSpace: 'pre-wrap' }}>
                  {candidate.manifesto}
                </p>
              </div>
            ) : (
              <p className="text-muted">No manifesto provided.</p>
            )}
          </Card>

          {/* Actions */}
          {candidate.election && (
            <Card className="mt-4">
              <h5 className="mb-3">Take Action</h5>
              <div className="d-flex gap-2 flex-wrap">
                <Link 
                  to={`/elections/${candidate.election.id}`}
                  className="btn btn-primary"
                >
                  <i className="fas fa-info-circle me-2"></i>
                  View Election
                </Link>
                {candidate.election.is_active_now && (
                  <Link 
                    to={`/vote/${candidate.election.id}`}
                    className="btn btn-success"
                  >
                    <i className="fas fa-vote-yea me-2"></i>
                    Vote Now
                  </Link>
                )}
                {candidate.election.is_finished && (
                  <Link 
                    to={`/results/${candidate.election.id}`}
                    className="btn btn-info"
                  >
                    <i className="fas fa-chart-bar me-2"></i>
                    View Results
                  </Link>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
};

export default CandidateProfilePage;
