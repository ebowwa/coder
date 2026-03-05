/**
 * Hetzner Cloud API types
 */

// ============================================================================
// Import shared status enums
// ============================================================================

import {
  EnvironmentStatus,
  ActionStatus,
  VolumeStatus,
} from "../../../../../packages/src/types";

// Re-export for convenience
export { EnvironmentStatus, ActionStatus, VolumeStatus };

// ============================================================================
// Server Types
// ============================================================================

export interface HetznerServer {
  id: number;
  name: string;
  status: EnvironmentStatus;
  image?: {
    id: number;
    name: string;
    description: string;
    type: "snapshot" | "backup" | "system";
  } | null;
  public_net: {
    ipv4: {
      ip: string;
      blocked: boolean;
    };
    ipv6?: {
      ip: string;
      blocked: boolean;
    };
    floating_ips: Array<{
      id: number;
      ip: string;
    }>;
    firewalls: Array<{
      id: number;
      name: string;
      status: "applied" | "pending";
    }>;
  };
  server_type: {
    id: number;
    name: string;
    description: string;
    cores: number;
    memory: number;
    disk: number;
  };
  datacenter: {
    id: number;
    name: string;
    description: string;
    location: {
      id: number;
      name: string;
      description: string;
      country: string;
      city: string;
      latitude: number;
      longitude: number;
      network_zone: string;
    };
    supported_server_types?: Array<{
      id: number;
      name: string;
    }> | null;
  };
  labels: Record<string, string>;
  created: string;
  protection: {
    delete: boolean;
    rebuild: boolean;
  };
  volumes: Array<{
    id: number;
    name: string;
    size: number;
    linux_device: string;
  }>;
}

export interface CreateServerOptions {
  name: string;
  server_type?: string;
  image?: string;
  location?: string;
  datacenter?: string;
  ssh_keys?: Array<string | number>;
  volumes?: number[];
  labels?: Record<string, string>;
  start_after_create?: boolean;
  /** Cloud-init user data script for first-boot provisioning */
  user_data?: string;
}

export interface UpdateServerOptions {
  name?: string;
  labels?: Record<string, string>;
}

// ============================================================================
// Action Types
// ============================================================================

/**
 * Action command types from Hetzner Cloud API
 */
export enum ActionCommand {
  // Server actions
  CreateServer = "create_server",
  DeleteServer = "delete_server",
  StartServer = "start_server",
  StopServer = "stop_server",
  RebootServer = "reboot_server",
  ResetServer = "reset_server",
  ShutdownServer = "shutdown_server",
  Poweroff = "poweroff",
  ChangeServerType = "change_server_type",
  RebuildServer = "rebuild_server",
  EnableBackup = "enable_backup",
  DisableBackup = "disable_backup",
  CreateImage = "create_image",
  ChangeDnsPtr = "change_dns_ptr",
  AttachToNetwork = "attach_to_network",
  DetachFromNetwork = "detach_from_network",
  ChangeAliasIps = "change_alias_ips",
  EnableRescue = "enable_rescue",
  DisableRescue = "disable_rescue",
  ChangeProtection = "change_protection",

  // Volume actions
  CreateVolume = "create_volume",
  DeleteVolume = "delete_volume",
  AttachVolume = "attach_volume",
  DetachVolume = "detach_volume",
  ResizeVolume = "resize_volume",
  VolumeChangeProtection = "volume_change_protection",

  // Network actions
  AddSubnet = "add_subnet",
  DeleteSubnet = "delete_subnet",
  AddRoute = "add_route",
  DeleteRoute = "delete_route",
  ChangeIpRange = "change_ip_range",
  NetworkChangeProtection = "network_change_protection",

  // Floating IP actions
  AssignFloatingIp = "assign_floating_ip",
  UnassignFloatingIp = "unassign_floating_ip",
  FloatingIpChangeDnsPtr = "floating_ip_change_dns_ptr",
  FloatingIpChangeProtection = "floating_ip_change_protection",

  // Load Balancer actions
  CreateLoadBalancer = "create_load_balancer",
  DeleteLoadBalancer = "delete_load_balancer",
  AddTarget = "add_target",
  RemoveTarget = "remove_target",
  AddService = "add_service",
  UpdateService = "update_service",
  DeleteService = "delete_service",
  LoadBalancerAttachToNetwork = "load_balancer_attach_to_network",
  LoadBalancerDetachFromNetwork = "load_balancer_detach_from_network",
  ChangeAlgorithm = "change_algorithm",
  ChangeType = "change_type",
  LoadBalancerChangeProtection = "load_balancer_change_protection",

