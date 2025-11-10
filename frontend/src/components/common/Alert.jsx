/**
 * Alert Component
 * Display contextual feedback messages
 */

import React, { useState } from 'react';

const Alert = ({ 
  children, 
  variant = 'info',
  dismissible = false,
  onClose,
  className = '',
  icon = null,
  ...props 
}) => {
  const [visible, setVisible] = useState(true);

  const variantClasses = {
    success: 'alert-success',
    danger: 'alert-danger',
    warning: 'alert-warning',
    info: 'alert-info',
    primary: 'alert-primary',
    secondary: 'alert-secondary'
  };

  const defaultIcons = {
    success: 'fas fa-check-circle',
    danger: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  if (!visible) return null;

  const alertClasses = [
    'alert',
    variantClasses[variant],
    dismissible ? 'alert-dismissible fade show' : '',
    'd-flex align-items-center',
    className
  ].filter(Boolean).join(' ');

  const displayIcon = icon || defaultIcons[variant];

  return (
    <div className={alertClasses} role="alert" {...props}>
      {displayIcon && <i className={`${displayIcon} me-2`}></i>}
      <div className="flex-grow-1">
        {children}
      </div>
      {dismissible && (
        <button 
          type="button" 
          className="btn-close" 
          onClick={handleClose}
          aria-label="Close"
        ></button>
      )}
    </div>
  );
};

export default Alert;

