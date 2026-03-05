import React from 'react'

interface ProgressBarProps {
  progress: number // 0-100
  label?: string
  color?: string
}

export function ProgressBar({ progress, label, color = '#3b82f6' }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div className="progress-bar-container">
      {label && <span className="progress-label">{label}</span>}
      <div className="progress-bar-wrapper">
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${clampedProgress}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <span className="progress-value">{Math.round(clampedProgress)}%</span>
      </div>
    </div>
  )
}
