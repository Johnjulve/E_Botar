/**
 * ProfilePage
 * View user profile information
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Badge, LoadingSpinner } from '../../../components/common';
import { authService } from '../../../services';
import { formatDate } from '../../../utils/formatters';
import { getInitials } from '../../../utils/helpers';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i className="fas fa-user me-2 text-primary"></i>
          My Profile
        </h1>
        <Link to="/profile/edit" className="btn btn-primary">
          <i className="fas fa-edit me-2"></i>
          Edit Profile
        </Link>
      </div>

      <div className="row g-4">
        {/* Profile Card */}
        <div className="col-lg-4">
          <Card>
            <div className="text-center">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="rounded-circle mb-3"
                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                />
              ) : (
                <div 
                  className="rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold mb-3"
                  style={{
                    width: '120px',
                    height: '120px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    fontSize: '3rem'
                  }}
                >
                  {getInitials(`${user?.first_name} ${user?.last_name}`)}
                </div>
              )}
              
              <h3 className="mb-2">
                {user?.first_name} {user?.last_name}
              </h3>
              
              <div className="mb-3">
                {user?.is_staff ? (
                  <Badge variant="danger">Admin</Badge>
                ) : (
                  <Badge variant="success">Student</Badge>
                )}
                {profile?.is_verified && (
                  <Badge variant="info" className="ms-2">
                    <i className="fas fa-check-circle me-1"></i>
                    Verified
                  </Badge>
                )}
              </div>

              <hr />

              <div className="text-start">
                <div className="mb-3">
                  <small className="text-muted d-block">Email</small>
                  <strong>{user?.email}</strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block">Student ID</small>
                  <strong>{profile?.student_id || 'N/A'}</strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block">Member Since</small>
                  <strong>{formatDate(user?.date_joined, 'date')}</strong>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Details Card */}
        <div className="col-lg-8">
          <Card>
            <h4 className="mb-3">
              <i className="fas fa-info-circle me-2 text-primary"></i>
              Personal Information
            </h4>

            <div className="row g-3">
              <div className="col-md-6">
                <small className="text-muted d-block">First Name</small>
                <strong>{user?.first_name}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Last Name</small>
                <strong>{user?.last_name}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Email Address</small>
                <strong>{user?.email}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Phone Number</small>
                <strong>{profile?.phone_number || 'Not provided'}</strong>
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            <h4 className="mb-3">
              <i className="fas fa-graduation-cap me-2 text-primary"></i>
              Academic Information
            </h4>

            <div className="row g-3">
              <div className="col-md-6">
                <small className="text-muted d-block">Student ID</small>
                <strong>{profile?.student_id || 'N/A'}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Year Level</small>
                <strong>{profile?.year_level || 'Not specified'}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Department</small>
                <strong>{profile?.department?.name || 'Not specified'}</strong>
              </div>
              <div className="col-md-6">
                <small className="text-muted d-block">Course</small>
                <strong>{profile?.course?.name || 'Not specified'}</strong>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-4">
            <h5 className="mb-3">Quick Actions</h5>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/elections" className="btn btn-outline-primary">
                <i className="fas fa-calendar-alt me-2"></i>
                View Elections
              </Link>
              <Link to="/my-votes" className="btn btn-outline-success">
                <i className="fas fa-history me-2"></i>
                My Votes
              </Link>
              <Link to="/my-applications" className="btn btn-outline-info">
                <i className="fas fa-file-alt me-2"></i>
                My Applications
              </Link>
              <Link to="/candidates" className="btn btn-outline-warning">
                <i className="fas fa-users me-2"></i>
                Browse Candidates
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
};

export default ProfilePage;
