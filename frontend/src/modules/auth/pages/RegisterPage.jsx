/**
 * RegisterPage
 * User registration page
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form } from 'react-bootstrap';
import { Button, Card, Alert } from '../../../components/common';
import { useAuth } from '../../../hooks/useAuth';
import { authService } from '../../../services';
import { validatePassword, isValidEmail } from '../../../utils/validators';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    department: '',
    course: '',
    year_level: '',
  });
  
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Fetch departments and courses
  useEffect(() => {
    fetchDepartmentsAndCourses();
  }, []);

  // Filter courses by department
  useEffect(() => {
    if (formData.department) {
      const filtered = courses.filter(
        course => course.department === parseInt(formData.department)
      );
      setFilteredCourses(filtered);
      // Reset course if it doesn't belong to selected department
      if (formData.course) {
        const courseExists = filtered.find(c => c.id === parseInt(formData.course));
        if (!courseExists) {
          setFormData(prev => ({ ...prev, course: '' }));
        }
      }
    } else {
      setFilteredCourses([]);
      setFormData(prev => ({ ...prev, course: '' }));
    }
  }, [formData.department, courses]);

  const fetchDepartmentsAndCourses = async () => {
    try {
      const [deptResponse, courseResponse] = await Promise.all([
        authService.getDepartments(),
        authService.getCourses()
      ]);
      setDepartments(deptResponse.data);
      setCourses(courseResponse.data);
    } catch (error) {
      console.error('Error fetching departments/courses:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }
    
    // Password confirmation
    if (!formData.password_confirm) {
      newErrors.password_confirm = 'Please confirm your password';
    } else if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    try {
      // Prepare data (convert to integer for foreign keys)
      const registrationData = {
        ...formData,
        department: formData.department ? parseInt(formData.department) : null,
        course: formData.course ? parseInt(formData.course) : null,
        password2: formData.password_confirm // Backend expects password2
      };
      
      delete registrationData.password_confirm; // Remove frontend field

      const result = await register(registrationData);
      
      if (result.success) {
        setSuccessMessage('Registration successful! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setErrorMessage(result.error);
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light py-5">
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={7}>
            <div className="text-center mb-4">
              <i className="fas fa-user-plus text-brand" style={{ fontSize: '3rem' }}></i>
              <h1 className="mt-3 mb-1">Create Account</h1>
              <p className="text-muted">Join E-Botar and participate in student elections</p>
            </div>

            <Card>
              {errorMessage && (
                <Alert variant="danger" dismissible onClose={() => setErrorMessage('')}>
                  {errorMessage}
                </Alert>
              )}
              
              {successMessage && (
                <Alert variant="success">
                  {successMessage}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Username <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        isInvalid={!!errors.username}
                        placeholder="Choose a username"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.username}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        isInvalid={!!errors.email}
                        placeholder="your.email@example.com"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        isInvalid={!!errors.first_name}
                        placeholder="First name"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.first_name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        isInvalid={!!errors.last_name}
                        placeholder="Last name"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.last_name}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Password <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        isInvalid={!!errors.password}
                        placeholder="Create a strong password"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.password}
                      </Form.Control.Feedback>
                      <Form.Text className="text-muted small">
                        At least 8 characters with uppercase, lowercase, and number
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Confirm Password <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="password"
                        name="password_confirm"
                        value={formData.password_confirm}
                        onChange={handleChange}
                        isInvalid={!!errors.password_confirm}
                        placeholder="Re-enter your password"
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.password_confirm}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>

                <h6 className="mb-3 text-secondary">Additional Information (Optional)</h6>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Department</Form.Label>
                      <Form.Select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Course</Form.Label>
                      <Form.Select
                        name="course"
                        value={formData.course}
                        onChange={handleChange}
                        disabled={loading || !formData.department}
                      >
                        <option value="">Select Course</option>
                        {filteredCourses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.name}
                          </option>
                        ))}
                      </Form.Select>
                      {!formData.department && (
                        <Form.Text className="text-muted small">
                          Please select a department first
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Year Level</Form.Label>
                      <Form.Select
                        name="year_level"
                        value={formData.year_level}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        <option value="">Select Year Level</option>
                        {yearLevels.map(year => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        placeholder="(123) 456-7890"
                        disabled={loading}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={loading}
                  className="mb-3 mt-2"
                >
                  Create Account
                </Button>

                <div className="text-center">
                  <p className="text-muted mb-0">
                    Already have an account?{' '}
                    <Link to="/login" className="text-brand fw-semibold">
                      Sign in here
                    </Link>
                  </p>
                </div>
              </Form>
            </Card>

            <div className="text-center mt-4">
              <p className="text-muted small">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RegisterPage;

