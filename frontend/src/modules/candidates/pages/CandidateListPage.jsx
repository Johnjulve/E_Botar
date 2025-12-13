/**
 * CandidateListPage
 * Browse all candidates with filtering - Modern Design
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { candidateService, electionService } from '../../../services';
import { getInitials } from '../../../utils/helpers';
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
                        <h6 className="candidate-name">
                          {candidate.user?.first_name} {candidate.user?.last_name}
                        </h6>
                        {candidate.party && (
                          <div className="candidate-party-badge">
                            {candidate.party.name}
                          </div>
                        )}
                        {candidate.election && (
                          <div className="candidate-election-info">
                            {candidate.election.title}
                          </div>
                        )}
                    
                      {candidate.manifesto && (
                        <p className="candidate-manifesto-preview">
                          {candidate.manifesto.length > 100 
                            ? `${candidate.manifesto.substring(0, 100)}...` 
                            : candidate.manifesto}
                        </p>
                      )}
                    
                      <div className="candidate-card-footer">
                        <Link 
                          to={`/candidates/${candidate.id}`}
                          className="candidate-view-btn"
                        >
                          View Profile
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
  );
};

// Helper function to get gradient colors based on ID
const getGradientColors = (id) => {
  const gradients = [
    '#667eea 0%, #764ba2 100%',
    '#f093fb 0%, #f5576c 100%',
    '#4facfe 0%, #00f2fe 100%',
    '#43e97b 0%, #38f9d7 100%',
    '#fa709a 0%, #fee140 100%',
    '#30cfd0 0%, #330867 100%',
    '#a8edea 0%, #fed6e3 100%',
    '#ff9a9e 0%, #fecfef 100%',
  ];
  return gradients[id % gradients.length];
};

export default CandidateListPage;
