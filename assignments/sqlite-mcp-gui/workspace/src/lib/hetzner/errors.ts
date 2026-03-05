/**
 * Hetzner Cloud API error types and utilities
 */

import type { RateLimitInfo, ActionError } from "./types.js";

// Re-export ActionError for convenience
export type { ActionError };

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Hetzner API error codes
 * @see https://docs.hetzner.cloud/#errors
 */
export enum HetznerErrorCode {
  // Authentication errors
  Unauthorized = "unauthorized",
  InvalidInput = "invalid_input",
  JSONError = "json_error",
  Forbidden = "forbidden",

  // Resource errors
  NotFound = "not_found",
  ResourceLocked = "locked",
  ResourceLimitExceeded = "resource_limit_exceeded",
  UniquenessError = "uniqueness_error",

  // Rate limiting
  RateLimitExceeded = "rate_limit_exceeded",

  // Conflict errors
  Conflict = "conflict",
  ServiceError = "service_error",

  // Server-specific errors
  ServerNotStopped = "server_not_stopped",
  ServerAlreadyStopped = "server_already_stopped",
  InvalidServerType = "invalid_server_type",

  // IP/network errors
  IpNotOwned = "ip_not_owned",
  IpAlreadyAssigned = "ip_already_assigned",

  // Volume errors
  VolumeAlreadyAttached = "volume_already_attached",
  VolumeSizeNotMultiple = "volume_size_not_multiple",

  // Firewall errors
  FirewallInUse = "firewall_in_use",

  // Certificate errors
  CertificateValidationFailed = "certificate_validation_failed",
  CertificatePending = "certificate_pending",
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base Hetzner API error
 */
export class HetznerAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "HetznerAPIError";
  }
}

/**
 * Authentication error (401)
 */
export class HetznerUnauthorizedError extends HetznerAPIError {
  constructor(message: string = "Unauthorized: Invalid API token") {
    super(message, HetznerErrorCode.Unauthorized);
    this.name = "HetznerUnauthorizedError";
  }
}

/**
 * Forbidden error (403)
 */
export class HetznerForbiddenError extends HetznerAPIError {
  constructor(message: string = "Forbidden: Insufficient permissions") {
    super(message, HetznerErrorCode.Forbidden);
    this.name = "HetznerForbiddenError";
  }
}

/**
 * Resource not found error (404)
 */
export class HetznerNotFoundError extends HetznerAPIError {
  constructor(resource: string, id: number | string) {
    super(
      `${resource} with ID ${id} not found`,
      HetznerErrorCode.NotFound,
      { resource, id }
    );
    this.name = "HetznerNotFoundError";
  }
}

/**
 * Rate limit exceeded error (429)
 */
export class HetznerRateLimitError extends HetznerAPIError {
  constructor(
    message: string = "Rate limit exceeded",
    public rateLimitInfo?: RateLimitInfo
  ) {
    super(message, HetznerErrorCode.RateLimitExceeded, rateLimitInfo);
    this.name = "HetznerRateLimitError";
  }

  /**
   * Get the number of milliseconds until the rate limit resets
   */
  get resetInMs(): number {
    if (!this.rateLimitInfo) return 60000; // Default to 1 minute
    return Math.max(0, this.rateLimitInfo.reset * 1000 - Date.now());
  }

  /**
   * Get a human-readable reset time
   */
  get resetTime(): string {
    if (!this.rateLimitInfo) return "unknown";
    return new Date(this.rateLimitInfo.reset * 1000).toISOString();
  }
}

/**
 * Resource locked error
 */
export class HetznerResourceLockedError extends HetznerAPIError {
  constructor(
    resource: string,
    id: number | string,
    public actionInProgress?: string
  ) {
    super(
      `${resource} ${id} is locked${actionInProgress ? ` by ${actionInProgress}` : ""}`,
      HetznerErrorCode.ResourceLocked,
      { resource, id, actionInProgress }
    );
    this.name = "HetznerResourceLockedError";
  }
}

/**
 * Resource limit exceeded error
 */
export class HetznerResourceLimitError extends HetznerAPIError {
  constructor(resource: string, limit: number) {
    super(
      `Resource limit exceeded: ${resource} (limit: ${limit})`,
      HetznerErrorCode.ResourceLimitExceeded,
      { resource, limit }
    );
    this.name = "HetznerResourceLimitError";
  }
}

