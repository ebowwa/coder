# Activities Module

User activity tracking system for the cheapspaces application.

## Overview

This module provides a comprehensive activity logging system that tracks user actions for audit trails, analytics, and debugging. Activities are stored in a dedicated SQLite table with proper indexing for performant queries.

## Database Schema

### Table: `activities`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | Unique activity identifier |
| `environment_id` | TEXT NOT NULL | Foreign key to environment_metadata |
| `action` | TEXT NOT NULL | Action type (e.g., "server_created") |
| `environment_name` | TEXT NOT NULL | Human-readable environment name |
| `details` | TEXT | Optional additional details (max 1000 chars) |
| `timestamp` | TEXT | ISO 8601 timestamp (auto-generated) |

### Indexes

- `idx_activities_env_time` - (environment_id, timestamp DESC) - Primary index for environment queries
- `idx_activities_timestamp` - (timestamp DESC) - For time-based cleanup and analytics
- `idx_activities_action` - (action) - For action type filtering
- `idx_activities_env_action` - (environment_id, action, timestamp DESC) - Composite index for filtered queries

## API Reference

### Core Functions

#### `addActivity(activity)`

Adds a new activity entry to the log.

**Parameters:**
```typescript
{
  environmentId: string;      // Required: Environment ID
  action: string;             // Required: Action type (max 100 chars)
  environmentName: string;    // Required: Environment name (max 64 chars)
  details?: string;           // Optional: Additional details (max 1000 chars)
}
```

**Returns:** `number` - The ID of the newly created activity

**Example:**
```typescript
const activityId = addActivity({
  environmentId: "123",
  action: "server_created",
  environmentName: "my-server",
  details: "Created cpx21 server in nbg1"
});
```

#### `getActivities(options)`

Retrieves activities with optional filtering.

**Parameters:**
```typescript
{
  environmentId?: string;     // Filter by environment
  limit?: number;             // Max results (default: 100, max: 1000)
  hours?: number;             // Last N hours
  since?: string;             // ISO 8601 start time
  until?: string;             // ISO 8601 end time
  action?: string;            // Filter by action type
}
```

**Returns:** `ActivityEntry[]`

**Examples:**
```typescript
// Get last 50 activities for an environment
const activities = getActivities({ environmentId: "123", limit: 50 });

// Get activities from last 24 hours
const recent = getActivities({ hours: 24 });

// Get activities for a specific action type
const creations = getActivities({ action: "server_created" });

// Get activities in a date range
const range = getActivities({
  since: "2024-01-01T00:00:00Z",
  until: "2024-01-31T23:59:59Z"
});
```

#### `getActivitiesForEnvironment(environmentId, options)`

Convenience function for getting activities for a specific environment.

**Parameters:**
- `environmentId`: string - The environment ID
- `options`: Same as `getActivities` but without `environmentId`

**Returns:** `ActivityEntry[]`

#### `getLatestActivity(environmentId)`

Gets the most recent activity for an environment.

**Parameters:**
- `environmentId`: string - The environment ID

**Returns:** `ActivityEntry | null`

#### `getActivitySummary(environmentId, hours?)`

Gets activity count summary grouped by action type.

**Parameters:**
- `environmentId`: string - The environment ID
- `hours`: number - Time range in hours (default: 24)

**Returns:** `Record<string, number>` - Mapping of action types to counts

**Example:**
```typescript
const summary = getActivitySummary("123", 24);
// Returns: { server_created: 5, server_deleted: 2, ssh_connected: 15 }
```

#### `getActivityStatistics(options)`

Gets comprehensive activity statistics including counts by action and environment.

**Parameters:** Same filtering options as `getActivities`

**Returns:** `ActivityStatistics | null`
```typescript
{
  total: number;
  byAction: Record<string, number>;
  byEnvironment: Record<string, number>;
  period: {
    start: string;
    end: string;
    hours: number;
  };
}
```

#### `deleteOldActivities(environmentId?, keepHours?)`

Deletes activities older than the specified time threshold.

**Parameters:**
- `environmentId`: string (optional) - Specific environment, or all if omitted
- `keepHours`: number - Hours of history to keep (default: 720 = 30 days)

**Returns:** `number` - Number of deleted records

**Examples:**
```typescript
// Delete activities older than 30 days for a specific environment
const deleted = deleteOldActivities("123", 720);

// Delete activities older than 90 days for all environments
const allDeleted = deleteOldActivities(undefined, 2160);
```

