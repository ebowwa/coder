/**
 * Hetzner pricing operations - fetch server types, locations, and calculate costs
 */

import { z } from "zod";
import type {
  HetznerServerType,
  HetznerLocation,
  HetznerDatacenter,
} from "./types.js";
import type { HetznerClient } from "./client.js";
import type { Environment } from "../../../../../packages/src/types";
import {
  HetznerListServerTypesResponseSchema,
  HetznerListLocationsResponseSchema,
  HetznerListDatacentersResponseSchema,
} from "./schemas.js";

// ============================================================================
// Cost Calculation Types
// ============================================================================

/**
 * Price information for a server type (in EUR)
 */
export interface ServerTypePrice {
  /** Server type name (e.g., "cpx11") */
  serverType: string;
  /** Monthly price in EUR */
  priceMonthly: number;
  /** Hourly price in EUR */
  priceHourly: number;
  /** Whether the server type is deprecated */
  deprecated: boolean;
}

/**
 * Cost breakdown for a single environment
 */
export interface EnvironmentCost {
  /** Environment ID */
  environmentId: string;
  /** Environment name */
  environmentName: string;
  /** Server type name */
  serverType: string;
  /** Whether the environment is currently running */
  isRunning: boolean;
  /** Monthly cost in EUR */
  costMonthly: number;
  /** Hourly cost in EUR */
  costHourly: number;
  /** Price info (undefined if server type not found) */
  priceInfo?: ServerTypePrice;
}

/**
 * Total cost calculation result
 */
export interface CostCalculationResult {
  /** Total monthly cost for all running environments (EUR) */
  totalMonthly: number;
  /** Total hourly cost for all running environments (EUR) */
  totalHourly: number;
  /** Number of environments included in calculation */
  runningEnvironmentCount: number;
  /** Number of environments excluded (not running) */
  stoppedEnvironmentCount: number;
  /** Number of environments with unknown server types */
  unknownServerTypeCount: number;
  /** Detailed breakdown by environment */
  breakdown: EnvironmentCost[];
  /** Map of server type names to their prices (for reference) */
  priceMap: Map<string, ServerTypePrice>;
}

/**
 * Default fallback price for unknown server types (EUR/month)
 * Conservative estimate based on Hetzner's smallest standard server
 */
const DEFAULT_FALLBACK_PRICE_MONTHLY = 5.0;

/**
 * Hours per month for hourly cost calculation
 * Using 730 hours (average month: 365.25 days * 24 hours / 12 months)
 */
const HOURS_PER_MONTH = 730;

// ============================================================================
// Zod Schemas for Cost Calculation
// ============================================================================

/**
 * Schema for server type price entry
 */
export const ServerTypePriceSchema = z.object({
  serverType: z.string(),
  priceMonthly: z.number().nonnegative(),
  priceHourly: z.number().nonnegative(),
  deprecated: z.boolean().optional().default(false),
});

/**
 * Schema for environment cost entry
 */
export const EnvironmentCostSchema = z.object({
  environmentId: z.string(),
  environmentName: z.string(),
  serverType: z.string(),
  isRunning: z.boolean(),
  costMonthly: z.number().nonnegative(),
  costHourly: z.number().nonnegative(),
  priceInfo: ServerTypePriceSchema.optional(),
});

/**
 * Schema for cost calculation result
 */
export const CostCalculationResultSchema = z.object({
  totalMonthly: z.number().nonnegative(),
  totalHourly: z.number().nonnegative(),
  runningEnvironmentCount: z.number().nonnegative().int(),
  stoppedEnvironmentCount: z.number().nonnegative().int(),
  unknownServerTypeCount: z.number().nonnegative().int(),
  breakdown: z.array(EnvironmentCostSchema),
  priceMap: z.custom<Map<string, ServerTypePrice>>(),
});

// ============================================================================
// Cost Calculation Utilities
// ============================================================================

/**
 * Parse Hetzner price string to number (EUR)
 * Hetzner returns prices as strings in gross format (e.g., "5.3400" for 5.34 EUR)
 *
 * @param priceString - Price string from Hetzner API (gross field)
 * @returns Price in EUR as number
 */
