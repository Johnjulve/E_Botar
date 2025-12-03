/**
 * ProfileEditPage
 * Edit user profile information
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { LoadingSpinner } from '../../../components/common';
import { authService } from '../../../services';
import { useAuth } from '../../../hooks/useAuth';
import { getInitials } from '../../../utils/helpers';
import './profile.css';

const ProfileEditPage = () => {
  const navigate = useNavigate();
  const { updateUser, user: authUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Check if user is admin/staff
  const isAdmin = authUser?.user?.is_superuser || authUser?.user?.is_staff || false;
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    student_id: '',
    department: '',
    course: '',
    year_level: '',
  });

  const [hasExistingEmail, setHasExistingEmail] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.department) {
      fetchCourses(formData.department);
    }
  }, [formData.department]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userResponse, departmentsResponse] = await Promise.all([
        authService.getCurrentUser(),
        authService.getDepartments()
      ]);

      const user = userResponse.data.user;
      const profile = userResponse.data.profile;

      // Store user data for avatar display
      setCurrentUser(user);
      
      // Set avatar preview if exists (prefer avatar_url which has full path)
      if (profile?.avatar_url) {
        setAvatarPreview(profile.avatar_url);
      } else if (profile?.avatar) {
        setAvatarPreview(profile.avatar);
      }

      // Check if user has existing email
      const emailExists = !!(user?.email && user.email.trim() !== '');
      setHasExistingEmail(emailExists);

      setFormData({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        username: user?.username || '',
        email: user?.email || '',
        student_id: profile?.student_id || '',
        department: profile?.department?.id || '',
        course: profile?.course?.id || '',
        year_level: profile?.year_level || '',
      });

      setDepartments(departmentsResponse.data || []);
      
      if (profile?.department?.id) {
        const coursesResponse = await authService.getCoursesByDepartment(profile.department.id);
        setCourses(coursesResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async (departmentId) => {
    try {
      const response = await authService.getCoursesByDepartment(departmentId);
      setCourses(response.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset course when department changes
    if (name === 'department') {
      setFormData(prev => ({
        ...prev,
        course: ''
      }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      setSaving(true);
      
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Append user fields
      if (formData.first_name) submitData.append('first_name', formData.first_name);
      if (formData.last_name) submitData.append('last_name', formData.last_name);
      if (formData.email && !hasExistingEmail) submitData.append('email', formData.email);
      
      // Append profile fields
      if (formData.student_id) submitData.append('student_id', formData.student_id);
      if (formData.year_level) submitData.append('year_level', formData.year_level);
      
      // Append department and course as IDs (ensure they're numbers)
      if (formData.department) {
        submitData.append('department', formData.department);
      }
      if (formData.course) {
        submitData.append('course', formData.course);
      }
      
      // Append avatar file if exists
      if (avatarFile) {
        submitData.append('avatar', avatarFile);
      } else if (avatarPreview === null) {
        // If avatar was removed, send removal flag
        submitData.append('remove_avatar', 'true');
      }
      
      // Update profile and refresh auth context
      const result = await updateUser(submitData);
      
      if (result.success) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          navigate('/profile');
        }, 1500);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Display detailed error messages
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          // Combine all error messages
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => {
              if (Array.isArray(messages)) {
                return `${field}: ${messages.join(', ')}`;
              }
              return `${field}: ${messages}`;
            })
            .join('\n');
          setError(errorMessages || 'Failed to update profile');
        } else {
          setError(error.response?.data?.message || 'Failed to update profile');
        }
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading profile..." />;
  }

  return (
    <div className="profile-page profile-edit-page">
      <Container>
        {/* Header */}
        <div className="profile-header">
          <h1 className="profile-title">Edit Profile</h1>
          <button 
            onClick={() => navigate('/profile')} 
            className="back-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Profile
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
            <button onClick={() => setError('')} className="alert-close">×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="alert-close">×</button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="profile-form">
          {/* Profile Picture Section */}
          <div className="form-section">
            <h3 className="section-title">Profile Picture</h3>
            <div className="avatar-upload-section">
              <div className="avatar-preview-container">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile Preview"
                    className="avatar-preview"
                  />
                ) : (
                  <div className="avatar-preview-placeholder">
                    {currentUser && getInitials(`${currentUser.first_name} ${currentUser.last_name}`)}
                  </div>
                )}
              </div>
              
              <div className="avatar-upload-controls">
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="avatar" className="btn-upload">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  {avatarPreview ? 'Change Picture' : 'Upload Picture'}
                </label>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="btn-remove-avatar"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Remove
                  </button>
                )}
              </div>
              
              <p className="avatar-help-text">
                Recommended: Square image, at least 400x400 pixels. Max size: 5MB
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="first_name" className="form-label">
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter first name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name" className="form-label">
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter last name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <div className="input-with-prefix disabled">
                  <span className="input-prefix">@</span>
                  <input
                    type="text"
                    className="form-input with-prefix"
                    id="username"
                    name="username"
                    value={formData.username}
                    disabled
                    placeholder="username"
                  />
                </div>
                <small className="form-help">Username cannot be changed</small>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email {!hasExistingEmail && <span className="required">*</span>}
                </label>
                <input
                  type="email"
                  className="form-input"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required={!hasExistingEmail}
                  disabled={hasExistingEmail}
                  placeholder="Enter email address"
                />
                {hasExistingEmail && (
                  <small className="form-help">Email cannot be changed once set</small>
                )}
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="form-section">
            <h3 className="section-title">
              Academic Information
              {isAdmin && (
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 'normal', 
                  color: '#6b7280',
                  marginLeft: '0.5rem'
                }}>
                  (Optional for Administrators)
                </span>
              )}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="student_id" className="form-label">
                  Student ID {!isAdmin && <span className="required">*</span>}
                </label>
                <input
                  type="text"
                  className="form-input"
                  id="student_id"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  required={!isAdmin}
                  placeholder="e.g., 2021-12345"
                />
                {isAdmin && (
                  <small className="form-help">
                    Optional for administrators. Leave blank if not applicable.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="year_level" className="form-label">
                  Year Level {!isAdmin && <span className="required">*</span>}
                </label>
                <select
                  className="form-select"
                  id="year_level"
                  name="year_level"
                  value={formData.year_level}
                  onChange={handleChange}
                  required={!isAdmin}
                >
                  <option value="">Select Year Level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="department" className="form-label">
                  Department {!isAdmin && <span className="required">*</span>}
                </label>
                <select
                  className="form-select"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required={!isAdmin}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="course" className="form-label">
                  Course {!isAdmin && <span className="required">*</span>}
                </label>
                <select
                  className="form-select"
                  id="course"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  required={!isAdmin}
                  disabled={!formData.department}
                >
                  <option value="">
                    {formData.department ? 'Select Course' : 'Select Department First'}
                  </option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/profile')}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </Container>
    </div>
  );
};

export default ProfileEditPage;
