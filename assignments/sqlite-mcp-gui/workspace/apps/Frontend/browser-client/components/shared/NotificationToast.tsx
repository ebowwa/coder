import React, { useEffect } from 'react'

export interface Notification {
  id: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface NotificationToastProps {
  notifications: Notification[]
  onRemove: (id: string) => void
}

export function NotificationToast({ notifications, onRemove }: NotificationToastProps) {
  useEffect(() => {
    notifications.forEach(notification => {
      const timer = setTimeout(() => {
        onRemove(notification.id)
      }, notification.duration || 3000)

      return () => clearTimeout(timer)
    })
  }, [notifications, onRemove])

  if (notifications.length === 0) return null

  return (
    <div className="notification-toast-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type || 'info'}`}
        >
          <span className="notification-message">{notification.message}</span>
          <button
            className="notification-close"
            onClick={() => onRemove(notification.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
