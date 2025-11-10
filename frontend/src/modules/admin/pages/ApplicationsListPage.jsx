/**
 * ApplicationsListPage
 * View and filter all candidate applications
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { candidateService } from '../../../services';
import { formatDate, getApplicationStatus } from '../../../utils/formatters';
import { getInitials } from '../../../utils/helpers';
import '../../../assets/styles/admin.css';

// SVG Icon Component
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    tasks: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
    clock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    checkCircle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    xCircle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    ),
    briefcase: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 7v-2a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
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

const ApplicationsListPage = () => {
  const [applications, setApplications] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [filter, applications]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getAllApplications();
      setApplications(response.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    if (filter === 'all') {
      setFilteredApps(applications);
    } else {
      setFilteredApps(applications.filter(app => app.status === filter));
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading applications..." />;
  }

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  const filterButtons = [
    { key: 'all', label: `All Applications (${applications.length})`, icon: 'tasks' },
    { key: 'pending', label: `Pending (${pendingCount})`, icon: 'clock' },
    { key: 'approved', label: `Approved (${approvedCount})`, icon: 'checkCircle' },
    { key: 'rejected', label: `Rejected (${rejectedCount})`, icon: 'xCircle' }
  ];

  return (
    <Container>
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>
            <Icon name="tasks" size={28} style={{ color: '#eab308' }} />
            Candidate Applications
          </h1>
          <p>Review and manage all candidate applications</p>
        </div>
        <div className="admin-header-actions">
          <Link to="/admin" className="admin-btn secondary">
            Back to Dashboard
          </Link>
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
              background: filter === btn.key ? (btn.key === 'pending' ? '#eab308' : btn.key === 'approved' ? '#22c55e' : btn.key === 'rejected' ? '#ef4444' : '#2563eb') : 'white',
              color: filter === btn.key && btn.key === 'pending' ? '#1f2937' : filter === btn.key ? 'white' : '#374151',
              borderColor: filter === btn.key ? (btn.key === 'pending' ? '#eab308' : btn.key === 'approved' ? '#22c55e' : btn.key === 'rejected' ? '#ef4444' : '#2563eb') : '#d1d5db'
            }}
          >
            <Icon name={btn.icon} size={16} />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Applications Grid */}
      {filteredApps.length > 0 ? (
        <div className="admin-card-grid">
          {filteredApps.map(application => {
            const status = getApplicationStatus(application.status);
            
            return (
              <div key={application.id} className="admin-card">
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div className="admin-avatar primary">
                    {getInitials(`${application.user?.first_name} ${application.user?.last_name}`)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{
                      margin: 0,
                      fontWeight: 600,
                      color: '#1f2937',
                      fontSize: '1rem'
                    }}>
                      {application.user?.first_name} {application.user?.last_name}
                    </h3>
                    <p style={{
                      margin: '0.25rem 0 0',
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {application.user?.email}
                    </p>
                  </div>
                </div>

                <div className="admin-status-badge" style={{
                  background: status.variant === 'warning' ? 'rgba(234, 179, 8, 0.15)' :
                             status.variant === 'success' ? 'rgba(34, 197, 94, 0.15)' :
                             'rgba(239, 68, 68, 0.15)',
                  color: status.variant === 'warning' ? '#b45309' :
                         status.variant === 'success' ? '#166534' :
                         '#991b1b',
                  marginBottom: '1rem'
                }}>
                  {status.label}
                </div>

                <div className="admin-card-meta">
                  <div className="admin-card-meta-item">
                    <Icon name="briefcase" size={16} />
                    <strong>{application.position?.name}</strong>
                  </div>
                  <div className="admin-card-meta-item">
                    <Icon name="calendar" size={16} />
                    <span>{application.election?.title}</span>
                  </div>
                  {application.party && (
                    <div className="admin-card-meta-item">
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#eab308' }}>★</span>
                      <span>{application.party.name}</span>
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize: '0.85rem',
                  color: '#6b7280',
                  margin: '1rem 0',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  Submitted: {formatDate(application.submitted_at, 'date')}
                </div>

                {application.manifesto && (
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#6b7280',
                    margin: '0.75rem 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {application.manifesto}
                  </p>
                )}

                <Link
                  to={`/admin/applications/${application.id}`}
                  className="admin-btn primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                >
                  {application.status === 'pending' ? (
                    <>
                      <Icon name="tasks" size={14} />
                      Review Application
                    </>
                  ) : (
                    <>
                      <Icon name="arrow" size={14} />
                      View Details
                    </>
                  )}
                </Link>
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
          <Icon name="tasks" size={48} style={{
            color: '#d1d5db',
            marginBottom: '1rem',
            display: 'block'
          }} />
          <h5 style={{
            color: '#1f2937',
            marginBottom: '0.5rem',
            fontWeight: 600
          }}>
            No {filter !== 'all' ? filter : ''} Applications
          </h5>
          <p style={{
            color: '#6b7280'
          }}>
            There are no {filter !== 'all' ? filter : ''} applications at this time.
          </p>
        </div>
      )}
    </Container>
  );
};

export default ApplicationsListPage;

