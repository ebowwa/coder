/**
 * Hetzner Cloud API action polling and management
 *
 * Provides a robust polling service for monitoring async Hetzner actions
 * with progress tracking, error handling, and cancellation support.
 */

import type { HetznerClient } from "./client.js";
import type {
  HetznerAction,
  ActionPollingOptions,
  RateLimitInfo,
} from "./types.js";
import {
  ActionStatus,
  ActionCommand,
} from "./types.js";
import {
  HetznerActionError,
  HetznerTimeoutError,
  isRetryableError,
  calculateRetryDelay,
  type ErrorHandler,
} from "./errors.js";

// ============================================================================
// Enhanced Polling Options
// ============================================================================

/**
 * Enhanced options for action polling with more granular control
 */
export interface EnhancedActionPollingOptions {
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number;
  /** Maximum number of polling attempts before timeout */
  maxRetries?: number;
  /** Maximum time to wait in milliseconds before timeout */
  timeout?: number;
  /** Callback fired on each progress update */
  onProgress?: (action: HetznerAction) => void;
  /** Callback fired when action completes successfully */
  onComplete?: (action: HetznerAction) => void;
  /** Callback fired when action fails */
  onError?: (error: HetznerActionError, action: HetznerAction) => void;
  /** Callback fired on each retry attempt */
  onRetry?: (attempt: number, delay: number) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Whether to use adaptive polling intervals (default: false) */
  adaptive?: boolean;
  /** Concurrency limit for multiple actions (default: 5) */
  concurrency?: number;
}

/**
 * Result of a polling operation
 */
export interface PollingResult<T = HetznerAction> {
  /** Whether the operation completed successfully */
  success: boolean;
  /** The final action state (if successful) */
  action?: HetznerAction;
  /** Error that occurred (if failed) */
  error?: Error;
  /** Number of polling attempts made */
  attempts: number;
  /** Total time elapsed in milliseconds */
  elapsed: number;
}

/**
 * Result for batch polling operations
 */
export interface BatchPollingResult {
  /** Map of action ID to result */
  results: Map<number, PollingResult>;
  /** Count of successful actions */
  successful: number;
  /** Count of failed actions */
  failed: number;
  /** Total time elapsed in milliseconds */
  elapsed: number;
}

// ============================================================================
// Action Operations Class
// ============================================================================

/**
 * Action operations for the Hetzner Cloud API
 *
 * Provides methods for managing and polling actions with enhanced
 * polling capabilities including cancellation, progress tracking,
 * and batch operations.
 */
export class ActionOperations {
  constructor(private client: HetznerClient) {}

  /**
   * Get a specific action by ID
   *
   * @param id - Action ID
   * @returns Action details
   */
  async get(id: number): Promise<HetznerAction> {
    const response = await this.client.request<{ action: HetznerAction }>(
      `/actions/${id}`
    );
    return response.action;
  }

  /**
   * List all actions
   *
   * @param options - Optional filters (status, sort, etc.)
   * @returns Array of actions
   */
  async list(options?: {
    status?: ActionStatus;
    sort?: string;
    page?: number;
    per_page?: number;
  }): Promise<HetznerAction[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append("status", options.status);
    if (options?.sort) params.append("sort", options.sort);
    if (options?.page) params.append("page", options.page.toString());
    if (options?.per_page)
      params.append("per_page", options.per_page.toString());

    const query = params.toString();
    const response = await this.client.request<{ actions: HetznerAction[] }>(
      `/actions${query ? `?${query}` : ""}`
    );
    return response.actions;
  }

