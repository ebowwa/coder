import React from 'react'
import { Environment } from "../../../../../../../@ebowwa/codespaces-types/compile"

interface ToolsSectionProps {
  environments: Environment[]
  screenshot: string | null
  screenshotLoading: boolean
  onScreenshot: () => void
  fileTransferEnvId: string | null
  setFileTransferEnvId: (id: string | null) => void
  fileTransferLoading: boolean
  fileTransferResult: string | null
  onFileUpload: (envId: string) => void
  onFileDownload: (envId: string) => void
}

export function ToolsSection({
  environments,
  screenshot,
  screenshotLoading,
  onScreenshot,
  fileTransferEnvId,
  setFileTransferEnvId,
  fileTransferLoading,
  fileTransferResult,
  onFileUpload,
  onFileDownload,
}: ToolsSectionProps) {
  return (
    <section className="tools-section">
      <h2>Tools</h2>
      <div className="tools-grid">
        <div className="tool-card">
          <h3>Screenshot</h3>
          <p>Capture a screenshot of your development environment</p>
          <button onClick={onScreenshot} disabled={screenshotLoading}>
            {screenshotLoading ? 'Capturing...' : 'Take Screenshot'}
          </button>
          {screenshot && (
            <div className="screenshot-result">
              <p>Saved to:</p>
              <code>{screenshot}</code>
            </div>
          )}
        </div>

        {environments.filter(e => e.status === 'running' && e.ipv4).length > 0 && (
          <div className="tool-card">
            <h3>File Transfer</h3>
            <p>Upload or download files to/from environments</p>
            <select
              value={fileTransferEnvId || ''}
              onChange={(e) => setFileTransferEnvId(e.target.value || null)}
              className="env-select"
            >
              <option value="">Select environment...</option>
              {environments
                .filter(e => e.status === 'running' && e.ipv4)
                .map(env => (
                  <option key={env.id} value={env.id}>
                    {env.name} ({env.ipv4})
                  </option>
                ))}
            </select>
            <div className="file-transfer-buttons">
              <button
                onClick={() => fileTransferEnvId && onFileUpload(fileTransferEnvId)}
                disabled={!fileTransferEnvId || fileTransferLoading}
              >
                {fileTransferLoading ? 'Transferring...' : 'Upload'}
              </button>
              <button
                onClick={() => fileTransferEnvId && onFileDownload(fileTransferEnvId)}
                disabled={!fileTransferEnvId || fileTransferLoading}
              >
                {fileTransferLoading ? 'Transferring...' : 'Download'}
              </button>
            </div>
            {fileTransferResult && (
              <div className="transfer-result">
                <p>{fileTransferResult}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
