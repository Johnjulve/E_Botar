/**
 * EditProfilePage
 * Edit user profile information
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container } from '../../../components/layout';
import { Card, Button, Alert, LoadingSpinner } from '../../../components/common';
import { authService } from '../../../services';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    student_id: '',
    year_level: '',
    department: '',
    course: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.department) {
      const filtered = courses.filter(c => c.department === parseInt(formData.department));
      setFilteredCourses(filtered);
    } else {
      setFilteredCourses([]);
    }
  }, [formData.department, courses]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch current user data
      const userResponse = await authService.getCurrentUser();
      const userData = userResponse.data;
      
      setFormData({
        first_name: userData.user?.first_name || '',
        last_name: userData.user?.last_name || '',
        email: userData.user?.email || '',
        student_id: userData.profile?.student_id || '',
        year_level: userData.profile?.year_level || '',
        department: userData.profile?.department?.id || '',
        course: userData.profile?.course?.id || ''
      });
      
      // Fetch departments and courses
      const [deptResponse, courseResponse] = await Promise.all([
        authService.getDepartments(),
        authService.getCourses()
      ]);
      
      setDepartments(deptResponse.data || []);
      setCourses(courseResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset course when department changes
    if (name === 'department') {
      setFormData(prev => ({ ...prev, course: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setSubmitting(true);
      
      await authService.updateProfile(formData);
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading profile..." />;
  }

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>
          <i className="fas fa-user-edit me-2 text-primary"></i>
          Edit Profile
        </h1>
        <Link to="/profile" className="btn btn-outline-secondary">
          <i className="fas fa-times me-2"></i>
          Cancel
        </Link>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">{success}</Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <h5 className="mb-3">
            <i className="fas fa-user me-2 text-primary"></i>
            Personal Information
          </h5>
          
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">First Name *</label>
              <input
                type="text"
                name="first_name"
                className="form-control"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="col-md-6">
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                name="last_name"
                className="form-control"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="col-md-6">
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
                disabled
              />
              <small className="text-muted">Email cannot be changed</small>
            </div>
          </div>
        </Card>

        <Card className="mb-4">
          <h5 className="mb-3">
            <i className="fas fa-graduation-cap me-2 text-primary"></i>
            Academic Information
          </h5>
          
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Student ID</label>
              <input
                type="text"
                name="student_id"
                className="form-control"
                value={formData.student_id}
                onChange={handleChange}
                placeholder="e.g., 2021-12345"
              />
            </div>
            
            <div className="col-md-6">
              <label className="form-label">Year Level</label>
              <select
                name="year_level"
                className="form-select"
                value={formData.year_level}
                onChange={handleChange}
              >
                <option value="">Select Year Level</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            
            <div className="col-md-6">
              <label className="form-label">College</label>
              <select
                name="department"
                className="form-select"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-6">
              <label className="form-label">Course</label>
              <select
                name="course"
                className="form-select"
                value={formData.course}
                onChange={handleChange}
                disabled={!formData.department}
              >
                <option value="">Select Course</option>
                {filteredCourses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
              {!formData.department && (
                <small className="text-muted">Select a department first</small>
              )}
            </div>
          </div>
        </Card>

        <div className="d-flex gap-2 justify-content-end">
          <Link to="/profile" className="btn btn-outline-secondary">
            Cancel
          </Link>
          <Button 
            type="submit" 
            variant="primary"
            loading={submitting}
            disabled={submitting}
          >
            <i className="fas fa-save me-2"></i>
            Save Changes
          </Button>
        </div>
      </form>
    </Container>
  );
};

export default EditProfilePage;
