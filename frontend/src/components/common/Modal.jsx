/**
 * Modal Component
 * Reusable modal dialog
 */

import React from 'react';
import { Modal as BootstrapModal } from 'react-bootstrap';
import Button from './Button';

const Modal = ({ 
  show,
  onHide,
  title,
  children,
  footer,
  size = 'md',
  centered = true,
  showCloseButton = true,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  confirmLoading = false,
  ...props
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onHide();
    }
  };

  return (
    <BootstrapModal
      show={show}
      onHide={onHide}
      size={size}
      centered={centered}
      {...props}
    >
      {title && (
        <BootstrapModal.Header closeButton={showCloseButton}>
          <BootstrapModal.Title>{title}</BootstrapModal.Title>
        </BootstrapModal.Header>
      )}
      
      <BootstrapModal.Body>
        {children}
      </BootstrapModal.Body>

      {(footer || onConfirm) && (
        <BootstrapModal.Footer>
          {footer || (
            <>
              <Button variant="secondary" onClick={handleCancel}>
                {cancelText}
              </Button>
              <Button 
                variant={confirmVariant} 
                onClick={onConfirm}
                loading={confirmLoading}
              >
                {confirmText}
              </Button>
            </>
          )}
        </BootstrapModal.Footer>
      )}
    </BootstrapModal>
  );
};

export default Modal;

