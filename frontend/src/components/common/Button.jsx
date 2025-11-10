/**
 * Button Component
 * Reusable button with consistent styling
 */

import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon = null,
  onClick,
  className = '',
  style = {},
  ...props 
}) => {
  const baseStyles = {
    padding: size === 'sm' ? '0.5rem 1rem' : size === 'lg' ? '0.75rem 1.5rem' : '0.6rem 1.2rem',
    border: '1px solid',
    borderRadius: '0.5rem',
    fontWeight: '500',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: size === 'sm' ? '0.85rem' : size === 'lg' ? '1rem' : '0.9rem',
    opacity: disabled || loading ? '0.6' : '1',
    width: fullWidth ? '100%' : 'auto',
    justifyContent: 'center',
    transition: 'none',
    textDecoration: 'none'
  };

  const variantStyles = {
    primary: {
      background: '#2563eb',
      color: 'white',
      borderColor: '#2563eb'
    },
    secondary: {
      background: 'white',
      color: '#374151',
      borderColor: '#d1d5db'
    },
    success: {
      background: '#22c55e',
      color: 'white',
      borderColor: '#22c55e'
    },
    danger: {
      background: '#ef4444',
      color: 'white',
      borderColor: '#ef4444'
    },
    warning: {
      background: '#eab308',
      color: '#1f2937',
      borderColor: '#eab308'
    },
    info: {
      background: '#3b82f6',
      color: 'white',
      borderColor: '#3b82f6'
    },
    outline: {
      background: 'transparent',
      color: '#2563eb',
      borderColor: '#2563eb'
    },
    link: {
      background: 'transparent',
      color: '#2563eb',
      border: 'none',
      padding: '0.25rem 0.5rem'
    }
  };

  const hoverStyles = {
    primary: { background: '#1d4ed8', borderColor: '#1d4ed8' },
    secondary: { background: '#f3f4f6', borderColor: '#9ca3af' },
    success: { background: '#16a34a', borderColor: '#16a34a' },
    danger: { background: '#dc2626', borderColor: '#dc2626' },
    warning: { background: '#d97706', borderColor: '#d97706' },
    info: { background: '#2563eb', borderColor: '#2563eb' },
    outline: { background: '#eff6ff', color: '#1d4ed8' },
    link: { opacity: '0.8' }
  };

  const [isHovered, setIsHovered] = React.useState(false);

  const finalStyles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...(isHovered && !disabled && !loading ? hoverStyles[variant] : {}),
    ...style
  };

  return (
    <button
      type={type}
      style={finalStyles}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      {...props}
    >
      {loading && (
        <span style={{
          width: '14px',
          height: '14px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }} role="status" aria-hidden="true"></span>
      )}
      {icon && !loading && icon}
      {children}
    </button>
  );
};

export default Button;