  /**
   * Poll a single action until completion (enhanced version)
   *
   * This is the main polling service method with full feature support:
   * - Progress tracking with onProgress callback
   * - Success/failure callbacks
   * - Cancellation via AbortSignal
   * - Adaptive polling intervals
   * - Comprehensive error handling
   *
   * @param actionId - Action ID to poll
   * @param options - Polling options
   * @returns Promise resolving to the completed action
   *
   * @example
   * ```typescript
   * const action = await client.actions.poll(123, {
   *   onProgress: (a) => console.log(`Progress: ${a.progress}%`),
   *   onComplete: (a) => console.log('Done!'),
   *   onError: (e) => console.error('Failed:', e.message),
   *   timeout: 300000, // 5 minutes
   *   signal: abortController.signal
   * });
   * ```
   */
  async poll(
    actionId: number,
    options: EnhancedActionPollingOptions = {}
  ): Promise<HetznerAction> {
    return pollAction(this.client, actionId, options);
  }

  /**
   * Poll multiple actions until completion
   *
   * Handles concurrent polling of multiple actions with optional
   * concurrency limit and individual action tracking.
   *
   * @param actionIds - Array of action IDs to poll
   * @param options - Polling options
   * @returns Promise resolving to array of completed actions
   *
   * @example
   * ```typescript
   * const actions = await client.actions.pollMany([1, 2, 3], {
   *   onProgress: (a) => updateUI(a),
   *   concurrency: 3, // Poll 3 at a time
   *   signal: abortController.signal
   * });
   * ```
   */
  async pollMany(
    actionIds: number[],
    options: EnhancedActionPollingOptions = {}
  ): Promise<HetznerAction[]> {
    return pollActions(this.client, actionIds, options);
  }

  /**
   * Poll multiple actions with detailed result tracking
   *
   * Returns a BatchPollingResult with success/failure counts and
   * per-action results for better error handling.
   *
   * @param actionIds - Array of action IDs to poll
   * @param options - Polling options
   * @returns Batch polling result with detailed status
   *
   * @example
   * ```typescript
   * const result = await client.actions.pollManyDetailed([1, 2, 3], {
   *   concurrency: 2
   * });
   * console.log(`Success: ${result.successful}, Failed: ${result.failed}`);
   * for (const [id, r] of result.results) {
   *   if (r.error) console.error(`Action ${id} failed:`, r.error);
   * }
   * ```
   */
  async pollManyDetailed(
    actionIds: number[],
    options: EnhancedActionPollingOptions = {}
  ): Promise<BatchPollingResult> {
    return pollActionsDetailed(this.client, actionIds, options);
  }

  /**
   * Wait for an action to complete (backward compatible alias)
   *
   * @param id - Action ID
   * @param options - Polling options
   * @returns Completed action
   * @deprecated Use poll() instead for new code
   */
  async waitFor(
    id: number,
    options?: ActionPollingOptions
  ): Promise<HetznerAction> {
    return waitForAction(this.client, id, options);
  }

  /**
   * Wait for multiple actions to complete (backward compatible alias)
   *
   * @param ids - Array of action IDs
   * @param options - Polling options
   * @returns Array of completed actions
   * @deprecated Use pollMany() instead for new code
   */
  async waitForMany(
    ids: number[],
    options?: ActionPollingOptions
  ): Promise<HetznerAction[]> {
    return waitForMultipleActions(this.client, ids, options);
  }

  /**
   * Batch check multiple actions (no polling, single fetch)
   *
   * @param ids - Array of action IDs
   * @returns Map of action ID to action
   */
  async batchCheck(
    ids: number[]
  ): Promise<Map<number, HetznerAction>> {
    return batchCheckActions(this.client, ids);
  }
}

// ============================================================================
// Action Timeouts
// ============================================================================

/**
 * Default timeouts for different action types (in milliseconds)
 * Adjusted based on typical operation durations
 */
