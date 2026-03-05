import { useState, useCallback, useRef } from 'react'

const API_BASE = '' // Relative URL - same port as frontend

interface HetznerAction {
  id: number
  command: string
  status: 'running' | 'success' | 'error'
  progress: number
  started: string
  finished: string | null
  resources: Array<{
    type: string
    id: number
    name: string
  }>
  error: {
    code: string
    message: string
  } | null
}

interface ActionPollingOptions {
  interval?: number // Polling interval in ms (default: 2000)
  timeout?: number // Maximum time to poll in ms (default: 300000 = 5 minutes)
  onProgress?: (action: HetznerAction) => void
  onComplete?: (action: HetznerAction) => void
  onError?: (action: HetznerAction) => void
}

interface UseHetznerActionReturn {
  pollAction: (actionId: number, options?: ActionPollingOptions) => Promise<HetznerAction | null>
  pollActions: (actionIds: number[], options?: ActionPollingOptions) => Promise<HetznerAction[]>
  isPolling: boolean
  stopPolling: () => void
}

/**
 * DECISION DOCUMENTATION: Frontend vs Backend Polling
 * ====================================================
 *
 * Context: Backend has a polling service in `lib/hetzner/actions.ts`
 *
 * Decision: Keep frontend polling with optimistic updates
 *
 * Rationale:
 * 1. Better UX: Immediate feedback when actions start/end
 * 2. Resilience: Works even if backend polling fails
 * 3. Flexibility: Different components can poll at different rates
 * 4. Simplicity: Frontend already has infrastructure for polling
 *
 * Future Considerations:
 * - Could add WebSocket support for real-time updates
 * - Backend polling could trigger webhooks/push notifications
 * - Consider caching strategy to reduce redundant API calls
 *
 * This hook provides a polling interface for Hetzner actions
 * with progress tracking and optimistic updates.
 *
 * @example
 * const { pollAction, isPolling } = useHetznerAction()
 *
 * // Poll a single action
 * const action = await pollAction(123, {
 *   onProgress: (action) => console.log(`${action.progress}%`),
 *   onComplete: (action) => console.log('Done!'),
 * })
 */
export function useHetznerAction(): UseHetznerActionReturn {
  const [isPolling, setIsPolling] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const stopPolling = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsPolling(false)
  }, [])

  const pollAction = useCallback(
    async (actionId: number, options: ActionPollingOptions = {}): Promise<HetznerAction | null> => {
      const {
        interval = 2000,
        timeout = 300000, // 5 minutes
        onProgress,
        onComplete,
        onError,
      } = options

      // Create new abort controller for this poll
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      setIsPolling(true)
      const startTime = Date.now()

      try {
        while (Date.now() - startTime < timeout) {
          // Check if aborted
          if (signal.aborted) {
            return null
          }

          // Fetch action status
          const response = await fetch(`${API_BASE}/api/actions/${actionId}`)
          if (!response.ok) {
            throw new Error(`Failed to fetch action status: ${response.statusText}`)
          }

          const data = await response.json()
          if (!data.success) {
            throw new Error(data.error || 'Failed to fetch action status')
          }

          const action: HetznerAction = data.action

          // Call progress callback
          if (onProgress) {
            onProgress(action)
          }

          // Check if action is complete
          if (action.status === 'success') {
            setIsPolling(false)
            if (onComplete) {
              onComplete(action)
            }
            return action
          }

          // Check if action failed
          if (action.status === 'error') {
            setIsPolling(false)
            if (onError) {
              onError(action)
            }
            return action
          }

          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, interval))
        }

        // Timeout
        setIsPolling(false)
        throw new Error(`Action ${actionId} polling timed out after ${timeout}ms`)
      } catch (error) {
        setIsPolling(false)
        if ((error as Error).name === 'AbortError') {
          return null // Polling was stopped
        }
        throw error
      }
    },
    []
  )

  const pollActions = useCallback(
    async (actionIds: number[], options: ActionPollingOptions = {}): Promise<HetznerAction[]> => {
      const {
        interval = 2000,
        timeout = 300000,
        onProgress,
        onComplete,
        onError,
      } = options

      setIsPolling(true)
      const startTime = Date.now()
      const results: Map<number, HetznerAction> = new Map()
      const pending = new Set(actionIds)

      // Create new abort controller for this poll
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      try {
        while (pending.size > 0 && Date.now() - startTime < timeout) {
          // Check if aborted
          if (signal.aborted) {
            break
          }

          // Poll all pending actions
          const pendingIds = Array.from(pending)
          const actionPromises = pendingIds.map(async (id) => {
            const response = await fetch(`${API_BASE}/api/actions/${id}`)
            if (!response.ok) {
              throw new Error(`Failed to fetch action ${id}`)
            }
            const data = await response.json()
            return data.action as HetznerAction
          })

          const actions = await Promise.all(actionPromises)

          // Process results
          for (const action of actions) {
            if (onProgress) {
              onProgress(action)
            }

            // Store result
            results.set(action.id, action)

            // Remove from pending if complete
            if (action.status === 'success' || action.status === 'error') {
              pending.delete(action.id)

              if (action.status === 'success' && onComplete) {
                onComplete(action)
              } else if (action.status === 'error' && onError) {
                onError(action)
              }
            }
          }

          // If all done, break
          if (pending.size === 0) {
            break
          }

          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, interval))
        }

        setIsPolling(false)
        return Array.from(results.values())
      } catch (error) {
        setIsPolling(false)
        if ((error as Error).name === 'AbortError') {
          return Array.from(results.values())
        }
        throw error
      }
    },
    []
  )

  return {
    pollAction,
    pollActions,
    isPolling,
    stopPolling,
  }
}
