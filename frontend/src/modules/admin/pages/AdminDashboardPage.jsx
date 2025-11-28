/**
 * AdminDashboardPage
 * Main admin dashboard with overview statistics
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { electionService, candidateService, votingService, authService } from '../../../services';
import { formatNumber } from '../../../utils/formatters';
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
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    clock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    vote: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    zap: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
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
    cog: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6m5.2-14.8l-4.2 4.2m-2 2l-4.2 4.2M23 12h-6m-6 0H1m14.8 5.2l-4.2-4.2m-2-2l-4.2-4.2"/>
      </svg>
    ),
    arrow: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    ),
    building: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 21h18"/>
        <path d="M5 21V7l8-4v18"/>
        <path d="M19 21V11l-6-4"/>
        <line x1="9" y1="9" x2="9" y2="9"/>
        <line x1="9" y1="12" x2="9" y2="12"/>
        <line x1="9" y1="15" x2="9" y2="15"/>
        <line x1="9" y1="18" x2="9" y2="18"/>
      </svg>
    ),
    activity: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  };

  return icons[name] || null;
};

const AdminDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    totalCandidates: 0,
    pendingApplications: 0,
    totalVotes: 0,
    totalUsers: 0
  });
  const [recentElections, setRecentElections] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        electionsRes,
        activeRes,
        candidatesRes,
        applicationsRes
      ] = await Promise.all([
        electionService.getAll(),
        electionService.getActive(),
        candidateService.getAll(),
        candidateService.getPendingApplications()
      ]);

      const elections = electionsRes.data || [];
      const active = activeRes.data || [];
      const candidates = candidatesRes.data || [];
      const applications = applicationsRes.data || [];

      // Calculate total votes from elections
      const totalVotes = elections.reduce((sum, e) => sum + (e.total_votes || 0), 0);

      setStats({
        totalElections: elections.length,
        activeElections: active.length,
        totalCandidates: candidates.length,
        pendingApplications: applications.length,
        totalVotes: totalVotes,
        totalUsers: 0 // Would need a separate endpoint
      });

      setRecentElections(elections.slice(0, 5));
      setPendingApplications(applications.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading admin dashboard..." />;
  }

  return (
    <Container>
      {/* Page Header */}
      <div className="admin-header">
        <h1>
          <Icon name="cog" size={28} style={{ color: '#2563eb' }} />
          Admin Dashboard
        </h1>
        <p>Manage elections, candidates, and monitor system activity</p>
      </div>

      {/* Statistics Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon primary">
            <Icon name="calendar" size={24} />
          </div>
          <div className="admin-stat-value">{formatNumber(stats.totalElections)}</div>
          <div className="admin-stat-label">Total Elections</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon success">
            <Icon name="checkCircle" size={24} />
          </div>
          <div className="admin-stat-value">{formatNumber(stats.activeElections)}</div>
          <div className="admin-stat-label">Active Elections</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon primary">
            <Icon name="users" size={24} />
          </div>
          <div className="admin-stat-value">{formatNumber(stats.totalCandidates)}</div>
          <div className="admin-stat-label">Candidates</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon warning">
            <Icon name="clock" size={24} />
          </div>
          <div className="admin-stat-value">{formatNumber(stats.pendingApplications)}</div>
          <div className="admin-stat-label">Pending Apps</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon success">
            <Icon name="vote" size={24} />
          </div>
          <div className="admin-stat-value">{formatNumber(stats.totalVotes)}</div>
          <div className="admin-stat-label">Total Votes</div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon primary">
            <Icon name="users" size={24} />
          </div>
          <div className="admin-stat-value">{formatNumber(stats.totalUsers)}</div>
          <div className="admin-stat-label">Registered Users</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h5 style={{
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#1f2937',
          fontWeight: 600
        }}>
          <Icon name="zap" size={20} style={{ color: '#eab308' }} />
          Quick Actions
        </h5>
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <Link to="/admin/elections/create" className="admin-btn primary">
            <Icon name="plus" size={16} />
            Create Election
          </Link>
          <Link to="/admin/applications" className="admin-btn">
            <Icon name="tasks" size={16} />
            Review Applications ({stats.pendingApplications})
          </Link>
          <Link to="/admin/elections" className="admin-btn">
            <Icon name="calendar" size={16} />
            Manage Elections
          </Link>
          <Link to="/admin/users" className="admin-btn">
            <Icon name="users" size={16} />
            Manage Users
          </Link>
          <Link to="/admin/logs" className="admin-btn">
            <Icon name="activity" size={16} />
            System Logs
          </Link>
          <Link to="/admin/programs" className="admin-btn">
            <Icon name="building" size={16} />
            Manage Programs
          </Link>
        </div>
      </div>

      {/* Recent Data Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Recent Elections */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h5 style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#1f2937',
              fontWeight: 600
            }}>
              <Icon name="calendar" size={20} style={{ color: '#2563eb' }} />
              Recent Elections
            </h5>
            <Link to="/admin/elections" className="admin-btn secondary">
              View All
            </Link>
          </div>

          {recentElections.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentElections.map(election => (
                <div key={election.id} style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  borderLeft: '3px solid #2563eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '1rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 600,
                        color: '#1f2937',
                        marginBottom: '0.25rem'
                      }}>
                        {election.title}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#6b7280'
                      }}>
                        {election.total_votes || 0} votes
                      </div>
                    </div>
                    <div className="admin-status-badge" style={{
                      background: election.is_active_now ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                      color: election.is_active_now ? '#166534' : '#374151'
                    }}>
                      {election.is_active_now ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: '#6b7280'
            }}>
              <p style={{ margin: 0 }}>No elections yet</p>
            </div>
          )}
        </div>

        {/* Pending Applications */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h5 style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#1f2937',
              fontWeight: 600
            }}>
              <Icon name="clock" size={20} style={{ color: '#eab308' }} />
              Pending Applications
            </h5>
            <Link to="/admin/applications" className="admin-btn secondary">
              Review All
            </Link>
          </div>

          {pendingApplications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingApplications.map(app => (
                <div key={app.id} style={{
                  padding: '1rem',
                  background: '#f9fafb',
                  borderRadius: '0.5rem',
                  borderLeft: '3px solid #eab308'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '1rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: 600,
                        color: '#1f2937',
                        marginBottom: '0.25rem'
                      }}>
                        {app.user?.first_name} {app.user?.last_name}
                      </div>
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#6b7280'
                      }}>
                        {app.position?.name} - {app.election?.title}
                      </div>
                    </div>
                    <Link
                      to={`/admin/applications/${app.id}`}
                      className="admin-btn secondary"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Icon name="arrow" size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: '#6b7280'
            }}>
              <p style={{ margin: 0 }}>No pending applications</p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

export default AdminDashboardPage;