export const ACTION_TIMEOUTS: Record<ActionCommand, number> = {
  // Quick operations (under 1 minute)
  [ActionCommand.StartServer]: 60000,
  [ActionCommand.StopServer]: 60000,
  [ActionCommand.RebootServer]: 120000,
  [ActionCommand.Poweroff]: 60000,
  [ActionCommand.ShutdownServer]: 60000,
  [ActionCommand.ResetServer]: 60000,

  // Medium operations (1-5 minutes)
  [ActionCommand.CreateServer]: 300000,
  [ActionCommand.DeleteServer]: 180000,
  [ActionCommand.ChangeServerType]: 600000,
  [ActionCommand.ChangeDnsPtr]: 30000,

  // Long operations (5-30 minutes)
  [ActionCommand.RebuildServer]: 900000,
  [ActionCommand.CreateImage]: 1800000,
  [ActionCommand.EnableRescue]: 120000,
  [ActionCommand.DisableRescue]: 60000,

  // Volume operations
  [ActionCommand.CreateVolume]: 300000,
  [ActionCommand.DeleteVolume]: 180000,
  [ActionCommand.AttachVolume]: 120000,
  [ActionCommand.DetachVolume]: 60000,
  [ActionCommand.ResizeVolume]: 600000,

  // Network operations
  [ActionCommand.AddSubnet]: 60000,
  [ActionCommand.DeleteSubnet]: 60000,
  [ActionCommand.AddRoute]: 60000,
  [ActionCommand.DeleteRoute]: 60000,
  [ActionCommand.ChangeIpRange]: 120000,
  [ActionCommand.AttachToNetwork]: 60000,
  [ActionCommand.DetachFromNetwork]: 60000,

  // Floating IP operations
  [ActionCommand.AssignFloatingIp]: 60000,
  [ActionCommand.UnassignFloatingIp]: 60000,

  // Load Balancer operations
  [ActionCommand.CreateLoadBalancer]: 300000,
  [ActionCommand.DeleteLoadBalancer]: 180000,
  [ActionCommand.AddTarget]: 60000,
  [ActionCommand.RemoveTarget]: 60000,
  [ActionCommand.AddService]: 60000,
  [ActionCommand.UpdateService]: 60000,
  [ActionCommand.DeleteService]: 60000,
  [ActionCommand.LoadBalancerAttachToNetwork]: 60000,
  [ActionCommand.LoadBalancerDetachFromNetwork]: 60000,
  [ActionCommand.ChangeAlgorithm]: 60000,
  [ActionCommand.ChangeType]: 60000,

  // Certificate operations
  [ActionCommand.IssueCertificate]: 600000, // Can take up to 10 minutes
  [ActionCommand.RetryCertificate]: 600000,

  // Firewall operations
  [ActionCommand.SetFirewallRules]: 60000,
  [ActionCommand.ApplyFirewall]: 120000,
  [ActionCommand.RemoveFirewall]: 60000,

  // Floating IP DNS
  [ActionCommand.FloatingIpChangeDnsPtr]: 30000,

  // Backup operations
  [ActionCommand.EnableBackup]: 60000,
  [ActionCommand.DisableBackup]: 60000,

  // Protection operations
  [ActionCommand.ChangeProtection]: 30000,
  [ActionCommand.VolumeChangeProtection]: 30000,
  [ActionCommand.NetworkChangeProtection]: 30000,
  [ActionCommand.FloatingIpChangeProtection]: 30000,
  [ActionCommand.LoadBalancerChangeProtection]: 30000,
  [ActionCommand.FirewallChangeProtection]: 30000,
  [ActionCommand.ImageChangeProtection]: 30000,

  // Other operations
  [ActionCommand.ChangeAliasIps]: 60000,
};

/**
 * Get default timeout for an action command
 */
export function getActionTimeout(command: ActionCommand): number {
  return ACTION_TIMEOUTS[command] || 300000; // Default 5 minutes
}

// ============================================================================
// Enhanced Action Polling Service
// ============================================================================

/**
 * Default polling options
 */
const DEFAULT_POLLING_OPTIONS: Required<EnhancedActionPollingOptions> = {
  pollInterval: 2000,
  maxRetries: 60,
  timeout: 300000,
  onProgress: () => {},
  onComplete: () => {},
  onError: () => {},
  onRetry: () => {},
  signal: undefined,
  adaptive: false,
  concurrency: 5,
};

