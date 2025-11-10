/**
 * Badge Component
 * Small status indicator or label
 */

import React from 'react';

const Badge = ({ 
  children, 
  variant = 'secondary',
  pill = false,
  className = '',
  ...props 
}) => {
  const variantClasses = {
    primary: 'bg-primary',
    secondary: 'badge-secondary',
    success: 'badge-success',
    danger: 'badge-danger',
    warning: 'badge-warning',
    info: 'badge-info'
  };

  const badgeClasses = [
    'badge',
    variantClasses[variant],
    pill ? 'rounded-pill' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;

