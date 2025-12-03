/**
 * ResultsDetailsPage
 * Modern redesigned election results with enhanced visualization
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, EmptyState } from '../../../components/common';
import { electionService, votingService, authService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { formatNumber, formatPercentage } from '../../../utils/formatters';
import './results.css';

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
      
      // Fetch total students count and organize by department/course
      // Use total_voters as fallback since those are students who participated
      // This ensures consistency: if there are votes, there are students
      try {
        const profilesResponse = await authService.getAllProfiles();
        const allProfiles = profilesResponse.data || [];
        const students = allProfiles.filter(profile => 
          profile.user && !profile.user.is_staff && !profile.user.is_superuser
        );
        
        setTotalStudents(Math.max(students.length, resultsData.total_voters || 0));
        
        // Organize students by department and course
        const deptMap = {};
        students.forEach(profile => {
          const deptName = profile.department?.name || 'Unassigned Department';
          const courseName = profile.course?.name || 'Unassigned Course';
          const courseCode = profile.course?.code || 'N/A';
          const yearLevel = profile.year_level || 'N/A';
          const studentId = profile.student_id || 'N/A';
          const fullName = profile.user?.get_full_name?.() || 
                          `${profile.user?.first_name || ''} ${profile.user?.last_name || ''}`.trim() ||
                          profile.user?.username || 'Unknown';
          
          if (!deptMap[deptName]) {
            deptMap[deptName] = {};
          }
          if (!deptMap[deptName][courseName]) {
            deptMap[deptName][courseName] = {
              code: courseCode,
              students: []
            };
          }
          
          deptMap[deptName][courseName].students.push({
            student_id: studentId,
            name: fullName,
            year_level: yearLevel
          });
        });
        
        setStudentsByDept(deptMap);
      } catch (profileError) {
        // If we can't fetch profiles, use total_voters as the student count
        // This ensures the count matches the votes (students who voted)
        console.log('Cannot fetch student count, using voters count as fallback');
        setTotalStudents(resultsData.total_voters || 0);
        setStudentsByDept({});
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
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                          <div className="candidate-name">
                            {candidate.candidate_name}
                            {!electionEnded && isWinner && (
                              <span className="winner-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                WINNER
                              </span>
                            )}
                          </div>
                          <div className="candidate-party">{candidate.party || 'Independent'}</div>
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
                        
                        <div className="progress-bar-container">
                          <div 
                            className={`progress-bar-fill ${isWinner ? 'winner-bar' : rank === 1 ? 'first-bar' : ''}`}
                            style={{ width: `${percentage}%` }}
                          >
                            <span className="progress-shimmer"></span>
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
