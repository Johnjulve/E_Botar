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
import { getFullName, getInitials, coerceYearLevelToFormValue } from '../../../utils/helpers';
<<<<<<< HEAD
import { getChangedFields } from '../../../utils/patchPayload';
=======
>>>>>>> main
import '../profile.css';

const ProfileEditPage = () => {
  const navigate = useNavigate();
  const { updateUser, user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [initialFormData, setInitialFormData] = useState(null);
  
  // Check if user is admin/staff
  const isAdmin = authUser?.user?.is_superuser || authUser?.user?.is_staff || false;
  
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    username: '',
    email: '',
    student_id: '',
    department: '',
    course: '',
    year_level: '',
    section: '',
  });

  const [hasExistingEmail, setHasExistingEmail] = useState(false);
  const formFieldRules = {
    first_name: 'string',
    middle_name: 'string',
    last_name: 'string',
    email: 'string',
    student_id: 'string',
    year_level: 'string',
    section: 'string',
    department: 'string',
    course: 'string',
  };

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

      const nextFormData = {
        first_name: user?.first_name || '',
        middle_name: profile?.middle_name || '',
        last_name: user?.last_name || '',
        username: user?.username || '',
        email: user?.email || '',
        student_id: profile?.student_id || '',
        department: profile?.department?.code || '',
        course: profile?.course?.code || '',
        year_level: coerceYearLevelToFormValue(profile?.year_level),
        section: profile?.section != null ? String(profile.section) : '',
<<<<<<< HEAD
      };
      setFormData(nextFormData);
      setInitialFormData(nextFormData);
=======
      });
