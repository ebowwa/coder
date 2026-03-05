/**
 * Hetzner server operations
 */

import { z } from "zod";
import type {
  HetznerServer,
  CreateServerOptions,
  HetznerAction,
  CreateServerResponse,
} from "./types.js";
import type { HetznerClient } from "./client.js";
import {
  HetznerListServersResponseSchema,
  HetznerGetServerResponseSchema,
  HetznerCreateServerResponseSchema,
  HetznerActionSchema,
} from "./schemas.js";

export class ServerOperations {
  constructor(private client: HetznerClient) {}

  /**
   * List all servers
   */
  async list(): Promise<HetznerServer[]> {
    const response = await this.client.request<{ servers: HetznerServer[] }>(
      "/servers",
    );

    // Validate response with Zod
    const validated = HetznerListServersResponseSchema.safeParse(response);
    if (!validated.success) {
      console.warn('Hetzner list servers validation warning:', validated.error.issues);
      return response.servers; // Return unvalidated data for backward compatibility
    }

    return validated.data.servers;
  }

  /**
   * Get a specific server by ID
   */
  async get(id: number): Promise<HetznerServer> {
    const response = await this.client.request<{ server: HetznerServer }>(
      `/servers/${id}`,
    );

    // Validate response with Zod
    const validated = HetznerGetServerResponseSchema.safeParse(response);
    if (!validated.success) {
      console.warn('Hetzner get server validation warning:', validated.error.issues);
      return response.server; // Return unvalidated data for backward compatibility
    }

    return validated.data.server;
  }

  /**
   * Create a new server
   *
   * @param options - Server creation options
   * @returns Create server response including server, action, and next_actions
   */
  async create(options: CreateServerOptions): Promise<CreateServerResponse> {
    // Validate input with Zod
    const createServerOptionsSchema = z.object({
      name: z.string().min(1),
      server_type: z.string().min(1).default("cpx11"),
      image: z.string().min(1).default("ubuntu-24.04"),
      location: z.string().min(1).optional(),
      datacenter: z.string().min(1).optional(),
      ssh_keys: z.array(z.union([z.string(), z.number()])).default([]),
      volumes: z.array(z.number()).default([]),
      labels: z.record(z.string(), z.any()).optional(),
      start_after_create: z.boolean().default(true),
      user_data: z.string().optional(),
    });

    const validatedOptions = createServerOptionsSchema.safeParse(options);
    if (!validatedOptions.success) {
      throw new Error(`Invalid server options: ${validatedOptions.error.issues.map(i => i.message).join(', ')}`);
    }

    // Ensure either location or datacenter, not both
    if (validatedOptions.data.location && validatedOptions.data.datacenter) {
      throw new Error('Cannot specify both location and datacenter');
    }

    const body = {
      name: validatedOptions.data.name,
      server_type: validatedOptions.data.server_type,
      image: validatedOptions.data.image,
      ...(validatedOptions.data.location && { location: validatedOptions.data.location }),
      ...(validatedOptions.data.datacenter && { datacenter: { id: validatedOptions.data.datacenter } }),
      ssh_keys: validatedOptions.data.ssh_keys,
      volumes: validatedOptions.data.volumes,
      ...(validatedOptions.data.labels && { labels: validatedOptions.data.labels }),
      start_after_create: validatedOptions.data.start_after_create,
      ...(validatedOptions.data.user_data && { user_data: validatedOptions.data.user_data }),
    };

    console.log('[Hetzner] Creating server with body:', JSON.stringify(body, null, 2));

    const response = await this.client.request<CreateServerResponse>("/servers", {
      method: "POST",
      body: JSON.stringify(body),
    });

    // Validate response with Zod
    const validatedResponse = HetznerCreateServerResponseSchema.safeParse(response);
    if (!validatedResponse.success) {
      console.warn('Hetzner create server validation warning:', validatedResponse.error.issues);
      return response; // Return unvalidated data for backward compatibility
    }

    return validatedResponse.data as CreateServerResponse;
  }

  /**
   * Create a new server and wait for it to be ready
   *
   * This convenience method creates a server and waits for the initial action to complete.
   *
   * @param options - Server creation options
   * @param onProgress - Optional progress callback
   * @returns Server once ready
   */
  async createAndWait(
    options: CreateServerOptions,
    onProgress?: (action: HetznerAction) => void
  ): Promise<HetznerServer> {
    const response = await this.create(options);

    // Build wait options (only include onProgress if defined)
    const waitOptions = onProgress !== undefined ? { onProgress } : {};

    // Wait for the main create action to complete
    if (response.action.status === 'running') {
      await this.client.actions.waitFor(response.action.id, waitOptions);
    }

    // Wait for any next actions (e.g., start server)
    if (response.next_actions.length > 0) {
      for (const action of response.next_actions) {
        await this.client.actions.waitFor(action.id, waitOptions);
      }
    }

    // Return the server object
    const server = await this.get(response.server.id);
    return server;
  }