/**
 * Poll for an action to complete with full feature support
 *
 * This is the core polling service function that provides:
 * - Progress tracking via onProgress callback
 * - Success/error notification via onComplete/onError
 * - Cancellation support via AbortSignal
 * - Adaptive polling intervals
 * - Retry logic with exponential backoff
 *
 * @param client - Hetzner API client
 * @param actionId - Action ID to poll
 * @param options - Polling options
 * @returns Completed action
 * @throws {HetznerActionError} If action fails
 * @throws {HetznerTimeoutError} If action times out
 *
 * @example
 * ```typescript
 * const action = await pollAction(client, 123, {
 *   onProgress: (a) => console.log(`Progress: ${a.progress}%`),
 *   onComplete: (a) => console.log('Completed:', a.command),
 *   onError: (e) => console.error('Failed:', e.message),
 *   timeout: 60000,
 *   signal: abortSignal
 * });
 * ```
 */
export async function pollAction(
  client: HetznerClient,
  actionId: number,
  options: EnhancedActionPollingOptions = {}
): Promise<HetznerAction> {
  const opts = { ...DEFAULT_POLLING_OPTIONS, ...options };
  const startTime = Date.now();
  let lastProgress = 0;
  let lastError: Error | null = null;
  let attempt = 0;

  // Check if already aborted
  if (opts.signal?.aborted) {
    throw new Error("Polling aborted before start");
  }

  // Set up abort listener
  const abortListener = () => {
    throw new Error("Polling aborted");
  };
  opts.signal?.addEventListener("abort", abortListener);

  try {
    while (attempt < opts.maxRetries) {
      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > opts.timeout) {
        throw new HetznerTimeoutError(actionId, opts.timeout, lastProgress);
      }

      try {
        const response = await client.request<{ action: HetznerAction }>(
          `/actions/${actionId}`
        );
        const action = response.action;
        attempt++;

        // Notify progress callback on any change
        if (action.progress !== lastProgress) {
          lastProgress = action.progress;
          opts.onProgress(action);
        }

        // Check if action completed successfully
        if (action.status === "success") {
          opts.onComplete(action);
          return action;
        }

        // Check if action failed
        if (action.status === "error") {
          const error = new HetznerActionError(
            action.error!,
            actionId
          );
          opts.onError(error, action);
          throw error;
        }

        // Still running - calculate wait time
        let waitTime = opts.pollInterval;
        if (opts.adaptive) {
          waitTime = getAdaptivePollInterval(action.progress);
        }

        await sleep(waitTime);

      } catch (error) {
        // Check if this is a retryable error
        if (isRetryableError(error)) {
          const delay = calculateRetryDelay(attempt);
          opts.onRetry(attempt, delay);

          if (opts.signal?.aborted) {
            throw new Error("Polling aborted during retry");
          }

          await sleep(delay);
          continue;
        }

        // Non-retryable error - throw immediately
        throw error;
      }
    }

    // Max retries exceeded
    throw new HetznerTimeoutError(actionId, opts.timeout, lastProgress);

  } finally {
    opts.signal?.removeEventListener("abort", abortListener);
  }
}

/**
 * Poll multiple actions concurrently
 *
 * Manages polling of multiple actions with optional concurrency limit.
 * Each action is polled independently with shared callbacks.
 *
 * @param client - Hetzner API client
 * @param actionIds - Array of action IDs to poll
 * @param options - Polling options
 * @returns Array of completed actions in same order as input
 *
 * @example
 * ```typescript
 * const actions = await pollActions(client, [1, 2, 3], {
 *   onProgress: (a) => console.log(`Action ${a.id}: ${a.progress}%`),
 *   onComplete: (a) => console.log(`Action ${a.id} complete`),
 *   concurrency: 3 // Poll 3 actions at a time
 * });
 * ```
 */