#### `deleteActivitiesForEnvironment(environmentId)`

Deletes all activities for a specific environment.

**Parameters:**
- `environmentId`: string - The environment ID

**Returns:** `number` - Number of deleted records

#### `getEnvironmentsWithActivities()`

Gets a list of all environments that have activity records.

**Returns:** `string[]` - Array of environment IDs

## HTTP API Endpoints

### `GET /api/activities`

Get activities with optional filtering.

**Query Parameters:**
- `environmentId` (optional) - Filter by environment
- `limit` (optional, default: 100) - Max results
- `hours` (optional) - Last N hours
- `since` (optional) - ISO 8601 start time
- `until` (optional) - ISO 8601 end time
- `action` (optional) - Filter by action type

**Response:**
```json
{
  "success": true,
  "activities": [...]
}
```

### `GET /api/environments/:id/activities`

Get activities for a specific environment.

**Query Parameters:** Same as above (except environmentId)

**Response:**
```json
{
  "success": true,
  "activities": [...]
}
```

### `GET /api/environments/:id/activities/latest`

Get the latest activity for an environment.

**Response:**
```json
{
  "success": true,
  "activity": {...}
}
```

### `GET /api/environments/:id/activities/summary`

Get activity summary for an environment.

**Query Parameters:**
- `hours` (optional, default: 24) - Time range in hours

**Response:**
```json
{
  "success": true,
  "summary": {
    "server_created": 5,
    "server_deleted": 2,
    "ssh_connected": 15
  }
}
```

### `GET /api/activities/statistics`

Get comprehensive activity statistics.

**Query Parameters:** Same as `/api/activities`

**Response:**
```json
{
  "success": true,
  "statistics": {
    "total": 100,
    "byAction": {...},
    "byEnvironment": {...},
    "period": {...}
  }
}
```

### `DELETE /api/activities/cleanup`

Delete old activities.

**Query Parameters:**
- `environmentId` (optional) - Specific environment, or all if omitted
- `keepHours` (optional, default: 720) - Hours of history to keep

**Response:**
```json
{
  "success": true,
  "deleted": 42
}
```

### `DELETE /api/environments/:id/activities`

Delete all activities for an environment.

**Response:**
```json
{
  "success": true,
  "deleted": 10
}
```

## Common Action Types

Suggested action types to use when logging activities:

- `server_created` - Server was created
- `server_deleted` - Server was deleted
- `server_started` - Server was powered on
- `server_stopped` - Server was powered off
- `ssh_connected` - SSH connection established
- `ssh_disconnected` - SSH connection closed
- `metadata_updated` - Environment metadata was modified
- `hours_updated` - Active hours tracking updated
- `ports_updated` - Active ports tracking updated
- `backup_created` - Backup was created
- `backup_restored` - Backup was restored
- `file_uploaded` - File was uploaded via SCP
- `file_downloaded` - File was downloaded via SCP
- `command_executed` - Command was executed on server
- `plugin_enabled` - A plugin was enabled
- `plugin_disabled` - A plugin was disabled

## Best Practices

1. **Use Descriptive Actions**: Choose action names that clearly describe what happened
2. **Include Context**: Use the `details` field to provide additional context when helpful
3. **Clean Up Old Data**: Implement regular cleanup using `deleteOldActivities` to prevent database bloat
4. **Use Time Filters**: Always use time-based filters (`hours` or `since`) for better query performance
5. **Set Reasonable Limits**: Use `limit` parameter to avoid returning large datasets

## Performance Considerations

1. **Indexes**: The module creates optimized indexes for common query patterns
2. **WAL Mode**: Database uses Write-Ahead Logging for better concurrency
3. **Time-Based Queries**: Indexes support efficient time range queries
4. **Composite Indexes**: Environment + action queries are optimized
5. **Default Limits**: Queries are limited to 100 results by default

## Migration from localStorage

The frontend previously used `useActivities` hook with localStorage. To migrate:

1. Backend now tracks activities in the database
2. Frontend can query activities via API endpoints
3. Consider migrating existing localStorage activities to the database

Example migration:
```typescript
// Old: localStorage
const { activities, addActivity } = useActivities();

// New: API calls
const activities = await fetch(`/api/environments/${envId}/activities`)
  .then(r => r.json())
  .then(data => data.activities);
```

## Testing

Run the test suite:
```bash
bun test tests/activities.test.ts
```

## License

MIT
