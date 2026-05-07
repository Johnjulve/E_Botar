/**
 * SystemLogsPage
 * System monitoring and activity logs
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Alert } from '../../../components/common';
import { logService } from '../../../services';
import { formatDate } from '../../../utils/formatters';
import '../admin.css';

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
  const [searchInput, setSearchInput] = useState(''); // Input value; apply only when Search is clicked
  const appliedSearchRef = useRef(''); // last search term actually applied to API
  const [summary, setSummary] = useState({ ...defaultSummary });
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [groupBy, setGroupBy] = useState('none'); // none | day | hour
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

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
      const appliedSearch = appliedSearchRef.current || '';
      if (appliedSearch.trim()) {
        params.search = appliedSearch.trim();
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
  }, [filter, logTypeFilter, resourceTypeFilter, actionFilter]);

  // Load summary when logTypeFilter changes (but not when severity filter changes)
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Load logs when any filter changes
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

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

  // Additional client-side filtering for severity (already handled in loadLogs, but keeping for consistency)
  const filteredLogs = filter === 'all' ? logs : logs.filter(log => getSeverity(log) === filter);

  const buildGroupKey = useCallback((log) => {
    const d = new Date(log?.timestamp);
    if (Number.isNaN(d.getTime())) return 'Unknown time';

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');

    if (groupBy === 'hour') return `${yyyy}-${mm}-${dd} ${hh}:00`;
    return `${yyyy}-${mm}-${dd}`;
  }, [groupBy]);

  const groupedLogs = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', title: 'All logs', logs: filteredLogs }];
    }

    const map = new Map();
    filteredLogs.forEach((log) => {
      const key = buildGroupKey(log);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(log);
    });

    const groups = Array.from(map.entries()).map(([key, groupLogs]) => ({
      key,
      title: groupBy === 'hour' ? key : formatDate(`${key}T00:00:00`, 'date'),
      logs: groupLogs,
    }));

    // Sort groups newest first based on key (YYYY-MM-DD or YYYY-MM-DD HH:00)
    groups.sort((a, b) => String(b.key).localeCompare(String(a.key)));
    return groups;
  }, [filteredLogs, groupBy, buildGroupKey]);

  useEffect(() => {
    // Auto-expand the newest group after regrouping for nicer UX
    if (groupBy === 'none') return;
    const first = groupedLogs[0]?.key;
    if (!first) return;
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.add(first);
      return next;
    });
  }, [groupBy, groupedLogs]);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
      {loading ? (
        <LoadingSpinner fullScreen text="Loading system logs..." />
      ) : (
        <>
          {/* Header */}
          <div className="admin-header">
            <h1>
              <Icon name="activity" size={28} className="admin-icon-primary" />
              System Logs & Monitoring
            </h1>
            <div className="admin-logs-header-actions">
              <p className="admin-logs-header-text">View system activity and monitor events</p>
              <button
                onClick={() => loadLogs({ silent: true })}
                disabled={isRefreshing}
                className="admin-btn admin-btn-refresh"
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
            <div className="admin-logs-backup-reminder">
              <div className="admin-logs-backup-icon">
                !
              </div>
              <div className="admin-logs-backup-content">
                <div className="admin-logs-backup-title">
                  Monthly backup reminder
                </div>
                <p className="admin-logs-backup-text">
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
          <div className="admin-logs-filters-section">
            <h5 className="admin-logs-filters-title">
              <Icon name="activity" size={18} />
              Filter Options
            </h5>
            
            <div className="admin-logs-filters-grid">
              {/* Log Type Filter */}
              <div>
                <label className="admin-logs-filter-label">
                  Log Type
                </label>
                <select
                  value={logTypeFilter}
                  onChange={(e) => setLogTypeFilter(e.target.value)}
                  className="admin-logs-filter-select"
                >
                  <option value="all">All Logs</option>
                  <option value="security">Security Events</option>
                  <option value="activity">Activity Logs</option>
                </select>
              </div>

              {/* Resource Type Filter */}
              <div>
                <label className="admin-logs-filter-label">
                  Resource Type
                </label>
                <select
                  value={resourceTypeFilter}
                  onChange={(e) => setResourceTypeFilter(e.target.value)}
                  className="admin-logs-filter-select"
                >
                  <option value="all">All Resources</option>
                  {uniqueResourceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Action Filter */}
              <div>
                <label className="admin-logs-filter-label">
                  Action
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="admin-logs-filter-select"
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
                <label className="admin-logs-filter-label">
                  Search
                </label>
                <div className="admin-flex-row" style={{ gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search logs..."
                    className="admin-logs-filter-input"
                  />
                  <button
                    type="button"
                    className="admin-btn secondary admin-btn-small"
                    onClick={() => {
                      appliedSearchRef.current = searchInput;
                      loadLogs();
                    }}
                  >
                    Search
                  </button>
                </div>
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
                  appliedSearchRef.current = '';
                  loadLogs();
                }}
                className="admin-logs-clear-filters"
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
                className={`admin-filter-btn ${filter === btn.key ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive-default'}`}
              >
                {btn.label} ({btn.count})
              </button>
            ))}
          </div>

          {/* Logs List */}
          {filteredLogs.length > 0 ? (
            <div className="admin-logs-list">
              <div className="admin-card-container" style={{ marginBottom: '1rem' }}>
                <div className="admin-flex-between" style={{ marginBottom: '0.5rem' }}>
                  <div className="admin-logs-filters-title" style={{ margin: 0 }}>
                    <Icon name="activity" size={18} />
                    Grouping
                  </div>
                  <div className="admin-flex-row" style={{ gap: '0.5rem' }}>
                    <button
                      type="button"
                      className={`admin-btn secondary admin-btn-small ${groupBy === 'none' ? 'admin-filter-btn-active' : ''}`}
                      onClick={() => setGroupBy('none')}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      className={`admin-btn secondary admin-btn-small ${groupBy === 'day' ? 'admin-filter-btn-active' : ''}`}
                      onClick={() => setGroupBy('day')}
                    >
                      By Day
                    </button>
                    <button
                      type="button"
                      className={`admin-btn secondary admin-btn-small ${groupBy === 'hour' ? 'admin-filter-btn-active' : ''}`}
                      onClick={() => setGroupBy('hour')}
                    >
                      By Hour
                    </button>
                  </div>
                </div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Click a group header to expand/collapse logs.
                </div>
              </div>

              {groupedLogs.map((group) => {
                const isExpanded = groupBy === 'none' ? true : expandedGroups.has(group.key);
                return (
                  <div key={group.key} style={{ borderTop: '1px solid var(--border-color)' }}>
                    {groupBy !== 'none' && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        className="admin-btn secondary"
                        style={{
                          width: '100%',
                          justifyContent: 'space-between',
                          border: 'none',
                          borderRadius: 0,
                          padding: '0.9rem 1.1rem',
                          background: 'var(--gray-50)',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 700 }}>{group.title}</span>
                          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                            ({group.logs.length})
                          </span>
                        </span>
                        <span style={{ fontWeight: 700 }}>{isExpanded ? '−' : '+'}</span>
                      </button>
                    )}

                    {isExpanded && (
                      <>
                        {group.logs.map((log) => {
                          const severity = getSeverity(log);
                          const colors = getLogColor(severity);
                          return (
                            <div
                              key={log.id}
                              className="admin-logs-item"
                            >
                              <div
                                className="admin-logs-icon-container"
                                style={{ background: colors.bg, color: colors.color }}
                              >
                                {getLogIcon(severity)}
                              </div>

                              <div className="admin-logs-content">
                                <div className="admin-logs-message">
                                  {log.message || log.event_label}
                                </div>
                                {log.event_label && (
                                  <div className="admin-logs-event-label">
                                    {log.event_label}
                                    {log.source && (
                                      <>
                                        {' • '}
                                        {log.source === 'security' ? 'Security Event' : 'Activity Log'}
                                      </>
                                    )}
                                  </div>
                                )}
                                <div className="admin-logs-meta">
                                  <span>{formatDate(log.timestamp, 'datetime')}</span>
                                  <span>•</span>
                                  <span>By: {log.user || 'System'}</span>
                                </div>
                              </div>

                              <div
                                className="admin-logs-severity-badge"
                                style={{ background: colors.bg, color: colors.color }}
                              >
                                {severity}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="admin-card-container admin-empty-state">
              <Icon name="activity" size={48} className="admin-empty-state-icon" />
              <h5 className="admin-empty-state-title">
                No Logs Found
              </h5>
              <p className="admin-empty-state-message">
                No {filter !== 'all' ? filter : ''} logs to display.
              </p>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default SystemLogsPage;
