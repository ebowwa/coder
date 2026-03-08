import React, { useState } from 'react'

interface ActivityEntry {
  id: string
  timestamp: Date
  action: string
  environment: string
  details: string
}

interface ActivityLogProps {
  activities: ActivityEntry[]
}

export function ActivityLog({ activities }: ActivityLogProps) {
  const [filter, setFilter] = useState<'all' | 'create' | 'delete' | 'start' | 'stop' | 'connect'>('all')

  const filteredActivities = activities.filter(entry =>
    filter === 'all' || entry.action.toLowerCase().includes(filter)
  )

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getActionColor = (action: string) => {
    const lower = action.toLowerCase()
    if (lower.includes('create')) return '#22c55e'
    if (lower.includes('delete')) return '#ef4444'
    if (lower.includes('start')) return '#3b82f6'
    if (lower.includes('stop')) return '#f59e0b'
    if (lower.includes('connect')) return '#8b5cf6'
    return '#666'
  }

  return (
    <div className="activity-log">
      <div className="activity-header">
        <h2>Activity Log</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="all">All Activities</option>
          <option value="create">Creates</option>
          <option value="delete">Deletes</option>
          <option value="start">Starts</option>
          <option value="stop">Stops</option>
          <option value="connect">Connections</option>
        </select>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="empty-state">
          <p>No activity recorded yet</p>
        </div>
      ) : (
        <div className="activity-list">
          {filteredActivities.map((entry) => (
            <div key={entry.id} className="activity-entry">
              <div className="activity-indicator" style={{ backgroundColor: getActionColor(entry.action) }} />
              <div className="activity-content">
                <div className="activity-header-row">
                  <span className="activity-action">{entry.action}</span>
                  <span className="activity-time">{formatTime(entry.timestamp)}</span>
                </div>
                <div className="activity-environment">{entry.environment}</div>
                {entry.details && <div className="activity-details">{entry.details}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
