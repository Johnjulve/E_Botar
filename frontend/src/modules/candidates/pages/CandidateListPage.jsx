/**
 * CandidateListPage
 * Browse all candidates with filtering
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Badge, LoadingSpinner, EmptyState, Button } from '../../../components/common';
import { candidateService, electionService } from '../../../services';
import { getInitials } from '../../../utils/helpers';

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
      <div className="mb-4">
        <h1>
          <i className="fas fa-users me-2 text-primary"></i>
          Candidates
        </h1>
        <p className="text-muted">Browse candidates running for student government positions</p>
      </div>

      {/* Election Filter */}
      <Card className="mb-4">
        <div className="row align-items-center">
          <div className="col-md-3">
            <label className="form-label fw-semibold">Filter by Election:</label>
          </div>
          <div className="col-md-9">
            <select
              className="form-select"
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
      </Card>

      {/* Candidates by Position */}
      {Object.keys(candidatesByPosition).length > 0 ? (
        <div>
          {Object.entries(candidatesByPosition).map(([positionName, positionCandidates]) => (
            <Card key={positionName} className="mb-4">
              <h4 className="mb-3 text-brand">
                <i className="fas fa-briefcase me-2"></i>
                {positionName}
              </h4>
              <div className="row g-3">
                {positionCandidates.map(candidate => (
                  <div key={candidate.id} className="col-md-6 col-lg-4">
                    <div className="border rounded p-3 h-100 hover-lift" style={{ cursor: 'pointer' }}>
                      <div className="d-flex align-items-start mb-2">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-3"
                          style={{
                            width: '60px',
                            height: '60px',
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            flexShrink: 0
                          }}
                        >
                          {getInitials(`${candidate.user?.first_name} ${candidate.user?.last_name}`)}
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1">
                            {candidate.user?.first_name} {candidate.user?.last_name}
                          </h6>
                          {candidate.party && (
                            <Badge variant="info" className="mb-2">{candidate.party.name}</Badge>
                          )}
                          {candidate.election && (
                            <div className="small text-muted">
                              <i className="fas fa-calendar me-1"></i>
                              {candidate.election.title}
                            </div>
                          )}
                        </div>
                      </div>
                      {candidate.manifesto && (
                        <p className="small text-muted mb-2">
                          {candidate.manifesto.substring(0, 100)}...
                        </p>
                      )}
                      <Link 
                        to={`/candidates/${candidate.id}`}
                        className="btn btn-sm btn-outline-primary w-100"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="fas fa-user-slash"
          title="No Candidates Found"
          message={selectedElection ? "No candidates have registered for this election yet." : "No candidates available at this time."}
        />
      )}
    </Container>
  );
};

export default CandidateListPage;
