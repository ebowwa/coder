import { useState, useEffect } from 'react'

const API_BASE = ''

export interface MetricDataPoint {
  id?: number
  environmentId: string
  cpuPercent: number
  memoryPercent: number
  diskPercent: number
  networkRxBytes?: number
  networkTxBytes?: number
  loadAvg1m?: number
  loadAvg5m?: number
  loadAvg15m?: number
  activeProcesses?: number
  activeConnections?: number
  capturedAt: string
}

export interface MetricsSummary {
  cpu: {
    avg: number
    min: number
    max: number
    count: number
    trend?: 'rising' | 'falling' | 'stable'
  }
  memory: {
    avg: number
    min: number
    max: number
    count: number
    trend?: 'rising' | 'falling' | 'stable'
  }
  disk: {
    avg: number
    min: number
    max: number
    count: number
    trend?: 'rising' | 'falling' | 'stable'
  }
  period: {
    start: string
    end: string
    hours: number
  }
  dataPoints: number
}

interface MetricsResponse {
  success: boolean
  metrics?: MetricDataPoint[]
  error?: string
}

interface MetricsSummaryResponse {
  success: boolean
  summary?: MetricsSummary
  error?: string
}

export function useMetrics(environmentId: string | null, options: { hours?: number; limit?: number; enabled?: boolean } = {}) {
  const { hours = 24, limit = 100, enabled = true } = options
  const [metrics, setMetrics] = useState<MetricDataPoint[]>([])
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!environmentId || !enabled) {
      setMetrics([])
      setSummary(null)
      return
    }

    const fetchMetrics = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch metrics history
        const response = await fetch(
          `${API_BASE}/api/environments/${environmentId}/metrics?hours=${hours}&limit=${limit}`
        )
        const data: MetricsResponse = await response.json()

        if (data.success && data.metrics) {
          // Reverse to get chronological order (oldest first)
          setMetrics(data.metrics.reverse())
        } else {
          setMetrics([])
          if (data.error) setError(data.error)
        }
      } catch (err) {
        setError('Failed to fetch metrics')
        setMetrics([])
      } finally {
        setLoading(false)
      }
    }

    const fetchSummary = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/environments/${environmentId}/metrics/summary?hours=${hours}`
        )
        const data: MetricsSummaryResponse = await response.json()

        if (data.success && data.summary) {
          setSummary(data.summary)
        } else {
          setSummary(null)
        }
      } catch {
        setSummary(null)
      }
    }

    fetchMetrics()
    fetchSummary()
  }, [environmentId, hours, limit, enabled])

  return { metrics, summary, loading, error }
}

/**
 * Fetch metrics for a specific environment (non-hook version)
 */
export async function fetchMetrics(
  environmentId: string,
  options: { hours?: number; limit?: number } = {}
): Promise<MetricDataPoint[]> {
  const { hours = 24, limit = 100 } = options

  try {
    const response = await fetch(
      `/api/environments/${environmentId}/metrics?hours=${hours}&limit=${limit}`
    )
    const data: MetricsResponse = await response.json()

    if (data.success && data.metrics) {
      return data.metrics.reverse() // Return in chronological order
    }
    return []
  } catch {
    return []
  }
}

/**
 * Fetch metrics summary for a specific environment
 */
export async function fetchMetricsSummary(
  environmentId: string,
  hours: number = 24
): Promise<MetricsSummary | null> {
  try {
    const response = await fetch(
      `/api/environments/${environmentId}/metrics/summary?hours=${hours}`
    )
    const data: MetricsSummaryResponse = await response.json()

    if (data.success && data.summary) {
      return data.summary
    }
    return null
  } catch {
    return null
  }
}
