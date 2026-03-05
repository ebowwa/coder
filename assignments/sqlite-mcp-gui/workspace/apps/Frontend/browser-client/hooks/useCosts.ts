import { useState, useEffect } from 'react'
import { Environment } from "../../../../../../@ebowwa/codespaces-types/compile"

const API_BASE = '' // Relative URL - same port as frontend

export interface CostBreakdown {
  environmentId: string
  environmentName: string
  serverType: string
  status: string
  priceMonthly: number
  priceHourly: number
}

export interface CostSummary {
  totalMonthly: number
  totalHourly: number
  runningCount: number
  stoppedCount: number
  breakdown: CostBreakdown[]
}

interface UseCostsOptions {
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
}

/**
 * Hook for fetching environment costs from the backend API
 *
 * @example
 * const { costs, loading, error, refreshCosts } = useCosts()
 */
export function useCosts(environments: Environment[], options: UseCostsOptions = {}) {
  const { autoRefresh = false, refreshInterval = 60000 } = options

  const [costs, setCosts] = useState<CostSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCosts = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/environments/costs`)

      if (!response.ok) {
        throw new Error(`Failed to fetch costs: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setCosts(data.costs || null)
      } else {
        setError(data.error || 'Failed to fetch costs')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useCosts] Failed to fetch costs:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchCosts()

    if (autoRefresh) {
      const interval = setInterval(fetchCosts, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  return {
    costs,
    loading,
    error,
    refreshCosts: fetchCosts,
  }
}