  // Certificate actions
  IssueCertificate = "issue_certificate",
  RetryCertificate = "retry_certificate",

  // Firewall actions
  SetFirewallRules = "set_firewall_rules",
  ApplyFirewall = "apply_firewall",
  RemoveFirewall = "remove_firewall",
  FirewallChangeProtection = "firewall_change_protection",

  // Image actions
  ImageChangeProtection = "image_change_protection",
}

/**
 * Resource types that can be affected by actions
 */
export enum ResourceType {
  Server = "server",
  Volume = "volume",
  Network = "network",
  FloatingIp = "floating_ip",
  LoadBalancer = "load_balancer",
  Certificate = "certificate",
  Firewall = "firewall",
  Image = "image",
}

/**
 * Action resource reference
 */
export interface ActionResource {
  id: number;
  type: ResourceType;
}

/**
 * Action error details
 */
export interface ActionError {
  code: string;
  message: string;
}

/**
 * Base Hetzner Action type matching the API response
 *
 * The API returns actions with:
 * - status: "running" | "success" | "error"
 * - finished: string | null (null when running)
 * - error: ActionError | null (null when not error)
 *
 * Note: Zod validation makes finished and error optional, but the API
 * typically returns them. Use type guards for runtime checks.
 */
export interface HetznerAction {
  id: number;
  command: ActionCommand | string; // API returns string
  status: ActionStatus;
  started: string;
  finished?: string | null;
  progress: number;
  resources: ActionResource[];
  error?: ActionError | null;
}

/**
 * Server action response (includes server reference)
 */
export interface ServerActionResponse {
  action: HetznerAction;
  server?: HetznerServer;
}

/**
 * Create server response with actions
 */
export interface CreateServerResponse {
  server: HetznerServer;
  action: HetznerAction;
  next_actions: HetznerAction[];
  root_password: string | null;
}

// ============================================================================
// Volume Types
// ============================================================================

export interface HetznerVolume {
  id: number;
  name: string;
  status: VolumeStatus;
  server: number | null;
  size: number;
  linux_device: string | null;
  format: string | null;
  location: {
    id: number;
    name: string;
    description: string;
    country: string;
    city: string;
    latitude: number;
    longitude: number;
  } | null;
  labels: Record<string, string>;
  created: string;
  protection: {
    delete: boolean;
  };
}

export interface CreateVolumeOptions {
  name: string;
  size: number;
  server?: number;
  location?: string;
  format?: string;
  automount?: boolean;
  labels?: Record<string, string>;
}

// ============================================================================
// Network Types
// ============================================================================

export interface HetznerNetwork {
  id: number;
  name: string;
  ip_range: string;
  subnets: Array<{
    type: "server" | "cloud" | "vswitch";
    ip_range: string;
    network_zone: string;
    gateway: string;
  }>;
  routes: Array<{
    destination: string;
    gateway: string;
  }>;
  servers: number[];
  protection: {
    delete: boolean;
  };
  labels: Record<string, string>;
  created: string;
}

// ============================================================================
// SSH Key Types
// ============================================================================

export interface HetznerSSHKey {
  id: number;
  name: string;
  fingerprint: string;
  public_key: string;
  labels: Record<string, string>;
  created: string;
}

export interface CreateSSHKeyOptions {
  name: string;
  public_key: string;
  labels?: Record<string, string>;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

export interface RateLimitHeaders {
  "RateLimit-Limit": string;
  "RateLimit-Remaining": string;
  "RateLimit-Reset": string;
}

// ============================================================================
// Polling Options
// ============================================================================

export interface ActionPollingOptions {
  /** Polling interval in milliseconds (default: 2000) */
  pollInterval?: number;
  /** Maximum number of polling attempts (default: 60) */
  maxRetries?: number;
  /** Optional callback for progress updates */
  onProgress?: (action: HetznerAction) => void;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

// ============================================================================
// Import shared Hetzner types for local use
// ============================================================================

import type {
  HetznerServerType,
  HetznerLocation,
  HetznerDatacenter,
} from "../../../../../packages/src/types";

// ============================================================================
// Re-export shared Hetzner types
// ============================================================================

export type { HetznerServerType, HetznerLocation, HetznerDatacenter };
