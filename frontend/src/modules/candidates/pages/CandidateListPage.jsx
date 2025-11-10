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
import './candidates.css';

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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '600',
          color: '#1a202c',
          marginBottom: '0.5rem'
        }}>
          Candidates
        </h1>
        <p style={{ color: '#718096', fontSize: '1rem', margin: 0 }}>
          Browse candidates running for student government positions
        </p>
      </div>

      {/* Election Filter */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div className="row align-items-center">
          <div className="col-md-3">
            <label style={{
              fontWeight: '600',
              color: '#2d3748',
              fontSize: '0.95rem',
              marginBottom: '0.5rem'
            }}>
              Filter by Election
            </label>
          </div>
          <div className="col-md-9">
            <select
              className="form-select"
              value={selectedElection}
              onChange={(e) => setSelectedElection(e.target.value)}
              style={{
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                padding: '0.625rem 1rem',
                fontSize: '0.95rem'
              }}
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
            <div key={positionName} style={{ 
              background: 'white',
              borderRadius: '8px',
              padding: '2rem',
              marginBottom: '2rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e2e8f0'
              }}>
                <h4 style={{ 
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#1a202c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>{positionName}</h4>
              </div>
              
              <div className="row g-3">
                {positionCandidates.map(candidate => (
                  <div key={candidate.id} className="col-md-6 col-lg-4">
                    <div style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      height: '100%',
                      transition: 'all 0.2s ease',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e0';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <h6 style={{ 
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: '#2d3748',
                          marginBottom: '0.5rem'
                        }}>
                          {candidate.user?.first_name} {candidate.user?.last_name}
                        </h6>
                        {candidate.party && (
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#718096',
                            marginBottom: '0.5rem'
                          }}>
                            {candidate.party.name}
                          </div>
                        )}
                        {candidate.election && (
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#a0aec0'
                          }}>
                            {candidate.election.title}
                          </div>
                        )}
                      </div>
                    
                      {candidate.manifesto && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#4a5568',
                          lineHeight: '1.5',
                          marginBottom: '1rem'
                        }}>
                          {candidate.manifesto.length > 100 
                            ? `${candidate.manifesto.substring(0, 100)}...` 
                            : candidate.manifesto}
                        </p>
                      )}
                    
                      <Link 
                        to={`/candidates/${candidate.id}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '0.625rem',
                          textAlign: 'center',
                          border: '1px solid #2d3748',
                          backgroundColor: 'white',
                          color: '#2d3748',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          textDecoration: 'none',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2d3748';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = '#2d3748';
                        }}
                      >
                        View Profile
                      </Link>
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
