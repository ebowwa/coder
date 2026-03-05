/**
 * Hetzner resource routes
 * Handles Hetzner Cloud resources like server types, locations, and SSH keys
 */

import { Hono } from "hono";
import type { Hono as HonoType } from "hono";
import {
  SSHKeyIdSchema,
  CreateSSHKeyRequestSchema,
} from "@ebowwa/codespaces-types/runtime/api";
import type { HetznerClient } from "../lib/hetzner";
import { validateRequest } from "./utils";

/**
 * Register all Hetzner resource-related routes
 */
export function registerHetznerRoutes(
  app: HonoType,
  hetznerClient: HetznerClient | null,
): void {
  /**
   * GET /api/server-types - List all available server types
   */
  app.get("/api/server-types", async (c) => {
    if (!hetznerClient) {
      return c.json({ success: true, serverTypes: [] });
    }

    try {
      const serverTypes = await hetznerClient.pricing.listServerTypes();
      return c.json({ success: true, serverTypes });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/locations - List all available locations
   */
  app.get("/api/locations", async (c) => {
    if (!hetznerClient) {
      return c.json({ success: true, locations: [] });
    }

    try {
      const locations = await hetznerClient.pricing.listLocations();
      return c.json({ success: true, locations });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/ssh-keys - List all SSH keys
   */
  app.get("/api/ssh-keys", async (c) => {
    if (!hetznerClient) {
      return c.json({ success: true, sshKeys: [] });
    }

    try {
      const sshKeys = await hetznerClient.ssh_keys.list();
      return c.json({ success: true, sshKeys });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/ssh-keys/:id - Get a specific SSH key
   */
  app.get("/api/ssh-keys/:id", async (c) => {
    const validation = validateRequest(SSHKeyIdSchema, c.req.param("id"));

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const id = validation.data;

    if (!hetznerClient) {
      return c.json(
        { success: false, error: "Hetzner client not available" },
        500,
      );
    }

    try {
      const sshKey = await hetznerClient.ssh_keys.get(id);
      return c.json({ success: true, sshKey });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/ssh-keys - Create a new SSH key
   */
  app.post("/api/ssh-keys", async (c) => {
    const body = await c.req.json();
    const validation = validateRequest(CreateSSHKeyRequestSchema, body);

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    if (!hetznerClient) {
      return c.json(
        { success: false, error: "Hetzner client not available" },
        500,
      );
    }

    try {
      const sshKey = await hetznerClient.ssh_keys.create(validation.data);
      return c.json({ success: true, sshKey });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * DELETE /api/ssh-keys/:id - Delete an SSH key
   */
  app.delete("/api/ssh-keys/:id", async (c) => {
    const validation = validateRequest(SSHKeyIdSchema, c.req.param("id"));

    if (!validation.success) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    const id = validation.data;

    if (!hetznerClient) {
      return c.json(
        { success: false, error: "Hetzner client not available" },
        500,
      );
    }

    try {
      await hetznerClient.ssh_keys.delete(id);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
