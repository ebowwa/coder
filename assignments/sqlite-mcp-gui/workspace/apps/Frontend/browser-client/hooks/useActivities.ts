import { useState, useEffect } from 'react'

const API_BASE = '' // Relative URL - same port as frontend

export interface ActivityEntry {
  id: number
  environmentId: string
  action: string
  environmentName: string
  details?: string
  timestamp: string
}

interface UseActivitiesOptions {
  environmentId?: string
  limit?: number
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
}

/**
 * Hook for fetching and managing activities from the backend API
 *
 * @example
 * const { activities, loading, error, refreshActivities, addActivity } = useActivities()
 * const { activities } = useActivities({ environmentId: '123', limit: 20 })
 */
export function useActivities(options: UseActivitiesOptions = {}) {
  const { environmentId, limit = 50, autoRefresh = false, refreshInterval = 30000 } = options

  const [activities, setActivities] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = async () => {
    setLoading(true)
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (environmentId) params.append('environmentId', environmentId)
      if (limit) params.append('limit', limit.toString())

      const url = `/api/activities${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(`${API_BASE}${url}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setActivities(data.activities || [])
      } else {
        setError(data.error || 'Failed to fetch activities')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useActivities] Failed to fetch activities:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchActivities()

    if (autoRefresh) {
      const interval = setInterval(fetchActivities, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [environmentId, limit, autoRefresh, refreshInterval])

  /**
   * Add a new activity via the backend API
   * Requires environmentId to log properly.
   *
   * @param environmentId - The environment ID
   * @param action - The action description
   * @param environmentName - The environment name
   * @param details - Optional additional details
   */
  const addActivity = async (
    environmentId: string,
    action: string,
    environmentName: string,
    details?: string
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentId, action, environmentName, details }),
      })

      if (!response.ok) {
        throw new Error(`Failed to add activity: ${response.statusText}`)
      }

      // Refresh to show the new activity
      await fetchActivities()
    } catch (err) {
      console.error('[useActivities] Failed to add activity:', err)
      throw err
    }
  }

  return {
    activities,
    loading,
    error,
    refreshActivities: fetchActivities,
    addActivity,
  }
}
