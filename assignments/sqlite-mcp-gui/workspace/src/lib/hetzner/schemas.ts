/**
 * Hetzner Cloud API Zod validation schemas
 *
 * These schemas provide runtime validation for API responses
 * and help ensure type safety throughout the application.
 */

import { z } from "zod";

// Import status enums to use in schema validation
import {
  EnvironmentStatus,
  ActionStatus,
  VolumeStatus,
} from "../../../../../packages/src/types";

// ============================================================================
// Helper Validators
// ============================================================================

/**
 * IPv4 address validator
 */
const ipv4Regex =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * IPv6 address validator
 * Hetzner returns IPv6 in CIDR notation which can vary in format
 * Using a more lenient pattern since exact format varies
 */
const ipv6Regex = /^[0-9a-fA-F:]+(?:\/\d{1,3})?$/;

/**
 * IP address validator (IPv4 or IPv6)
 */
const ipRegex =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Hetzner API error response schema
 */
export const HetznerErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

/**
 * Pagination metadata schema
 */
export const HetznerPaginationSchema = z.object({
  page: z.number(),
  per_page: z.number(),
  previous_page: z.number().nullable(),
  next_page: z.number().nullable(),
  last_page: z.number(),
  total_entries: z.number(),
});

/**
 * Metadata wrapper schema
 */
export const HetznerMetaSchema = z.object({
  pagination: HetznerPaginationSchema.optional(),
});

// ============================================================================
// Action Schemas
// ============================================================================

/**
 * Action resource schema
 */
export const HetznerActionResourceSchema = z.object({
  id: z.number(),
  type: z.enum([
    "server",
    "volume",
    "network",
    "floating_ip",
    "load_balancer",
    "certificate",
    "firewall",
    "image",
  ]),
});

/**
 * Action error schema
 */
export const HetznerActionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

/**
 * Base action schema
 */
export const HetznerActionSchema = z.object({
  id: z.number(),
  command: z.string(), // API returns string, not ActionCommand enum
  status: z.nativeEnum(ActionStatus),
  started: z.string(),
  finished: z.string().nullable(),
  progress: z.number().min(0).max(100),
  resources: z.array(HetznerActionResourceSchema),
  error: HetznerActionErrorSchema.nullable(),
});

/**
 * Action response schema
 */
export const HetznerActionResponseSchema = z.object({
  action: HetznerActionSchema,
});

/**
 * Actions list response schema
 */
export const HetznerActionsResponseSchema = z.object({
  actions: z.array(HetznerActionSchema),
  meta: HetznerMetaSchema,
});

// ============================================================================
// Server Schemas
// ============================================================================

/**
 * Server image schema
 */
export const HetznerServerImageSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["snapshot", "backup", "system"]),
});

/**
 * Server IPv4 schema
 */
export const HetznerIPv4Schema = z.object({
  ip: z.string().regex(ipv4Regex),
  blocked: z.boolean(),
});

/**
 * Server IPv6 schema
 */
export const HetznerIPv6Schema = z.object({
  ip: z.string().regex(ipv6Regex),
  blocked: z.boolean(),
});

/**
 * Server floating IP reference schema
 */
export const HetznerFloatingIpRefSchema = z.object({
  id: z.number(),
  ip: z.string(),
});

/**
 * Server firewall reference schema
 */
export const HetznerFirewallRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(["applied", "pending"]),
});

/**
 * Server public network schema
 */
export const HetznerPublicNetSchema = z.object({
  ipv4: HetznerIPv4Schema,
  ipv6: HetznerIPv6Schema.optional(),
  floating_ips: z.array(HetznerFloatingIpRefSchema),
  firewalls: z.array(HetznerFirewallRefSchema),
});

/**
 * Server type schema
 */
export const HetznerServerTypeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  cores: z.number(),
  memory: z.number(),
  disk: z.number(),
});

/**
 * Location schema
 */
export const HetznerLocationSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  country: z.string(),
  city: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  network_zone: z.string(),
});

/**
 * Datacenter schema
 */
export const HetznerDatacenterSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  location: HetznerLocationSchema,
  // Hetzner API sometimes doesn't return this field
  supported_server_types: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    )
    .optional()
    .nullable(),
});

/**
 * Server volume reference schema
 */
