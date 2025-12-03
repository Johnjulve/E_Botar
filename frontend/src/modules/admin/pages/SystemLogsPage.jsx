/**
 * SystemLogsPage
 * System monitoring and activity logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Alert } from '../../../components/common';
import { logService } from '../../../services';
import { formatDate } from '../../../utils/formatters';
import '../../../assets/styles/admin.css';

// SVG Icon Component
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    activity: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    info: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
    alertCircle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
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
  };

  return icons[name] || null;
};

const defaultSummary = {
  total: 0,
  success: 0,
  info: 0,
  warnings: 0,
  errors: 0
};

const SystemLogsPage = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, info, success, warning, error
  const [logTypeFilter, setLogTypeFilter] = useState('all'); // all, security, activity
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all'); // all, Election, Candidate, User, etc.
  const [actionFilter, setActionFilter] = useState('all'); // all, create, update, delete, login, etc.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Separate state for input to allow debouncing
  const [summary, setSummary] = useState({ ...defaultSummary });
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const normalizeSummary = (data = {}) => ({
    total: data.total ?? 0,
    success: data.success ?? 0,
    info: data.info ?? 0,
    warnings: data.warnings ?? data.warning ?? 0,
    errors: data.errors ?? data.error ?? 0
  });

  // Load summary separately (always without severity, search, or other filters to get accurate counts)
  const loadSummary = useCallback(async () => {
    try {
      const params = {};
      // Only apply log_type filter to summary (if user wants to see counts for security vs activity)
      // Don't include severity, search, resource_type, or action filters
      if (logTypeFilter !== 'all') {
        params.log_type = logTypeFilter;
      }
      // Explicitly don't include severity, search, or other filters
      const response = await logService.getSystemLogs(params);
      const data = response.data || {};
      setSummary(normalizeSummary(data.summary || {}));
    } catch (err) {
      console.error('Error fetching summary:', err);
      // Don't update summary on error, keep existing values
    }
  }, [logTypeFilter]);

  const loadLogs = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      // Build query parameters
      const params = {};
      
      // Log type filter (all, security, activity)
      if (logTypeFilter !== 'all') {
        params.log_type = logTypeFilter;
      }
      
      // Severity filter (all, info, success, warning, error)
      // Note: We don't send severity to backend for summary, but we do for logs
      if (filter !== 'all') {
        params.severity = filter;
      }
      
      // Search query
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      const response = await logService.getSystemLogs(params);
      const data = response.data || {};
      let allLogs = data.logs || [];
      
      // Apply resource type filter (client-side)
      if (resourceTypeFilter !== 'all') {
        allLogs = allLogs.filter(log => {
          // For activity logs, check resource_type field (now included in response)
          if (log.source === 'activity' && log.resource_type) {
            return log.resource_type.toLowerCase().includes(resourceTypeFilter.toLowerCase());
          }
          // For security events, check message/description for resource type mentions
          if (log.source === 'security' && log.message) {
            return log.message.toLowerCase().includes(resourceTypeFilter.toLowerCase());
          }
          return false;
        });
      }
      
      // Apply action filter (client-side)
      if (actionFilter !== 'all') {
        allLogs = allLogs.filter(log => {
          // Check event_type (for security) or action (for activity)
          const action = log.event_type || log.action || '';
          return action.toLowerCase() === actionFilter.toLowerCase();
        });
      }
      
      setLogs(allLogs);
      // Don't update summary here - it's loaded separately
    } catch (err) {
      console.error('Error fetching system logs:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to load system logs';
      setError(detail);
      setLogs([]);
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [filter, logTypeFilter, resourceTypeFilter, actionFilter, searchQuery]);

  // Load summary when logTypeFilter changes (but not when severity filter changes)
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Load logs when any filter changes
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Extract unique resource types and actions from all logs (before filtering)
  // We need to fetch all logs first to populate these dropdowns
  const [allLogsForFilters, setAllLogsForFilters] = useState([]);

  // Load all logs for filter options (without filters applied)
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await logService.getSystemLogs({ limit: 500 }); // Get more logs for filter options
        setAllLogsForFilters(response.data?.logs || []);
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };
    loadFilterOptions();
  }, []);

  const uniqueResourceTypes = React.useMemo(() => {
    const types = new Set();
    allLogsForFilters.forEach(log => {
      // Activity logs have resource_type field (now included in API response)
      if (log.source === 'activity' && log.resource_type) {
        types.add(log.resource_type);
      }
    });
    // Add common resource types that might appear in security logs
    // These are extracted from the message content
    const commonTypes = ['Election', 'Candidate', 'User', 'Application', 'Vote', 'Ballot', 'Party', 'Position', 'Profile'];
    allLogsForFilters.forEach(log => {
      if (log.source === 'security' && log.message) {
        commonTypes.forEach(type => {
          if (log.message.toLowerCase().includes(type.toLowerCase())) {
            types.add(type);
          }
        });
      }
    });
    return Array.from(types).sort();
  }, [allLogsForFilters]);

  const uniqueActions = React.useMemo(() => {
    const actions = new Set();
    allLogsForFilters.forEach(log => {
      if (log.event_type) {
        actions.add(log.event_type);
      }
      if (log.action) {
        actions.add(log.action);
      }
    });
    return Array.from(actions).sort();
  }, [allLogsForFilters]);

  const getSeverity = (log) => log?.severity || log?.type || 'info';

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading system logs..." />;
  }

  // Additional client-side filtering for severity (already handled in loadLogs, but keeping for consistency)
  const filteredLogs = filter === 'all' ? logs : logs.filter(log => getSeverity(log) === filter);

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <Icon name="checkCircle" size={20} />;
      case 'error': return <Icon name="xCircle" size={20} />;
      case 'warning': return <Icon name="alertCircle" size={20} />;
      default: return <Icon name="info" size={20} />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#166534', border: '#22c55e' };
      case 'error': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#991b1b', border: '#ef4444' };
      case 'warning': return { bg: 'rgba(234, 179, 8, 0.1)', color: '#b45309', border: '#eab308' };
      default: return { bg: 'rgba(59, 130, 246, 0.1)', color: '#1e40af', border: '#3b82f6' };
    }
  };

  const filterButtons = [
    { key: 'all', label: 'All Logs', count: summary.total },
    { key: 'info', label: 'Info', count: summary.info },
    { key: 'success', label: 'Success', count: summary.success },
    { key: 'warning', label: 'Warnings', count: summary.warnings },
    { key: 'error', label: 'Errors', count: summary.errors },
  ];

  // Simple monthly backup reminder: show warning during the last 7 days of each month
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysUntilMonthEnd = lastDayOfMonth - today.getDate();
  const showBackupReminder = daysUntilMonthEnd <= 7;

  return (
    <Container>
      {/* Header */}
      <div className="admin-header">
        <h1>
          <Icon name="activity" size={28} style={{ color: '#2563eb' }} />
          System Logs & Monitoring
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <p style={{ margin: 0 }}>View system activity and monitor events</p>
          <button
            onClick={() => loadLogs({ silent: true })}
            disabled={isRefreshing}
            className="admin-btn"
            style={{ padding: '0.5rem 0.85rem' }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {showBackupReminder && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid #fbbf24',
            background: '#fffbeb',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: '#facc15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#92400e',
              flexShrink: 0,
              fontWeight: 700
            }}
          >
            !
          </div>
          <div style={{ fontSize: '0.9rem', color: '#92400e' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
              Monthly backup reminder
            </div>
            <p style={{ margin: 0 }}>
              You are in the last week of the month. For transparency and data safety, export and
              back up your system and security logs for this period and store them in secure
              offline or archival storage.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon primary">
            <Icon name="activity" size={24} />
          </div>
          <div className="admin-stat-value">{summary.total}</div>
          <div className="admin-stat-label">Total Events</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon success">
            <Icon name="checkCircle" size={24} />
          </div>
          <div className="admin-stat-value">{summary.success}</div>
          <div className="admin-stat-label">Success</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon warning">
            <Icon name="alertCircle" size={24} />
          </div>
          <div className="admin-stat-value">{summary.warnings}</div>
          <div className="admin-stat-label">Warnings</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon danger">
            <Icon name="xCircle" size={24} />
          </div>
          <div className="admin-stat-value">{summary.errors}</div>
          <div className="admin-stat-label">Errors</div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h5 style={{
          marginBottom: '1rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Icon name="activity" size={18} />
          Filter Options
        </h5>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          {/* Log Type Filter */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Log Type
            </label>
            <select
              value={logTypeFilter}
              onChange={(e) => setLogTypeFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Logs</option>
              <option value="security">Security Events</option>
              <option value="activity">Activity Logs</option>
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Resource Type
            </label>
            <select
              value={resourceTypeFilter}
              onChange={(e) => setResourceTypeFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Resources</option>
              {uniqueResourceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Search
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search logs..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(logTypeFilter !== 'all' || resourceTypeFilter !== 'all' || actionFilter !== 'all' || searchInput) && (
          <button
            onClick={() => {
              setLogTypeFilter('all');
              setResourceTypeFilter('all');
              setActionFilter('all');
              setSearchInput('');
              setSearchQuery('');
            }}
            style={{
              padding: '0.5rem 1rem',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Severity Filter Tabs */}
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
            {btn.label} ({btn.count})
          </button>
        ))}
      </div>

      {/* Logs List */}
      {filteredLogs.length > 0 ? (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          overflow: 'hidden'
        }}>
          {filteredLogs.map((log, index) => {
            const severity = getSeverity(log);
            const colors = getLogColor(severity);
            return (
              <div
                key={log.id}
                style={{
                  padding: '1.25rem',
                  borderBottom: index < filteredLogs.length - 1 ? '1px solid #e5e7eb' : 'none',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '0.5rem',
                  background: colors.bg,
                  color: colors.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {getLogIcon(severity)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 500,
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>
                    {log.message || log.event_label}
                  </div>
                  {log.event_label && (
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      marginBottom: '0.35rem'
                    }}>
                      {log.event_label}
                      {log.source && (
                        <>
                          {' • '}
                          {log.source === 'security' ? 'Security Event' : 'Activity Log'}
                        </>
                      )}
                    </div>
                  )}
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <span>{formatDate(log.timestamp, 'datetime')}</span>
                    <span>•</span>
                    <span>By: {log.user || 'System'}</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.4rem',
                    background: colors.bg,
                    color: colors.color,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {severity}
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
          <Icon name="activity" size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
          <h5 style={{
            color: '#1f2937',
            marginBottom: '0.5rem',
            fontWeight: 600
          }}>
            No Logs Found
          </h5>
          <p style={{ color: '#6b7280' }}>
            No {filter !== 'all' ? filter : ''} logs to display.
          </p>
        </div>
      )}
    </Container>
  );
};

export default SystemLogsPage;