export async function pollActions(
  client: HetznerClient,
  actionIds: number[],
  options: EnhancedActionPollingOptions = {}
): Promise<HetznerAction[]> {
  const concurrency = options.concurrency ?? DEFAULT_POLLING_OPTIONS.concurrency;

  // If concurrency is high enough, poll all at once
  if (concurrency >= actionIds.length) {
    const promises = actionIds.map((id) =>
      pollAction(client, id, options)
    );
    return Promise.all(promises);
  }

  // Otherwise, process in batches with concurrency limit
  const results: HetznerAction[] = new Array(actionIds.length);
  let currentIndex = 0;

  const processBatch = async (): Promise<void> => {
    while (currentIndex < actionIds.length) {
      const batchStart = currentIndex;
      const batchEnd = Math.min(currentIndex + concurrency, actionIds.length);
      const batchIds = actionIds.slice(batchStart, batchEnd);
      currentIndex = batchEnd;

      const batchResults = await Promise.all(
        batchIds.map((id, i) => pollAction(client, id, options))
      );

      // Store results in correct positions
      batchResults.forEach((result, i) => {
        results[batchStart + i] = result;
      });
    }
  };

  // Process batches sequentially but actions within each batch concurrently
  await processBatch();
  return results;
}

/**
 * Poll multiple actions with detailed result tracking
 *
 * Similar to pollActions but returns a BatchPollingResult with
 * success/failure counts and per-action results for better
 * error handling and monitoring.
 *
 * @param client - Hetzner API client
 * @param actionIds - Array of action IDs to poll
 * @param options - Polling options
 * @returns Batch polling result with detailed status
 *
 * @example
 * ```typescript
 * const result = await pollActionsDetailed(client, [1, 2, 3], {
 *   onProgress: (a) => updateProgressBar(a)
 * });
 *
 * console.log(`Completed: ${result.successful}/${actionIds.length}`);
 * for (const [id, r] of result.results) {
 *   if (r.error) {
 *     console.error(`Action ${id} failed:`, r.error.message);
 *   }
 * }
 * ```
 */
export async function pollActionsDetailed(
  client: HetznerClient,
  actionIds: number[],
  options: EnhancedActionPollingOptions = {}
): Promise<BatchPollingResult> {
  const startTime = Date.now();
  const results = new Map<number, PollingResult>();
  let successful = 0;
  let failed = 0;

  // Wrap callbacks to track results
  const wrappedOptions: EnhancedActionPollingOptions = {
    ...options,
    onComplete: (action) => {
      results.set(action.id, {
        success: true,
        action,
        attempts: 0,
        elapsed: Date.now() - startTime,
      });
      successful++;
      options.onComplete?.(action);
    },
    onError: (error, action) => {
      results.set(action.id, {
        success: false,
        action,
        error,
        attempts: 0,
        elapsed: Date.now() - startTime,
      });
      failed++;
      options.onError?.(error, action);
    },
  };

  try {
    // Poll all actions
    await pollActions(client, actionIds, wrappedOptions);
  } catch (error) {
    // Some actions may have failed, but we still return results
    console.warn("Some actions failed during batch polling:", error);
  }

  return {
    results,
    successful,
    failed,
    elapsed: Date.now() - startTime,
  };
}

// ============================================================================
// Backward Compatible Polling Functions
// ============================================================================

/**
 * Poll for an action to complete (backward compatible)
 *
 * @deprecated Use pollAction() instead for new code
 */
export async function waitForAction(
  client: HetznerClient,
  actionId: number,
  options: ActionPollingOptions = {}
): Promise<HetznerAction> {
  const opts = { ...DEFAULT_POLLING_OPTIONS, ...options };
  const startTime = Date.now();
  let lastProgress = 0;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    // Check timeout
    if (Date.now() - startTime > opts.timeout) {
      throw new HetznerTimeoutError(actionId, opts.timeout, lastProgress);
    }

    try {
      const action = await client.request<{ action: HetznerAction }>(
        `/actions/${actionId}`
      );

      // Notify progress callback
      if (action.action.progress !== lastProgress) {
        lastProgress = action.action.progress;
        opts.onProgress(action.action);
      }

      // Check if action is complete
      if (action.action.status === "success") {
        return action.action;
      }

      if (action.action.status === "error") {
        throw new HetznerActionError(
          action.action.error!,
          actionId
        );
      }

      // Still running - wait before next poll
      await sleep(opts.pollInterval);

    } catch (error) {
      // Check if error is retryable
      if (isRetryableError(error)) {
        const delay = calculateRetryDelay(attempt);
        console.warn(
          `Retrying action ${actionId} after ${delay}ms (attempt ${attempt + 1}/${opts.maxRetries})`
        );
        await sleep(delay);
        continue;
      }

      // Non-retryable error - throw immediately
      throw error;
    }
  }

  // Max retries exceeded
  throw new HetznerTimeoutError(actionId, opts.timeout, lastProgress);
}

