/**
 * RegisterPage
 * User registration page - Modern Design
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form } from 'react-bootstrap';
import { useAuth } from '../../../hooks/useAuth';
import { validatePassword, isValidEmail, isValidEmailDomain } from '../../../utils/validators';
import './auth.css';

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
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0); // 0: none, 1: weak, 2: medium, 3: strong

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Calculate password strength
    if (name === 'password') {
      const strength = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    return Math.min(strength, 3);
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
    } else {
      const emailValidation = isValidEmailDomain(formData.email);
      if (!emailValidation.valid) {
        newErrors.email = emailValidation.message;
      }
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
      // Prepare data
      const registrationData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        first_name: formData.first_name.trim() || '',
        last_name: formData.last_name.trim() || ''
      };

      const result = await register(registrationData);
      
      if (result.success) {
        setSuccessMessage('Registration successful! Please complete your profile. Redirecting...');
        setTimeout(() => {
          navigate('/profile/edit');
        }, 2000);
      } else {
        setErrorMessage(result.error);
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthClass = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'password-strength-weak';
    if (passwordStrength === 2) return 'password-strength-medium';
    return 'password-strength-strong';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength === 1) return 'Weak';
    if (passwordStrength === 2) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="auth-page d-flex align-items-center">
      <Container className="auth-container">
        <Row className="justify-content-center">
          <Col md={8} lg={7} xl={6}>
            <div className="auth-header">
              <h1>Create Your Account</h1>
              <p>Join E-Botar and participate in student elections</p>
            </div>

            <div className="auth-card">
              {errorMessage && (
                <div className="auth-alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{errorMessage}</span>
                  <button 
                    type="button" 
                    className="btn-close ms-auto" 
                    onClick={() => setErrorMessage('')}
                    aria-label="Close"
                  ></button>
                </div>
              )}
              
              {successMessage && (
                <div className="auth-alert alert-success" role="alert">
                  <i className="fas fa-check-circle"></i>
                  <span>{successMessage}</span>
                </div>
              )}

              <Form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-two-column">
                  <Form.Group className="form-group">
                    <Form.Label>
                      <i className="fas fa-user"></i>
                      Username <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      isInvalid={!!errors.username}
                      placeholder="Choose a username"
                      disabled={loading}
                    />
                    {errors.username && (
                      <div className="invalid-feedback d-block">
                        {errors.username}
                      </div>
                    )}
                  </Form.Group>

                  <Form.Group className="form-group">
                    <Form.Label>
                      <i className="fas fa-envelope"></i>
                      Email <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      isInvalid={!!errors.email}
                      placeholder="your.email@ssct.edu.ph"
                      disabled={loading}
                    />
                    {errors.email && (
                      <div className="invalid-feedback d-block">
                        {errors.email}
                      </div>
                    )}
                    <Form.Text className="text-muted">
                      <i className="fas fa-lock"></i>
                      Email must be from snsu.edu.ph or scct.edu.ph domain
                    </Form.Text>
                  </Form.Group>
                </div>

                <div className="auth-two-column">
                  <Form.Group className="form-group">
                    <Form.Label>
                      <i className="fas fa-id-card"></i>
                      First Name
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      isInvalid={!!errors.first_name}
                      placeholder="Your first name (optional)"
                      disabled={loading}
                    />
                    {errors.first_name && (
                      <div className="invalid-feedback d-block">
                        {errors.first_name}
                      </div>
                    )}
                  </Form.Group>

                  <Form.Group className="form-group">
                    <Form.Label>
                      <i className="fas fa-id-card"></i>
                      Last Name
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      isInvalid={!!errors.last_name}
                      placeholder="Your last name (optional)"
                      disabled={loading}
                    />
                    {errors.last_name && (
                      <div className="invalid-feedback d-block">
                        {errors.last_name}
                      </div>
                    )}
                  </Form.Group>
                </div>

                <div className="auth-two-column">
                  <Form.Group className="form-group">
                    <Form.Label>
                      <i className="fas fa-key"></i>
                      Password <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      isInvalid={!!errors.password}
                      placeholder="Create a strong password"
                      disabled={loading}
                    />
                    {errors.password && (
                      <div className="invalid-feedback d-block">
                        {errors.password}
                      </div>
                    )}
                    {formData.password && (
                      <div className="password-strength mt-2">
                        <div className={`password-strength-bar ${getPasswordStrengthClass()}`}></div>
                      </div>
                    )}
                    {passwordStrength > 0 && (
                      <Form.Text className="text-muted">
                        <i className="fas fa-info-circle"></i>
                        Password strength: {getPasswordStrengthText()}
                      </Form.Text>
                    )}
                  </Form.Group>

                  <Form.Group className="form-group">
                    <Form.Label>
                      <i className="fas fa-shield-alt"></i>
                      Confirm Password <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleChange}
                      isInvalid={!!errors.password_confirm}
                      placeholder="Re-enter your password"
                      disabled={loading}
                    />
                    {errors.password_confirm && (
                      <div className="invalid-feedback d-block">
                        {errors.password_confirm}
                      </div>
                    )}
                  </Form.Group>
                </div>

                <div className="auth-info-box">
                  <i className="fas fa-info-circle"></i>
                  <span>
                    You can add your name, department, course and other details in your profile after registration.
                  </span>
                </div>

                <button
                  type="submit"
                  className={`auth-submit-btn ${loading ? 'loading' : ''}`}
                  disabled={loading}
                >
                  {loading && <span className="auth-spinner"></span>}
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="auth-link-text">
                  Already have an account?{' '}
                  <Link to="/login" className="auth-link">
                    Sign in here
                  </Link>
                </div>
              </Form>
            </div>

            <div className="auth-footer">
              <p>
                <i className="fas fa-file-contract"></i>
                By creating an account, you agree to our Terms of Service
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RegisterPage;

