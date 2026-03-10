/**
 * Retry Logic - Exponential backoff with jitter for API failures
 * Handles rate limits, network errors, and transient failures
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterFactor?: number;
  retryableStatusCodes?: number[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.2,
  retryableStatusCodes: [429, 500, 502, 503, 504, 529],
  onRetry: undefined as ((attempt: number, error: Error, delayMs: number) => void) | undefined,
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);

  // Add jitter to prevent thundering herd
  const jitter = exponentialDelay * jitterFactor * (Math.random() * 2 - 1);

  // Cap at max delay
  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(
  error: Error,
  retryableStatusCodes: number[]
): boolean {
  // Check for rate limit errors
  if (error.message.includes("429") || error.message.includes("rate limit")) {
    return true;
  }

  // Check for server errors
  if (error.message.includes("500") ||
      error.message.includes("502") ||
      error.message.includes("503") ||
      error.message.includes("504")) {
    return true;
  }

  // Check for network errors
  if (error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("network") ||
      error.message.includes("fetch failed")) {
    return true;
  }

  // Check for transient API errors (empty/malformed responses)
  if (error.message.includes("No message received") ||
      error.message.includes("empty response") ||
      error.message.includes("invalid response") ||
      error.message.includes("unexpected EOF") ||
      error.message.includes("connection reset") ||
      error.message.includes("aborted")) {
    return true;
  }

  // Check for specific status codes in error message
  for (const code of retryableStatusCodes) {
    if (error.message.includes(String(code))) {
      return true;
    }
  }

  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt < opts.maxRetries! && isRetryableError(lastError, opts.retryableStatusCodes!)) {
        const delayMs = calculateDelay(
          attempt,
          opts.baseDelayMs!,
          opts.maxDelayMs!,
          opts.jitterFactor!
        );

        // Log retry attempt
        if (opts.onRetry) {
          opts.onRetry(attempt + 1, lastError, delayMs);
        } else {
          console.warn(
            `\x1b[33mRetry ${attempt + 1}/${opts.maxRetries} after ${delayMs}ms: ${lastError.message}\x1b[0m`
          );
        }

        await sleep(delayMs);
      } else {
        // Non-retryable error or max retries reached
        throw lastError;
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Create a retry wrapper for fetch
 */
export function createFetchWithRetry(
  options: RetryOptions = {}
): (url: string, init?: RequestInit) => Promise<Response> {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    return withRetry(
      async () => {
        const response = await fetch(url, init);

        // Check for retryable status codes
        if (options.retryableStatusCodes?.includes(response.status)) {
          const text = await response.text();
          throw new Error(`API error: ${response.status} - ${text}`);
        }

        return response;
      },
      options
    );
  };
}

/**
 * Parse retry-after header from rate limit response
 */
export function parseRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000; // Convert to milliseconds
    }
  }
  return null;
}
