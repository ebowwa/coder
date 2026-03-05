import React, { useEffect, useRef, useState, useMemo } from 'react'
import ReactDOM from 'react-dom'
import './PickerModal.css'

export interface PickerOption<T = string> {
  value: T
  title: string
  subtitle?: string
  detail?: string
  description?: string
}

export interface PickerModalProps<T = string> {
  isOpen: boolean
  onClose: () => void
  title: string
  options: PickerOption<T>[]
  selectedValue: T
  onSelect: (value: T) => void
  renderOption?: (option: PickerOption<T>) => React.ReactNode
  pageSize?: number
  multiSelect?: boolean
  selectedValues?: Set<T>
}

const PAGE_SIZE = 8

export function PickerModal<T = string>({
  isOpen,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  renderOption,
  pageSize = PAGE_SIZE,
  multiSelect = false,
  selectedValues,
}: PickerModalProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(0)

  // Reset to page 0 when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(0)
    }
  }, [isOpen])

  // Find which page the selected item is on and go there
  useEffect(() => {
    if (isOpen) {
      const selectedIndex = options.findIndex(opt => opt.value === selectedValue)
      if (selectedIndex >= 0) {
        const pageWithSelection = Math.floor(selectedIndex / pageSize)
        setCurrentPage(pageWithSelection)
      }
    }
  }, [isOpen, selectedValue, options, pageSize])

  // Prevent body scroll when modal is open
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleOptionClick = (value: T) => {
    onSelect(value)
    if (!multiSelect) {
      onClose()
    }
  }

  const totalPages = Math.ceil(options.length / pageSize)
  const startIndex = currentPage * pageSize
  const endIndex = Math.min(startIndex + pageSize, options.length)
  const currentOptions = options.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
  }

  const goToPrevPage = () => goToPage(currentPage - 1)
  const goToNextPage = () => goToPage(currentPage + 1)

  if (!isOpen) return null

  const modal = (
    <div className="picker-modal-overlay" onClick={handleBackdropClick}>
      <div className="picker-modal" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <div className="picker-modal-header">
          <h2 id="picker-title" className="picker-modal-title">{title}</h2>
          <button className="picker-modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={listRef} className="picker-modal-options">
          {currentOptions.map((option) => {
            const isSelected = multiSelect && selectedValues
              ? selectedValues.has(option.value)
              : option.value === selectedValue
            return (
              <div
                key={String(option.value)}
                className={`picker-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleOptionClick(option.value)}
                data-selected={isSelected}
                role="option"
                aria-selected={isSelected}
              >
                {renderOption ? renderOption(option) : (
                  <>
                    <div className="picker-option-header">
                      <span className="picker-option-title">{option.title}</span>
                      {option.subtitle && (
                        <span className="picker-option-subtitle">{option.subtitle}</span>
                      )}
                    </div>
                    {option.detail && (
                      <div className="picker-option-detail">{option.detail}</div>
                    )}
                    {option.description && (
                      <div className="picker-option-description">{option.description}</div>
                    )}
                  </>
                )}
                {isSelected && (
                  <div className="picker-option-check">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="picker-modal-footer">
            <button
              className="picker-page-button"
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              aria-label="Previous page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <span className="picker-page-info">
              {currentPage + 1} / {totalPages}
            </span>

            <button
              className="picker-page-button"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages - 1}
              aria-label="Next page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}
