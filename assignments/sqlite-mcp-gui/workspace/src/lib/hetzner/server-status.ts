/**
 * Fetch server status from Hetzner API by IP address
 * Used for network error detection to determine if server is actually running
 */

import { HetznerClient } from "./client.js";

/**
 * Cache for server status lookups
 * Key: IP address, Value: { status, timestamp }
 */
const statusCache = new Map<string, { status: string; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

/**
 * Get server status by IP address
 * @param ip - The server IP address
 * @param client - HetznerClient instance
 * @returns Server status ("running", "stopped", etc.) or null if not found
 */
export async function getServerStatusByIP(
  ip: string,
  client?: HetznerClient
): Promise<string | null> {
  // Check cache first
  const cached = statusCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.status;
  }

  // If no client provided, create one (will use env vars)
  const hetznerClient = client || new HetznerClient();

  try {
    // List all servers and find matching IP
    const servers = await hetznerClient.listServers();

    // Find server with matching IPv4
    const server = servers.find(
      (s) => s.public_net.ipv4.ip === ip
    );

    if (server) {
      const status = server.status;
      // Cache the result
      statusCache.set(ip, { status, timestamp: Date.now() });
      return status;
    }

    // Server not found
    return null;
  } catch (error) {
    // Log error but don't throw - we don't want to break SSH connection on API failure
    console.warn(`[NetworkError] Failed to fetch server status for ${ip}:`, error);
    return null;
  }
}

/**
 * Clear the status cache
 * Useful for testing or when you know server state has changed
 */
export function clearServerStatusCache(): void {
  statusCache.clear();
}

/**
 * Get server status by IP with a fallback default
 * @param ip - The server IP address
 * @param client - HetznerClient instance (optional)
 * @param defaultStatus - Default status to return if lookup fails (default: "unknown")
 * @returns Server status or defaultStatus if not found/error
 */
export async function getServerStatusByIPWithDefault(
  ip: string,
  client?: HetznerClient,
  defaultStatus: string = "unknown"
): Promise<string> {
  const status = await getServerStatusByIP(ip, client);
  return status ?? defaultStatus;
}
