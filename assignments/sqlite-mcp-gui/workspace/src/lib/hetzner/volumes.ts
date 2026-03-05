/**
 * Hetzner Volume Operations
 *
 * Provides methods for managing Hetzner Cloud volumes.
 * See: https://docs.hetzner.cloud/#volumes
 */

import type { HetznerClient } from "./client.js";
import type {
  HetznerVolume,
  CreateVolumeOptions,
} from "./types.js";
import {
  HetznerListVolumesResponseSchema,
  HetznerGetVolumeResponseSchema,
  HetznerCreateVolumeResponseSchema,
  HetznerActionResponseSchema,
} from "./schemas.js";

/**
 * Volume operations for Hetzner Cloud API
 */
export class VolumeOperations {
  constructor(private client: HetznerClient) {}

  /**
   * List all volumes
   *
   * @param options - List options (name, status, sort, etc.)
   * @returns Array of volumes
   */
  async list(options?: {
    name?: string;
    status?: string;
    sort?: string;
    label_selector?: string;
  }): Promise<HetznerVolume[]> {
    const params = new URLSearchParams();
    if (options?.name) params.set("name", options.name);
    if (options?.status) params.set("status", options.status);
    if (options?.sort) params.set("sort", options.sort);
    if (options?.label_selector) params.set("label_selector", options.label_selector);

    const endpoint = `/volumes${params.toString() ? `?${params}` : ""}`;
    const response = await this.client.request<typeof HetznerListVolumesResponseSchema._output>(
      endpoint,
    );

    return response.volumes || [];
  }

  /**
   * Get a specific volume by ID
   *
   * @param id - Volume ID
   * @returns Volume details
   */
  async get(id: number): Promise<HetznerVolume> {
    const response = await this.client.request<typeof HetznerGetVolumeResponseSchema._output>(
      `/volumes/${id}`,
    );
    return response.volume;
  }

  /**
   * Create a new volume
   *
   * @param options - Volume creation options
   * @returns Created volume with action info
   */
  async create(options: CreateVolumeOptions): Promise<{
    volume: HetznerVolume;
    action: any;
    next_actions: any[];
  }> {
    const response = await this.client.request<typeof HetznerCreateVolumeResponseSchema._output>(
      "/volumes",
      {
        method: "POST",
        body: JSON.stringify({
          name: options.name,
          size: options.size,
          server: options.server,
          location: options.location,
          automount: options.automount ?? true,
          format: options.format,
          labels: options.labels,
        }),
      },
    );
    return response;
  }

  /**
   * Delete a volume
   *
   * @param id - Volume ID
   * @returns Action response
   */
  async delete(id: number): Promise<any> {
    const response = await this.client.request<typeof HetznerActionResponseSchema._output>(
      `/volumes/${id}`,
      {
        method: "DELETE",
      },
    );
    return response.action;
  }

  /**
   * Attach a volume to a server
   *
   * @param volumeId - Volume ID
   * @param serverId - Server ID
   * @param automount - Automatically mount the volume
   * @returns Action response
   */
  async attach(
    volumeId: number,
    serverId: number,
    automount: boolean = true,
  ): Promise<any> {
    const response = await this.client.request<typeof HetznerActionResponseSchema._output>(
      `/volumes/${volumeId}/actions/attach`,
      {
        method: "POST",
        body: JSON.stringify({
          server: serverId,
          automount,
        }),
      },
    );
    return response.action;
  }

  /**
   * Detach a volume from a server
   *
   * @param volumeId - Volume ID
   * @returns Action response
   */
  async detach(volumeId: number): Promise<any> {
    const response = await this.client.request<typeof HetznerActionResponseSchema._output>(
      `/volumes/${volumeId}/actions/detach`,
      {
        method: "POST",
      },
    );
    return response.action;
  }

  /**
   * Resize a volume
   *
   * @param volumeId - Volume ID
   * @param size - New size in GB (must be larger than current)
   * @returns Action response
   */
  async resize(volumeId: number, size: number): Promise<any> {
    const response = await this.client.request<typeof HetznerActionResponseSchema._output>(
      `/volumes/${volumeId}/actions/resize`,
      {
        method: "POST",
        body: JSON.stringify({ size }),
      },
    );
    return response.action;
  }

  /**
   * Change volume protection
   *
   * @param volumeId - Volume ID
   * @param deleteProtection - Enable delete protection
   * @returns Action response
   */
  async changeProtection(volumeId: number, deleteProtection: boolean): Promise<any> {
    const response = await this.client.request<typeof HetznerActionResponseSchema._output>(
      `/volumes/${volumeId}/actions/change_protection`,
      {
        method: "POST",
        body: JSON.stringify({
          delete: deleteProtection,
        }),
      },
    );
    return response.action;
  }

  /**
   * Update volume labels
   *
   * @param volumeId - Volume ID
   * @param labels - New labels
   * @returns Updated volume
   */
  async updateLabels(volumeId: number, labels: Record<string, string>): Promise<HetznerVolume> {
    const response = await this.client.request<typeof HetznerGetVolumeResponseSchema._output>(
      `/volumes/${volumeId}`,
      {
        method: "PUT",
        body: JSON.stringify({ labels }),
      },
    );
    return response.volume;
  }

  /**
   * Get volume pricing information
   * Calculates monthly cost based on size (€0.008/GB per month)
   *
   * @param sizeInGB - Volume size in GB
   * @returns Monthly and hourly pricing
   */
  static calculatePrice(sizeInGB: number) {
    const PRICE_PER_GB_MONTHLY = 0.008; // €0.008 per GB per month
    const HOURS_PER_MONTH = 730; // Average

    const monthly = sizeInGB * PRICE_PER_GB_MONTHLY;
    const hourly = monthly / HOURS_PER_MONTH;

    return {
      size: sizeInGB,
      monthly: Math.round(monthly * 100) / 100,
      hourly: Math.round(hourly * 10000) / 10000,
      currency: "EUR",
    };
  }
}
