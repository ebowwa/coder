# Hetzner Types Refactor

## Overview

This refactor preserves Hetzner's rich nested object graph instead of flattening it to simple strings, preventing data loss and improving type safety.

## Problem Statement

Previously, the `Environment` interface stored `region: string`, but the Hetzner API returns a rich nested structure:

```typescript
// What Hetzner API returns:
server.datacenter.location = {
  id: 1,
  name: "nbg1",
  city: "Nuremberg",
  country: "DE",
  network_zone: "eu-central",
  latitude: 49.452,
  longitude: 11.076
}

// What we used to store:
region: "nbg1"  // Lost: city, country, network_zone, etc.
```

## Solution

### 1. Shared Types (`app/fullstack-shared/types.ts`)

**Added `HetznerDatacenter` interface:**
```typescript
export interface HetznerDatacenter {
  id: number;
  name: string;              // e.g., "nbg1-dc3"
  description: string;
  location: HetznerLocation;
  supported_server_types?: Array<{...}> | null;
  available_server_types?: Array<{...}>;
}
```

**Updated `Environment` interface:**
```typescript
export interface Environment extends EnvironmentBase {
  // NEW: Full location object
  location?: HetznerLocation;
  // NEW: Optional datacenter for facility-level detail
  datacenter?: HetznerDatacenter;
  // DEPRECATED: region for backward compatibility
  region?: string;  // = location.name
  // ... other fields
}
```

**Added helper functions:**
- `getEnvRegionName(env)` - Returns region name (e.g., "nbg1") for backward compatibility
- `getEnvLocation(env)` - Returns full location object
- `getEnvLocationLabel(env)` - Returns human-readable "City, Country" format

### 2. Backend Types (`app/backend/shared/lib/hetzner/types.ts`)

**Exports:**
```typescript
export type { HetznerServerType, HetznerLocation, HetznerDatacenter };
```

### 3. API Mapping (`app/backend/shared/api.ts`)

**GET /api/environments (lines 346-348):**
```typescript
location: server.datacenter.location,
datacenter: server.datacenter,
region: server.datacenter.location.name,  // for backward compatibility
```

**POST /api/environments (lines 494-496):**
```typescript
location: response.server.datacenter.location,
datacenter: response.server.datacenter,
region: response.server.datacenter.location.name,
```

### 4. Frontend Updates

**`app/browser-client/components/environments/EnvironmentDetails.tsx`:**
- Uses `getEnvLocationLabel(env)` to display "Nuremberg, DE" instead of "nbg1"
- Label changed from "Region" to "Location"

**`app/browser-client/components/environments/EnvironmentList.tsx`:**
- Uses `getEnvLocationLabel(env)` for display (lines 226, 265)
- Uses `getEnvRegionName(env)` for search filtering (line 62) - short format better for matching
- Label changed from "Region" to "Location"

## Benefits

1. **No Data Loss**: Full location object preserved from Hetzner API
2. **Type Safety**: Direct access to all location properties (city, country, network_zone, etc.)
3. **Better UX**: Can display "Nuremberg, DE" instead of just "nbg1"
4. **Backward Compatibility**: `region` field and `getEnvRegionName()` helper maintain old behavior
5. **Future-Proof**: Can access any location property without API changes

## Migration Guide

### For Display
```typescript
// OLD
<span>{env.region}</span>  // "nbg1"

// NEW (rich format)
<span>{getEnvLocationLabel(env)}</span>  // "Nuremberg, DE"

// NEW (short format)
<span>{env.location?.name}</span>  // "nbg1"
```

### For Filtering
```typescript
// Use region name for search/filtering
const matches = env.location?.name.toLowerCase().includes(query)
```

### For API Calls
```typescript
// Server creation still uses location: string
await hetznerClient.createServer({
  location: env.location?.name || "nbg1"
});
```

## Status: ✅ COMPLETE

- [x] Shared types updated with HetznerDatacenter
- [x] Environment interface updated with location, datacenter, deprecated region
- [x] Backend exports HetznerDatacenter
- [x] API mapping preserves full objects
- [x] Frontend uses helper functions
- [x] Frontend displays rich location info

## Files Modified

- `app/fullstack-shared/types.ts` - Added interfaces and helpers
- `app/backend/shared/lib/hetzner/types.ts` - Export HetznerDatacenter
- `app/backend/shared/api.ts` - Preserve full objects in mapping
- `app/browser-client/components/environments/EnvironmentDetails.tsx` - Use getEnvLocationLabel
- `app/browser-client/components/environments/EnvironmentList.tsx` - Use getEnvLocationLabel
