/**
 * SystemLogsPage
 * System monitoring and activity logs
 */

import React, { useState, useEffect } from 'react';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
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

const SystemLogsPage = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, info, success, warning, error

  useEffect(() => {
    // Simulate fetching logs
    setTimeout(() => {
      // Demo data - replace with actual API call
      const demoLogs = [
        {
          id: 1,
          type: 'success',
          message: 'User "john.doe@example.com" logged in successfully',
          timestamp: new Date().toISOString(),
          user: 'John Doe'
        },
        {
          id: 2,
          type: 'info',
          message: 'Election "Student Council 2025" was created',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'Admin User'
        },
        {
          id: 3,
          type: 'warning',
          message: 'Failed login attempt from IP 192.168.1.100',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          user: 'System'
        },
        {
          id: 4,
          type: 'success',
          message: 'Application approved for candidate "Jane Smith"',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          user: 'Admin User'
        },
        {
          id: 5,
          type: 'error',
          message: 'Database backup failed - disk space low',
          timestamp: new Date(Date.now() - 14400000).toISOString(),
          user: 'System'
        },
      ];
      setLogs(demoLogs);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading system logs..." />;
  }

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.type === filter);

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
    { key: 'all', label: 'All Logs', count: logs.length },
    { key: 'info', label: 'Info', count: logs.filter(l => l.type === 'info').length },
    { key: 'success', label: 'Success', count: logs.filter(l => l.type === 'success').length },
    { key: 'warning', label: 'Warnings', count: logs.filter(l => l.type === 'warning').length },
    { key: 'error', label: 'Errors', count: logs.filter(l => l.type === 'error').length },
  ];

  return (
    <Container>
      {/* Header */}
      <div className="admin-header">
        <h1>
          <Icon name="activity" size={28} style={{ color: '#2563eb' }} />
          System Logs & Monitoring
        </h1>
        <p>View system activity and monitor events</p>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon primary">
            <Icon name="activity" size={24} />
          </div>
          <div className="admin-stat-value">{logs.length}</div>
          <div className="admin-stat-label">Total Events</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon success">
            <Icon name="checkCircle" size={24} />
          </div>
          <div className="admin-stat-value">{logs.filter(l => l.type === 'success').length}</div>
          <div className="admin-stat-label">Success</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon warning">
            <Icon name="alertCircle" size={24} />
          </div>
          <div className="admin-stat-value">{logs.filter(l => l.type === 'warning').length}</div>
          <div className="admin-stat-label">Warnings</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon danger">
            <Icon name="xCircle" size={24} />
          </div>
          <div className="admin-stat-value">{logs.filter(l => l.type === 'error').length}</div>
          <div className="admin-stat-label">Errors</div>
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
            const colors = getLogColor(log.type);
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
                  {getLogIcon(log.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 500,
                    color: '#1f2937',
                    marginBottom: '0.25rem'
                  }}>
                    {log.message}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <span>{formatDate(log.timestamp, 'datetime')}</span>
                    <span>•</span>
                    <span>By: {log.user}</span>
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
                  {log.type}
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
