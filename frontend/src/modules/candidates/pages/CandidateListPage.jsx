/**
 * CandidateListPage
 * Browse all candidates with filtering - Modern Design
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { candidateService, electionService } from '../../../services';
import '../candidates.css';

const CandidateListPage = () => {
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(searchParams.get('election') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchElections();
  }, []);

  useEffect(() => {
    if (selectedElection) {
      fetchCandidates();
    } else {
      fetchAllCandidates();
    }
  }, [selectedElection]);

  const fetchElections = async () => {
    try {
      const response = await electionService.getAll();
      setElections(response.data || []);
    } catch (error) {
      console.error('Error fetching elections:', error);
    }
  };

  const fetchAllCandidates = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getAll();
      setCandidates(response.data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getByElection(selectedElection);
      setCandidates(response.data || []);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupCandidatesByPosition = () => {
    const grouped = {};
    candidates.forEach(candidate => {
      const positionName = candidate.position?.name || 'Unknown Position';
      if (!grouped[positionName]) {
        grouped[positionName] = [];
      }
      grouped[positionName].push(candidate);
    });
    return grouped;
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading candidates..." />;
  }

  const candidatesByPosition = groupCandidatesByPosition();

  return (
    <div className="candidates-list-page">
      <Container>
        {/* Page Header */}
        <div className="candidates-header">
          <h1>
            Candidates
          </h1>
          <p>
            Browse candidates running for student government positions
          </p>
        </div>

        {/* Election Filter */}
        <div className="candidates-filter-card">
          <div className="row align-items-center">
            <div className="col-md-3">
              <label className="candidates-filter-label">
                Filter by Election
              </label>
            </div>
            <div className="col-md-9">
              <select
                className="form-select candidates-filter-select"
                value={selectedElection}
                onChange={(e) => setSelectedElection(e.target.value)}
              >
                <option value="">All Elections</option>
                {elections.map(election => (
                  <option key={election.id} value={election.id}>
                    {election.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Candidates by Position */}
        {Object.keys(candidatesByPosition).length > 0 ? (
          <div>
            {Object.entries(candidatesByPosition).map(([positionName, positionCandidates]) => (
              <div key={positionName} className="position-section">
                <div className="position-header">
                  <h4>{positionName}</h4>
                </div>
                
                <div className="row g-3">
                  {positionCandidates.map(candidate => (
                    <div key={candidate.id} className="col-md-6 col-lg-4">
                      <div className="candidate-card">
                        <div className="candidate-card-body">
                          <div className="d-flex align-items-center gap-3 mb-1">
                            <div className="candidate-list-avatar">
                              {candidate.photo_url ? (
                                <img
                                  src={candidate.photo_url}
                                  alt={`${candidate.user?.first_name || ''} ${candidate.user?.last_name || ''}`}
                                  className="candidate-list-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.parentElement.querySelector('.candidate-list-avatar-initials');
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <span
                                className="candidate-list-avatar-initials"
                                style={{ display: candidate.photo_url ? 'none' : 'flex' }}
                              >
                                {candidate.user?.first_name?.[0]?.toUpperCase() || 'C'}
                              </span>
                            </div>
                            <div className="flex-grow-1 min-w-0">
                              <h5 className="candidate-name mb-0 text-truncate">
                                {candidate.user?.first_name} {candidate.user?.last_name}
                              </h5>
                              <small className="text-muted text-truncate d-block">
                                {candidate.election?.title}
                              </small>
                            </div>
                          </div>

                          {candidate.party && (
                            <div className="candidate-party-badge">
                              {candidate.party.name}
                            </div>
                          )}

                          {candidate.manifesto && (
                            <p className="candidate-manifesto-preview">
                              {candidate.manifesto}
                            </p>
                          )}

                          <div className="candidate-card-footer">
                            <Link
                              to={`/candidates/${candidate.id}`}
                              className="candidate-view-btn"
                            >
                              <span>View Profile</span>
                              <i className="fas fa-arrow-right"></i>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="candidates-empty">
            <i className="fas fa-user-slash"></i>
            <h3>No Candidates Found</h3>
            <p>
              {selectedElection 
                ? "No candidates have registered for this election yet." 
                : "No candidates available at this time."}
            </p>
          </div>
        )}
      </Container>
    </div>
  );
};

export default CandidateListPage;
