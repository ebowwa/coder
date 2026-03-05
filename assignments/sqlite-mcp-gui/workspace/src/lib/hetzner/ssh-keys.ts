/**
 * Hetzner SSH key operations
 */

import { z } from "zod";
import type {
  HetznerSSHKey,
  CreateSSHKeyOptions,
} from "./types.js";
import type { HetznerClient } from "./client.js";
import {
  HetznerListSSHKeysResponseSchema,
  HetznerGetSSHKeyResponseSchema,
  HetznerCreateSSHKeyRequestSchema,
  HetznerCreateSSHKeyResponseSchema,
} from "./schemas.js";

export class SSHKeyOperations {
  constructor(private client: HetznerClient) {}

  /**
   * List all SSH keys
   */
  async list(): Promise<HetznerSSHKey[]> {
    const response = await this.client.request<{ ssh_keys: HetznerSSHKey[] }>(
      "/ssh_keys",
    );

    // Validate response with Zod
    const validated = HetznerListSSHKeysResponseSchema.safeParse(response);
    if (!validated.success) {
      console.warn('Hetzner list SSH keys validation warning:', validated.error.issues);
      return response.ssh_keys; // Return unvalidated data for backward compatibility
    }

    return validated.data.ssh_keys;
  }

  /**
   * Get a specific SSH key by ID or name
   */
  async get(idOrName: number | string): Promise<HetznerSSHKey> {
    const endpoint = typeof idOrName === 'number'
      ? `/ssh_keys/${idOrName}`
      : `/ssh_keys?name=${encodeURIComponent(idOrName)}`;

    const response = await this.client.request<{ ssh_key: HetznerSSHKey }>(
      endpoint,
    );

    // Validate response with Zod
    const validated = HetznerGetSSHKeyResponseSchema.safeParse(response);
    if (!validated.success) {
      console.warn('Hetzner get SSH key validation warning:', validated.error.issues);
      return response.ssh_key; // Return unvalidated data for backward compatibility
    }

    return validated.data.ssh_key;
  }

  /**
   * Create a new SSH key
   *
   * @param options - SSH key creation options
   * @returns Created SSH key
   */
  async create(options: CreateSSHKeyOptions): Promise<HetznerSSHKey> {
    // Validate input with Zod
    const validatedOptions = HetznerCreateSSHKeyRequestSchema.safeParse(options);
    if (!validatedOptions.success) {
      throw new Error(`Invalid SSH key options: ${validatedOptions.error.issues.map(i => i.message).join(', ')}`);
    }

    const body = {
      name: validatedOptions.data.name,
      public_key: validatedOptions.data.public_key,
      ...(validatedOptions.data.labels && { labels: validatedOptions.data.labels }),
    };

    const response = await this.client.request<{ ssh_key: HetznerSSHKey }>(
      "/ssh_keys",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    // Validate response with Zod
    const validated = HetznerCreateSSHKeyResponseSchema.safeParse(response);
    if (!validated.success) {
      console.warn('Hetzner create SSH key validation warning:', validated.error.issues);
      return response.ssh_key; // Return unvalidated data for backward compatibility
    }

    return validated.data.ssh_key;
  }

  /**
   * Delete an SSH key
   *
   * @param id - SSH key ID
   */
  async delete(id: number): Promise<void> {
    await this.client.request(
      `/ssh_keys/${id}`,
      { method: "DELETE" }
    );
  }

  /**
   * Find an SSH key by name
   * Returns undefined if not found
   */
  async findByName(name: string): Promise<HetznerSSHKey | undefined> {
    try {
      const keys = await this.list();
      return keys.find(key => key.name === name);
    } catch {
      return undefined;
    }
  }
}
