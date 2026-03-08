import { useState, useEffect } from 'react'

const API_BASE = ''

export interface HetznerSSHKey {
  id: number
  name: string
  fingerprint: string
  public_key: string
  labels: Record<string, string>
  created: string
}

interface SSHKeysResponse {
  success: boolean
  sshKeys?: HetznerSSHKey[]
  error?: string
}

/**
 * Hook to fetch SSH keys from Hetzner API
 */
export function useSSHKeys() {
  const [sshKeys, setSSHKeys] = useState<HetznerSSHKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSSHKeys = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${API_BASE}/api/ssh-keys`)
        const data: SSHKeysResponse = await response.json()

        if (data.success && data.sshKeys) {
          // Sort SSH keys by name
          const sortedKeys = data.sshKeys.sort((a, b) => a.name.localeCompare(b.name))
          setSSHKeys(sortedKeys)
        } else {
          console.error('[useSSHKeys] API error:', data.error)
          setError(data.error || 'Failed to fetch SSH keys')
        }
      } catch (err) {
        console.error('[useSSHKeys] Failed to fetch SSH keys:', err)
        setError('Failed to connect to backend')
      } finally {
        setLoading(false)
      }
    }

    fetchSSHKeys()
  }, [])

  return { sshKeys, loading, error }
}
