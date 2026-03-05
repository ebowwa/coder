import React, { useState, useEffect } from 'react'

interface RefreshButtonProps {
  onRefresh: () => void
  loading?: boolean
  autoRefresh?: boolean
  onToggleAutoRefresh?: (enabled: boolean) => void
}

export function RefreshButton({ onRefresh, loading = false, autoRefresh = false, onToggleAutoRefresh }: RefreshButtonProps) {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        onRefresh()
        setLastRefresh(new Date())
      }, 30000) // Refresh every 30 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh, onRefresh])

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = (now.getTime() - date.getTime()) / 1000

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <div className="refresh-button">
      <div className="refresh-info">
        {lastRefresh && autoRefresh ? (
          <span className="refresh-time">Updated {formatTime(lastRefresh)}</span>
        ) : (
          <span className="refresh-time">Last refresh: {lastRefresh ? formatTime(lastRefresh) : 'Never'}</span>
        )}
      </div>
      <div className="refresh-controls">
        <button
          className="refresh-toggle"
          onClick={() => onToggleAutoRefresh?.(!autoRefresh)}
          disabled={loading}
          title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
        >
          <span className={`toggle-icon ${autoRefresh ? 'active' : ''}`}>
            <span className="toggle-circle"></span>
          </span>
        </button>
        <button
          className="refresh-btn"
          onClick={() => {
            onRefresh()
            setLastRefresh(new Date())
          }}
          disabled={loading}
          title="Refresh now"
        >
          <span className={`refresh-icon ${loading ? 'spinning' : ''}`}>⟳</span>
        </button>
      </div>
    </div>
  )
}
