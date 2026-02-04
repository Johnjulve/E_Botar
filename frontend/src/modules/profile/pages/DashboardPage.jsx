/**
 * DashboardPage (Home Page)
 * Main landing page showing current administration and election info
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Button, Badge, LoadingSpinner, EmptyState } from '../../../components/common';
import { electionService, candidateService, votingService, authService } from '../../../services';
import systemService from '../../../services/systemService';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../contexts/BrandingContext';
import { formatDate } from '../../../utils/formatters';
import '../../../modules/profile/dashboard.css';

/**
 * Pick the finished election to show for the selected academic year.
 * Only returns an election when one matches the A.Y.; otherwise null (no Current Administration shown).
 * @param {Array} finishedList - List of finished elections (newest first)
 * @param {string} academicYear - Selected A.Y. e.g. "2026-2027"
 * @returns {{ election: object|null }}
 */
const getElectionForAcademicYear = (finishedList, academicYear) => {
  if (!finishedList || finishedList.length === 0) {
    return { election: null };
  }
  const match = finishedList.find(
    (e) => e.start_year != null && e.end_year != null && `${e.start_year}-${e.end_year}` === academicYear
  );
  return { election: match || null };
};

const DashboardPage = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const branding = useBranding();
  const [loading, setLoading] = useState(true);
  const [currentElection, setCurrentElection] = useState(null);
  const [finishedElections, setFinishedElections] = useState([]); // All finished elections (newest first)
  const [previousElection, setpreviousElection] = useState(null); // Election whose winners we show (only when it matches selected A.Y.)
  const [candidates, setCandidates] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [currentAdministration, setCurrentAdministration] = useState([]); // Winners from selected administration election
  const [totalStudents, setTotalStudents] = useState(0); // Total number of students
  const [academicYear, setAcademicYear] = useState('2025-2026'); // Current academic year
  const [academicYearDisplay, setAcademicYearDisplay] = useState('A.Y 2025-2026'); // Display format
  const [isUpdatingAcademicYear, setIsUpdatingAcademicYear] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [isAuthenticated]);

  const fetchWinnersForElection = async (election) => {
    if (!election) {
      setCurrentAdministration([]);
      return;
    }
    try {
      const resultsResponse = await votingService.getElectionResults(election.id);
      const resultsData = resultsResponse.data;
      const winners = [];
      if (resultsData.positions) {
        resultsData.positions.forEach(position => {
          if (position.candidates && position.candidates.length > 0) {
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
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch academic year and finished elections in parallel so we can pick administration by A.Y.
      const [academicData, activeResponse, finishedResponse] = await Promise.all([
        systemService.getAcademicYear(),
        electionService.getActive(),
        electionService.getFinished()
      ]);
      
      const academicYearValue = academicData?.academic_year || '2025-2026';
      setAcademicYear(academicYearValue);
      setAcademicYearDisplay(academicData?.display || `A.Y ${academicYearValue}`);
      
      const activeElection = activeResponse.data?.[0] || null;
      setCurrentElection(activeElection);
      
      const finishedList = [...(finishedResponse.data || [])].sort(
        (a, b) => new Date(b.end_date) - new Date(a.end_date)
      );
      setFinishedElections(finishedList);
      
      const { election: administrationElection } = getElectionForAcademicYear(finishedList, academicYearValue);
      setpreviousElection(administrationElection);
      await fetchWinnersForElection(administrationElection);
      
      // Fetch candidates for current election (public data)
      if (activeElection) {
        const candidatesResponse = await candidateService.getByElection(activeElection.id);
        setCandidates(candidatesResponse.data || []);
        
        // Fetch statistics - only if authenticated
        if (isAuthenticated) {
          try {
            const statsResponse = await votingService.getStatistics(activeElection.id);
            setStatistics(statsResponse.data);
          } catch (error) {
            console.error('Stats not available:', error);
            setStatistics(null);
          }
        } else {
          setStatistics(null);
        }
      }
      
      // Fetch total students count - only if authenticated
      if (isAuthenticated) {
        try {
          const studentCountResponse = await authService.getStudentCount();
          const studentCount = studentCountResponse.data?.total_students || 0;
          setTotalStudents(studentCount);
        } catch (error) {
          console.error('Error fetching student count:', error);
          // Don't set to 0, just leave it as is or set to null
          setTotalStudents(0);
        }
      } else {
        // For guest users, don't show student count
        setTotalStudents(0);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcademicYearChange = async (event) => {
    const newYear = event.target.value;
    if (newYear === academicYear) return; // No change
    
    try {
      setIsUpdatingAcademicYear(true);
      const data = await systemService.updateAcademicYear(newYear);
      setAcademicYear(data.academic_year);
      setAcademicYearDisplay(data.display);
      
      // Recompute which administration to show for the new A.Y. (only show when a finished election matches)
      const { election: administrationElection } = getElectionForAcademicYear(finishedElections, data.academic_year);
      setpreviousElection(administrationElection);
      await fetchWinnersForElection(administrationElection);
    } catch (error) {
      console.error('Error updating academic year:', error);
      alert('Failed to update academic year. Please try again.');
    } finally {
      setIsUpdatingAcademicYear(false);
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
  const academicYearOptions = systemService.generateAcademicYearOptions();

  return (
    <div className="dashboard-page">
      <Container>
        {/* Hero Section */}
        <div className="dashboard-hero-section">
          <h1 className="dashboard-hero-title">{branding.app_name?.toUpperCase() || 'E-BOTAR'}</h1>
          <p className="dashboard-hero-subtitle">Electronic Voting System for School Administration</p>
          {isAdmin ? (
            <div className="dashboard-hero-year-selector">
              <select
                value={academicYear}
                onChange={handleAcademicYearChange}
                disabled={isUpdatingAcademicYear}
                className="dashboard-hero-year-select"
                title="Select Academic Year"
              >
                {academicYearOptions.map(year => (
                  <option key={year} value={year}>
                    A.Y {year}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="dashboard-hero-year">{academicYearDisplay}</div>
          )}
        </div>

        {/* Active election: stats + actions card only (above Current Administration) */}
        {currentElection ? (
          <>
            {/* Statistics Cards - Only show if authenticated */}
            {isAuthenticated && (
              <div className="dashboard-stats-grid">
                <div className="dashboard-stat-card-modern">
                  <div className="dashboard-stat-icon dashboard-indigo">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className="dashboard-stat-content">
                    <div className="dashboard-stat-value">{totalStudents || 0}</div>
                    <div className="dashboard-stat-label">Students</div>
                  </div>
                </div>
                <div className="dashboard-stat-card-modern">
                  <div className="dashboard-stat-icon dashboard-votes-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  </div>
                  <div className="dashboard-stat-content">
                    <div className="dashboard-stat-value">{statistics?.total_voters || statistics?.total_ballots || 0}</div>
                    <div className="dashboard-stat-label">Votes Recorded</div>
                  </div>
                </div>
              </div>
            )}

            {/* Election Actions card - "Cast your vote now" with dates and buttons */}
            <Card className="dashboard-election-actions-card">
              <div className="dashboard-card-header-custom">
                <div className="dashboard-header-icon dashboard-election-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div>
                  <h2 className="dashboard-card-title">{currentElection.title}</h2>
                  <p className="dashboard-card-subtitle">Cast your vote now</p>
                </div>
              </div>

              {/* Election Timeline */}
              <div className="dashboard-election-dates">
                <div className="dashboard-date-item">
                  <div className="dashboard-date-icon dashboard-start-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <div className="dashboard-date-label">Start Date</div>
                    <div className="dashboard-date-value">{formatDate(currentElection.start_date, 'datetime')}</div>
                  </div>
                </div>
                <div className="dashboard-date-item">
                  <div className="dashboard-date-icon dashboard-end-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div>
                    <div className="dashboard-date-label">End Date</div>
                    <div className="dashboard-date-value">{formatDate(currentElection.end_date, 'datetime')}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="dashboard-actions-grid">
                <Link to={`/elections/${currentElection.id}`} className="dashboard-btn-custom dashboard-btn-info">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <span>View Details</span>
                </Link>
                <Link to={`/vote/${currentElection.id}`} className="dashboard-btn-custom dashboard-btn-primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span>Cast Your Vote</span>
                </Link>
                <Link to={`/results/${currentElection.id}`} className="dashboard-btn-custom dashboard-btn-outline">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <span>View Results</span>
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="dashboard-btn-custom dashboard-btn-admin">
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
          <div className="dashboard-empty-election-wrap">
            <EmptyState
              icon="fas fa-calendar-times"
              title="No Active Election"
              message="Stay tuned for upcoming school administration elections"
              actionText={isAdmin ? "Create Election" : null}
              onAction={isAdmin ? () => window.location.href = '/admin/elections' : null}
            />
          </div>
        )}

        {/* Current Administration (Winners from finished election for selected A.Y.) */}
        {previousElection && (
          <Card className="dashboard-winners-card">
            <div className="dashboard-card-header-custom">
              <div className="dashboard-header-icon dashboard-winner-icon">
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
                <h2 className="dashboard-card-title">Current Administration</h2>
                <p className="dashboard-card-subtitle">{previousElection.title}</p>
              </div>
            </div>
            <div className="dashboard-card-body-custom">
              {currentAdministration.length > 0 ? (
                <>
                  <p className="dashboard-text-muted-custom">
                    Current officers serving from the recently concluded election
                  </p>
                  <div className="dashboard-winners-grid">
                    {currentAdministration.map((item, index) => (
                      <div key={index} className="dashboard-winner-item">
                        <div className="dashboard-winner-avatar">
                          {item.candidate.candidate_name?.charAt(0)?.toUpperCase() || 'W'}
                        </div>
                        <div className="dashboard-winner-name">
                          {item.candidate.candidate_name || 'Unknown'}
                        </div>
                        <div className="dashboard-winner-position">
                          {item.position}
                        </div>
                        <div className="dashboard-winner-badges">
                          <div className="dashboard-winner-badge">
                            Current Officer
                          </div>
                          {item.candidate.party && (
                            <div className="dashboard-winner-party-badge">
                              {item.candidate.party}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to={`/results/${previousElection.id}`} className="dashboard-btn-custom dashboard-btn-outline inline-flex">
                    <span>View Results</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <p className="dashboard-text-muted-custom">Winners from the recently concluded election</p>
                  <Link to={`/results/${previousElection.id}`} className="dashboard-btn-custom dashboard-btn-outline">
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

        {/* Candidates - below Current Administration when there is an active election */}
        {currentElection && (
          <Card className="dashboard-candidates-section">
            <div className="dashboard-card-header-custom">
              <div className="dashboard-header-icon dashboard-candidates-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <h2 className="dashboard-card-title">Candidates</h2>
                <p className="dashboard-card-subtitle">{currentElection.title}</p>
              </div>
            </div>

            {Object.keys(candidatesByPosition).length > 0 ? (
              <div className="dashboard-positions-list">
                {Object.entries(candidatesByPosition).map(([position, positionCandidates]) => (
                  <div key={position} className="dashboard-position-group">
                    <h3 className="dashboard-position-name">{position}</h3>
                    <div className="dashboard-candidates-row">
                      {positionCandidates.map(candidate => (
                        <div key={candidate.id} className="dashboard-candidate-item">
                          <div className="dashboard-candidate-photo">
                            {candidate.user?.first_name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div className="dashboard-candidate-info">
                            <div className="dashboard-candidate-fullname">
                              {candidate.user?.first_name} {candidate.user?.last_name}
                            </div>
                            {candidate.party && (
                              <div className="dashboard-candidate-party">{candidate.party.name}</div>
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
        )}
      </Container>
    </div>
  );
};

export default DashboardPage;
