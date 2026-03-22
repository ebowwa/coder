/**
 * Reusable API utilities for fetch operations
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);
      if (!res.ok) {
        throw new ApiError(`Failed to fetch: ${url}`, res.status, url);
      }
      return res.json();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
}

export function createApiClient(baseUrl: string, defaultOptions?: FetchOptions) {
  return {
    get: <T>(path: string, options?: FetchOptions) =>
      fetchJson<T>(`${baseUrl}${path}`, { ...defaultOptions, ...options }),
    post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
      fetchJson<T>(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        ...defaultOptions,
        ...options,
      }),
  };
}
