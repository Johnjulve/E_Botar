/**
 * DashboardPage (Home Page)
 * Main landing page showing current administration and election info
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Button, Badge, LoadingSpinner, EmptyState } from '../../../components/common';
import { electionService, candidateService, votingService, authService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate } from '../../../utils/formatters';
import '../../../modules/profile/dashboard.css';

const DashboardPage = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentElection, setCurrentElection] = useState(null);
  const [previousElection, setpreviousElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [currentAdministration, setCurrentAdministration] = useState([]); // Winners from last election
  const [totalStudents, setTotalStudents] = useState(0); // Total number of students

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch active election
      const activeResponse = await electionService.getActive();
      const activeElection = activeResponse.data?.[0] || null;
      setCurrentElection(activeElection);
      
      // Fetch finished elections (for previous winners/current administration)
      const finishedResponse = await electionService.getFinished();
      const lastFinished = finishedResponse.data?.[0] || null;
      setpreviousElection(lastFinished);
      
      // Fetch winners from the last completed election (current administration)
      if (lastFinished) {
        try {
          const resultsResponse = await votingService.getElectionResults(lastFinished.id);
          const resultsData = resultsResponse.data;
          
          // Extract winners from results
          const winners = [];
          if (resultsData.positions) {
            resultsData.positions.forEach(position => {
              if (position.candidates && position.candidates.length > 0) {
                // Find the winner (first candidate with is_winner flag or highest votes)
                const winner = position.candidates.find(c => c.is_winner) || 
                              (position.candidates.length > 0 && position.candidates[0].vote_count > 0 ? position.candidates[0] : null);
                if (winner && winner.vote_count > 0) {
                  winners.push({
                    position: position.position_name || position.name,
                    candidate: winner,
                    vote_count: winner.vote_count,
                    percentage: winner.percentage || 0
                  });
                }
              }
            });
          }
          setCurrentAdministration(winners);
        } catch (error) {
          console.error('Error fetching current administration:', error);
          setCurrentAdministration([]);
        }
      } else {
        setCurrentAdministration([]);
      }
      
      // Fetch candidates for current election
      if (activeElection) {
        const candidatesResponse = await candidateService.getByElection(activeElection.id);
        setCandidates(candidatesResponse.data || []);
        
        // Fetch statistics
        try {
          const statsResponse = await votingService.getStatistics(activeElection.id);
          setStatistics(statsResponse.data);
        } catch (error) {
          console.error('Stats not available:', error);
        }
      }
      
      // Fetch total students count (all users with profiles)
      try {
        // Fetch profiles to count total students
        // Note: This only works if user has admin access, otherwise will be limited
        try {
          const profilesResponse = await authService.getAllProfiles();
          // Count active students (users who are not staff/admin)
          const allProfiles = profilesResponse.data || [];
          const studentCount = allProfiles.filter(profile => 
            profile.user && !profile.user.is_staff && !profile.user.is_superuser
          ).length;
          // Use voters count as minimum to ensure consistency
          const votersCount = statistics?.total_voters || 0;
          setTotalStudents(Math.max(studentCount, votersCount));
        } catch (profileError) {
          // If user doesn't have access, use voters count as fallback
          // This ensures consistency: votes recorded should match or be less than students
          console.log('Cannot fetch student count, using voters count as fallback');
          const votersCount = statistics?.total_voters || 0;
          setTotalStudents(votersCount);
        }
      } catch (error) {
        console.error('Error fetching student count:', error);
        // Fallback to voters count
        const votersCount = statistics?.total_voters || 0;
        setTotalStudents(votersCount);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
    return <LoadingSpinner fullScreen text="Loading dashboard..." />;
  }

  const candidatesByPosition = groupCandidatesByPosition();
  const currentYear = new Date().getFullYear();

  return (
    <div className="dashboard-page">
      <Container>
        {/* Hero Section */}
        <div className="hero-section">
          <h1 className="hero-title">SNSU E-BOTAR</h1>
          <p className="hero-subtitle">Electronic Voting System for School Administration</p>
          <div className="hero-year">{currentYear}</div>
        </div>

        {/* Current Administration (Winners from Last Election) */}
        {previousElection && (
          <Card className="winners-card">
            <div className="card-header-custom">
              <div className="header-icon winner-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                  <path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                </svg>
              </div>
              <div>
                <h2 className="card-title">Current Administration</h2>
                <p className="card-subtitle">{previousElection.title}</p>
              </div>
            </div>
            <div className="card-body-custom">
              {currentAdministration.length > 0 ? (
                <>
                  <p className="text-muted-custom" style={{ marginBottom: '1.5rem' }}>
                    Current officers serving from the recently concluded election
                  </p>
                  <div className="winners-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '1.5rem',
                    justifyContent: 'center',
                    maxWidth: '100%'
                  }}>
                    {currentAdministration.map((item, index) => (
                      <div key={index} className="winner-item" style={{
                        textAlign: 'center',
                        padding: '1.25rem',
                        background: '#f9fafb',
                        borderRadius: '0.75rem',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        minHeight: '280px'
                      }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          margin: '0 auto 0.75rem',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '2rem',
                          fontWeight: 'bold',
                          border: '3px solid white',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                          flexShrink: 0
                        }}>
                          {item.candidate.candidate_name?.charAt(0)?.toUpperCase() || 'W'}
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#1f2937',
                          marginBottom: '0.25rem',
                          lineHeight: '1.3',
                          minHeight: '2.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {item.candidate.candidate_name || 'Unknown'}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          marginBottom: '0.75rem',
                          fontWeight: 500,
                          minHeight: '1.25rem'
                        }}>
                          {item.position}
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          alignItems: 'center',
                          width: '100%',
                          marginTop: 'auto'
                        }}>
                          <div style={{
                            fontSize: '0.65rem',
                            color: '#f59e0b',
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: '0.375rem',
                            display: 'inline-block',
                            fontWeight: 600,
                            width: 'fit-content'
                          }}>
                            🏆 Current Officer
                          </div>
                          {item.candidate.party && (
                            <div style={{
                              fontSize: '0.7rem',
                              color: '#10b981',
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(16, 185, 129, 0.1)',
                              borderRadius: '0.375rem',
                              display: 'inline-block',
                              width: 'fit-content'
                            }}>
                              {item.candidate.party}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to={`/results/${previousElection.id}`} className="btn-custom btn-outline" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>View Full Results</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-muted-custom">Winners from the recently concluded election</p>
                  <Link to={`/results/${previousElection.id}`} className="btn-custom btn-outline">
                    <span>View Winners</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Current Election Info */}
        {currentElection ? (
          <>
            {/* Statistics Cards */}
            <div className="stats-grid">
              <div className="stat-card-modern">
                <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{totalStudents || 0}</div>
                  <div className="stat-label">Students</div>
                </div>
              </div>
              <div className="stat-card-modern">
                <div className="stat-icon votes-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{statistics?.total_voters || statistics?.total_ballots || 0}</div>
                  <div className="stat-label">Votes Recorded</div>
                </div>
              </div>
            </div>

            {/* Election Candidates */}
            <Card className="candidates-section">
              <div className="card-header-custom">
                <div className="header-icon candidates-header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <h2 className="card-title">Candidates</h2>
                  <p className="card-subtitle">{currentElection.title}</p>
                </div>
              </div>

              {Object.keys(candidatesByPosition).length > 0 ? (
                <div className="positions-list">
                  {Object.entries(candidatesByPosition).map(([position, positionCandidates]) => (
                    <div key={position} className="position-group">
                      <h3 className="position-name">{position}</h3>
                      <div className="candidates-row">
                        {positionCandidates.map(candidate => (
                          <div key={candidate.id} className="candidate-item">
                            <div className="candidate-photo">
                              {candidate.user?.first_name?.[0]?.toUpperCase() || 'C'}
                            </div>
                            <div className="candidate-info">
                              <div className="candidate-fullname">
                                {candidate.user?.first_name} {candidate.user?.last_name}
                              </div>
                              {candidate.party && (
                                <div className="candidate-party">{candidate.party.name}</div>
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
                  message="No candidates have been registered for this election."
                />
              )}
            </Card>

            {/* Election Actions */}
            <Card className="election-actions-card">
              <div className="card-header-custom">
                <div className="header-icon election-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div>
                  <h2 className="card-title">{currentElection.title}</h2>
                  <p className="card-subtitle">Cast your vote now</p>
                </div>
              </div>

              {/* Election Timeline */}
              <div className="election-dates">
                <div className="date-item">
                  <div className="date-icon start-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <div className="date-label">Start Date</div>
                    <div className="date-value">{formatDate(currentElection.start_date, 'datetime')}</div>
                  </div>
                </div>
                <div className="date-item">
                  <div className="date-icon end-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div>
                    <div className="date-label">End Date</div>
                    <div className="date-value">{formatDate(currentElection.end_date, 'datetime')}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="actions-grid">
                <Link to={`/elections/${currentElection.id}`} className="btn-custom btn-info">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <span>View Details</span>
                </Link>
                <Link to={`/vote/${currentElection.id}`} className="btn-custom btn-primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span>Cast Your Vote</span>
                </Link>
                <Link to={`/results/${currentElection.id}`} className="btn-custom btn-outline">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <span>View Results</span>
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="btn-custom btn-admin">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M12 1v6m0 6v6m5.2-14.8l-4.2 4.2m-2 2l-4.2 4.2M23 12h-6m-6 0H1m14.8 5.2l-4.2-4.2m-2-2l-4.2-4.2"/>
                    </svg>
                    <span>Admin Panel</span>
                  </Link>
                )}
              </div>
            </Card>
          </>
        ) : (
          <EmptyState
            icon="fas fa-calendar-times"
            title="No Active Election"
            message="Stay tuned for upcoming school administration elections"
            actionText={isAdmin ? "Create Election" : null}
            onAction={isAdmin ? () => window.location.href = '/admin/elections' : null}
          />
        )}
      </Container>
    </div>
  );
};

export default DashboardPage;
