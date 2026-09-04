/**
 * Modal Component
 * Reusable modal dialog
 */

import React from 'react';
import { Modal as BootstrapModal } from 'react-bootstrap';
import Button from './Button';

const Modal = ({ 
  show,
  isOpen,
  onHide,
  onClose,
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
  const isVisible = show !== undefined ? Boolean(show) : Boolean(isOpen);
  const closeHandler = onHide || onClose;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (closeHandler) {
      closeHandler();
    }
  };

  return (
    <BootstrapModal
      show={isVisible}
      onHide={closeHandler}
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

