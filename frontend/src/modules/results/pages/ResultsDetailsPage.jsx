/**
 * ResultsDetailsPage
 * Modern redesigned election results with enhanced visualization
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, EmptyState } from '../../../components/common';
import { electionService, votingService, authService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate, formatNumber, formatPercentage } from '../../../utils/formatters';
import './results.css';

// Component to auto-shrink text to fit one line
const AutoFitText = ({ children, className = '', minFontSize = 14, maxFontSize = 20 }) => {
  const textRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const adjustFontSize = () => {
      if (!textRef.current || !containerRef.current) return;
      
      const container = containerRef.current;
      const text = textRef.current;
      
      // Reset to max size
      text.style.fontSize = `${maxFontSize}px`;
      
      // Check if text overflows
      if (text.scrollWidth > container.clientWidth) {
        // Binary search for optimal font size
        let min = minFontSize;
        let max = maxFontSize;
        let size = maxFontSize;
        let bestFit = maxFontSize;
        
        while (min <= max) {
          size = Math.floor((min + max) / 2);
          text.style.fontSize = `${size}px`;
          
          if (text.scrollWidth <= container.clientWidth) {
            bestFit = size;
            min = size + 1;
          } else {
            max = size - 1;
          }
        }
        
        // Set final size
        text.style.fontSize = `${Math.max(bestFit, minFontSize)}px`;
      } else {
        // Text fits, use max size
        text.style.fontSize = `${maxFontSize}px`;
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(adjustFontSize, 0);
    
    // Adjust on window resize
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(adjustFontSize, 0);
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [children, minFontSize, maxFontSize]);

  return (
    <div ref={containerRef} className={className} style={{ overflow: 'hidden', width: '100%', minWidth: 0, textAlign: 'center' }}>
      <span ref={textRef} style={{ whiteSpace: 'nowrap', display: 'inline-block' }}>
        {children}
      </span>
    </div>
  );
};

const ResultsDetailsPage = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [election, setElection] = useState(null);
  const [results, setResults] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [electionEnded, setElectionEnded] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [resultsLocked, setResultsLocked] = useState(false);
  const [availableAfter, setAvailableAfter] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentsByDept, setStudentsByDept] = useState({});

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
      setError('');
      
      // Fetch election details
      const electionResponse = await electionService.getById(id);
      const electionData = electionResponse.data;
      setElection(electionData);
      
      try {
        // Fetch results
        const resultsResponse = await votingService.getElectionResults(id);
        const resultsData = resultsResponse.data;
        
        setResultsLocked(false);
        setAvailableAfter('');
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
        
        // Use total_eligible_students from results data (calculated on backend)
        // This ensures accurate count based on election eligibility rules
        setTotalStudents(resultsData.total_eligible_students || resultsData.total_voters || 0);
        
        // Note: We don't fetch all profiles anymore since non-admin users can't access them
        // The backend calculates eligible students based on election type and eligibility rules
        setStudentsByDept({});
      } catch (resultsError) {
        const status = resultsError.response?.status;
        if (status === 403) {
          const availableDate = resultsError.response?.data?.available_after || electionData?.end_date;
          setResults([]);
          setStatistics(null);
          setResultsLocked(true);
          setAvailableAfter(availableDate);
          setIsActive(electionData?.is_active ?? false);
          setElectionEnded(false);
          setAutoRefresh(false);
          return;
        }
        
        throw resultsError;
      }
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

  if (resultsLocked) {
    const endDateText = formatDate(availableAfter || election.end_date, 'datetime');
    return (
      <Container>
        <EmptyState
          icon="fas fa-lock"
          title="Results Hidden"
          message={`Results will be available after the election ends${endDateText ? ` on ${endDateText}` : ''}.`}
          actionText="Back to Elections"
          onAction={() => window.location.href = '/elections'}
        />
      </Container>
    );
  }

  return (
    <div className="results-page">
      <Container>
        {/* Header Section */}
        <div className="results-header">
          <div className="results-header-content">
            <div className="results-header-top">
              <Link to="/elections" className="back-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/>
                  <polyline points="12 19 5 12 12 5"/>
                </svg>
                <span>Back to Elections</span>
              </Link>
              
              {isActive && (
                <div className="live-badge">
                  <span className="live-indicator"></span>
                  <span>LIVE</span>
                </div>
              )}
              
              {electionEnded && (
                <div className="ended-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span>COMPLETED</span>
                </div>
              )}
            </div>
            
            <h1 className="results-title">{election.title}</h1>
            <p className="results-subtitle">Election Results</p>
            
            <div className="results-header-controls">
              {isActive && (
                <div className="auto-refresh-control">
                  <svg className={autoRefresh ? 'spinning' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  <span>Auto-refreshing every 10 seconds</span>
                  <button 
                    onClick={() => setAutoRefresh(!autoRefresh)} 
                    className="refresh-toggle"
                  >
                    {autoRefresh ? 'Pause' : 'Resume'}
                  </button>
                </div>
              )}
              
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card votes">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatNumber(totalStudents || 0)}</div>
              <div className="stat-label">Students</div>
            </div>
          </div>
          
          <div className="stat-card votes">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatNumber(statistics?.total_voters || statistics?.total_votes || statistics?.total_ballots || 0)}</div>
              <div className="stat-label">Votes Recorded</div>
            </div>
          </div>
        </div>

        {/* Results by Position */}
        {results.length > 0 ? (
          <div className="results-container">
            {results.map((positionResult, posIndex) => (
              <div key={posIndex} className="position-section">
                <div className="position-header">
                  <h2 className="position-title">{positionResult.position_name}</h2>
                  <span className="position-votes">{formatNumber(positionResult.total_votes)} total votes</span>
                </div>

                <div className="candidates-list">
                  {positionResult.candidates.map((candidate, candIndex) => {
                    const percentage = parseFloat(candidate.percentage) || 0;
                    const isWinner = candidate.is_winner && electionEnded;
                    const rank = candIndex + 1;
                    
                    return (
                      <div 
                        key={candIndex} 
                        className={`candidate-card ${isWinner ? 'winner' : ''} ${rank === 1 ? 'first' : ''} ${rank === 2 ? 'second' : ''} ${rank === 3 ? 'third' : ''}`}
                      >
                        <div className="candidate-card-top">
                          {/* Remove crown/rank icons for finished elections */}
                          {!electionEnded && (
                            <div className="candidate-rank">
                              {rank === 1 && (
                                <svg className="rank-icon gold" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                                </svg>
                              )}
                              {rank === 2 && (
                                <svg className="rank-icon silver" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                                </svg>
                              )}
                              {rank === 3 && (
                                <svg className="rank-icon bronze" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                                </svg>
                              )}
                              {rank > 3 && <span className="rank-number">#{rank}</span>}
                            </div>
                          )}
                          
                          <div className="candidate-info">
                            <AutoFitText className="candidate-name" minFontSize={14} maxFontSize={20}>
                              {candidate.candidate_name}
                              {!electionEnded && isWinner && (
                                <span className="winner-badge">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                  WINNER
                                </span>
                              )}
                            </AutoFitText>
                            <div className="candidate-party">{candidate.party || 'Independent'}</div>
                          </div>
                        </div>
                        
                        <div className="candidate-stats">
                          <div className="vote-count">
                            <span className="count-number">{formatNumber(candidate.vote_count)}</span>
                            <span className="count-label">votes</span>
                          </div>
                          <div className={`vote-percentage ${isWinner ? 'winner-percentage' : ''}`}>
                            {formatPercentage(percentage, 1)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="fas fa-inbox"
            title="No Results Available"
            message="Results will be available after the election ends and votes are tallied."
          />
        )}
      </Container>
    </div>
  );
};

export default ResultsDetailsPage;
