/**
 * Confirmation Dialog Component
 * Reusable confirmation prompts
 */

import { type FC } from 'react';
import { Modal } from './Modal.tsx';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="confirm-dialog">
        <div className={`confirm-icon confirm-icon-${variant}`}>
          {variant === 'danger' && '⚠️'}
          {variant === 'warning' && '⚠️'}
          {variant === 'info' && 'ℹ️'}
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button onClick={onClose} className="btn btn-secondary">
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`btn btn-${variant === 'danger' ? 'danger' : 'primary'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
