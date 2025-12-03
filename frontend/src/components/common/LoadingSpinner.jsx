/**
 * LoadingSpinner Component
 * Display loading state with spinner
 */

import React from 'react';

const LoadingSpinner = ({ 
  size = 'md',
  text = 'Loading...',
  fullScreen = false,
  variant = 'primary',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg'
  };

  const variantClass = variant === 'light' ? 'text-light' : 'text-primary';

  if (fullScreen) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className={`spinner-border ${sizeClasses[size]} ${variantClass}`} role="status">
            <span className="visually-hidden">{text}</span>
          </div>
          {text && <p className="mt-3 text-muted">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      <div className={`spinner-border ${sizeClasses[size]} ${variantClass}`} role="status">
        <span className="visually-hidden">{text}</span>
      </div>
      {text && <p className="mt-2 text-muted small">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;

