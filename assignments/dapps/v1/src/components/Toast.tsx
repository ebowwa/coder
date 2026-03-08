/**
 * Toast Component
 * Temporary notification messages
 */

import { type FC, useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(() => onClose(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className={`toast toast-${toast.type}`}>
      <span className="toast-icon">{icons[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="toast-close"
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Hook for using toasts
let toastId = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

export const useToast = () => {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setCurrentToasts);
    setCurrentToasts(toasts);

    return () => {
      listeners.delete(setCurrentToasts);
    };
  }, []);

  const show = useCallback(
    (type: ToastType, message: string, duration: number = 5000) => {
      const id = `toast-${++toastId}`;
      const newToast: Toast = { id, type, message, duration };
      toasts = [...toasts, newToast];
      listeners.forEach((listener) => listener(toasts));
      return id;
    },
    []
  );

  const close = useCallback((id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((listener) => listener(toasts));
  }, []);

  return {
    toasts: currentToasts,
    showSuccess: (message: string, duration?: number) =>
      show('success', message, duration),
    showError: (message: string, duration?: number) =>
      show('error', message, duration),
    showInfo: (message: string, duration?: number) =>
      show('info', message, duration),
    showWarning: (message: string, duration?: number) =>
      show('warning', message, duration),
    close,
  };
};
