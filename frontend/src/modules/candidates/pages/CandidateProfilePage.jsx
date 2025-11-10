/**
 * CandidateProfilePage
 * View candidate profile and manifesto - Modern Design
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { candidateService } from '../../../services';
import { getInitials } from '../../../utils/helpers';
import './candidates.css';

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
        <div className="candidates-empty">
          <i className="fas fa-user-slash"></i>
          <h3>Candidate Not Found</h3>
          <p>The candidate profile you're looking for doesn't exist.</p>
          <Link to="/candidates" className="action-btn action-btn-primary mt-4" style={{ display: 'inline-flex' }}>
            <i className="fas fa-arrow-left"></i>
            Back to Candidates
          </Link>
        </div>
      </Container>
    );
  }

  const getGradientColor = (id) => {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ];
    return gradients[id % gradients.length];
  };

  return (
    <Container className="profile-page">
      {/* Back Button */}
      <Link to="/candidates" className="profile-back-btn">
        <i className="fas fa-arrow-left"></i>
        Back to Candidates
      </Link>

      <div className="row g-4">
        {/* Profile Sidebar */}
        <div className="col-lg-4">
          <div className="profile-sidebar-card">
            <div 
              className="profile-avatar-large"
              style={{
                background: getGradientColor(candidate.id)
              }}
            >
              {getInitials(`${candidate.user?.first_name} ${candidate.user?.last_name}`)}
            </div>
            
            <h3 className="profile-name">
              {candidate.user?.first_name} {candidate.user?.last_name}
            </h3>
            
            <div className="profile-candidate-badge">
              <i className="fas fa-check-circle"></i>
              Candidate
            </div>
            
            {candidate.party && (
              <div className="profile-party">
                <i className="fas fa-flag"></i>
                <strong>{candidate.party.name}</strong>
              </div>
            )}

            <hr className="profile-divider" />

            <div className="profile-details">
              <h6>Campaign Details</h6>
              
              <div className="profile-detail-item">
                <i className="fas fa-briefcase"></i>
                <div className="profile-detail-content">
                  <strong>Position</strong>
                  <span>{candidate.position?.name}</span>
                </div>
              </div>

              <div className="profile-detail-item">
                <i className="fas fa-calendar"></i>
                <div className="profile-detail-content">
                  <strong>Election</strong>
                  <span>{candidate.election?.title}</span>
                </div>
              </div>

              {candidate.election?.start_date && (
                <div className="profile-detail-item">
                  <i className="fas fa-clock"></i>
                  <div className="profile-detail-content">
                    <strong>Voting Period</strong>
                    <span>
                      {new Date(candidate.election.start_date).toLocaleDateString()} - {' '}
                      {new Date(candidate.election.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-lg-8">
          {/* Manifesto Card */}
          <div className="manifesto-card">
            <div className="manifesto-header">
              <h4>
                <i className="fas fa-file-alt"></i>
                Campaign Manifesto
              </h4>
            </div>
            
            {candidate.manifesto ? (
              <div className="manifesto-content">
                {candidate.manifesto}
              </div>
            ) : (
              <div className="manifesto-empty">
                <i className="fas fa-file"></i>
                <p>No manifesto provided yet.</p>
              </div>
            )}
          </div>

          {/* Actions Card */}
          {candidate.election && (
            <div className="actions-card">
              <h5>
                <i className="fas fa-bolt"></i>
                Take Action
              </h5>
              <div className="action-buttons">
                <Link 
                  to={`/elections/${candidate.election.id}`}
                  className="action-btn action-btn-primary"
                >
                  <i className="fas fa-info-circle"></i>
                  View Election
                </Link>
                
                {candidate.election.is_active_now && (
                  <Link 
                    to={`/vote/${candidate.election.id}`}
                    className="action-btn action-btn-success"
                  >
                    <i className="fas fa-vote-yea"></i>
                    Vote Now
                  </Link>
                )}
                
                {candidate.election.is_finished && (
                  <Link 
                    to={`/results/${candidate.election.id}`}
                    className="action-btn action-btn-info"
                  >
                    <i className="fas fa-chart-bar"></i>
                    View Results
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

export default CandidateProfilePage;
