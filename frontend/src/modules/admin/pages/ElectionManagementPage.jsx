/**
 * ElectionManagementPage
 * Manage all elections (CRUD operations)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Icon } from '../../../components/common';
import { electionService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate, getElectionStatus } from '../../../utils/formatters';
import '../admin.css';

const ElectionManagementPage = () => {
  const { isAdmin, isStaffOrAdmin } = useAuth();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyElectionId, setBusyElectionId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, upcoming, finished
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredElections = useMemo(() => {
    if (!searchQuery.trim()) return elections;
    const q = searchQuery.toLowerCase().trim();
    return elections.filter((e) => {
      const title = (e.title || '').toLowerCase();
      const desc = (e.description || '').toLowerCase();
      const dept = (e.allowed_department_code || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || dept.includes(q);
    });
  }, [elections, searchQuery]);

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

      {/* Toolbar with Search and Filter Tabs */}
      <div className="admin-registry-toolbar-row">
        <div className="admin-users-search-pill">
          <Icon name="search" size={16} className="admin-users-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search elections by title or department..."
            className="admin-users-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="admin-users-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

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
      </div>

      {/* Elections Grid */}
      {filteredElections.length > 0 ? (
        <div className="admin-card-grid">
          {filteredElections.map(election => {
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

                <div className="admin-election-metrics-row">
                  <span className="admin-election-metric-chip votes">
                    <Icon name="checkCircle" size={14} />
                    <strong>{election.total_votes || 0}</strong> Votes
                  </span>
                  <span className="admin-election-metric-chip positions">
                    <Icon name="users" size={14} />
                    <strong>{election.total_positions || 0}</strong> Positions
                  </span>
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
            {searchQuery
              ? `No elections matching "${searchQuery}"`
              : filter === 'all'
              ? 'No elections yet'
              : `No ${filter} elections`}
          </h2>
          <p className="admin-empty-text">
            {searchQuery
              ? 'Try adjusting your search terms or clear the search filter.'
              : filter === 'all'
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
