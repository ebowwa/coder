/**
 * Hetzner Cloud API client
 * For server-side use only (requires API token)
 *
 * TODO: RE-REVIEW https://docs.hetzner.cloud/reference/cloud#authentication
 * - https://tailscale.com/kb/1150/cloud-hetzner
 */

// Explicitly import fetch for Bun compatibility
import { fetch as bunFetch } from "bun";
import { z } from "zod";
import { HETZNER_API_BASE } from "./config.js";

// Use Bun's fetch if available, otherwise try global fetch
const fetch = bunFetch || (globalThis as any).fetch;
import { resolveApiToken, getTokenFromCLI, isAuthenticated } from "./auth.js";
import { ServerOperations } from "./servers.js";
import { ActionOperations } from "./actions.js";
import { PricingOperations } from "./pricing.js";
import { SSHKeyOperations } from "./ssh-keys.js";
import { VolumeOperations } from "./volumes.js";
import {
  HetznerListServersResponseSchema,
  HetznerGetServerResponseSchema,
  HetznerCreateServerResponseSchema,
} from "./schemas.js";
import {
  createHetznerError,
  isRateLimitError,
} from "./errors.js";
import {
  parseRateLimitHeaders,
  waitForRateLimitReset,
} from "./actions.js";
import type { RateLimitInfo } from "./types.js";

export class HetznerClient {
  private apiToken: string;

  constructor(apiToken?: string) {
    this.apiToken = resolveApiToken(apiToken);

    // If no token from env or explicit, try CLI config
    if (!this.apiToken) {
      this.apiToken = getTokenFromCLI();
    }
  }

  get isAuthenticated(): boolean {
    return isAuthenticated(this.apiToken);
  }

  /**
   * Make a request to the Hetzner Cloud API
   *
   * @param endpoint - API endpoint (e.g., "/servers")
   * @param options - RequestInit options
   * @returns Parsed JSON response
   * @throws {HetznerAPIError} On API errors
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${HETZNER_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Parse rate limit headers
    const rateLimit = parseRateLimitHeaders(response.headers);
    this.handleRateLimit(rateLimit);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw createHetznerError(response.status, body);
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Validate Hetzner API response with Zod schema
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate
   * @returns Validated data
   */
  private validateResponse<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (result.success) {
      return result.data;
    }
    // Log validation errors but don't throw to maintain backward compatibility
    console.warn(
      "Hetzner API response validation warning:",
      result.error.issues
    );
    return data as T;
  }

  /**
   * Handle rate limit information from response headers
   *
   * @param rateLimit - Rate limit info from response
   */
  private handleRateLimit(rateLimit: RateLimitInfo | null): void {
    if (!rateLimit) return;

    // Warn if rate limit is low
    if (rateLimit.remaining < 100) {
      console.warn(
        `[Hetzner API] Rate limit low: ${rateLimit.remaining}/${rateLimit.limit} remaining. Resets at ${new Date(rateLimit.reset * 1000).toISOString()}`
      );
    }
  }

  /**
   * Get current rate limit information
   *
   * Makes a lightweight request to check rate limit status
   *
   * @returns Rate limit info or null if not available
   */
  async getRateLimit(): Promise<RateLimitInfo | null> {
    try {
      const response = await fetch(`${HETZNER_API_BASE}/servers`, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });
      return parseRateLimitHeaders(response.headers);
    } catch {
      return null;
    }
  }

  readonly servers = new ServerOperations(this);
  readonly actions = new ActionOperations(this);
  readonly pricing = new PricingOperations(this);
  readonly ssh_keys = new SSHKeyOperations(this);
  readonly volumes = new VolumeOperations(this);

  // Backward-compatible convenience methods (delegates to servers operations)
  async listServers() {
    return this.servers.list();
  }

  async getServer(id: number) {
    return this.servers.get(id);
  }

  async createServer(options: import("./types.js").CreateServerOptions) {
    return this.servers.create(options);
  }

  async deleteServer(id: number) {
    return this.servers.delete(id);
  }

  async powerOn(id: number) {
    return this.servers.powerOn(id);
  }

  async powerOff(id: number) {
    return this.servers.powerOff(id);
  }

  async reboot(id: number) {
    return this.servers.reboot(id);
  }
}

// Re-export types for convenience
export type * from "./types.js";
