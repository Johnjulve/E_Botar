/**
 * EmptyState Component
 * Display when no data is available
 */

import React from 'react';
import Button from './Button';

const EmptyState = ({ 
  icon = 'fas fa-inbox',
  title = 'No data found',
  message = 'There are no items to display at this time.',
  actionText,
  onAction,
  className = ''
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <i className={icon}></i>
      <h4 className="mt-3">{title}</h4>
      <p className="text-muted">{message}</p>
      {actionText && onAction && (
        <Button variant="primary" onClick={onAction} className="mt-3">
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;