export const HetznerVolumeRefSchema = z.object({
  id: z.number(),
  name: z.string(),
  size: z.number().positive(),
  linux_device: z.string(),
});

/**
 * Server protection schema
 */
export const HetznerServerProtectionSchema = z.object({
  delete: z.boolean(),
  rebuild: z.boolean(),
});

/**
 * Full server schema
 */
export const HetznerServerSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1),
  status: z.nativeEnum(EnvironmentStatus),
  image: HetznerServerImageSchema.nullable().optional(),
  public_net: HetznerPublicNetSchema,
  server_type: HetznerServerTypeSchema,
  datacenter: HetznerDatacenterSchema,
  labels: z.record(z.string(), z.any()),
  created: z.string().datetime(),
  protection: HetznerServerProtectionSchema,
  volumes: z.array(HetznerVolumeRefSchema),
});

/**
 * List servers response schema
 */
export const HetznerListServersResponseSchema = z.object({
  servers: z.array(HetznerServerSchema),
  meta: HetznerMetaSchema,
});

/**
 * Get server response schema
 */
export const HetznerGetServerResponseSchema = z.object({
  server: HetznerServerSchema,
});

/**
 * Create server request options schema
 */
export const HetznerCreateServerRequestSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(
        /^[a-zA-Z0-9][a-zA-Z0-9-]*$/,
        "Name must start with letter/number and contain only letters, numbers, and hyphens",
      ),
    server_type: z.string().min(1),
    image: z.string().min(1),
    location: z.string().min(1).optional(),
    datacenter: z.string().min(1).optional(),
    ssh_keys: z.array(z.union([z.string(), z.number()])).optional(),
    volumes: z.array(z.number().positive()).optional(),
    labels: z.record(z.string(), z.any()).optional(),
    start_after_create: z.boolean().optional(),
  })
  .refine(
    (data) => !(data.location && data.datacenter),
    "Cannot specify both location and datacenter",
  );

/**
 * Create server response schema
 */
export const HetznerCreateServerResponseSchema = z.object({
  server: HetznerServerSchema,
  action: HetznerActionSchema,
  next_actions: z.array(HetznerActionSchema),
  root_password: z.string().nullable(),
});

/**
 * Update server request schema
 */
export const HetznerUpdateServerRequestSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  labels: z.record(z.string(), z.any()).optional(),
});

/**
 * Update server response schema
 */
export const HetznerUpdateServerResponseSchema = z.object({
  server: HetznerServerSchema,
});

// ============================================================================
// Volume Schemas
// ============================================================================

/**
 * Volume location schema
 */
export const HetznerVolumeLocationSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  country: z.string(),
  city: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

/**
 * Volume protection schema
 */
export const HetznerVolumeProtectionSchema = z.object({
  delete: z.boolean(),
});

/**
 * Volume schema
 */
export const HetznerVolumeSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1),
  status: z.nativeEnum(VolumeStatus),
  server: z.number().positive().nullable(),
  size: z.number().positive(),
  linux_device: z.string().nullable(),
  format: z.string().nullable(),
  location: HetznerVolumeLocationSchema.nullable(),
  labels: z.record(z.string(), z.any()),
  created: z.string().datetime(),
  protection: HetznerVolumeProtectionSchema,
});

/**
 * List volumes response schema
 */
export const HetznerListVolumesResponseSchema = z.object({
  volumes: z.array(HetznerVolumeSchema),
  meta: HetznerMetaSchema,
});

/**
 * Get volume response schema
 */
export const HetznerGetVolumeResponseSchema = z.object({
  volume: HetznerVolumeSchema,
});

/**
 * Create volume request schema
 */
export const HetznerCreateVolumeRequestSchema = z
  .object({
    name: z.string().min(1).max(64),
    size: z.number().positive().multipleOf(1), // GB
    server: z.number().positive().optional(),
    location: z.string().min(1).optional(),
    automount: z.boolean().optional(),
    format: z.string().optional(),
    labels: z.record(z.string(), z.any()).optional(),
  })
  .refine((data) => {
    // Ensure size is a multiple of GB (1, 2, 3, etc.)
    return Number.isInteger(data.size);
  }, "Volume size must be a whole number in GB");

/**
 * Create volume response schema
 */
