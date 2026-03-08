# Prompt: Hetzner Types Interconnectivity Refactor

You are working on a codebase for a Hetzner Cloud management application. The application has a type system issue where Hetzner's rich nested object graph is being flattened into simple strings, causing data loss and type inconsistency.

## Current Problem

The `Environment` interface stores `region: string`, but the Hetzner API returns a rich nested structure:

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

// What we currently store:
region: "nbg1"  // Lost: city, country, network_zone, etc.
```

The mapping in `app/backend/shared/api.ts:342` does this:

```typescript
region: server.datacenter.location.name,  // FLATTENS to string
```

## Existing Types

**In `app/fullstack-shared/types.ts`:**
- `HetznerLocation` - Full object with id, name, description, country, city, latitude, longitude, network_zone
- `HetznerServerType` - Full object with pricing array
- `Environment` - Has `region: string` (problematic)

**In `app/backend/shared/lib/hetzner/types.ts` (NOT exported to shared):**
- `HetznerDatacenter` - Full object but backend-only

## Your Task

Implement the following refactor to preserve the full object graph:

### 1. Update Shared Types (`app/fullstack-shared/types.ts`)

Add `HetznerDatacenter` to shared types:

```typescript
/**
 * Hetzner datacenter (specific facility within a location)
 * Previously backend-only, now shared for full object graph preservation
 */
export interface HetznerDatacenter {
  id: number;
  name: string;              // e.g., "nbg1-dc3"
  description: string;
  location: HetznerLocation;
  supported_server_types?: Array<{
    id: number;
    name: string;
  }> | null;
  available_server_types?: Array<{
    id: number;
    name: string;
  }>;
}
```

Update the `Environment` interface:

```typescript
export interface Environment extends EnvironmentBase {
  // ... other fields
  // CHANGE: Replace region: string with full object
  location: HetznerLocation;
  // NEW: Optional datacenter for facility-level detail
  datacenter?: HetznerDatacenter;
  // DEPRECATED: region for backward compatibility (optional)
  region?: string;  // = location.name
  // ... other fields
}
```

### 2. Export from Backend (`app/backend/shared/lib/hetzner/types.ts`)

```typescript
// Change line 385 from:
export type { HetznerServerType, HetznerLocation };

// To:
export type { HetznerServerType, HetznerLocation, HetznerDatacenter };
```

### 3. Update API Mapping (`app/backend/shared/api.ts`)

Find the environment mapping around line 342 and change:

```typescript
// FROM:
region: server.datacenter.location.name,

// TO:
location: server.datacenter.location,
datacenter: server.datacenter,
region: server.datacenter.location.name,  // for backward compatibility
```

Do this in ALL places where environments are mapped from Hetzner servers.

### 4. Update Frontend Consumers

Update all files that reference `env.region` to use `env.location.name` instead:

**Files to update:**
- `app/browser-client/components/environments/EnvironmentList.tsx` (lines ~62, 226, 265)
- `app/browser-client/components/environments/EnvironmentDetails.tsx` (line ~501)
- `app/browser-client/components/terminal/TerminalSheet.tsx` (line ~379)
- `app/browser-client/hooks/useEnvironmentsApi.ts` (lines ~277, 314, 523)
- `tools/check-api-image.ts` (line ~46)

**Pattern:**

```typescript
// Display: use location.name or location.city
<span>{env.location.name}</span>
// OR for better UX:
<span>{env.location.city}, {env.location.country}</span>

// Filtering: use location.name
env.location.name.toLowerCase().includes(query)

// API calls: use location.name
location: env.location.name,
```

## Important Notes

1. **Read files before editing** - Always use the Read tool first to understand the current code
2. **Preserve backward compatibility** - Keep `region` as an optional field aliased to `location.name`
3. **Test after changes** - Verify the frontend displays correctly
4. **Hetzner API compatibility** - Server creation still uses `location: string` in request body, this change only affects response handling

## Expected Outcome

After this refactor:
- `env.location` contains the full `HetznerLocation` object
- `env.datacenter` optionally contains the full `HetznerDatacenter` object
- Frontend can display "Nuremberg, DE" instead of just "nbg1"
- No data loss from API responses
- Type-safe access to all location properties

## Context

- Full documentation: `docs/hetzner-types-refactor.md`
- Current schemas: `app/backend/shared/lib/hetzner/schemas.ts`
- The Hetzner API already returns full objects - we just need to stop flattening them

Begin implementation when ready. Ask clarifying questions if needed.
