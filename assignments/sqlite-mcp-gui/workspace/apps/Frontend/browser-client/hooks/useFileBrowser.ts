import { Environment } from "../../../../../../@ebowwa/codespaces-types/compile"
import type { FileListItem, Notification } from './useAppState'

const API_BASE = '' // Relative URL - same port as frontend

interface UseFileBrowserProps {
  environments: Environment[]
  fileTransferEnvId: string | null
  setFileTransferEnvId: (id: string | null) => void
  setFileTransferLoading: (loading: boolean) => void
  setFileTransferResult: (result: string | null) => void
  setFileList: (files: FileListItem[]) => void
  fileList: FileListItem[]
  setCurrentPath: (path: string) => void
  currentPath: string
  setShowFileBrowser: (show: boolean) => void
  setSelectedFile: (file: { name: string; path: string } | null) => void
  selectedFile: { name: string; path: string } | null
  setPreviewContent: (content: { type: string; content?: string; error?: string } | null) => void
  setPreviewLoading: (loading: boolean) => void
  setShowFileBrowser: (show: boolean) => void
  setPreviewLayerOpen: (open: boolean) => void
  showNotification: (message: string, type: Notification['type']) => void
}

export function useFileBrowser({
  environments,
  fileTransferEnvId,
  setFileTransferEnvId,
  setFileTransferLoading,
  setFileTransferResult,
  setFileList,
  setCurrentPath,
  currentPath,
  setShowFileBrowser,
  setSelectedFile,
  selectedFile,
  setPreviewContent,
  setPreviewLoading,
  setPreviewLayerOpen,
  showNotification,
}: UseFileBrowserProps) {

  const handleFileUpload = async (envId: string) => {
    const env = environments.find(e => e.id === envId)
    if (!env || !env.ipv4) return

    const host = env.ipv4

    // Create file input
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setFileTransferLoading(true)
      setFileTransferResult(null)

      try {
        // Create FormData to upload file to backend
        const formData = new FormData()
        formData.append('file', file)
        formData.append('host', host)
        formData.append('destination', `/root/${file.name}`)

        const response = await fetch(`${API_BASE}/api/scp/upload`, {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()
        if (data.success) {
          setFileTransferResult(`Uploaded ${file.name} to ${env.name}`)
          showNotification(`File uploaded to ${env.name}`, 'success')
        } else {
          showNotification(data.error || 'Upload failed', 'error')
        }
      } catch (err) {
        showNotification('Upload failed - backend not running', 'error')
      } finally {
        setFileTransferLoading(false)
      }
    }
    input.click()
  }

  const handleFileDownload = async (envId: string) => {
    setFileTransferEnvId(envId)
    setShowFileBrowser(true)
    await handleLoadFiles(envId)
  }

  const handleCloseFileBrowser = () => {
    setShowFileBrowser(false)
    setSelectedFile(null)
  }

  const handleLoadFiles = async (envId: string) => {
    const env = environments.find(e => e.id === envId)
    if (!env || !env.ipv4) return

    const host = env.ipv4

    setFileTransferLoading(true)
    setFileList([])
    setCurrentPath('.')
    setShowFileBrowser(true)

    try {
      const response = await fetch(`${API_BASE}/api/files/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, path: currentPath }),
      })

      const data = await response.json()
      if (data.success && data.files) {
        setFileList(data.files)
      } else {
        showNotification(data.error || 'Failed to load files', 'error')
      }
    } catch (err) {
      showNotification('Failed to load files - backend not running', 'error')
    } finally {
      setFileTransferLoading(false)
    }
  }

  const handleNavigateDirectory = async (path: string) => {
    setCurrentPath(path)
    setSelectedFile(null)
    if (!fileTransferEnvId) return

    const env = environments.find(e => e.id === fileTransferEnvId)
    if (!env || !env.ipv4) return

    setFileTransferLoading(true)
    setFileList([])

    try {
      const response = await fetch(`${API_BASE}/api/files/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: env.ipv4, path }),
      })

      const data = await response.json()
      if (data.success && data.files) {
        setFileList(data.files)
      } else {
        showNotification(data.error || 'Failed to load files', 'error')
      }
    } catch (err) {
      showNotification('Failed to load files - backend not running', 'error')
    } finally {
      setFileTransferLoading(false)
    }
  }

  const handleSelectFile = (file: { name: string; path: string }) => {
    setSelectedFile(file)
    // Clear previous preview when selecting a new file (lazy loading)
    setPreviewContent(null)
  }

  const handleLoadPreview = async (file: { name: string; path: string }) => {
    if (!fileTransferEnvId) return

    const env = environments.find(e => e.id === fileTransferEnvId)
    if (!env || !env.ipv4) return

    setPreviewLoading(true)
    setPreviewContent(null)

    try {
      const response = await fetch(`${API_BASE}/api/files/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: env.ipv4, path: file.path }),
      })

      const data = await response.json()
      if (data.success) {
        setPreviewContent(data)
        setShowFileBrowser(false)
        setPreviewLayerOpen(true)
      } else {
        showNotification(data.error || 'Failed to preview file', 'error')
      }
    } catch (err) {
      showNotification('Failed to preview file - backend not running', 'error')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleClosePreviewLayer = () => {
    setPreviewLayerOpen(false)
    setPreviewContent(null)
  }

  const handleConfirmDownload = async () => {
    if (!selectedFile || !fileTransferEnvId) return

    const env = environments.find(e => e.id === fileTransferEnvId)
    if (!env || !env.ipv4) return

    const host = env.ipv4
    const source = selectedFile.path

    setFileTransferLoading(true)
    setFileTransferResult(null)

    try {
      const response = await fetch(`${API_BASE}/api/scp/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host,
          source,
          destination: `~/Downloads/${selectedFile.name}`,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setFileTransferResult(`Downloaded ${selectedFile.name} from ${env.name}`)
        showNotification(`File downloaded from ${env.name}`, 'success')
      } else {
        showNotification(data.error || 'Download failed', 'error')
      }
    } catch (err) {
      showNotification('Download failed - backend not running', 'error')
    } finally {
      setFileTransferLoading(false)
    }
  }

  // Format file size for display
  const formatFileSize = (bytes: string): string => {
    const size = parseInt(bytes) || 0
    if (size === 0) return '-'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return {
    handleFileUpload,
    handleFileDownload,
    handleCloseFileBrowser,
    handleLoadFiles,
    handleNavigateDirectory,
    handleSelectFile,
    handleLoadPreview,
    handleClosePreviewLayer,
    handleConfirmDownload,
    formatFileSize,
  }
}
