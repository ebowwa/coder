/**
 * API Client Module
 * Type-safe API communication with retry logic
 */

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

interface ApiError extends Error {
  status?: number;
  code?: string;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private maxRetries: number;

  constructor(
    baseUrl: string = '/api',
    options: { timeout?: number; maxRetries?: number } = {}
  ) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = options.timeout || 10000;
    this.maxRetries = options.maxRetries || 3;
  }

  /**
   * Create API error with context
   */
  private createError(message: string, status?: number, code?: string): ApiError {
    const error = new Error(message) as ApiError;
    error.status = status;
    error.code = code;
    return error;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 0) throw error;
      
      const isNetworkError = error instanceof TypeError;
      const isServerError = error instanceof ApiClientError && 
        error.status >= 500 && 
        error.status < 600;

      if (!isNetworkError && !isServerError) {
        throw error;
      }

      const delay = Math.min(1000 * Math.pow(2, this.maxRetries - retries), 10000);
      await this.sleep(delay);
      
      return this.retryWithBackoff(operation, retries - 1);
    }
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number>): string {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createError('Request timeout', 408, 'TIMEOUT');
      }
      throw error;
    }
  }

  /**
   * Process response and handle errors
   */
  private async processResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let message = response.statusText || 'Request failed';
      let code: string | undefined;

      if (isJson) {
        try {
          const errorData = await response.json();
          message = errorData.message || errorData.error || message;
          code = errorData.code;
        } catch {
          // Use default message
        }
      }

      throw this.createError(message, response.status, code);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (isJson) {
      return response.json();
    }

    throw this.createError('Unsupported response type', response.status);
  }

  /**
   * Generic request method
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number>,
    options: RequestInit = {}
  ): Promise<T> {
    const operation = async () => {
      const url = this.buildUrl(path, params);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      const response = await this.fetchWithTimeout(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      });

      return this.processResponse<T>(response);
    };

    return this.retryWithBackoff(operation);
  }

  /**
   * GET request
   */
  async get<T>(
    path: string,
    params?: Record<string, string | number>,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>('GET', path, undefined, params, options);
  }

  /**
   * POST request
   */
  async post<T>(
    path: string,
    body?: unknown,
    params?: Record<string, string | number>,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>('POST', path, body, params, options);
  }

  /**
   * PUT request
   */
  async put<T>(
    path: string,
    body?: unknown,
    params?: Record<string, string | number>,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>('PUT', path, body, params, options);
  }

  /**
   * PATCH request
   */
  async patch<T>(
    path: string,
    body?: unknown,
    params?: Record<string, string | number>,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>('PATCH', path, body, params, options);
  }

  /**
   * DELETE request
   */
  async delete<T>(
    path: string,
    params?: Record<string, string | number>,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>('DELETE', path, undefined, params, options);
  }
}

class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Singleton instance
export const api = new ApiClient();

export { ApiClient, ApiClientError, type ApiResponse };
