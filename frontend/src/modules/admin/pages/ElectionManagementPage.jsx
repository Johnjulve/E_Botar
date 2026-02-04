/**
 * ElectionManagementPage
 * Manage all elections (CRUD operations)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { electionService } from '../../../services';
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
  };

  return icons[name] || null;
};

const ElectionManagementPage = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
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
      {/* Header */}
      <div className="admin-header">
        <div className="admin-election-header-flex">
          <div>
            <h1>
              <Icon name="calendar" size={28} className="admin-icon-primary" />
              Election Management
            </h1>
            <p>Create and manage all elections</p>
          </div>
          <div className="admin-header-actions">
            <Link to="/admin" className="admin-btn secondary">
              Back to Dashboard
            </Link>
            <Link to="/admin/elections/create" className="admin-btn primary">
              Create Election
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`admin-filter-btn ${filter === btn.key ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive-default'}`}
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
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="admin-card-container admin-empty-state">
          <h5 className="admin-empty-state-title">
            No {filter !== 'all' ? filter : ''} Elections
          </h5>
          <p className="admin-empty-state-message">
            There are no elections matching your filter criteria.
          </p>
          <Link to="/admin/elections/create" className="admin-btn primary">
            Create Election
          </Link>
        </div>
      )}
    </Container>
  );
};

export default ElectionManagementPage;
