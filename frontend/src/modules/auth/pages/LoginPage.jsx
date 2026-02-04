/**
 * LoginPage
 * User authentication page - Modern Design
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form } from 'react-bootstrap';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../contexts/BrandingContext';
import './auth.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username or email is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    try {
      const result = await login(formData);
      
      if (result.success) {
        navigate('/');
      } else {
        setErrorMessage(result.error);
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const branding = useBranding();

  return (
    <div className="auth-page d-flex align-items-center">
      <Container className="auth-container">
        <Row className="justify-content-center">
          <Col md={8} lg={6} xl={5}>
            <div className="auth-header">
              <h1>Welcome Back</h1>
              <p>Sign in to continue to {branding.app_name}</p>
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

              <Form onSubmit={handleSubmit} className="auth-form">
                <Form.Group className="form-group">
                  <Form.Label>
                    <i className="fas fa-user"></i>
                    Username or Email
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    isInvalid={!!errors.username}
                    placeholder="Enter your username or email"
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
                    <i className="fas fa-lock"></i>
                    Password
                  </Form.Label>
                  <div className="auth-password-wrap">
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      isInvalid={!!errors.password}
                      placeholder="Enter your password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                    </button>
                  </div>
                  {errors.password && (
                    <div className="invalid-feedback d-block">
                      {errors.password}
                    </div>
                  )}
                </Form.Group>

                <button
                  type="submit"
                  className={`auth-submit-btn ${loading ? 'auth-loading' : ''}`}
                  disabled={loading}
                >
                  {loading && <span className="auth-spinner"></span>}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="auth-link-text">
                  Don't have an account?{' '}
                  <Link to="/register" className="auth-link">
                    Create one here
                  </Link>
                </div>
              </Form>
            </div>

            <div className="auth-footer">
              <p>
                <i className="fas fa-shield-alt"></i>
                Secure, Transparent, and Efficient Online Voting
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LoginPage;

