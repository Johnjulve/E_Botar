/**
 * AdminDashboardPage
 * Main admin dashboard with overview statistics
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner, Icon } from '../../../components/common';
import { electionService, candidateService, authService } from '../../../services';
import { formatNumber } from '../../../utils/formatters';
import '../admin.css';
import '../admin-dashboard.css';

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
        applicationsRes,
        userCountRes
      ] = await Promise.all([
        electionService.getAll(),
        electionService.getActive(),
        candidateService.getAll(),
        candidateService.getPendingApplications(),
        authService.getUserCount()
      ]);

      const elections = electionsRes.data || [];
      const active = activeRes.data || [];
      const candidates = candidatesRes.data || [];
      const applications = applicationsRes.data || [];
      const userCounts = userCountRes.data || {};

      // Calculate total votes from elections
      const totalVotes = elections.reduce((sum, e) => sum + (e.total_votes || 0), 0);

      setStats({
        totalElections: elections.length,
        activeElections: active.length,
        totalCandidates: candidates.length,
        pendingApplications: applications.length,
        totalVotes: totalVotes,
        totalUsers: userCounts.total_users || 0
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
      <div className="admin-card-container">
        <h5 className="admin-section-header">
          <Icon name="zap" size={20} className="admin-icon-warning" />
          Quick Actions
        </h5>
        <div className="admin-quick-actions-grid">
          <Link to="/admin/elections/create" className="admin-btn">
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
      <div className="admin-grid-auto-fit">
        {/* Recent Elections */}
        <div className="admin-card-container" style={{ marginBottom: 0 }}>
          <div className="admin-flex-between" style={{ marginBottom: '1.5rem' }}>
            <h5 className="admin-section-header">
              <Icon name="calendar" size={20} className="admin-icon-primary" />
              Recent Elections
            </h5>
            <Link to="/admin/elections" className="admin-btn secondary">
              View All
            </Link>
          </div>

          {recentElections.length > 0 ? (
            <div className="admin-flex-column">
              {recentElections.map(election => (
                <div key={election.id} className="admin-list-item">
                  <div className="admin-flex-start">
                    <div className="admin-flex-1">
                      <div className="admin-list-item-title">
                        {election.title}
                      </div>
                      <div className="admin-list-item-subtitle">
                        {election.total_votes || 0} votes
                      </div>
                    </div>
                    <div className={`admin-status-badge ${election.is_active_now ? 'admin-status-badge-active' : 'admin-status-badge-inactive'}`}>
                      {election.is_active_now ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <p>No elections yet</p>
            </div>
          )}
        </div>

        {/* Pending Applications */}
        <div className="admin-card-container" style={{ marginBottom: 0 }}>
          <div className="admin-flex-between" style={{ marginBottom: '1.5rem' }}>
            <h5 className="admin-section-header">
              <Icon name="clock" size={20} className="admin-icon-warning" />
              Pending Applications
            </h5>
            <Link to="/admin/applications" className="admin-btn secondary">
              Review All
            </Link>
          </div>

          {pendingApplications.length > 0 ? (
            <div className="admin-flex-column">
              {pendingApplications.map(app => (
                <div key={app.id} className="admin-list-item-warning">
                  <div className="admin-flex-start">
                    <div className="admin-flex-1">
                      <div className="admin-list-item-title">
                        {app.user?.first_name} {app.user?.last_name}
                      </div>
                      <div className="admin-list-item-subtitle">
                        {app.position?.name} - {app.election?.title}
                      </div>
                    </div>
                    <Link
                      to={`/admin/applications/${app.id}`}
                      className="admin-btn secondary admin-nowrap"
                    >
                      <Icon name="arrow" size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <p>No pending applications</p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

export default AdminDashboardPage;