  /**
   * Delete a server
   *
   * @param id - Server ID
   * @returns Action for server deletion
   */
  async delete(id: number): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}`,
      { method: "DELETE" }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner delete server validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Delete a server and wait for completion
   *
   * @param id - Server ID
   * @param onProgress - Optional progress callback
   */
  async deleteAndWait(
    id: number,
    onProgress?: (action: HetznerAction) => void
  ): Promise<void> {
    const action = await this.delete(id);
    await this.client.actions.waitFor(action.id, { onProgress });
  }

  /**
   * Power on a server
   *
   * @param id - Server ID
   * @returns Action for server power on
   */
  async powerOn(id: number): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}/actions/poweron`,
      { method: "POST" }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner power on validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Power on a server and wait for completion
   *
   * @param id - Server ID
   * @param onProgress - Optional progress callback
   */
  async powerOnAndWait(
    id: number,
    onProgress?: (action: HetznerAction) => void
  ): Promise<HetznerAction> {
    const action = await this.powerOn(id);
    return await this.client.actions.waitFor(action.id, { onProgress });
  }

  /**
   * Power off a server
   *
   * @param id - Server ID
   * @returns Action for server power off
   */
  async powerOff(id: number): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}/actions/poweroff`,
      { method: "POST" }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner power off validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Power off a server and wait for completion
   *
   * @param id - Server ID
   * @param onProgress - Optional progress callback
   */
  async powerOffAndWait(
    id: number,
    onProgress?: (action: HetznerAction) => void
  ): Promise<HetznerAction> {
    const action = await this.powerOff(id);
    return await this.client.actions.waitFor(action.id, { onProgress });
  }

  /**
   * Reboot a server
   *
   * @param id - Server ID
   * @returns Action for server reboot
   */
  async reboot(id: number): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}/actions/reboot`,
      { method: "POST" }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner reboot validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Reboot a server and wait for completion
   *
   * @param id - Server ID
   * @param onProgress - Optional progress callback
   */
  async rebootAndWait(
    id: number,
    onProgress?: (action: HetznerAction) => void
  ): Promise<HetznerAction> {
    const action = await this.reboot(id);
    return await this.client.actions.waitFor(action.id, { onProgress });
  }

  /**
   * Shutdown a server gracefully
   *
   * @param id - Server ID
   * @returns Action for server shutdown
   */
  async shutdown(id: number): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}/actions/shutdown`,
      { method: "POST" }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner shutdown validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Shutdown a server and wait for completion
   *
   * @param id - Server ID
   * @param onProgress - Optional progress callback
   */
  async shutdownAndWait(
    id: number,
    onProgress?: (action: HetznerAction) => void
  ): Promise<HetznerAction> {
    const action = await this.shutdown(id);
    return await this.client.actions.waitFor(action.id, { onProgress });
  }

  /**
   * Reset a server
   *
   * @param id - Server ID
   * @returns Action for server reset
   */
  async reset(id: number): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}/actions/reset`,
      { method: "POST" }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner reset validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Reset a server and wait for completion
   *
   * @param id - Server ID
   * @param onProgress - Optional progress callback
   */
  async resetAndWait(
    id: number,
    onProgress?: (action: HetznerAction) => void
  ): Promise<HetznerAction> {
    const action = await this.reset(id);
    return await this.client.actions.waitFor(action.id, { onProgress });
  }

  /**
   * Rebuild a server from an image
   *
   * @param id - Server ID
   * @param image - Image ID or name
   * @returns Action for server rebuild
   */
  async rebuild(id: number, image: string): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}/actions/rebuild`,
      {
        method: "POST",
        body: JSON.stringify({ image }),
      }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner rebuild validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Enable rescue mode for a server
   *
   * @param id - Server ID
   * @param options - Rescue mode options
   * @returns Action for enabling rescue mode
   */
  async enableRescue(
    id: number,
    options?: { type?: string; ssh_keys?: number[] }
  ): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}/actions/enable_rescue`,
      {
        method: "POST",
        body: JSON.stringify(options || {}),
      }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner enable rescue validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Disable rescue mode for a server
   *
   * @param id - Server ID
   * @returns Action for disabling rescue mode
   */
  async disableRescue(id: number): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}/actions/disable_rescue`,
      { method: "POST" }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner disable rescue validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Change server type
   *
   * @param id - Server ID
   * @param serverType - New server type
   * @param upgradeDisk - Whether to upgrade disk (default: false)
   * @returns Action for changing server type
   */
  async changeType(
    id: number,
    serverType: string,
    upgradeDisk: boolean = false
  ): Promise<HetznerAction> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const response = await this.client.request<{ action: HetznerAction }>(
      `/servers/${validatedId.data}/actions/change_type`,
      {
        method: "POST",
        body: JSON.stringify({ server_type: serverType, upgrade_disk: upgradeDisk }),
      }
    );

    const validated = HetznerActionSchema.safeParse(response.action);
    if (!validated.success) {
      console.warn('Hetzner change type validation warning:', validated.error.issues);
      return response.action;
    }

    return validated.data as HetznerAction;
  }

  /**
   * Get actions for a specific server
   *
   * @param id - Server ID
   * @param options - Optional filters (status, sort, etc.)
   * @returns Array of server actions
   */
  async getActions(
    id: number,
    options?: { status?: "running" | "success" | "error"; sort?: string }
  ): Promise<HetznerAction[]> {
    // Validate ID with Zod
    const serverIdSchema = z.number().int().positive();
    const validatedId = serverIdSchema.safeParse(id);
    if (!validatedId.success) {
      throw new Error(`Invalid server ID: ${validatedId.error.issues.map(i => i.message).join(', ')}`);
    }

    const params = new URLSearchParams();
    if (options?.status) params.append("status", options.status);
    if (options?.sort) params.append("sort", options.sort);

    const query = params.toString();
    const response = await this.client.request<{ actions: HetznerAction[] }>(
      `/servers/${validatedId.data}/actions${query ? `?${query}` : ""}`
    );

    return response.actions;
  }
}
