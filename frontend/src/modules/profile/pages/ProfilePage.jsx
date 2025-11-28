/**
 * ProfilePage
 * View user profile information
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { authService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate } from '../../../utils/formatters';
import { getInitials } from '../../../utils/helpers';
import './profile.css';

const ProfilePage = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check if user is admin/staff
  const isAdmin = authUser?.user?.is_superuser || authUser?.user?.is_staff || false;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authService.getCurrentUser();
      setUser(response.data.user);
      setProfile(response.data.profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading profile..." />;
  }

  return (
    <div className="profile-page">
      <Container>
        {/* Header */}
        <div className="profile-header">
          <h1 className="profile-title">My Profile</h1>
          <Link to="/profile/edit" className="edit-profile-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Profile
          </Link>
        </div>

        <div className="profile-content">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-avatar-section">
              {(profile?.avatar_url || profile?.avatar) ? (
                <img
                  src={profile.avatar_url || profile.avatar}
                  alt="Profile"
                  className="profile-avatar"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  {getInitials(`${user?.first_name} ${user?.last_name}`)}
                </div>
              )}
              
              <div className="profile-name-section">
                <h2 className="profile-name">
                  {user?.first_name} {user?.last_name}
                </h2>
                {user?.username && (
                  <p className="profile-username">@{user.username}</p>
                )}
                <div className="profile-badges">
                  {user?.is_staff ? (
                    <span className="profile-badge admin">Admin</span>
                  ) : (
                    <span className="profile-badge student">Student</span>
                  )}
                  {profile?.is_verified && (
                    <span className="profile-badge verified">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-info-grid">
              {user?.username && (
                <div className="info-item">
                  <span className="info-label">Username</span>
                  <span className="info-value">@{user.username}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Student ID</span>
                <span className="info-value">{profile?.student_id || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Member Since</span>
                <span className="info-value">{formatDate(user?.date_joined, 'date')}</span>
              </div>
            </div>
          </div>

          {/* Academic Information - Only show if user has academic info or is not admin */}
          {(profile?.student_id || profile?.department || profile?.course || profile?.year_level || !isAdmin) && (
          <div className="profile-section">
            <h3 className="section-title">Academic Information</h3>
            <div className="profile-info-grid">
                {profile?.student_id && (
              <div className="info-item">
                <span className="info-label">Student ID</span>
                    <span className="info-value">{profile.student_id}</span>
              </div>
                )}
                {profile?.year_level && (
              <div className="info-item">
                <span className="info-label">Year Level</span>
                    <span className="info-value">{profile.year_level}</span>
              </div>
                )}
                {profile?.department && (
              <div className="info-item">
                <span className="info-label">College</span>
                    <span className="info-value">{profile.department.name}</span>
              </div>
                )}
                {profile?.course && (
              <div className="info-item">
                <span className="info-label">Course</span>
                    <span className="info-value">{profile.course.name}</span>
                  </div>
                )}
                {isAdmin && !profile?.student_id && !profile?.department && !profile?.course && !profile?.year_level && (
                  <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="info-value" style={{ color: '#6b7280', fontStyle: 'italic' }}>
                      No academic information provided (optional for administrators)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="profile-section">
            <h3 className="section-title">Personal Information</h3>
            <div className="profile-info-grid">
              <div className="info-item">
                <span className="info-label">First Name</span>
                <span className="info-value">{user?.first_name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Last Name</span>
                <span className="info-value">{user?.last_name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email Address</span>
                <span className="info-value">{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="profile-section">
            <h3 className="section-title">Quick Actions</h3>
            <div className="quick-actions">
              <Link to="/elections" className="action-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                View Elections
              </Link>
              <Link to="/my-votes" className="action-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                My Votes
              </Link>
              <Link to="/my-applications" className="action-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                My Applications
              </Link>
              <Link to="/candidates" className="action-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Browse Candidates
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ProfilePage;