export function parseHetznerPrice(priceString: string): number {
  const parsed = parseFloat(priceString);
  if (isNaN(parsed)) {
    console.warn(`Failed to parse Hetzner price string: ${priceString}`);
    return 0;
  }
  return parsed;
}

/**
 * Extract pricing information from a Hetzner server type
 * Uses the first price entry (location-agnostic pricing)
 *
 * @param serverType - Hetzner server type object
 * @returns Server type price info or undefined if pricing unavailable
 */
export function extractServerTypePrice(
  serverType: HetznerServerType,
): ServerTypePrice | undefined {
  if (!serverType.prices || serverType.prices.length === 0) {
    console.warn(`Server type ${serverType.name} has no pricing information`);
    return undefined;
  }

  // Use first price entry (Hetzner API returns location-agnostic pricing first)
  const priceEntry = serverType.prices[0];

  const priceMonthly = parseHetznerPrice(priceEntry.price_monthly.gross);
  const priceHourly = parseHetznerPrice(priceEntry.price_hourly.gross);

  return {
    serverType: serverType.name,
    priceMonthly,
    priceHourly,
    deprecated: serverType.deprecated ?? false,
  };
}

/**
 * Build a price lookup map from server types
 *
 * @param serverTypes - Array of Hetzner server types
 * @returns Map of server type name to price info
 */
export function buildPriceMap(
  serverTypes: HetznerServerType[],
): Map<string, ServerTypePrice> {
  const priceMap = new Map<string, ServerTypePrice>();

  for (const serverType of serverTypes) {
    const priceInfo = extractServerTypePrice(serverType);
    if (priceInfo) {
      priceMap.set(serverType.name, priceInfo);
    }
  }

  return priceMap;
}

/**
 * Get the monthly price for a server type from the price map
 * Returns fallback price for unknown/deprecated types
 *
 * @param serverTypeName - Name of the server type
 * @param priceMap - Price lookup map
 * @param fallbackPrice - Fallback price for unknown types (default: 5.0 EUR)
 * @returns Monthly price in EUR
 */
export function getServerTypeMonthlyPrice(
  serverTypeName: string,
  priceMap: Map<string, ServerTypePrice>,
  fallbackPrice: number = DEFAULT_FALLBACK_PRICE_MONTHLY,
): number {
  const priceInfo = priceMap.get(serverTypeName);
  return priceInfo?.priceMonthly ?? fallbackPrice;
}

/**
 * Calculate hourly price from monthly price
 * Uses standard 730 hours per month
 *
 * @param monthlyPrice - Monthly price in EUR
 * @returns Hourly price in EUR
 */
export function calculateHourlyFromMonthly(monthlyPrice: number): number {
  return monthlyPrice / HOURS_PER_MONTH;
}

// ============================================================================
// Main Cost Calculation Function
// ============================================================================

/**
 * Calculate total costs for a list of environments
 *
 * This function:
 * - Only includes environments with "running" status
 * - Handles missing/deprecated server types with fallback pricing
 * - Returns detailed breakdown and aggregated totals
 *
 * @param environments - Array of environment objects
 * @param serverTypes - Array of Hetzner server types with pricing
 * @param options - Optional configuration
 * @returns Cost calculation result with totals and breakdown
 */
