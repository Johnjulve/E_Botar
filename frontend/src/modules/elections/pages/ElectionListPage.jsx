/**
 * ElectionListPage
 * Display all elections with filtering
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, EmptyState } from '../../../components/common';
import { electionService } from '../../../services';
import { formatDate, getElectionStatus } from '../../../utils/formatters';
import '../elections.css';

const ElectionListPage = () => {
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

  const getStatusBadge = (election) => {
    const status = getElectionStatus(election);
    const statusClass = status.label.toLowerCase().replace(' ', '-');
    return <div className={`status-badge ${statusClass}`}>{status.label}</div>;
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading elections..." />;
  }

  return (
    <Container>
      {/* Page Header */}
      <div className="elections-page-header">
        <div className="page-title">
          <div className="page-title-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <span>Elections</span>
        </div>
        <p className="page-subtitle">Browse and participate in school administration elections</p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <span>All Elections</span>
        </button>
        <button
          className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Active</span>
        </button>
        <button
          className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
          onClick={() => setFilter('upcoming')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Upcoming</span>
        </button>
        <button
          className={`filter-tab ${filter === 'finished' ? 'active' : ''}`}
          onClick={() => setFilter('finished')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Finished</span>
        </button>
      </div>

      {/* Elections Grid */}
      {elections.length > 0 ? (
        <div className="elections-grid">
          {elections.map(election => (
            <div key={election.id} className="election-card">
              <div className="election-header">
                <h3 className="election-title">{election.title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {getStatusBadge(election)}
                  {election.election_type === 'university' ? (
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.375rem',
                      background: 'rgba(37, 99, 235, 0.15)',
                      color: '#1e40af',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      USC
                    </div>
                  ) : (
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.375rem',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#166534',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21h18"/>
                        <path d="M5 21V7l8-4v18"/>
                        <path d="M19 21V11l-6-4"/>
                      </svg>
                      {election.allowed_department_code || 'Dept'}
                    </div>
                  )}
                </div>
              </div>

              {election.description && (
                <p className="election-description">{election.description}</p>
              )}

              <div className="election-dates">
                <div className="date-row">
                  <div className="date-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <span>Start: {formatDate(election.start_date, 'datetime')}</span>
                </div>
                <div className="date-row">
                  <div className="date-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <span>End: {formatDate(election.end_date, 'datetime')}</span>
                </div>
              </div>

              <div className="election-footer">
                <div className="vote-count">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <span>{election.total_votes || 0} votes</span>
                </div>
                <Link to={`/elections/${election.id}`} className="view-details-btn">
                  <span>View Details</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="fas fa-inbox"
          title={`No ${filter !== 'all' ? filter : ''} Elections Found`}
          message="There are no elections matching your filter criteria."
        />
      )}
    </Container>
  );
};

export default ElectionListPage;