/**
 * Invalid input error
 */
export class HetznerInvalidInputError extends HetznerAPIError {
  constructor(
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message, HetznerErrorCode.InvalidInput, { fields });
    this.name = "HetznerInvalidInputError";
  }
}

/**
 * Conflict error
 */
export class HetznerConflictError extends HetznerAPIError {
  constructor(message: string, details?: unknown) {
    super(message, HetznerErrorCode.Conflict, details);
    this.name = "HetznerConflictError";
  }
}

/**
 * Service error (5xx)
 */
export class HetznerServiceError extends HetznerAPIError {
  constructor(message: string, public statusCode?: number) {
    super(message, HetznerErrorCode.ServiceError, { statusCode });
    this.name = "HetznerServiceError";
  }
}

/**
 * Action failed error
 */
export class HetznerActionError extends HetznerAPIError {
  constructor(
    public actionError: ActionError,
    public actionId: number
  ) {
    super(
      `Action ${actionId} failed: ${actionError.code} - ${actionError.message}`,
      actionError.code,
      { actionError, actionId }
    );
    this.name = "HetznerActionError";
  }
}

/**
 * Timeout error for action polling
 */
export class HetznerTimeoutError extends HetznerAPIError {
  constructor(
    actionId: number,
    timeout: number,
    public lastProgress: number
  ) {
    super(
      `Action ${actionId} timed out after ${timeout}ms (last progress: ${lastProgress}%)`,
      "timeout",
      { actionId, timeout, lastProgress }
    );
    this.name = "HetznerTimeoutError";
  }
}

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Parse Hetzner API error response and create appropriate error
 */
export function createHetznerError(
  statusCode: number,
  body: {
    error?: {
      code: string;
      message: string;
      details?: unknown;
    };
  }
): HetznerAPIError {
  const error = body.error;

  if (!error) {
    return new HetznerServiceError(
      `HTTP ${statusCode}: ${JSON.stringify(body)}`,
      statusCode
    );
  }

  switch (statusCode) {
    case 401:
      return new HetznerUnauthorizedError(error.message);
    case 403:
      return new HetznerForbiddenError(error.message);
    case 404:
      return new HetznerNotFoundError("resource", "unknown");
    case 429:
      return new HetznerRateLimitError(error.message);
    case 400:
      if (error.code === HetznerErrorCode.ResourceLocked) {
        return new HetznerResourceLockedError(
          "resource",
          "unknown",
          error.message
        );
      }
      if (error.code === HetznerErrorCode.InvalidInput) {
        return new HetznerInvalidInputError(error.message);
      }
      return new HetznerInvalidInputError(error.message);
    case 409:
      return new HetznerConflictError(error.message, error.details);
    default:
      if (statusCode >= 500) {
        return new HetznerServiceError(error.message, statusCode);
      }
      return new HetznerAPIError(error.message, error.code, error.details);
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof HetznerRateLimitError) return true;
  if (error instanceof HetznerResourceLockedError) return true;
  if (error instanceof HetznerServiceError) return true;
  if (error instanceof HetznerConflictError) return true;
  return false;
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is HetznerRateLimitError {
  return error instanceof HetznerRateLimitError;
}

/**
 * Check if an error is a resource locked error
 */
export function isResourceLockedError(
  error: unknown
): error is HetznerResourceLockedError {
  return error instanceof HetznerResourceLockedError;
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 60000
): number {
  const delay = baseDelay * Math.pow(2, attempt);
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(maxDelay, delay + jitter);
}

// ============================================================================
// Error Handler Types
// ============================================================================

/**
 * Error handler function type
 */
export type ErrorHandler = (error: HetznerAPIError) => void | Promise<void>;

/**
 * Error handler options
 */
export interface ErrorHandlerContext {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Base delay for exponential backoff in milliseconds */
  baseDelay?: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay?: number;
  /** Optional error handler callback */
  onError?: ErrorHandler;
  /** Whether to log errors */
  logErrors?: boolean;
}

/**
 * Default error handler that logs to console
 */
export function defaultErrorHandler(error: HetznerAPIError): void {
  console.error(`[Hetzner API Error] ${error.name}: ${error.message}`);
  if (error.details) {
    console.error("Details:", error.details);
  }
}
