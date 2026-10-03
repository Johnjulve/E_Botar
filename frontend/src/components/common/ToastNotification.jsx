/**
 * ToastNotification Component
 * Unified, modern floating notification banner for application action feedback.
 */

import React from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import Icon from './Icon';

const VARIANT_CONFIGS = {
  success: {
    title: 'Success',
    headerBg: 'bg-success text-white',
    borderClass: 'border-success',
    iconName: 'checkCircle',
  },
  danger: {
    title: 'Error',
    headerBg: 'bg-danger text-white',
    borderClass: 'border-danger',
    iconName: 'alertTriangle',
  },
  warning: {
    title: 'Warning',
    headerBg: 'bg-warning text-dark',
    borderClass: 'border-warning',
    iconName: 'alertTriangle',
  },
  info: {
    title: 'Notice',
    headerBg: 'bg-primary text-white',
    borderClass: 'border-primary',
    iconName: 'info',
  },
};

const ToastNotification = ({
  show = false,
  message = null,
  title = null,
  variant = 'success',
  onClose,
  delay = 3500,
  autohide = true,
  position = 'top-end',
  timeText = 'Just now',
}) => {
  const isVisible = Boolean(show && message);
  if (!isVisible) return null;

  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.info;
  const displayTitle = title || config.title;
  const isWarning = variant === 'warning';

  return (
    <ToastContainer className="app-toast-container" position={position}>
      <Toast
        show={isVisible}
        onClose={onClose}
        delay={delay}
        autohide={autohide}
        className={`app-toast-card ${config.borderClass}`}
      >
        <Toast.Header className={`${config.headerBg} py-2`}>
          <Icon
            name={config.iconName}
            size={16}
            className={`me-2 ${isWarning ? 'text-dark' : 'text-white'}`}
          />
          <strong className={`me-auto ${isWarning ? 'text-dark' : 'text-white'}`}>
            {displayTitle}
          </strong>
          <small className={isWarning ? 'text-muted' : 'text-white-50'}>
            {timeText}
          </small>
        </Toast.Header>
        <Toast.Body className="bg-white text-dark py-3 fw-medium">
          {message}
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
};

export default ToastNotification;
