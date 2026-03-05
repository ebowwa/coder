import React from 'react'

export function Loading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner" aria-hidden="true">
        <svg className="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="1s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>
      <p className="loading-message">{message}</p>
    </div>
  )
}

export function EnvironmentListSkeleton() {
  return (
    <div className="environment-list-skeleton" role="status" aria-label="Loading environments">
      <div className="skeleton-card">
        <div className="skeleton-header">
          <div className="skeleton-title" />
          <div className="skeleton-badge" />
        </div>
        <div className="skeleton-body">
          <div className="skeleton-row" />
          <div className="skeleton-row short" />
        </div>
        <div className="skeleton-actions">
          <div className="skeleton-button" />
          <div className="skeleton-button" />
          <div className="skeleton-button" />
        </div>
      </div>
      <div className="skeleton-card">
        <div className="skeleton-header">
          <div className="skeleton-title" />
          <div className="skeleton-badge" />
        </div>
        <div className="skeleton-body">
          <div className="skeleton-row" />
          <div className="skeleton-row short" />
        </div>
        <div className="skeleton-actions">
          <div className="skeleton-button" />
          <div className="skeleton-button" />
          <div className="skeleton-button" />
        </div>
      </div>
    </div>
  )
}
