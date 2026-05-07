/**
 * LoginPage
 * User authentication page - Modern Design
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form } from 'react-bootstrap';
import { LoadingSpinner } from '../../../components/common';
import { useAuth } from '../../../hooks/useAuth';
import { useBranding } from '../../../hooks/useBranding';
import { DEFAULT_FEATURE_FLAGS } from '../../../services/systemService';
import './auth.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const {
    app_name: brandingAppName,
    feature_flags: featureFlagsForLogin = {},
    loading: brandingLoading,
  } = useBranding();
  const mergedFlags = { ...DEFAULT_FEATURE_FLAGS, ...(featureFlagsForLogin || {}) };
  const registrationAllowed =
    (mergedFlags.user_registration ??
      DEFAULT_FEATURE_FLAGS.user_registration) === true;
  const googleLoginAllowedByFlag =
    (mergedFlags.google_login ??
      DEFAULT_FEATURE_FLAGS.google_login) === true;
  const googleClientIdConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const googleSignInOperational = googleClientIdConfigured && googleLoginAllowedByFlag;

  const { login, loginWithGoogle, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [linkModalEmail, setLinkModalEmail] = useState('');
  const [linkModalPassword, setLinkModalPassword] = useState('');
  const [linkModalError, setLinkModalError] = useState('');
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState('');
  const [pendingGoogleAccessToken, setPendingGoogleAccessToken] = useState('');
  const googleTokenClientRef = useRef(null);

  const loadGoogleIdentityScript = () =>
    new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[data-google-identity="true"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Failed to load Google Identity script.')),
          { once: true }
        );
        return;
      }

      const scriptElement = document.createElement('script');
      scriptElement.src = 'https://accounts.google.com/gsi/client';
      scriptElement.async = true;
      scriptElement.defer = true;
      scriptElement.dataset.googleIdentity = 'true';
      scriptElement.onload = () => resolve();
      scriptElement.onerror = () => reject(new Error('Failed to load Google Identity script.'));
      document.head.appendChild(scriptElement);
    });

  const handleGoogleCredential = async ({
    googleCredential = '',
    googleAccessToken = '',
    passwordValue = '',
  }) => {
    const result = await loginWithGoogle({
      credential: googleCredential,
      accessToken: googleAccessToken,
      password: passwordValue,
    });

    if (result.success) {
      setIsLinkModalVisible(false);
      setLinkModalPassword('');
      setLinkModalError('');
      navigate('/');
      return;
    }

    if (result.requiresPassword) {
      setPendingGoogleCredential(googleCredential);
      setPendingGoogleAccessToken(googleAccessToken);
      setLinkModalEmail(result.email || '');
      setLinkModalError('');
      setLinkModalPassword('');
      setIsLinkModalVisible(true);
      return;
    }

    setErrorMessage(result.error);
  };

  useEffect(() => {
    if (!googleSignInOperational) {
      setIsGoogleReady(false);
      googleTokenClientRef.current = null;
      return undefined;
    }

    let isComponentMounted = true;

    const initializeGoogleSignIn = async () => {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        return;
      }

      try {
        await loadGoogleIdentityScript();
        if (!isComponentMounted || !window.google?.accounts?.oauth2) {
          return;
        }

        googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            setIsGoogleLoading(false);
            if (tokenResponse?.error) {
              setErrorMessage(tokenResponse.error_description || 'Google sign-in failed.');
              return;
            }
            if (!tokenResponse?.access_token) {
              setErrorMessage('Google sign-in did not return an access token.');
              return;
            }
            await handleGoogleCredential({ googleAccessToken: tokenResponse.access_token });
          },
        });

        setIsGoogleReady(true);
      } catch (error) {
        if (isComponentMounted) {
          setErrorMessage(error?.message || 'Failed to initialize Google sign-in.');
        }
      }
    };

    initializeGoogleSignIn();
    return () => {
      isComponentMounted = false;
    };
  }, [googleSignInOperational]);

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    if (!googleLoginAllowedByFlag) {
      return;
    }
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      setErrorMessage('Google login is not configured. Missing VITE_GOOGLE_CLIENT_ID.');
      return;
    }
    if (!isGoogleReady || !googleTokenClientRef.current) {
      setErrorMessage('Google sign-in is still loading. Please try again.');
      return;
    }

    setIsGoogleLoading(true);
    googleTokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
  };

  const handleLinkModalSubmit = async (event) => {
    event.preventDefault();
    setLinkModalError('');

    if (!linkModalPassword.trim()) {
      setLinkModalError('Current account password is required.');
      return;
    }

    await handleGoogleCredential({
      googleCredential: pendingGoogleCredential,
      googleAccessToken: pendingGoogleAccessToken,
      passwordValue: linkModalPassword,
    });
  };

  const handleLinkModalCancel = () => {
    setIsLinkModalVisible(false);
    setLinkModalPassword('');
    setLinkModalError('');
    setPendingGoogleCredential('');
    setPendingGoogleAccessToken('');
    setErrorMessage('Google account linking cancelled.');
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
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
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (brandingLoading) {
    return (
      <div className="auth-page d-flex align-items-center justify-content-center">
        <LoadingSpinner text="Loading sign-in…" />
      </div>
    );
  }

  return (
    <div className="auth-page d-flex align-items-center">
      <Container className="auth-container">
        <Row className="justify-content-center">
          <Col md={8} lg={6} xl={5}>
            <div className="auth-header">
              <h1>Welcome Back</h1>
              <p>Sign in to continue to {brandingAppName}</p>
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
                    <div className="invalid-feedback d-block">{errors.username}</div>
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
                    <div className="invalid-feedback d-block">{errors.password}</div>
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
              </Form>

              {googleClientIdConfigured && (
                <>
                  <div className="auth-divider">
                    <span>or</span>
                  </div>

                  <button
                    type="button"
                    className={`auth-google-btn${googleLoginAllowedByFlag ? '' : ' auth-google-btn--muted'}`}
                    onClick={handleGoogleLogin}
                    disabled={
                      loading ||
                      isGoogleLoading ||
                      isLinkModalVisible ||
                      !googleLoginAllowedByFlag
                    }
                    title={
                      googleLoginAllowedByFlag
                        ? undefined
                        : 'Google sign-in is temporarily unavailable (Maintenance → Feature availability).'
                    }
                    aria-disabled={!googleLoginAllowedByFlag ? true : undefined}
                  >
                    <i className="fab fa-google" aria-hidden="true"></i>
                    {isGoogleLoading ? 'Opening Google...' : 'Continue with Google'}
                  </button>
                  {!googleLoginAllowedByFlag && (
                    <p className="small text-muted text-center mb-0 mt-2 px-1">
                      Google sign-in Unavailable
                    </p>
                  )}
                </>
              )}

              {registrationAllowed && (
                <div className="auth-link-text">
                  Don&apos;t have an account?{' '}
                  <Link to="/register" className="auth-link">
                    Create one here
                  </Link>
                </div>
              )}
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
      {isLinkModalVisible && (
        <div
          className="auth-link-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-link-title"
        >
          <div className="auth-link-modal-card">
            <h2 id="google-link-title">Link Google Account</h2>
            <p>
              Account <strong>{linkModalEmail || 'this email'}</strong> already exists. Enter your current password to
              continue linking Google sign-in.
            </p>
            <Form onSubmit={handleLinkModalSubmit}>
              <Form.Group className="form-group">
                <Form.Label>
                  <i className="fas fa-lock"></i>
                  Current Password
                </Form.Label>
                <Form.Control
                  type="password"
                  value={linkModalPassword}
                  onChange={(event) => setLinkModalPassword(event.target.value)}
                  placeholder="Enter current password"
                  autoFocus
                />
              </Form.Group>

              {linkModalError && (
                <div className="auth-alert alert-danger auth-link-modal-error" role="alert">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{linkModalError}</span>
                </div>
              )}

              <div className="auth-link-modal-actions">
                <button type="button" className="auth-link-modal-cancel" onClick={handleLinkModalCancel}>
                  Cancel
                </button>
                <button type="submit" className="auth-link-modal-confirm">
                  Link Account
                </button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
