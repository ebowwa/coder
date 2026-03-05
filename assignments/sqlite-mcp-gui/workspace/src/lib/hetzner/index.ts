/**
 * Hetzner Cloud API client
 * For server-side use only (requires API token)
 *
 * TODO:
 * - Certificate actions: https://docs.hetzner.cloud/reference/cloud#certificate-actions
 * - DNS operations
 */

// Core exports
export { HetznerClient } from "./client.js";
export { ServerOperations } from "./servers.js";
export { ActionOperations } from "./actions.js";
export { SSHKeyOperations } from "./ssh-keys.js";

// Auth
export { getTokenFromCLI, isAuthenticated, resolveApiToken } from "./auth.js";

// Config
export { HETZNER_API_BASE } from "./config.js";

// Types
export * from "./types.js";

// Schemas
export * from "./schemas.js";

// Errors
export * from "./errors.js";

// Action utilities
export {
  waitForAction,
  waitForMultipleActions,
  waitForMultipleActionsWithLimit,
  batchCheckActions,
  getActionTimeout,
  isActionRunning,
  isActionSuccess,
  isActionError,
  formatActionProgress,
  getActionDescription,
  getPollInterval,
  getAdaptivePollInterval,
  waitForActionAdaptive,
  parseRateLimitHeaders,
  isRateLimitLow,
  formatRateLimitStatus,
  waitForRateLimitReset,
  createProgressLogger,
  ACTION_TIMEOUTS,
} from "./actions.js";
