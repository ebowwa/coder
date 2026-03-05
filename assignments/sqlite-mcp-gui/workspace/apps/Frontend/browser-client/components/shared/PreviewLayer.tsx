import React from 'react'

interface PreviewLayerProps {
  show: boolean
  selectedFile: { name: string; path: string } | null
  previewContent: { type: string; content?: string; error?: string } | null
  onClose: () => void
}

export function PreviewLayer({
  show,
  selectedFile,
  previewContent,
  onClose,
}: PreviewLayerProps) {
  if (!show || !selectedFile || !previewContent) return null

  return (
    <div className="preview-layer-overlay" onClick={onClose}>
      <div className="preview-layer-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="preview-sheet-header">
          <h3>{selectedFile.name}</h3>
          <button className="preview-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="preview-sheet-content">
          {previewContent.type === 'text' ? (
            <pre className="text-preview">{previewContent.content}</pre>
          ) : previewContent.type === 'image' ? (
            <div className="image-preview">
              <p>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'text-bottom', marginRight: '8px' }}>
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
                Image file - download to view
              </p>
            </div>
          ) : previewContent.type === 'error' ? (
            <div className="error-preview">
              <p className="error-title">Preview Error</p>
              <p className="error-message">{previewContent.error}</p>
            </div>
          ) : (
            <div className="binary-preview">
              <p>Binary file - download to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
