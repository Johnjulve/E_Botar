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
import '../admin.css';

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
  const [pageSize, setPageSize] = useState(20); // 20 | 50 | Infinity (All)
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [filter, applications]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, pageSize]);

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

  const totalRows = filteredApps.length;
  const effectivePageSize = Number.isFinite(pageSize) ? pageSize : totalRows || 1;
  const totalPages = Math.max(1, Math.ceil(totalRows / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * effectivePageSize;
  const endIndexExclusive = Math.min(startIndex + effectivePageSize, totalRows);
  const paginatedApps = filteredApps.slice(startIndex, endIndexExclusive);

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
        {filterButtons.map(btn => {
          const isActive = filter === btn.key;
          const btnClass = isActive 
            ? (btn.key === 'pending' ? 'admin-filter-btn-pending' :
               btn.key === 'approved' ? 'admin-filter-btn-approved' :
               btn.key === 'rejected' ? 'admin-filter-btn-rejected' :
               'admin-filter-btn-default')
            : 'admin-filter-btn-inactive';
          
          return (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`admin-filter-btn ${btnClass}`}
            >
              <Icon name={btn.icon} size={16} />
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Applications Grid */}
      {filteredApps.length > 0 ? (
        <div className="admin-table-container">
          <div className="admin-card-grid" style={{ padding: 'var(--spacing-md)' }}>
            {paginatedApps.map(application => {
            const status = getApplicationStatus(application.status);
            
            return (
              <div key={application.id} className="admin-card">
                <div className="admin-app-card-header">
                  <div className="admin-avatar primary">
                    {getInitials(`${application.user?.first_name} ${application.user?.last_name}`)}
                  </div>
                  <div className="admin-flex-1 admin-min-width-0">
                    <h3 className="admin-app-card-name">
                      {application.user?.first_name} {application.user?.last_name}
                    </h3>
                    <p className="admin-app-card-email">
                      {application.user?.email}
                    </p>
                  </div>
                </div>

                <div className={`admin-status-badge ${
                  status.variant === 'warning' ? 'admin-status-badge-warning' :
                  status.variant === 'success' ? 'admin-status-badge-success' :
                  'admin-status-badge-danger'
                }`} style={{ marginBottom: '1rem' }}>
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
                      <span className="admin-star-icon">★</span>
                      <span>{application.party.name}</span>
                    </div>
                  )}
                </div>

                <div className="admin-app-card-divider">
                  Submitted: {formatDate(application.submitted_at, 'date')}
                </div>

                {application.manifesto && (
                  <p className="admin-app-card-manifesto">
                    {application.manifesto}
                  </p>
                )}

                <Link
                  to={`/admin/applications/${application.id}`}
                  className="admin-btn primary admin-app-card-button"
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

          <div className="admin-pagination">
            <div className="admin-pagination-left">
              <span className="admin-pagination-title">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <span className="admin-pagination-range">
                ({totalRows === 0 ? 0 : startIndex + 1}-{endIndexExclusive} of {totalRows})
              </span>
            </div>

            <div className="admin-pagination-right">
              <button
                type="button"
                className="admin-btn admin-btn-small"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
              >
                Prev
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-small"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
              >
                Next
              </button>

              <div className="admin-pagination-view">
                <label className="admin-pagination-view-label">View</label>
                <select
                  className="admin-pagination-view-select"
                  value={Number.isFinite(pageSize) ? String(pageSize) : 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'all') setPageSize(Infinity);
                    else setPageSize(Number(value));
                  }}
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-card-container admin-empty-state">
          <h5 className="admin-empty-state-title">
            No {filter !== 'all' ? filter : ''} Applications
          </h5>
          <p className="admin-empty-state-message">
            There are no {filter !== 'all' ? filter : ''} applications at this time.
          </p>
        </div>
      )}
    </Container>
  );
};

export default ApplicationsListPage;

