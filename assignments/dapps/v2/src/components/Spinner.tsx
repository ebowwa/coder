/**
 * Spinner Component
 * Animated loading indicators
 */

import { type FC } from 'react';
import '../styles/loading.css';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'bars' | 'ripple';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  speed?: 'slow' | 'normal' | 'fast';
  className?: string;
}

const sizeMap: Record<NonNullable<SpinnerProps['size']>, string> = {
  xs: 'spinner-xs',
  sm: 'spinner-sm',
  md: 'spinner-md',
  lg: 'spinner-lg',
  xl: 'spinner-xl',
};

const colorMap: Record<NonNullable<SpinnerProps['color']>, string> = {
  primary: 'spinner-primary',
  secondary: 'spinner-secondary',
  success: 'spinner-success',
  warning: 'spinner-warning',
  error: 'spinner-error',
};

const speedMap: Record<NonNullable<SpinnerProps['speed']>, string> = {
  slow: 'spinner-slow',
  normal: 'spinner-normal',
  fast: 'spinner-fast',
};

export const Spinner: FC<SpinnerProps> = ({
  size = 'md',
  variant = 'default',
  color = 'primary',
  speed = 'normal',
  className = '',
}) => {
  const classes = [
    'spinner',
    sizeMap[size],
    colorMap[color],
    speedMap[speed],
    `spinner-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  switch (variant) {
    case 'dots':
      return (
        <div className={classes} aria-label="Loading">
          <span className="spinner-dot" />
          <span className="spinner-dot" />
          <span className="spinner-dot" />
        </div>
      );

    case 'bars':
      return (
        <div className={classes} aria-label="Loading">
          <span className="spinner-bar" />
          <span className="spinner-bar" />
          <span className="spinner-bar" />
          <span className="spinner-bar" />
        </div>
      );

    case 'ripple':
      return (
        <div className={classes} aria-label="Loading">
          <div className="spinner-ripple-circle" />
          <div className="spinner-ripple-circle" />
        </div>
      );

    default:
      return <div className={classes} aria-label="Loading" />;
  }
};

// Overlay spinner for full-screen loading
export interface SpinnerOverlayProps {
  visible: boolean;
  message?: string;
  spinnerProps?: SpinnerProps;
}

export const SpinnerOverlay: FC<SpinnerOverlayProps> = ({
  visible,
  message,
  spinnerProps = { size: 'lg' },
}) => {
  if (!visible) return null;

  return (
    <div className="spinner-overlay">
      <div className="spinner-overlay-content">
        <Spinner {...spinnerProps} />
        {message && <p className="spinner-overlay-message">{message}</p>}
      </div>
    </div>
  );
};

// Inline spinner for buttons
export const SpinnerButton: FC<SpinnerProps & { label?: string }> = ({
  label,
  size = 'sm',
  ...props
}) => (
  <span className="spinner-button">
    <Spinner size={size} {...props} />
    {label && <span className="spinner-button-label">{label}</span>}
  </span>
);
