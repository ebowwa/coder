const API_BASE = '' // Relative URL - same port as frontend

export interface HetznerAction {
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

/**
 * Poll a single Hetzner action until completion
 *
 * @param actionId - The action ID to poll
 * @param options - Polling options
 * @returns The completed action, or null if stopped
 */
export async function pollAction(
  actionId: number,
  options: ActionPollingOptions = {}
): Promise<HetznerAction | null> {
  const {
    interval = 2000,
    timeout = 300000, // 5 minutes
    onProgress,
    onComplete,
    onError,
  } = options

  const startTime = Date.now()

  try {
    while (Date.now() - startTime < timeout) {
      // Fetch action status
      const response = await fetch(`${API_BASE}/api/actions/${actionId}`)
      if (!response.ok) {
        console.error(`[pollAction] Failed to fetch action ${actionId}: ${response.statusText}`)
        throw new Error(`Failed to fetch action status: ${response.statusText}`)
      }

      const data = await response.json()
      if (!data.success) {
        console.error(`[pollAction] API error for action ${actionId}:`, data.error)
        throw new Error(data.error || 'Failed to fetch action status')
      }

      const action: HetznerAction = data.action

      // Call progress callback
      if (onProgress) {
        onProgress(action)
      }

      // Check if action is complete
      if (action.status === 'success') {
        if (onComplete) {
          onComplete(action)
        }
        return action
      }

      // Check if action failed
      if (action.status === 'error') {
        if (onError) {
          onError(action)
        }
        return action
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    // Timeout
    console.error(`[pollAction] Action ${actionId} polling timed out after ${timeout}ms`)
    throw new Error(`Action ${actionId} polling timed out after ${timeout}ms`)
  } catch (error) {
    console.error(`[pollAction] Error polling action ${actionId}:`, error)
    throw error
  }
}

/**
 * Poll multiple Hetzner actions until all complete
 *
 * @param actionIds - Array of action IDs to poll
 * @param options - Polling options
 * @returns Array of completed actions
 */
export async function pollActions(
  actionIds: number[],
  options: ActionPollingOptions = {}
): Promise<HetznerAction[]> {
  const {
    interval = 2000,
    timeout = 300000,
    onProgress,
    onComplete,
    onError,
  } = options

  const startTime = Date.now()
  const results: Map<number, HetznerAction> = new Map()
  const pending = new Set(actionIds)

  try {
    while (pending.size > 0 && Date.now() - startTime < timeout) {
      // Poll all pending actions
      const pendingIds = Array.from(pending)
      const actionPromises = pendingIds.map(async (id) => {
        const response = await fetch(`${API_BASE}/api/actions/${id}`)
        if (!response.ok) {
          console.error(`[pollActions] Failed to fetch action ${id}: ${response.statusText}`)
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

    return Array.from(results.values())
  } catch (error) {
    console.error('[pollActions] Error polling actions:', error)
    throw error
  }
}