export function calculateCosts(
  environments: Environment[],
  serverTypes: HetznerServerType[],
  options: {
    /** Custom fallback price for unknown server types (EUR/month) */
    fallbackPrice?: number;
    /** Whether to include stopped environments in breakdown (default: false) */
    includeStopped?: boolean;
  } = {},
): CostCalculationResult {
  const { fallbackPrice = DEFAULT_FALLBACK_PRICE_MONTHLY, includeStopped = false } =
    options;

  // Build price lookup map
  const priceMap = buildPriceMap(serverTypes);

  // Calculate costs for each environment
  const breakdown: EnvironmentCost[] = [];
  let totalMonthly = 0;
  let runningCount = 0;
  let stoppedCount = 0;
  let unknownTypeCount = 0;

  for (const env of environments) {
    const isRunning = env.status === "running";
    const priceInfo = priceMap.get(env.serverType);
    const isUnknownType = !priceInfo;

    // Count environments by status
    if (isRunning) {
      runningCount++;
    } else {
      stoppedCount++;
    }

    // Count unknown server types (only for running environments)
    if (isRunning && isUnknownType) {
      unknownTypeCount++;
    }

    // Get price (use fallback for unknown types, or 0 for stopped environments)
    const monthlyPrice = isRunning
      ? (priceInfo?.priceMonthly ?? fallbackPrice)
      : 0;
    const hourlyPrice = isRunning
      ? (priceInfo?.priceHourly ?? calculateHourlyFromMonthly(fallbackPrice))
      : 0;

    // Add to totals (only running environments)
    if (isRunning) {
      totalMonthly += monthlyPrice;
    }

    // Include in breakdown if running or if includeStopped is true
    if (isRunning || includeStopped) {
      breakdown.push({
        environmentId: env.id,
        environmentName: env.name,
        serverType: env.serverType,
        isRunning,
        costMonthly: monthlyPrice,
        costHourly: hourlyPrice,
        priceInfo: priceInfo,
      });
    }
  }

  // Calculate total hourly from monthly total
  const totalHourly = calculateHourlyFromMonthly(totalMonthly);

  return {
    totalMonthly,
    totalHourly,
    runningEnvironmentCount: runningCount,
    stoppedEnvironmentCount: stoppedCount,
    unknownServerTypeCount: unknownTypeCount,
    breakdown,
    priceMap,
  };
}

// ============================================================================
// Pricing Operations Class
// ============================================================================

export class PricingOperations {
  constructor(private client: HetznerClient) {}

  /**
   * List all server types
   */
  async listServerTypes(): Promise<HetznerServerType[]> {
    const response = await this.client.request<{ server_types: HetznerServerType[] }>(
      "/server_types"
    );

    // Validate response with Zod
    const validated = HetznerListServerTypesResponseSchema.safeParse(response);
    if (!validated.success) {
      console.warn('Hetzner list server types validation warning:', validated.error.issues);
      return response.server_types; // Return unvalidated data for backward compatibility
    }

    return validated.data.server_types;
  }

  /**
   * Get a specific server type by name
   */
  async getServerType(name: string): Promise<HetznerServerType | undefined> {
    const types = await this.listServerTypes();
    return types.find(t => t.name === name);
  }

  /**
   * List all locations
   */
  async listLocations(): Promise<HetznerLocation[]> {
    const response = await this.client.request<{ locations: HetznerLocation[] }>(
      "/locations"
    );

    // Validate response with Zod
    const validated = HetznerListLocationsResponseSchema.safeParse(response);
    if (!validated.success) {
      console.warn('Hetzner list locations validation warning:', validated.error.issues);
      return response.locations; // Return unvalidated data for backward compatibility
    }

    return validated.data.locations;
  }

  /**
   * Get a specific location by name
   */
  async getLocation(name: string): Promise<HetznerLocation | undefined> {
    const locations = await this.listLocations();
    return locations.find(l => l.name === name);
  }

  /**
   * List all datacenters
   */
  async listDatacenters(): Promise<HetznerDatacenter[]> {
    const response = await this.client.request<{ datacenters: HetznerDatacenter[] }>(
      "/datacenters"
    );

    // Validate response with Zod
    const validated = HetznerListDatacentersResponseSchema.safeParse(response);
    if (!validated.success) {
      console.warn('Hetzner list datacenters validation warning:', validated.error.issues);
      return response.datacenters; // Return unvalidated data for backward compatibility
    }

    return validated.data.datacenters;
  }

  /**
   * Calculate costs for environments using current Hetzner pricing
   *
   * Convenience method that fetches server types and calculates costs in one call
   *
   * @param environments - Array of environment objects
   * @param options - Optional configuration for cost calculation
   * @returns Cost calculation result
   */
  async calculateEnvironmentCosts(
    environments: Environment[],
    options?: {
      fallbackPrice?: number;
      includeStopped?: boolean;
    },
  ): Promise<CostCalculationResult> {
    const serverTypes = await this.listServerTypes();
    return calculateCosts(environments, serverTypes, options);
  }
}
