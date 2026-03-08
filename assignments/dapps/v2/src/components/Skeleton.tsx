/**
 * Skeleton Component
 * Placeholder content while loading
 */

import { type FC } from 'react';
import '../styles/loading.css';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  count?: number;
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
}

const SkeletonBase: FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className = '',
}) => {
  const variantClasses: Record<string, string> = {
    text: 'skeleton-text',
    circular: 'skeleton-circular',
    rectangular: 'skeleton-rectangular',
    rounded: 'skeleton-rounded',
  };

  const animationClasses: Record<string, string> = {
    pulse: 'skeleton-pulse',
    wave: 'skeleton-wave',
    none: '',
  };

  const style: Record<string, string> = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`skeleton ${variantClasses[variant]} ${animationClasses[animation]} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  );
};

export const Skeleton: FC<SkeletonProps> = ({ count = 1, ...props }) => {
  if (count === 1) {
    return <SkeletonBase {...props} />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBase key={i} {...props} />
      ))}
    </>
  );
};

// Preset skeleton components

export const SkeletonText: FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="text" {...props} />
);

export const SkeletonAvatar: FC<Omit<SkeletonProps, 'variant'>> = (props) => (
  <Skeleton variant="circular" width={40} height={40} {...props} />
);

export const SkeletonCard: FC = () => (
  <div className="skeleton-card">
    <Skeleton variant="rectangular" height={200} className="skeleton-card-image" />
    <div className="skeleton-card-content">
      <Skeleton variant="text" width="60%" height={24} className="skeleton-card-title" />
      <Skeleton variant="text" width="100%" className="skeleton-card-text" />
      <Skeleton variant="text" width="80%" className="skeleton-card-text" />
    </div>
  </div>
);

export const SkeletonList: FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="skeleton-list">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-list-item">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="skeleton-list-content">
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="text" width="60%" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonTable: FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 4 }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" height={20} />
      ))}
    </div>
    <div className="skeleton-table-body">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} variant="text" />
          ))}
        </div>
      ))}
    </div>
  </div>
);
