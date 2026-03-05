import React from 'react'
import { Environment } from "../../../../../../../@ebowwa/codespaces-types/compile"

interface QuickStatsProps {
  environments: Environment[]
}

export function QuickStats({ environments }: QuickStatsProps) {
  const running = environments.filter(e => e.status === 'running').length
  const stopped = environments.filter(e => e.status === 'stopped').length
  const total = environments.length

  return (
    <div className="quick-stats">
      <div className="stat">
        <span className="stat-value">{total}</span>
        <span className="stat-label">Total</span>
      </div>
      <div className="stat">
        <span className="stat-value stat-running">{running}</span>
        <span className="stat-label">Running</span>
      </div>
      <div className="stat">
        <span className="stat-value stat-stopped">{stopped}</span>
        <span className="stat-label">Stopped</span>
      </div>
    </div>
  )
}
