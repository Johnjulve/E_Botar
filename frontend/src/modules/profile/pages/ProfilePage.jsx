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
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  
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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
      setPasswordError('All password fields are required');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.old_password === passwordData.new_password) {
      setPasswordError('New password must be different from current password');
      return;
    }

    try {
      setChangingPassword(true);
      const response = await authService.changePassword(passwordData.old_password, passwordData.new_password);
      
      // Verify response
      if (response.data && response.data.message) {
        setPasswordSuccess('Password changed successfully! You will be logged out in 3 seconds. Please log back in with your new password.');
        setPasswordData({
          old_password: '',
          new_password: '',
          confirm_password: ''
        });
        
        // Automatically log out after 3 seconds for security
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordSuccess('');
          // Clear auth and redirect - use window.location for full page reload
          authService.logout();
          // Use window.location.href for a full page reload to ensure complete logout
          window.location.href = '/login';
        }, 3000);
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.message || 
                          'Failed to change password. Please try again.';
      setPasswordError(errorMessage);
    } finally {
      setChangingPassword(false);
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

          {/* Change Password Section */}
          <div className="profile-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <h3 className="section-title" style={{ marginBottom: '0.25rem' }}>Change Password</h3>
                {!showChangePassword && (
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280', 
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Update your account password for better security
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowChangePassword(!showChangePassword);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setPasswordData({
                    old_password: '',
                    new_password: '',
                    confirm_password: ''
                  });
                }}
                className="btn-secondary"
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexShrink: 0,
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {showChangePassword ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Cancel
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Change Password
                  </>
                )}
              </button>
            </div>

            {showChangePassword && (
              <form onSubmit={handleChangePassword} style={{ marginTop: '1rem' }}>
                {passwordError && (
                  <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span style={{ flex: 1 }}>{passwordError}</span>
                    <button onClick={() => setPasswordError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#991b1b' }}>×</button>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '0.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span style={{ flex: 1 }}>{passwordSuccess}</span>
                    <button onClick={() => setPasswordSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#166534' }}>×</button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label htmlFor="old_password" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                      Current Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      id="old_password"
                      name="old_password"
                      value={passwordData.old_password}
                      onChange={handlePasswordChange}
                      required
                      placeholder="Enter current password"
                      disabled={changingPassword}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="new_password" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                      New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      id="new_password"
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      required
                      minLength={8}
                      placeholder="Enter new password (min 8 characters)"
                      disabled={changingPassword}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit'
                      }}
                    />
                    <small style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>Must be at least 8 characters long</small>
                  </div>

                  <div>
                    <label htmlFor="confirm_password" style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                      Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      id="confirm_password"
                      name="confirm_password"
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      required
                      minLength={8}
                      placeholder="Confirm new password"
                      disabled={changingPassword}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.95rem',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#0b6e3b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: changingPassword ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: changingPassword ? 0.6 : 1
                    }}
                  >
                    {changingPassword ? (
                      <>
                        <span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                        Changing...
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
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
