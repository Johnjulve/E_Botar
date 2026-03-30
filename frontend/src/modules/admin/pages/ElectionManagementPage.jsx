/**
 * ElectionManagementPage
 * Manage all elections (CRUD operations)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { electionService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate, getElectionStatus } from '../../../utils/formatters';
import '../admin.css';

// SVG Icon Component
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    checkCircle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    clock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    trendingUp: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 17"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
    eye: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    barChart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="17" x2="12" y2="3"/>
        <line x1="18" y1="17" x2="18" y2="9"/>
        <line x1="6" y1="17" x2="6" y2="13"/>
      </svg>
    ),
    arrow: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    ),
    edit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
    trash: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      </svg>
    ),
    pause: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>
    ),
    play: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
  };

  return icons[name] || null;
};

const ElectionManagementPage = () => {
  const { isAdmin, isStaffOrAdmin } = useAuth();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyElectionId, setBusyElectionId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, upcoming, finished

  useEffect(() => {
    fetchElections();
  }, [filter]);

  const fetchElections = async () => {
    try {
      setLoading(true);
      let response;
      
      switch (filter) {
        case 'active':
          response = await electionService.getActive();
          break;
        case 'upcoming':
          response = await electionService.getUpcoming();
          break;
        case 'finished':
          response = await electionService.getFinished();
          break;
        default:
          response = await electionService.getAll();
      }
      
      setElections(response.data || []);
    } catch (error) {
      console.error('Error fetching elections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteElection = async (election) => {
    if (
      !window.confirm(
        `Delete “${election.title}”? This removes the election and related links. This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyElectionId(election.id);
    try {
      await electionService.delete(election.id);
      await fetchElections();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Only superusers can delete elections.');
    } finally {
      setBusyElectionId(null);
    }
  };

  const handlePauseElection = async (election) => {
    if (!window.confirm(`Pause voting for “${election.title}”? Students cannot vote until you resume.`)) {
      return;
    }
    setBusyElectionId(election.id);
    try {
      await electionService.pause(election.id);
      await fetchElections();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to pause election.');
    } finally {
      setBusyElectionId(null);
    }
  };

  const handleResumeElection = async (election) => {
    setBusyElectionId(election.id);
    try {
      await electionService.resume(election.id);
      await fetchElections();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to resume election.');
    } finally {
      setBusyElectionId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading elections..." />;
  }

  const filterButtons = [
    { key: 'all', label: 'All Elections', icon: 'calendar' },
    { key: 'active', label: 'Active', icon: 'checkCircle' },
    { key: 'upcoming', label: 'Upcoming', icon: 'clock' },
    { key: 'finished', label: 'Finished', icon: 'trendingUp' }
  ];

  return (
    <Container>
      <div className="admin-registry-page">
        <header className="admin-registry-header">
          <div className="admin-registry-header-text">
            <p className="admin-registry-eyebrow">Election setup</p>
            <div className="admin-registry-title-row">
              <div className="admin-registry-icon" aria-hidden>
                <Icon name="calendar" size={22} />
              </div>
              <div>
                <h1 className="admin-registry-title">Elections</h1>
                <p className="admin-registry-lede">
                  Schedule ballots, attach positions and parties, and monitor voting from one place.
                </p>
              </div>
            </div>
            <nav className="admin-registry-nav" aria-label="Election admin sections">
              <Link to="/admin/elections" className="admin-btn primary admin-registry-nav-btn" aria-current="page">
                Elections
              </Link>
              <Link to="/admin/parties" className="admin-btn secondary admin-registry-nav-btn">
                Parties
              </Link>
              <Link to="/admin/positions" className="admin-btn secondary admin-registry-nav-btn">
                Positions
              </Link>
            </nav>
          </div>
          <div className="admin-registry-header-actions admin-registry-header-actions--elections">
            <Link to="/admin" className="admin-btn secondary">
              Back to dashboard
            </Link>
            <Link to="/admin/elections/create" className="admin-btn primary">
              <Icon name="plus" size={16} />
              Create election
            </Link>
          </div>
        </header>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs admin-registry-filters" role="group" aria-label="Filter elections">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            type="button"
            onClick={() => setFilter(btn.key)}
            className={`admin-filter-btn ${filter === btn.key ? 'active' : ''}`}
          >
            <Icon name={btn.icon} size={16} />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Elections Grid */}
      {elections.length > 0 ? (
        <div className="admin-card-grid">
          {elections.map(election => {
            const status = getElectionStatus(election);
            
            return (
              <div key={election.id} className="admin-card">
                <div className="admin-card-header">
                  <div className="admin-flex-1">
                    <div className="admin-election-title-row">
                    <h3 className="admin-card-title">{election.title}</h3>
                      {election.election_type === 'university' ? (
                        <span className="admin-election-type-badge admin-election-type-usc">
                          USC
                        </span>
                      ) : (
                        <span className="admin-election-type-badge admin-election-type-dept">
                          {election.allowed_department_code || 'Dept'}
                        </span>
                      )}
                    </div>
                    {election.description && (
                      <p className="admin-card-subtitle">{election.description.substring(0, 60)}{election.description.length > 60 ? '...' : ''}</p>
                    )}
                  </div>
                  <div className={`admin-status-badge ${
                    status.variant === 'success' ? 'admin-status-badge-success' :
                    status.variant === 'warning' ? 'admin-status-badge-warning' :
                    'admin-status-badge-inactive'
                  }`}>
                    {status.label}
                  </div>
                </div>

                <div className="admin-card-meta">
                  <div className="admin-card-meta-item">
                    <Icon name="clock" size={16} />
                    <span>Start: {formatDate(election.start_date, 'datetime')}</span>
                  </div>
                  <div className="admin-card-meta-item">
                    <Icon name="calendar" size={16} />
                    <span>End: {formatDate(election.end_date, 'datetime')}</span>
                  </div>
                </div>

                <div className="admin-election-stats-grid">
                  <div className="admin-election-stat-box">
                    <div className="admin-election-stat-value admin-election-stat-value-primary">
                      {election.total_votes || 0}
                    </div>
                    <small className="admin-election-stat-label">Votes</small>
                  </div>
                  <div className="admin-election-stat-box">
                    <div className="admin-election-stat-value admin-election-stat-value-success">
                      {election.total_positions || 0}
                    </div>
                    <small className="admin-election-stat-label">Positions</small>
                  </div>
                </div>

                <div className="admin-card-actions">
                  <Link
                    to={`/elections/${election.id}`}
                    className="admin-btn secondary"
                  >
                    <Icon name="eye" size={14} />
                    View
                  </Link>
                  <Link
                    to={`/admin/elections/${election.id}/edit`}
                    className="admin-btn secondary"
                  >
                    <Icon name="edit" size={14} />
                    Edit
                  </Link>
                  <Link
                    to={`/results/${election.id}`}
                    className="admin-btn secondary"
                  >
                    <Icon name="barChart" size={14} />
                    Results
                  </Link>
                  {isAdmin && (
                    <button
                      type="button"
                      className="admin-btn danger"
                      disabled={busyElectionId === election.id}
                      onClick={() => handleDeleteElection(election)}
                    >
                      <Icon name="trash" size={14} />
                      Delete
                    </button>
                  )}
                  {isStaffOrAdmin && !election.is_finished && !election.is_paused && (
                    <button
                      type="button"
                      className="admin-btn secondary"
                      disabled={busyElectionId === election.id}
                      onClick={() => handlePauseElection(election)}
                      title="Temporarily stop voting (e.g. technical issue)"
                    >
                      <Icon name="pause" size={14} />
                      Pause
                    </button>
                  )}
                  {isStaffOrAdmin && election.is_paused && !election.is_finished && (
                    <button
                      type="button"
                      className="admin-btn primary"
                      disabled={busyElectionId === election.id}
                      onClick={() => handleResumeElection(election)}
                    >
                      <Icon name="play" size={14} />
                      Resume
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="admin-empty-card admin-registry-empty">
          <Icon name="calendar" size={40} className="admin-empty-icon" />
          <h2 className="admin-empty-title">
            {filter === 'all' ? 'No elections yet' : `No ${filter} elections`}
          </h2>
          <p className="admin-empty-text">
            {filter === 'all'
              ? 'Create an election to open nominations, voting, and results.'
              : 'Try another filter or create a new election.'}
          </p>
          <Link to="/admin/elections/create" className="admin-btn primary">
            <Icon name="plus" size={16} />
            Create election
          </Link>
        </div>
      )}
      </div>
    </Container>
  );
};

export default ElectionManagementPage;
