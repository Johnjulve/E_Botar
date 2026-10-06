/**
 * ErrorBoundary Component
 * Catches runtime rendering errors in child components and renders
 * a graceful recovery UI instead of crashing to a blank white screen.
 */

import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5 text-center">
          <div
            className="card shadow-sm border-0 p-4 mx-auto"
            style={{ maxWidth: '520px', borderRadius: '12px' }}
          >
            <div className="mb-3 text-warning">
              <i className="fas fa-exclamation-triangle fa-3x" aria-hidden="true"></i>
            </div>
            <h4 className="fw-bold mb-2">Something went wrong</h4>
            <p className="text-muted mb-4 small">
              An unexpected display error occurred on this page. Your session is safe.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => window.history.back()}
              >
                Go Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={this.handleReset}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