/**
 * Poll for multiple actions concurrently (backward compatible)
 *
 * @deprecated Use pollActions() instead for new code
 */
export async function waitForMultipleActions(
  client: HetznerClient,
  actionIds: number[],
  options: ActionPollingOptions = {}
): Promise<HetznerAction[]> {
  const promises = actionIds.map((id) => waitForAction(client, id, options));
  return Promise.all(promises);
}

/**
 * Poll for multiple actions with concurrency limit (backward compatible)
 *
 * @deprecated Use pollActions() with concurrency option instead
 */
export async function waitForMultipleActionsWithLimit(
  client: HetznerClient,
  actionIds: number[],
  concurrency: number = 5,
  options: ActionPollingOptions = {}
): Promise<HetznerAction[]> {
  const results: HetznerAction[] = [];
  const chunks: number[][] = [];

  // Split action IDs into chunks
  for (let i = 0; i < actionIds.length; i += concurrency) {
    chunks.push(actionIds.slice(i, i + concurrency));
  }

  // Process each chunk sequentially
  for (const chunk of chunks) {
    const chunkResults = await waitForMultipleActions(client, chunk, options);
    results.push(...chunkResults);
  }

  return results;
}

/**
 * Batch check multiple actions in a single API call
 *
 * Uses the /actions?id=42&id=43 endpoint to fetch multiple actions at once
 *
 * @param client - Hetzner API client
 * @param actionIds - Array of action IDs to check
 * @returns Map of action ID to action
 */
export async function batchCheckActions(
  client: HetznerClient,
  actionIds: number[]
): Promise<Map<number, HetznerAction>> {
  const MAX_BATCH_SIZE = 50; // API limit for ID parameter
  const results = new Map<number, HetznerAction>();

  // Process in batches
  for (let i = 0; i < actionIds.length; i += MAX_BATCH_SIZE) {
    const batch = actionIds.slice(i, i + MAX_BATCH_SIZE);
    const idParams = batch.map((id) => `id=${id}`).join("&");

    const response = await client.request<{ actions: HetznerAction[] }>(
      `/actions?${idParams}`
    );

    for (const action of response.actions) {
      results.set(action.id, action);
    }
  }

  return results;
}

// ============================================================================
// Action Status Utilities
// ============================================================================

/**
 * Check if an action is running
 */
export function isActionRunning(action: HetznerAction): boolean {
  return action.status === "running";
}

/**
 * Check if an action completed successfully
 */
export function isActionSuccess(action: HetznerAction): boolean {
  return action.status === "success";
}

/**
 * Check if an action failed
 */
export function isActionError(action: HetznerAction): boolean {
  return action.status === "error";
}

/**
 * Format action progress for display
 */
export function formatActionProgress(action: HetznerAction): string {
  const command = action.command.replace(/_/g, " ");
  const status = action.status.toUpperCase();
  return `${status}: ${command} (${action.progress}%)`;
}

/**
 * Get human-readable action description
 */
