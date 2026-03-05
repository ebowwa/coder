import { useState, useEffect } from "react";
import type { HetznerServerType, HetznerLocation } from "../../../../../../@ebowwa/codespaces-types/compile";

const API_BASE = "";

interface ServerTypesResponse {
  success: boolean;
  serverTypes?: HetznerServerType[];
  error?: string;
}

interface LocationsResponse {
  success: boolean;
  locations?: HetznerLocation[];
  error?: string;
}

/**
 * Hook to fetch server types from Hetzner API
 */
export function useServerTypes() {
  const [serverTypes, setServerTypes] = useState<HetznerServerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServerTypes = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/server-types`);
        const data: ServerTypesResponse = await response.json();

        if (data.success && data.serverTypes) {
          // Filter out deprecated server types and sort by price
          const activeTypes = data.serverTypes
            .filter((t) => !t.deprecated)
            .sort((a, b) => {
              const priceA = parseFloat(
                a.prices?.[0]?.price_monthly?.gross || "0",
              );
              const priceB = parseFloat(
                b.prices?.[0]?.price_monthly?.gross || "0",
              );
              return priceA - priceB;
            });
          setServerTypes(activeTypes);
        } else {
          console.error("[useServerTypes] API error:", data.error);
          setError(data.error || "Failed to fetch server types");
        }
      } catch (err) {
        console.error("[useServerTypes] Failed to fetch server types:", err);
        setError("Failed to connect to backend");
      } finally {
        setLoading(false);
      }
    };

    fetchServerTypes();
  }, []);

  return { serverTypes, loading, error };
}

/**
 * Hook to fetch locations from Hetzner API
 */
export function useLocations() {
  const [locations, setLocations] = useState<HetznerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/api/locations`);
        const data: LocationsResponse = await response.json();

        if (data.success && data.locations) {
          // Sort locations by name
          const sortedLocations = data.locations.sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          setLocations(sortedLocations);
        } else {
          console.error("[useLocations] API error:", data.error);
          setError(data.error || "Failed to fetch locations");
        }
      } catch (err) {
        console.error("[useLocations] Failed to fetch locations:", err);
        setError("Failed to connect to backend");
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  return { locations, loading, error };
}

/**
 * Get flag emoji for country code
 */
export function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    DE: "🇩🇪",
    USA: "🇺🇸",
    US: "🇺🇸",
    FI: "🇫🇮",
    GB: "🇬🇧",
    FR: "🇫🇷",
  };
  return flags[country.toUpperCase()] || "🌍";
}

/**
 * Format server type info for display
 */
export function formatServerTypeInfo(type: HetznerServerType): {
  vcpus: string;
  ram: string;
  disk: string;
  price: string;
} {
  // Get price from first location, parse the gross string
  const priceGross = type.prices?.[0]?.price_monthly?.gross || "0";
  const price = parseFloat(priceGross).toFixed(2);

  return {
    vcpus: type.cores.toString(),
    ram:
      type.memory < 1024
        ? `${type.memory} MB`
        : `${(type.memory / 1024).toFixed(0)} GB`,
    disk: `${type.disk} GB`,
    price,
  };
}

/**
 * Check if a server type is available in a specific location
 */
export function isServerTypeAvailableInLocation(
  serverType: HetznerServerType,
  locationName: string,
): boolean {
  if (!serverType.prices || serverType.prices.length === 0) {
    return false;
  }
  return serverType.prices.some((price) => price.location === locationName);
}

/**
 * Get locations that support a specific server type
 */
export function getLocationsForServerType(
  serverType: HetznerServerType,
  allLocations: HetznerLocation[],
): HetznerLocation[] {
  if (!serverType.prices || serverType.prices.length === 0) {
    return [];
  }
  const availableLocationNames = new Set(
    serverType.prices
      .map((p) => p.location)
      .filter((loc): loc is string => loc !== null),
  );
  return allLocations.filter((loc) => availableLocationNames.has(loc.name));
}

/**
 * Get server types available in a specific location
 */
export function getServerTypesForLocation(
  locationName: string,
  allServerTypes: HetznerServerType[],
): HetznerServerType[] {
  return allServerTypes.filter((serverType) =>
    isServerTypeAvailableInLocation(serverType, locationName),
  );
}
