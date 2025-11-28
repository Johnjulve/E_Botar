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
import '../../../assets/styles/admin.css';

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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '2rem'
        }}>
          <div>
            <h1>
              <Icon name="calendar" size={28} style={{ color: '#2563eb' }} />
              Election Management
            </h1>
            <p>Create and manage all elections</p>
          </div>
          <div className="admin-header-actions">
            <Link to="/admin" className="admin-btn secondary">
              Back to Dashboard
            </Link>
            <Link to="/admin/elections/create" className="admin-btn primary">
              <Icon name="plus" size={16} />
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
            className={`admin-filter-btn ${filter === btn.key ? 'active' : ''}`}
            style={{
              background: filter === btn.key ? '#2563eb' : 'white',
              color: filter === btn.key ? 'white' : '#374151',
              borderColor: filter === btn.key ? '#2563eb' : '#d1d5db'
            }}
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
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3 className="admin-card-title">{election.title}</h3>
                      {election.election_type === 'university' ? (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '0.25rem',
                          background: 'rgba(37, 99, 235, 0.15)',
                          color: '#1e40af',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          USC
                        </span>
                      ) : (
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '0.25rem',
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#166534',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          {election.allowed_department_code || 'Dept'}
                        </span>
                      )}
                    </div>
                    {election.description && (
                      <p className="admin-card-subtitle">{election.description.substring(0, 60)}{election.description.length > 60 ? '...' : ''}</p>
                    )}
                  </div>
                  <div className="admin-status-badge" style={{
                    background: status.variant === 'success' ? 'rgba(34, 197, 94, 0.15)' : 
                               status.variant === 'warning' ? 'rgba(234, 179, 8, 0.15)' :
                               'rgba(107, 114, 128, 0.15)',
                    color: status.variant === 'success' ? '#166534' :
                           status.variant === 'warning' ? '#b45309' :
                           '#374151'
                  }}>
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

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem',
                  margin: '1rem 0',
                  padding: '1rem 0',
                  borderTop: '1px solid #e5e7eb',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontWeight: 700,
                      color: '#2563eb',
                      fontSize: '1.1rem'
                    }}>
                      {election.total_votes || 0}
                    </div>
                    <small style={{ color: '#6b7280' }}>Votes</small>
                  </div>
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontWeight: 700,
                      color: '#22c55e',
                      fontSize: '1.1rem'
                    }}>
                      {election.positions?.length || 0}
                    </div>
                    <small style={{ color: '#6b7280' }}>Positions</small>
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
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          textAlign: 'center',
          padding: '3rem 2rem'
        }}>
          <Icon name="calendar" size={48} style={{
            color: '#d1d5db',
            marginBottom: '1rem',
            display: 'block'
          }} />
          <h5 style={{
            color: '#1f2937',
            marginBottom: '0.5rem',
            fontWeight: 600
          }}>
            No {filter !== 'all' ? filter : ''} Elections
          </h5>
          <p style={{
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>
            There are no elections matching your filter criteria.
          </p>
          <Link to="/admin/elections/create" className="admin-btn primary">
            <Icon name="plus" size={16} />
            Create Election
          </Link>
        </div>
      )}
    </Container>
  );
};

export default ElectionManagementPage;
