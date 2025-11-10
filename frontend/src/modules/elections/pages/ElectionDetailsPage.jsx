/**
 * ElectionDetailsPage
 * Show election details with positions and candidates
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, EmptyState } from '../../../components/common';
import { electionService, candidateService } from '../../../services';
import { formatDate, getElectionStatus } from '../../../utils/formatters';
import '../elections.css';

const ElectionDetailsPage = () => {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchElectionDetails();
  }, [id]);

  const fetchElectionDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch election details
      const electionResponse = await electionService.getById(id);
      setElection(electionResponse.data);
      
      // Fetch candidates
      const candidatesResponse = await candidateService.getByElection(id);
      setCandidates(candidatesResponse.data || []);
    } catch (error) {
      console.error('Error fetching election details:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupCandidatesByPosition = () => {
    const grouped = {};
    candidates.forEach(candidate => {
      const positionName = candidate.position?.name || 'Unknown Position';
      if (!grouped[positionName]) {
        grouped[positionName] = {
          position: candidate.position,
          candidates: []
        };
      }
      grouped[positionName].candidates.push(candidate);
    });
    return grouped;
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading election details..." />;
  }

  if (!election) {
    return (
      <Container>
        <EmptyState
          icon="fas fa-exclamation-circle"
          title="Election Not Found"
          message="The election you're looking for doesn't exist."
          actionText="Back to Elections"
          onAction={() => window.location.href = '/elections'}
        />
      </Container>
    );
  }

  const status = getElectionStatus(election);
  const statusClass = status.label.toLowerCase().replace(' ', '-');
  const candidatesByPosition = groupCandidatesByPosition();

  return (
    <Container>
      {/* Header */}
      <div className="details-header">
        <div className="details-title-section">
          <h1 className="details-title">{election.title}</h1>
          <div className={`status-badge ${statusClass}`}>{status.label}</div>
        </div>
        <Link to="/elections" className="back-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          <span>Back to Elections</span>
        </Link>
      </div>

      {/* Election Info Card */}
      <div className="info-card">
        <div className="info-card-header">
          <div className="info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <h2 className="info-title">Election Information</h2>
        </div>
        
        {election.description && (
          <p className="info-description">{election.description}</p>
        )}

        <div className="info-grid">
          <div className="info-item">
            <div className="info-item-icon start">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="info-item-content">
              <div className="info-item-label">Start Date</div>
              <div className="info-item-value">{formatDate(election.start_date, 'datetime')}</div>
            </div>
          </div>

          <div className="info-item">
            <div className="info-item-icon end">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div className="info-item-content">
              <div className="info-item-label">End Date</div>
              <div className="info-item-value">{formatDate(election.end_date, 'datetime')}</div>
            </div>
          </div>

          <div className="info-item">
            <div className="info-item-icon votes">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div className="info-item-content">
              <div className="info-item-label">Total Votes Cast</div>
              <div className="info-item-value">{election.total_votes || 0}</div>
            </div>
          </div>

          <div className="info-item">
            <div className="info-item-icon candidates">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="info-item-content">
              <div className="info-item-label">Total Candidates</div>
              <div className="info-item-value">{candidates.length}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(status.label === 'Active' || status.label === 'Finished') && (
          <div className="action-buttons">
            {status.label === 'Active' && (
              <>
                <Link to={`/vote/${election.id}`} className="action-btn action-btn-primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span>Cast Your Vote</span>
                </Link>
                <Link to={`/results/${election.id}`} className="action-btn action-btn-success">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <span>View Live Results</span>
                </Link>
                <Link to={`/candidates?election=${election.id}`} className="action-btn action-btn-secondary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>View Candidates</span>
                </Link>
              </>
            )}

            {status.label === 'Finished' && (
              <Link to={`/results/${election.id}`} className="action-btn action-btn-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                <span>View Final Results</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Candidates by Position */}
      <div className="candidates-section-header">
        <div className="candidates-section-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h2 className="candidates-section-title">Candidates by Position</h2>
      </div>

      {Object.keys(candidatesByPosition).length > 0 ? (
        <div>
          {Object.entries(candidatesByPosition).map(([positionName, data]) => (
            <div key={positionName} className="position-card">
              <h3 className="position-header">{positionName}</h3>
              <div className="candidates-list">
                {data.candidates.map(candidate => (
                  <div key={candidate.id} className="candidate-card-item">
                    <div className="candidate-avatar">
                      {candidate.user?.first_name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="candidate-details">
                      <div className="candidate-name">
                        {candidate.user?.first_name} {candidate.user?.last_name}
                      </div>
                      {candidate.party && (
                        <div className="candidate-party-badge">
                          {candidate.party.name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="fas fa-user-slash"
          title="No Candidates Yet"
          message="No candidates have registered for this election."
        />
      )}
    </Container>
  );
};

export default ElectionDetailsPage;
