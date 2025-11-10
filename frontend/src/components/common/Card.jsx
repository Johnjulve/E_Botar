/**
 * Card Component
 * Reusable card container with optional header and footer
 */

import React from 'react';

const Card = ({ 
  children, 
  header = null,
  footer = null,
  className = '',
  hoverable = false,
  ...props 
}) => {
  const cardClasses = [
    'card',
    hoverable ? 'hover-lift' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {header && (
        <div className="card-header">
          {header}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;