export const HetznerCreateVolumeResponseSchema = z.object({
  volume: HetznerVolumeSchema,
  action: HetznerActionSchema,
  next_actions: z.array(HetznerActionSchema),
});

// ============================================================================
// Network Schemas
// ============================================================================

/**
 * Network subnet schema
 */
export const HetznerSubnetSchema = z.object({
  type: z.enum(["server", "cloud", "vswitch"]),
  ip_range: z.string().regex(ipRegex),
  network_zone: z.string(),
  gateway: z.string().regex(ipRegex),
});

/**
 * Network route schema
 */
export const HetznerRouteSchema = z.object({
  destination: z.string().regex(ipRegex),
  gateway: z.string().regex(ipRegex),
});

/**
 * Network protection schema
 */
export const HetznerNetworkProtectionSchema = z.object({
  delete: z.boolean(),
});

/**
 * Network schema
 */
export const HetznerNetworkSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(64),
  ip_range: z.string().regex(ipRegex),
  subnets: z.array(HetznerSubnetSchema),
  routes: z.array(HetznerRouteSchema),
  servers: z.array(z.number().positive()),
  protection: HetznerNetworkProtectionSchema,
  labels: z.record(z.string(), z.any()),
  created: z.string().datetime(),
});

/**
 * List networks response schema
 */
export const HetznerListNetworksResponseSchema = z.object({
  networks: z.array(HetznerNetworkSchema),
  meta: HetznerMetaSchema,
});

/**
 * Get network response schema
 */
export const HetznerGetNetworkResponseSchema = z.object({
  network: HetznerNetworkSchema,
});

// ============================================================================
// SSH Key Schemas
// ============================================================================

/**
 * SSH key schema
 */
export const HetznerSSHKeySchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(64),
  fingerprint: z.string(),
  public_key: z.string(),
  labels: z.record(z.string(), z.any()),
  created: z.string().datetime(),
});

/**
 * List SSH keys response schema
 */
export const HetznerListSSHKeysResponseSchema = z.object({
  ssh_keys: z.array(HetznerSSHKeySchema),
  meta: HetznerMetaSchema,
});

/**
 * Get SSH key response schema
 */
export const HetznerGetSSHKeyResponseSchema = z.object({
  ssh_key: HetznerSSHKeySchema,
});

/**
 * Create SSH key request schema
 */
export const HetznerCreateSSHKeyRequestSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]*$/,
      "Name must start with letter/number and contain only letters, numbers, and hyphens",
    ),
  public_key: z.string().min(1),
  labels: z.record(z.string(), z.any()).optional(),
});

/**
 * Create SSH key response schema
 */
export const HetznerCreateSSHKeyResponseSchema = z.object({
  ssh_key: HetznerSSHKeySchema,
});

// ============================================================================
// Floating IP Schemas
// ============================================================================

/**
 * Floating IP schema
 */
export const HetznerFloatingIpSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(64),
  description: z.string().optional(),
  type: z.enum(["ipv4", "ipv6"]),
  ip: z.string().regex(ipRegex),
  server: z.number().positive().nullable(),
  dns_ptr: z.array(
    z.object({
      ip: z.string(),
      dns_ptr: z.string(),
    }),
  ),
  home_location: HetznerLocationSchema,
  blocked: z.boolean(),
  protection: z.object({
    delete: z.boolean(),
  }),
  labels: z.record(z.string(), z.any()),
  created: z.string().datetime(),
});

/**
 * List floating IPs response schema
 */
export const HetznerListFloatingIpsResponseSchema = z.object({
  floating_ips: z.array(HetznerFloatingIpSchema),
  meta: HetznerMetaSchema,
});

// ============================================================================
// Firewall Schemas
// ============================================================================

/**
 * Firewall rule schema
 */
export const HetznerFirewallRuleSchema = z.object({
  direction: z.enum(["in", "out"]),
  source_ips: z.array(z.string().regex(ipRegex)).optional(),
  destination_ips: z.array(z.string().regex(ipRegex)).optional(),
  source_port: z.string().optional(),
  destination_port: z.string().optional(),
  protocol: z.enum(["tcp", "udp", "icmp", "esp", "gre"]),
});

/**
 * Firewall resource schema
 */