>>>>>>> main

      setDepartments(departmentsResponse.data || []);
      
      if (profile?.department?.code) {
        const coursesResponse = await authService.getCoursesByDepartment(profile.department.code);
        setCourses(coursesResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async (departmentCode) => {
    try {
      const response = await authService.getCoursesByDepartment(departmentCode);
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
    
    // Reset course when department changes and fetch courses for new department
    if (name === 'department') {
      setFormData(prev => ({
        ...prev,
        course: ''
      }));
      if (value) {
        fetchCourses(value); // value is now department code
      } else {
        setCourses([]);
      }
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
      setAvatarRemoved(false);
      
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
    setAvatarRemoved(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      setSaving(true);
      
      // Create FormData for file upload
      const submitData = new FormData();
      const {
        normalizedCurrent: normalizedCurrentData,
        normalizedInitial: normalizedInitialData,
        changedFields,
        hasChanges: hasFieldChanges,
      } = getChangedFields({
        currentValues: formData,
        initialValues: initialFormData,
        fieldRules: formFieldRules,
      });
      const hasAvatarChanges = Boolean(avatarFile) || avatarRemoved;

      if (!hasFieldChanges && !hasAvatarChanges) {
        setSuccess('No changes to save.');
        return;
      }
      
      // Append user fields
      if (Object.prototype.hasOwnProperty.call(changedFields, 'first_name')) submitData.append('first_name', normalizedCurrentData.first_name);
      if (Object.prototype.hasOwnProperty.call(changedFields, 'middle_name')) submitData.append('middle_name', normalizedCurrentData.middle_name);
      if (Object.prototype.hasOwnProperty.call(changedFields, 'last_name')) submitData.append('last_name', normalizedCurrentData.last_name);
      if (!hasExistingEmail && Object.prototype.hasOwnProperty.call(changedFields, 'email')) submitData.append('email', normalizedCurrentData.email);
      
      // Append profile fields
<<<<<<< HEAD
      if (Object.prototype.hasOwnProperty.call(changedFields, 'student_id')) submitData.append('student_id', normalizedCurrentData.student_id);
      if (Object.prototype.hasOwnProperty.call(changedFields, 'year_level')) submitData.append('year_level', normalizedCurrentData.year_level);
      if (Object.prototype.hasOwnProperty.call(changedFields, 'section')) submitData.append('section', normalizedCurrentData.section);
=======
      if (formData.student_id) submitData.append('student_id', formData.student_id);
      if (formData.year_level) submitData.append('year_level', formData.year_level);
      submitData.append('section', formData.section != null ? String(formData.section).trim() : '');
>>>>>>> main
      
      // Append department and course as IDs (ensure they're numbers)
      if (Object.prototype.hasOwnProperty.call(changedFields, 'department')) {
        submitData.append('department', normalizedCurrentData.department);
      }
      if (Object.prototype.hasOwnProperty.call(changedFields, 'course')) {
        submitData.append('course', normalizedCurrentData.course);
      }
      
      // Append avatar file if exists
      if (avatarFile) {
        submitData.append('avatar', avatarFile);
      } else if (avatarRemoved) {
        // If avatar was removed, send removal flag
        submitData.append('remove_avatar', 'true');
      }
      
      // Update profile and refresh auth context
      const result = await updateUser(submitData);
      
      if (result.success) {
        setSuccess('Profile updated successfully!');
        setAvatarRemoved(false);
        setAvatarFile(null);
        setInitialFormData({
          ...formData,
          section: formData.section != null ? String(formData.section).trim() : '',
          student_id: formData.student_id != null ? String(formData.student_id).trim() : '',
        });
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
            className="profile-back-btn"
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
          <div className="profile-alert profile-alert-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
            <button onClick={() => setError('')} className="profile-alert-close">×</button>
          </div>
        )}

        {success && (
          <div className="profile-alert profile-alert-success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="profile-alert-close">×</button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="profile-form">
          {/* Profile Picture Section */}
          <div className="profile-form-section">
            <h3 className="profile-section-title">Profile Picture</h3>
            <div className="profile-avatar-upload-section">
              <div className="profile-avatar-preview-container">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile Preview"
                    className="profile-avatar-preview"
                    onError={() => setAvatarPreview(null)}
                  />
                ) : (
                  <div className="profile-avatar-preview-placeholder">
                    {currentUser && getInitials(getFullName(currentUser, { middle_name: formData.middle_name }))}
                  </div>
                )}
              </div>
              
              <div className="profile-avatar-upload-controls">
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="avatar" className="profile-btn-upload">
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
                    className="profile-btn-remove-avatar"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Remove
                  </button>
                )}
              </div>
              
              <p className="profile-avatar-help-text">
                Recommended: Square image, at least 400x400 pixels. Max size: 5MB
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="profile-form-section">
            <h3 className="profile-section-title">Personal Information</h3>
            <div className="profile-form-grid">
              <div className="profile-form-group">
                <label htmlFor="first_name" className="profile-form-label">
                  First Name <span className="profile-required">*</span>
                </label>
                <input
                  type="text"
                  className="profile-form-input"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter first name"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="middle_name" className="profile-form-label">
                  Middle Name
                </label>
                <input
                  type="text"
                  className="profile-form-input"
                  id="middle_name"
                  name="middle_name"
                  value={formData.middle_name}
                  onChange={handleChange}
                  placeholder="Enter middle name (optional)"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="last_name" className="profile-form-label">
                  Last Name <span className="profile-required">*</span>
                </label>
                <input
                  type="text"
                  className="profile-form-input"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter last name"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="username" className="profile-form-label">
                  Username
                </label>
                <div className="profile-input-with-prefix disabled">
                  <span className="profile-input-prefix">@</span>
                  <input
                    type="text"
                    className="profile-form-input profile-with-prefix"
                    id="username"
                    name="username"
                    value={formData.username}
                    disabled
                    placeholder="username"
                  />
                </div>
                <small className="profile-form-help">Username cannot be changed</small>
              </div>

              <div className="profile-form-group">
                <label htmlFor="email" className="profile-form-label">
                  Email {!hasExistingEmail && <span className="profile-required">*</span>}
                </label>
                <input
                  type="email"
                  className="profile-form-input"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required={!hasExistingEmail}
                  disabled={hasExistingEmail}
                  placeholder="Enter email address"
                />
                {hasExistingEmail && (
                  <small className="profile-form-help">Email cannot be changed once set</small>
                )}
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="profile-form-section">
            <h3 className="profile-section-title">
              Academic Information
              {isAdmin && (
                <span className="profile-section-title-subtext">
                  (Optional for Administrators)
                </span>
              )}
            </h3>
            <div className="profile-form-grid">
              <div className="profile-form-group">
                <label htmlFor="student_id" className="profile-form-label">
                  Student ID {!isAdmin && <span className="profile-required">*</span>}
                </label>
                <input
                  type="text"
                  className="profile-form-input"
                  id="student_id"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  required={!isAdmin}
                  placeholder="e.g., 2021-12345"
                />
                {isAdmin && (
                  <small className="profile-form-help">
                    Optional for administrators. Leave blank if not applicable.
                  </small>
                )}
              </div>

              <div className="profile-form-group">
                <label htmlFor="year_level" className="profile-form-label">
                  Year Level {!isAdmin && <span className="profile-required">*</span>}
                </label>
                <select
                  className="profile-form-select"
                  id="year_level"
                  name="year_level"
                  value={formData.year_level}
                  onChange={handleChange}
                  required={!isAdmin}
                >
                  <option value="">Select Year Level</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              <div className="profile-form-group">
                <label htmlFor="section" className="profile-form-label">
                  Section {!isAdmin && <span className="profile-required">*</span>}
                </label>
                <input
                  type="text"
                  className="profile-form-input"
                  id="section"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  required={!isAdmin}
                  maxLength={50}
                  placeholder="e.g. A, B, Block 1"
                />
                <small className="profile-form-help">
                  Your class or block section (as used by your college).
                </small>
              </div>

              <div className="profile-form-group">
                <label htmlFor="department" className="profile-form-label">
                  College {!isAdmin && <span className="profile-required">*</span>}
                </label>
                <select
                  className="profile-form-select"
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required={!isAdmin}
                >
                  <option value="">Select College</option>
                  {departments.map(dept => (
                    <option key={dept.code} value={dept.code}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="profile-form-group">
                <label htmlFor="course" className="profile-form-label">
                  Course {!isAdmin && <span className="profile-required">*</span>}
                </label>
                <select
                  className="profile-form-select"
                  id="course"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  required={!isAdmin}
                  disabled={!formData.department}
                >
                  <option value="">
                    {formData.department ? 'Select Course' : 'Select College First'}
                  </option>
                  {courses.map(course => (
                    <option key={course.code} value={course.code}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-form-actions">
            <button
              type="button"
              className="profile-btn-secondary"
              onClick={() => navigate('/profile')}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="profile-btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="profile-spinner"></span>
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
