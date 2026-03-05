# Frontend Migration to Backend Services - Summary

## Overview
Updated the frontend to use new backend services instead of client-side processing, including activities API, cost calculation API, and documented the polling service decision.

## Changes Made

### 1. Updated `app/browser-client/hooks/useActivities.ts`

**Changes:**
- Replaced localStorage-based storage with API calls to `GET /api/activities`
- Removed all localStorage code
- Added loading and error states
- Maintained backward compatibility with existing `addActivity(action, environment, details)` signature
- Added auto-refresh capability with configurable interval
- Changed activity interface to match backend schema (id as number, timestamp as string)

**Key Features:**
- `fetchActivities()` - Fetches activities from backend with optional filters
- `addActivity()` - Client-side convenience wrapper (maintains backward compatibility)
- `refreshActivities` - Manual refresh function
- Auto-refresh support with `autoRefresh` and `refreshInterval` options

**API Integration:**
- `GET /api/activities` - Get all activities with query params
- `GET /api/environments/:id/activities` - Get activities for specific environment
- `POST /api/activities` - Add new activity (backend endpoint)

### 2. Created `app/browser-client/hooks/useCosts.ts` (NEW FILE)

**Purpose:**
- Fetch cost calculations from backend instead of client-side computation
- Provides fallback client-side calculation for backward compatibility

**Key Features:**
- `fetchCosts()` - Fetches cost breakdown from backend
- `calculateClientSide()` - Fallback for when backend is unavailable
- Auto-refresh support with 60-second default interval
- Cost breakdown by environment with monthly/hourly rates

**API Integration:**
- `GET /api/environments/costs` - Returns cost summary

**Response Structure:**
```typescript
{
  totalMonthly: number
  totalHourly: number
  runningCount: number
  stoppedCount: number
  breakdown: Array<{
    environmentId: string
    environmentName: string
    serverType: string
    status: string
    priceMonthly: number
    priceHourly: number
  }>
}
```

### 3. Updated `app/browser-client/components/shared/CostEstimate.tsx`

**Changes:**
- Removed duplicate client-side cost calculation functions
- Now uses `useCosts` hook for backend data
- Maintains fallback to client-side calculation if backend unavailable
- Shows error state if costs cannot be loaded
- Auto-refreshes costs every minute

**Improvements:**
- Single source of truth for cost data (backend)
- Better error handling
- Automatic refresh for up-to-date pricing
- Cleaner component with less code

### 4. Documented `app/browser-client/hooks/useHetznerAction.ts`

**Changes:**
- Added comprehensive documentation about polling decision
- Explained rationale for keeping frontend polling
- Documented future considerations (WebSocket, webhooks, caching)

**Decision: Keep frontend polling with optimistic updates**

**Rationale:**
1. Better UX: Immediate feedback when actions start/end
2. Resilience: Works even if backend polling fails
3. Flexibility: Different components can poll at different rates
4. Simplicity: Frontend already has infrastructure for polling

### 5. Backend Updates in `app/backend/shared/index.ts`

**New Endpoints Added:**

#### `GET /api/environments/costs`
- Returns cost breakdown for all environments
- Calculates monthly/hourly costs based on server types
- Only counts running servers in totals
- Returns per-environment breakdown

#### `POST /api/activities`
- Adds new activity entry to database
- Validates request with `AddActivityRequestSchema`
- Returns the ID of created activity

**Schema Import Added:**
- `AddActivityRequestSchema` imported for request validation

## API Endpoints Summary

| Endpoint | Method | Description | Query Params |
|----------|--------|-------------|--------------|
| `/api/activities` | GET | Get all activities | environmentId, limit, hours, since, until, action |
| `/api/activities` | POST | Add new activity | - |
| `/api/environments/:id/activities` | GET | Get activities for environment | limit, hours, since, until, action |
| `/api/environments/:id/activities/latest` | GET | Get latest activity | - |
| `/api/environments/:id/activities/summary` | GET | Get activity summary | hours |
| `/api/environments/costs` | GET | Get cost breakdown | - |

## Backward Compatibility

All changes maintain backward compatibility with existing code:

1. **useActivities hook** - Same interface, just different implementation
2. **addActivity signature** - Still accepts `(action, environment, details)`
3. **CostEstimate component** - Falls back to client-side if backend unavailable
4. **useHetznerAction** - No functional changes, just added documentation

## Testing Recommendations

1. Test activities loading with different filter options
2. Test cost calculations with various server types
3. Test auto-refresh functionality
4. Test error handling when backend is unavailable
5. Verify backward compatibility with existing components

## Future Improvements

1. Add WebSocket support for real-time activity updates
2. Implement server-side filtering/pagination for activities
3. Add cost history tracking (time series)
4. Consider adding caching layer for frequently accessed data
5. Add rate limiting for activity creation