export const HetznerFirewallResourceSchema = z.object({
  type: z.enum(["server", "label_selector"]),
  server: z
    .object({
      id: z.number().positive(),
    })
    .optional(),
  label_selector: z
    .object({
      selector: z.string(),
    })
    .optional(),
});

/**
 * Firewall schema
 */
export const HetznerFirewallSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(64),
  rules: z.array(HetznerFirewallRuleSchema),
  apply_to: z.array(HetznerFirewallResourceSchema),
  labels: z.record(z.string(), z.any()),
  created: z.string().datetime(),
});

/**
 * List firewalls response schema
 */
export const HetznerListFirewallsResponseSchema = z.object({
  firewalls: z.array(HetznerFirewallSchema),
  meta: HetznerMetaSchema,
});

// ============================================================================
// ISO Schemas
// ============================================================================

/**
 * ISO schema
 */
export const HetznerIsoSchema = z.object({
  id: z.number().positive(),
  name: z.string(),
  description: z.string(),
  type: z.enum(["public", "private"]),
  deprecated: z.date().nullable().optional(),
  architecture: z.array(z.enum(["x86", "arm"])).optional(),
});

/**
 * List ISOs response schema
 */
export const HetznerListIsosResponseSchema = z.object({
  isos: z.array(HetznerIsoSchema),
  meta: HetznerMetaSchema,
});

// ============================================================================
// Location Schemas
// ============================================================================

/**
 * List locations response schema
 */
export const HetznerListLocationsResponseSchema = z.object({
  locations: z.array(HetznerLocationSchema),
});

// ============================================================================
// Datacenter Schemas
// ============================================================================

/**
 * List datacenters response schema
 */
export const HetznerListDatacentersResponseSchema = z.object({
  datacenters: z.array(HetznerDatacenterSchema),
});

// ============================================================================
// Server Type Schemas
// ============================================================================

/**
 * Server type pricing schema
 *
 * Note: location can be null in some Hetzner API responses
 */
export const HetznerServerTypePricingSchema = z.object({
  location: z.string().nullable(),
  price_hourly: z.object({
    net: z.string(),
    gross: z.string(),
  }),
  price_monthly: z.object({
    net: z.string(),
    gross: z.string(),
  }),
});

/**
 * Extended server type schema (for listing)
 */
export const HetznerServerTypeExtendedSchema = HetznerServerTypeSchema.extend({
  deprecated: z.boolean().optional(),
  prices: z.array(HetznerServerTypePricingSchema),
  storage_type: z.enum(["local", "network"]),
  cpu_type: z.enum(["shared", "dedicated"]),
});

/**
 * List server types response schema
 */
export const HetznerListServerTypesResponseSchema = z.object({
  server_types: z.array(HetznerServerTypeExtendedSchema),
});

// ============================================================================
// Certificate Schemas
// ============================================================================

/**
 * Certificate schema
 */
export const HetznerCertificateSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(64),
  labels: z.record(z.string(), z.any()),
  certificate: z.string(),
  not_valid_before: z.string().datetime(),
  not_valid_after: z.string().datetime(),
  domain_names: z.array(z.string().url()),
  fingerprint: z.string(),
  created: z.string().datetime(),
  status: z.enum(["pending", "issued", "failed", "revoked"]) as z.ZodType<["pending", "issued", "failed", "revoked"]>,
  failed: z.boolean().optional(),
  type: z.enum(["uploaded", "managed"]),
  usage: z
    .array(z.enum(["dual_stack", "server", "load_balancer", "dns"]))
    .optional(),
});

/**
 * List certificates response schema
 */
export const HetznerListCertificatesResponseSchema = z.object({
  certificates: z.array(HetznerCertificateSchema),
  meta: HetznerMetaSchema,
});

// ============================================================================
// Generic Response Wrappers
// ============================================================================

/**
 * Generic paginated response schema
 */
export function createPaginatedResponseSchema<T extends z.ZodType>(
  itemSchema: T,
  itemName: string,
) {
  return z.object({
    [itemName]: z.array(itemSchema),
    meta: HetznerMetaSchema,
  });
}

/**
 * Generic single item response schema
 */
export function createItemResponseSchema<T extends z.ZodType>(
  itemSchema: T,
  itemName: string,
) {
  return z.object({
    [itemName]: itemSchema,
  });
}
