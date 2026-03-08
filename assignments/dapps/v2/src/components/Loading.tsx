/**
 * Loading Component
 * Consistent loading states across the application
 */

import { type FC } from 'react';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  fullScreen?: boolean;
}

export const Loading: FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg',
  };

  const content = (
    <div className={`loading loading-${variant} ${sizeClasses[size]}`}>
      {variant === 'spinner' && <div className="spinner" />}
      {variant === 'dots' && (
        <div className="dots">
          <span />
          <span />
          <span />
        </div>
      )}
      {variant === 'pulse' && <div className="pulse" />}
      {text && <p className="loading-text">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return <div className="loading-fullscreen">{content}</div>;
  }

  return content;
};
