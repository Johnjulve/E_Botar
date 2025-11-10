/**
 * ResultsDetailsPage
 * Display election results with vote counts and percentages
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Badge, LoadingSpinner, EmptyState, Button } from '../../../components/common';
import { electionService, votingService } from '../../../services';
import { formatNumber, formatPercentage } from '../../../utils/formatters';

const ResultsDetailsPage = () => {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [results, setResults] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [electionEnded, setElectionEnded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchResults();
    
    // Auto-refresh every 10 seconds if election is active
    let interval;
    if (autoRefresh && isActive) {
      interval = setInterval(() => {
        fetchResults();
      }, 10000); // Refresh every 10 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, autoRefresh, isActive]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // Fetch election details
      const electionResponse = await electionService.getById(id);
      setElection(electionResponse.data);
      
      // Fetch results
      const resultsResponse = await votingService.getElectionResults(id);
      const resultsData = resultsResponse.data;
      
      setResults(resultsData.positions || []);
      setElectionEnded(resultsData.election_ended || false);
      setIsActive(resultsData.is_active || false);
      
      // Set statistics from results data
      setStatistics({
        total_voters: resultsData.total_voters || 0,
        total_votes: resultsData.total_ballots || 0,
        total_positions: resultsData.positions?.length || 0,
        turnout_percentage: 0 // Can calculate if we have total eligible voters
      });
    } catch (error) {
      console.error('Error fetching results:', error);
      setError(error.response?.data?.detail || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading results..." />;
  }

  if (error) {
    return (
      <Container>
        <EmptyState
          icon="fas fa-exclamation-circle"
          title="Results Not Available"
          message={error}
          actionText="Back to Elections"
          onAction={() => window.location.href = '/elections'}
        />
      </Container>
    );
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

  const getWinnerBadge = (index) => {
    const badges = [
      { icon: 'fas fa-trophy', color: '#ffd700', text: '1st Place' },
      { icon: 'fas fa-medal', color: '#c0c0c0', text: '2nd Place' },
      { icon: 'fas fa-award', color: '#cd7f32', text: '3rd Place' }
    ];
    return badges[index] || null;
  };

  return (
    <Container>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h1 className="mb-2">
            <i className="fas fa-chart-bar me-2 text-primary"></i>
            Election Results
            {isActive && (
              <Badge variant="success" className="ms-2">
                <i className="fas fa-circle me-1" style={{ fontSize: '0.5rem' }}></i>
                Live
              </Badge>
            )}
          </h1>
          <h4 className="text-muted">{election.title}</h4>
          {isActive && (
            <div className="text-muted small mt-2">
              <i className="fas fa-sync-alt me-1"></i>
              Auto-refreshing every 10 seconds
              <button 
                onClick={() => setAutoRefresh(!autoRefresh)} 
                className="btn btn-sm btn-link ms-2"
                style={{ textDecoration: 'none' }}
              >
                {autoRefresh ? 'Pause' : 'Resume'}
              </button>
            </div>
          )}
          {electionEnded && (
            <div className="alert alert-info mt-2">
              <i className="fas fa-flag-checkered me-2"></i>
              Election has ended. Winners are highlighted below.
            </div>
          )}
        </div>
        <Link to="/elections" className="btn btn-outline-secondary">
          <i className="fas fa-arrow-left me-2"></i>
          Back to Elections
        </Link>
      </div>

      {/* Statistics Overview */}
      {statistics && (
        <Card className="mb-4">
          <h5 className="mb-3">
            <i className="fas fa-chart-pie me-2 text-info"></i>
            Overview Statistics
          </h5>
          <div className="row g-3">
            <div className="col-md-3 col-6">
              <div className="text-center">
                <div className="fs-2 fw-bold text-primary">{statistics.total_voters || 0}</div>
                <div className="text-muted small">Total Voters</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="text-center">
                <div className="fs-2 fw-bold text-success">{statistics.total_votes || 0}</div>
                <div className="text-muted small">Total Votes Cast</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="text-center">
                <div className="fs-2 fw-bold text-info">{statistics.total_positions || 0}</div>
                <div className="text-muted small">Positions</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="text-center">
                <div className="fs-2 fw-bold text-warning">
                  {formatPercentage(statistics.turnout_percentage || 0, 1)}
                </div>
                <div className="text-muted small">Voter Turnout</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results by Position */}
      {results.length > 0 ? (
        <div className="mb-4">
          {results.map((positionResult, index) => (
            <Card key={index} className="mb-4">
              <h4 className="mb-3 text-brand">{positionResult.position_name}</h4>
              <div className="text-muted small mb-3">
                Total Votes: {formatNumber(positionResult.total_votes)}
              </div>

              <div className="d-grid gap-3">
                {positionResult.candidates.map((candidate, candidateIndex) => {
                  const winnerBadge = electionEnded && candidate.is_winner ? getWinnerBadge(0) : null;
                  const percentage = parseFloat(candidate.percentage) || 0;
                  const isWinner = candidate.is_winner && electionEnded;
                  
                  return (
                    <div 
                      key={candidateIndex} 
                      className={`border rounded p-3 ${isWinner ? 'border-warning border-3 bg-light' : ''}`}
                      style={isWinner ? { boxShadow: '0 0 20px rgba(255, 193, 7, 0.3)' } : {}}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center flex-grow-1">
                          {isWinner && (
                            <i 
                              className="fas fa-trophy me-2"
                              style={{ color: '#ffd700', fontSize: '1.5rem' }}
                            ></i>
                          )}
                          <div className="flex-grow-1">
                            <div className="fw-bold fs-5">
                              {candidate.candidate_name}
                              {isWinner && (
                                <span className="badge bg-warning text-dark ms-2">
                                  <i className="fas fa-crown me-1"></i>
                                  WINNER
                                </span>
                              )}
                            </div>
                            <div className="text-muted small">{candidate.party || 'Independent'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-semibold">
                          {formatNumber(candidate.vote_count)} votes
                        </span>
                        <span className={`fw-bold ${isWinner ? 'text-warning' : 'text-success'}`}>
                          {formatPercentage(percentage, 1)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="progress" style={{ height: '10px' }}>
                        <div
                          className={`progress-bar ${isWinner ? 'bg-warning' : candidateIndex === 0 ? 'bg-success' : 'bg-secondary'}`}
                          role="progressbar"
                          style={{ width: `${percentage}%` }}
                          aria-valuenow={percentage}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="fas fa-inbox"
          title="No Results Available"
          message="Results will be available after the election ends and votes are tallied."
        />
      )}

      {/* Actions */}
      <div className="d-flex gap-2 justify-content-center">
        <Link to={`/statistics/${id}`} className="btn btn-info">
          <i className="fas fa-chart-line me-2"></i>
          View Statistics
        </Link>
        <Link to={`/elections/${id}`} className="btn btn-primary">
          <i className="fas fa-info-circle me-2"></i>
          Election Details
        </Link>
      </div>
    </Container>
  );
};

export default ResultsDetailsPage;
