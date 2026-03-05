import React from 'react'
import { Environment } from "../../../../../../../@ebowwa/codespaces-types/compile"
import type { FileListItem } from '../../hooks/useAppState'

interface FileBrowserProps {
  show: boolean
  environments: Environment[]
  fileTransferEnvId: string | null
  fileTransferLoading: boolean
  fileList: FileListItem[]
  currentPath: string
  selectedFile: { name: string; path: string } | null
  previewContent: { type: string; content?: string; error?: string } | null
  previewLoading: boolean
  onClose: () => void
  onNavigateDirectory: (path: string) => void
  onSelectFile: (file: { name: string; path: string }) => void
  onConfirmDownload: () => void
  onLoadPreview: (file: { name: string; path: string }) => void
  onClearPreview: () => void
  onLoadFiles: (envId: string) => void
  formatFileSize: (bytes: string) => string
}

export function FileBrowser({
  show,
  environments,
  fileTransferEnvId,
  fileTransferLoading,
  fileList,
  currentPath,
  selectedFile,
  previewContent,
  previewLoading,
  onClose,
  onNavigateDirectory,
  onSelectFile,
  onConfirmDownload,
  onLoadPreview,
  onClearPreview,
  onLoadFiles,
  formatFileSize,
}: FileBrowserProps) {
  if (!show) return null

  const envName = environments.find(e => e.id === fileTransferEnvId)?.name

  return (
    <div className="file-browser-overlay" onClick={onClose}>
      <div className="file-browser" onClick={(e) => e.stopPropagation()}>
        <div className="file-browser-header">
          <h3>File Browser - {envName}</h3>
        </div>

        {fileTransferLoading ? (
          <div className="file-browser-loading">Loading files...</div>
        ) : (
          <div className="file-browser-content">
            <div className="file-browser-nav">
              {currentPath !== '.' && (
                <button onClick={() => onNavigateDirectory('.')} className="nav-btn">
                  Root
                </button>
              )}
              {currentPath.split('/').filter(Boolean).slice(0, -1).length > 0 && (
                <button
                  onClick={() => onNavigateDirectory(currentPath.split('/').filter(Boolean).slice(0, -1).join('/') || '.')}
                  className="nav-btn"
                >
                  ← Back
                </button>
              )}
              <div className="file-browser-breadcrumb">
                <span className="breadcrumb-item root" onClick={() => onNavigateDirectory('.')}>root</span>
                {currentPath !== '.' && currentPath.split('/').filter(Boolean).map((part, index, parts) => (
                  <span key={`${part}-${index}`}>
                    <span className="breadcrumb-separator">/</span>
                    <span
                      className="breadcrumb-item"
                      onClick={() => {
                        const newPath = parts.slice(0, index + 1).join('/')
                        onNavigateDirectory(newPath || '.')
                      }}
                    >
                      {part}
                    </span>
                  </span>
                ))}
              </div>
              <div className="file-browser-actions-right">
                <button className="refresh-btn" onClick={() => fileTransferEnvId && onLoadFiles(fileTransferEnvId)} disabled={fileTransferLoading}>
                  {fileTransferLoading ? '⟳' : '↻'}
                </button>
                <button className="close-btn" onClick={onClose}>×</button>
              </div>
            </div>

            <div className="file-list">
              {fileList.length === 0 ? (
                <div className="empty-state">Empty directory</div>
              ) : (
                <>
                  {currentPath !== '.' && (
                    <div
                      className="file-item directory"
                      onClick={() => onNavigateDirectory(currentPath.split('/').filter(Boolean).slice(0, -1).join('/') || '.')}
                    >
                      <span className="file-icon">..</span>
                      <span className="file-name">Parent Directory</span>
                      <span className="file-size">-</span>
                    </div>
                  )}
                  {fileList.map((file, index) => (
                    <div
                      key={index}
                      className={`file-item ${file.type === 'directory' ? 'directory' : 'file'}`}
                      onClick={async () => {
                        if (file.type === 'directory') {
                          onNavigateDirectory(file.path)
                        } else {
                          onSelectFile(file)
                          await onLoadPreview(file)
                        }
                      }}
                    >
                      <span className="file-icon">{file.type === 'directory' ? '📁' : '📄'}</span>
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {selectedFile && (
              <div className="file-selection-actions">
                <p className="selected-file-info">
                  Selected: <strong>{selectedFile.name}</strong><br/>
                  <span className="selected-file-path">{selectedFile.path}</span>
                </p>
                <div className="action-buttons">
                  <button
                    onClick={() => selectedFile && onLoadPreview(selectedFile)}
                    className="preview-btn"
                    disabled={previewLoading}
                  >
                    {previewLoading ? 'Loading...' : 'Preview'}
                  </button>
                  <button onClick={onConfirmDownload} className="download-confirm-btn">
                    Download {selectedFile.name}
                  </button>
                  <button onClick={onClose} className="cancel-btn">
                    Cancel
                  </button>
                </div>
                {previewContent && (
                  <div className="file-preview">
                    <div className="preview-header">
                      <h4>Preview: {selectedFile.name}</h4>
                      <button className="preview-close" onClick={onClearPreview}>×</button>
                    </div>
                    <div className="preview-content">
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
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