export function getActionDescription(command: ActionCommand | string): string {
  const descriptions: Record<ActionCommand, string> = {
    [ActionCommand.CreateServer]: "Creating server",
    [ActionCommand.DeleteServer]: "Deleting server",
    [ActionCommand.StartServer]: "Starting server",
    [ActionCommand.StopServer]: "Stopping server",
    [ActionCommand.RebootServer]: "Rebooting server",
    [ActionCommand.ResetServer]: "Resetting server",
    [ActionCommand.ShutdownServer]: "Shutting down server",
    [ActionCommand.Poweroff]: "Cutting power to server",
    [ActionCommand.ChangeServerType]: "Changing server type",
    [ActionCommand.RebuildServer]: "Rebuilding server",
    [ActionCommand.EnableBackup]: "Enabling backups",
    [ActionCommand.DisableBackup]: "Disabling backups",
    [ActionCommand.CreateImage]: "Creating image",
    [ActionCommand.ChangeDnsPtr]: "Changing reverse DNS",
    [ActionCommand.AttachToNetwork]: "Attaching to network",
    [ActionCommand.DetachFromNetwork]: "Detaching from network",
    [ActionCommand.ChangeAliasIps]: "Changing alias IPs",
    [ActionCommand.EnableRescue]: "Enabling rescue mode",
    [ActionCommand.DisableRescue]: "Disabling rescue mode",
    [ActionCommand.ChangeProtection]: "Changing protection",
    [ActionCommand.CreateVolume]: "Creating volume",
    [ActionCommand.DeleteVolume]: "Deleting volume",
    [ActionCommand.AttachVolume]: "Attaching volume",
    [ActionCommand.DetachVolume]: "Detaching volume",
    [ActionCommand.ResizeVolume]: "Resizing volume",
    [ActionCommand.VolumeChangeProtection]: "Changing volume protection",
    [ActionCommand.AddSubnet]: "Adding subnet",
    [ActionCommand.DeleteSubnet]: "Deleting subnet",
    [ActionCommand.AddRoute]: "Adding route",
    [ActionCommand.DeleteRoute]: "Deleting route",
    [ActionCommand.ChangeIpRange]: "Changing IP range",
    [ActionCommand.NetworkChangeProtection]: "Changing network protection",
    [ActionCommand.AssignFloatingIp]: "Assigning floating IP",
    [ActionCommand.UnassignFloatingIp]: "Unassigning floating IP",
    [ActionCommand.FloatingIpChangeDnsPtr]: "Changing floating IP DNS",
    [ActionCommand.FloatingIpChangeProtection]: "Changing floating IP protection",
    [ActionCommand.CreateLoadBalancer]: "Creating load balancer",
    [ActionCommand.DeleteLoadBalancer]: "Deleting load balancer",
    [ActionCommand.AddTarget]: "Adding target to load balancer",
    [ActionCommand.RemoveTarget]: "Removing target from load balancer",
    [ActionCommand.AddService]: "Adding service to load balancer",
    [ActionCommand.UpdateService]: "Updating load balancer service",
    [ActionCommand.DeleteService]: "Deleting load balancer service",
    [ActionCommand.LoadBalancerAttachToNetwork]: "Attaching load balancer to network",
    [ActionCommand.LoadBalancerDetachFromNetwork]: "Detaching load balancer from network",
    [ActionCommand.ChangeAlgorithm]: "Changing load balancer algorithm",
    [ActionCommand.ChangeType]: "Changing load balancer type",
    [ActionCommand.LoadBalancerChangeProtection]: "Changing load balancer protection",
    [ActionCommand.IssueCertificate]: "Issuing certificate",
    [ActionCommand.RetryCertificate]: "Retrying certificate",
    [ActionCommand.SetFirewallRules]: "Setting firewall rules",
    [ActionCommand.ApplyFirewall]: "Applying firewall",
    [ActionCommand.RemoveFirewall]: "Removing firewall",
    [ActionCommand.FirewallChangeProtection]: "Changing firewall protection",
    [ActionCommand.ImageChangeProtection]: "Changing image protection",
  };

  return descriptions[command] || command.replace(/_/g, " ");
}

// ============================================================================
// Adaptive Polling
// ============================================================================

/**
 * Get adaptive polling interval based on operation type
 */
