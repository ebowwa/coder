import React, { useEffect } from 'react'
import './Sheet.css'

export type SheetSide = 'right' | 'left' | 'top' | 'bottom'
export type SheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface SheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  side?: SheetSide
  size?: SheetSize
  closeOnBackdropClick?: boolean
  closeOnEscape?: boolean
  className?: string
  showCloseButton?: boolean
  title?: string
}

export function Sheet({
  isOpen,
  onClose,
  children,
  side = 'right',
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className,
  showCloseButton = true,
  title,
}: SheetProps) {
  // Handle escape key press
  useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose()
    }
  }

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (!isOpen) return null

  return (
    <div className={`sheet-overlay sheet-${side} ${className || ''}`} onClick={handleBackdropClick}>
      <div
        className={`sheet sheet-${side} sheet-${size}`}
        onClick={handleContentClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
      >
        {(title || showCloseButton) && (
          <div className="sheet-header">
            {title && (
              <h2 id="sheet-title" className="sheet-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button className="sheet-close" onClick={onClose} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="sheet-content">
          {children}
        </div>
      </div>
    </div>
  )
}
