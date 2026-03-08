import React from 'react'

export function TagBadge({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  const colors = [
    { bg: '#dbeafe', text: '#1e40af' },
    { bg: '#dcfce7', text: '#166534' },
    { bg: '#fef3c7', text: '#92400e' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#e0e7ff', text: '#3730a3' },
    { bg: '#fed7aa', text: '#9a3412' },
  ]

  // Deterministic color based on tag string
  const colorIndex = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const color = colors[colorIndex]

  return (
    <span
      className="tag-badge"
      style={{
        backgroundColor: color.bg,
        color: color.text,
      }}
    >
      {tag}
      {onRemove && (
        <button
          className="tag-remove"
          onClick={onRemove}
          type="button"
        >
          ×
        </button>
      )}
    </span>
  )
}