export function getPollInterval(command: ActionCommand): number {
  const intervals: Partial<Record<ActionCommand, number>> = {
    // Quick operations - poll frequently
    [ActionCommand.StartServer]: 5000,
    [ActionCommand.StopServer]: 5000,
    [ActionCommand.RebootServer]: 10000,
    [ActionCommand.Poweroff]: 5000,
    [ActionCommand.ShutdownServer]: 5000,

    // Medium operations
    [ActionCommand.CreateServer]: 15000,
    [ActionCommand.CreateVolume]: 10000,
    [ActionCommand.AttachVolume]: 8000,
    [ActionCommand.DetachVolume]: 5000,

    // Long operations - poll less frequently
    [ActionCommand.RebuildServer]: 30000,
    [ActionCommand.CreateImage]: 60000,
    [ActionCommand.IssueCertificate]: 30000,
  };

  return intervals[command] || 10000; // Default 10 seconds
}

/**
 * Get adaptive polling interval based on action progress
 */
export function getAdaptivePollInterval(progress: number): number {
  if (progress < 10) return 2000; // Quick progress at start
  if (progress < 50) return 5000; // Medium progress
  if (progress < 90) return 10000; // Slowing down
  return 15000; // Near completion
}

/**
 * Poll with adaptive intervals (backward compatible)
 *
 * @deprecated Use pollAction() with adaptive: true option instead
 */
export async function waitForActionAdaptive(
  client: HetznerClient,
  actionId: number,
  command: ActionCommand,
  options: ActionPollingOptions = {}
): Promise<HetznerAction> {
  const startTime = Date.now();
  const timeout = options.timeout ?? getActionTimeout(command);
  let lastProgress = -1;

  while (Date.now() - startTime < timeout) {
    const action = await client.request<{ action: HetznerAction }>(
      `/actions/${actionId}`
    );

    // Notify progress callback
    if (action.action.progress !== lastProgress) {
      lastProgress = action.action.progress;
      options.onProgress?.(action.action);
    }

    if (action.action.status === "success") {
      return action.action;
    }

    if (action.action.status === "error") {
      throw new HetznerActionError(action.action.error!, actionId);
    }

    // Adaptive polling based on progress
    const interval = getAdaptivePollInterval(action.action.progress);
    await sleep(interval);
  }

  throw new HetznerTimeoutError(actionId, timeout, lastProgress);
}

// ============================================================================
// Rate Limit Handling
// ============================================================================

/**
 * Parse rate limit headers from response
 */
export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get("RateLimit-Limit");
  const remaining = headers.get("RateLimit-Remaining");
  const reset = headers.get("RateLimit-Reset");

  if (!limit || !remaining || !reset) {
    return null;
  }

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
  };
}

/**
 * Check if rate limit is low (should warn user)
 */
export function isRateLimitLow(info: RateLimitInfo, threshold: number = 100): boolean {
  return info.remaining < threshold;
}

/**
 * Get human-readable rate limit status
 */
export function formatRateLimitStatus(info: RateLimitInfo): string {
  const resetDate = new Date(info.reset * 1000);
  const remaining = info.remaining;
  const limit = info.limit;
  const percentage = ((remaining / limit) * 100).toFixed(1);

  return `${remaining}/${limit} (${percentage}%) - resets at ${resetDate.toISOString()}`;
}

/**
 * Wait for rate limit to reset
 */
export async function waitForRateLimitReset(info: RateLimitInfo): Promise<void> {
  const resetTime = info.reset * 1000;
  const now = Date.now();
  const waitTime = Math.max(0, resetTime - now);

  if (waitTime > 0) {
    const waitSeconds = Math.ceil(waitTime / 1000);
    console.log(`Rate limit exhausted. Waiting ${waitSeconds}s for reset...`);
    await sleep(waitTime);
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a progress logger for actions
 */
export function createProgressLogger(prefix: string = "Action") {
  return (action: HetznerAction) => {
    console.log(
      `[${prefix}] ${getActionDescription(action.command)}: ${action.progress}%`
    );
  };
}
