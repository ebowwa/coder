# Hetzner Cloud API Actions

## Overview

Actions show the results and progress of asynchronous requests to the Hetzner Cloud API. When you perform operations that take time to complete (like creating a server, attaching a volume, etc.), the API returns an Action object that you can query to track the operation's status.

## Action Object Structure

An Action object contains the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | integer | Unique identifier for the action |
| `command` | string | The operation being performed (e.g., `create_server`, `start_server`) |
| `status` | string | Current status: `running`, `success`, or `error` |
| `started` | timestamp | ISO 8601 timestamp when the action started |
| `finished` | timestamp | ISO 8601 timestamp when the action completed (null if still running) |
| `progress` | integer | Progress percentage (0-100) |
| `resources` | array | Resources affected by this action |
| `error` | object | Error details (only present if status is `error`) |

### Action Status Values

| Status | Description |
|--------|-------------|
| `running` | Action is currently in progress |
| `success` | Action completed successfully |
| `error` | Action failed with an error |

### Action Commands

Common action commands include:

| Command | Description |
|---------|-------------|
| `create_server` | Creating a new server |
| `start_server` | Starting a server |
| `stop_server` | Stopping a server |
| `reboot_server` | Rebooting a server |
| `reset_server` | Force resetting a server |
| `shutdown_server` | Gracefully shutting down a server |
| `poweroff` | Force cutting power to a server |
| `delete_server` | Deleting a server |
| `create_volume` | Creating a new volume |
| `attach_volume` | Attaching a volume to a server |
| `detach_volume` | Detaching a volume from a server |
| `resize_volume` | Resizing a volume |
| `change_server_type` | Changing server type |
| `rebuild_server` | Rebuilding a server from an image |
| `enable_backup` | Enabling backups for a server |
| `disable_backup` | Disabling backups |
| `create_image` | Creating an image from a server |
| `change_dns_ptr` | Changing reverse DNS entry |
| `attach_to_network` | Attaching server to network |
| `detach_from_network` | Detaching server from network |
| `assign_floating_ip` | Assigning a floating IP |
| `unassign_floating_ip` | Unassigning a floating IP |
| `create_load_balancer` | Creating a load balancer |
| `add_target` | Adding a target to load balancer |
| `remove_target` | Removing target from load balancer |
| `add_service` | Adding service to load balancer |
| `delete_service` | Deleting service from load balancer |

## Global Actions Endpoints

### Get All Actions

Get all actions across all resources in your project.

**Endpoint:** `GET /actions`

**Query Parameters:**
- `id` (array): Filter actions by ID
- `sort` (array): Sort by field (id, command, status, started, finished)
- `status` (array): Filter by status (running, success, error)
- `page` (integer): Page number (default: 1)
- `per_page` (integer): Entries per page (default: 25, max: 50)

**Example Request:**
```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://api.hetzner.cloud/v1/actions?id=42&id=43&status=running"
```

**Response:**
```json
{
  "actions": [
    {
      "id": 42,
      "command": "start_server",
      "status": "running",
      "started": "2016-01-30T23:55:00+00:00",
      "finished": "2016-01-30T23:55:00+00:00",
      "progress": 100,
      "resources": [
        {
          "id": 42,
          "type": "server"
        }
      ],
      "error": {
        "code": "action_failed",
        "message": "Action failed"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 3,
      "per_page": 25,
      "previous_page": 2,
      "next_page": 4,
      "last_page": 4,
      "total_entries": 100
    }
  }
}
```

### Get a Specific Action

Get details of a specific action by ID.

**Endpoint:** `GET /actions/{id}`

**Example Request:**
```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://api.hetzner.cloud/v1/actions/42"
```

## Resource-Specific Actions

Each resource type has its own set of action endpoints:

### Server Actions

**List server actions:**
- Endpoint: `GET /servers/actions`
- Get actions for specific server: `GET /servers/{id}/actions`
- Get specific action: `GET /servers/{id}/actions/{action_id}`

**Server action commands:**
- Power management: `poweron`, `poweroff`, `reboot`, `reset`, `shutdown`
- Server lifecycle: `create_server`, `delete_server`
- Image management: `create_image`, `rebuild_server`
- Network: `attach_to_network`, `detach_from_network`, `change_alias_ips`
- Backup: `enable_backup`, `disable_backup`
- Rescue mode: `enable_rescue`, `disable_rescue`
- Server management: `change_server_type`, `change_dns_ptr`, `change_protection`

### Volume Actions

**List volume actions:**
- Endpoint: `GET /volumes/actions`
- Get actions for specific volume: `GET /volumes/{id}/actions`
- Get specific action: `GET /volumes/{id}/actions/{action_id}`

**Volume action commands:**
- Lifecycle: `create_volume`, `delete_volume`
- Attachment: `attach`, `detach`
- Management: `resize_volume`, `change_protection`

### Load Balancer Actions

**List load balancer actions:**
- Endpoint: `GET /load_balancers/actions`
- Get actions for specific load balancer: `GET /load_balancers/{id}/actions`
- Get specific action: `GET /load_balancers/{id}/actions/{action_id}`

**Load balancer action commands:**
- Lifecycle: `create_load_balancer`
- Target management: `add_target`, `remove_target`
- Service management: `add_service`, `update_service`, `delete_service`
- Network: `attach_to_network`, `detach_from_network`
- Configuration: `change_algorithm`, `change_type`, `change_protection`

### Floating IP Actions

**List floating IP actions:**
- Endpoint: `GET /floating_ips/actions`
- Get actions for specific floating IP: `GET /floating_ips/{id}/actions`
- Get specific action: `GET /floating_ips/{id}/actions/{action_id}`

**Floating IP action commands:**
- Assignment: `assign`, `unassign`
- DNS: `change_dns_ptr`
- Protection: `change_protection`

### Network Actions

**List network actions:**
- Endpoint: `GET /networks/actions`
- Get actions for specific network: `GET /networks/{id}/actions`
- Get specific action: `GET /networks/{id}/actions/{action_id}`

**Network action commands:**
- Subnet management: `add_subnet`, `delete_subnet`
- Route management: `add_route`, `delete_route`
- Configuration: `change_ip_range`, `change_protection`

### Certificate Actions

**List certificate actions:**
- Endpoint: `GET /certificates/actions`
- Get actions for specific certificate: `GET /certificates/{id}/actions`
- Get specific action: `GET /certificates/{id}/actions/{action_id}`

**Certificate action commands:**
- Certificate management: `issue_certificate` (managed certificates only)
- Retry: `retry` (for failed issuance/renewal)

### Image Actions

**List image actions:**
- Endpoint: `GET /images/actions`
- Get actions for specific image: `GET /images/{id}/actions`
- Get specific action: `GET /images/{id}/actions/{action_id}`

**Image action commands:**
- Protection: `change_protection`

### Firewall Actions

**List firewall actions:**
- Endpoint: `GET /firewalls/actions`
- Get actions for specific firewall: `GET /firewalls/{id}/actions`
- Get specific action: `GET /firewalls/{id}/actions/{action_id}`

**Firewall action commands:**
- Rules: `set_firewall_rules`
- Resources: `apply_firewall`, `remove_firewall`
- Protection: `change_protection`

## Error Handling

Actions can fail for various reasons. When an action has `status: "error"`, the error object contains:

| Field | Description |
|-------|-------------|
| `code` | Machine-readable error code |
| `message` | Human-readable error message |
| `details` | Additional error context |

### Common Error Codes

| Code | Description |
|------|-------------|
| `action_failed` | General action failure |
| `locked` | Resource is locked by another action |
| `rate_limit_exceeded` | Too many requests |
| `resource_limit_exceeded` | Exceeded resource limits |
| `conflict` | Resource changed during request |
| `uniqueness_error` | Constraint violation |
| `server_not_stopped` | Server must be powered off |

## Best Practices

### Polling Actions

When working with long-running actions, implement polling:

```typescript
async function waitForAction(actionId: string): Promise<Action> {
  while (true) {
    const action = await api.getAction(actionId);
    if (action.status === 'success' || action.status === 'error') {
      return action;
    }
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### Handling Action Errors

Always check action status and handle errors:

```typescript
const action = await api.waitForAction(actionId);

if (action.status === 'error') {
  console.error(`Action failed: ${action.error.message}`);
  // Handle specific error codes
  switch (action.error.code) {
    case 'locked':
      // Retry after delay
      break;
    case 'rate_limit_exceeded':
      // Implement exponential backoff
      break;
    default:
      throw new Error(action.error.message);
  }
}
```

### Action Progress Monitoring

Monitor progress for user feedback:

```typescript
function formatProgress(action: Action): string {
  const progress = action.progress;
  const command = action.command.replace(/_/g, ' ');
  return `${command}: ${progress}%`;
}
```

## Sorting

Actions can be sorted by multiple fields:

- `id` - Action ID
- `command` - Command name
- `status` - Current status
- `started` - Start timestamp
- `finished` - Completion timestamp

**Example:**
```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://api.hetzner.cloud/v1/servers/42/actions?sort=status:asc&sort=started:desc"
```

## Filtering

### By Status

Get only running actions:
```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://api.hetzner.cloud/v1/actions?status=running"
```

Get only completed actions:
```bash
curl -H "Authorization: BERER $API_TOKEN" \
  "https://api.hetzner.cloud/v1/servers/42/actions?status=success&status=error"
```

### By ID

Get specific actions:
```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://api.hetzner.cloud/v1/actions?id=42&id=43"
```

## Pagination

Use pagination for large result sets:

```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://api.hetzner.cloud/v1/servers/42/actions?page=2&per_page=50"
```

Response includes pagination metadata:
```json
{
  "meta": {
    "pagination": {
      "page": 2,
      "per_page": 50,
      "previous_page": 1,
      "next_page": 3,
      "last_page": 10,
      "total_entries": 500
    }
  }
}
```

## Rate Limiting

Action endpoints are subject to rate limiting:
- Default limit: 3600 requests per hour per project
- Response headers include rate limit information

Check rate limit headers:
- `RateLimit-Limit` - Total requests per hour
- `RateLimit-Remaining` - Requests remaining
- `RateLimit-Reset` - Unix timestamp for limit reset

## References

- [Hetzner Cloud API Actions Reference](https://docs.hetzner.cloud/reference/cloud#actions)
- [Hetzner Cloud API Overview](https://docs.hetzner.cloud/reference/cloud)

## Official SDKs and Libraries

Hetzner provides several official SDKs that handle action polling automatically:

| Language | Package | Repository |
|----------|---------|------------|
| Go | `hcloud-go` | [github.com/hetznercloud/hcloud-go](https://github.com/hetznercloud/hcloud-go) |
| Python | `hcloud-python` | [github.com/hetznercloud/hcloud-python](https://github.com/hetznercloudcloud/hcloud-python) |
| JavaScript | `@hetznercloud/hcloud-js` | [github.com/hetznercloud/js-cloud-client](https://github.com/hetznercloud/js-cloud-client) |

### Python SDK Example with Action Polling

```python
from hcloud import Client
from hcloud.actions import Action, PollActionException

client = Client(token="your_api_token")

# Create a server
server = client.servers.create(
    name="my-server",
    server_type="cx22",
    image="ubuntu-24.04",
    location="fsn1"
)

# The SDK automatically polls for action completion
try:
    # Wait for the create action to complete
    action = client.servers.wait_until_finished(server)
    print(f"Server created successfully: {action.command}")
except PollActionException as e:
    print(f"Action failed: {e}")
```

### Go SDK Example with Polling

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/hetznercloud/hcloud-go/hcloud"
    "github.com/hetznercloudcloud/hcloud/go/wait"
)

func main() {
    client := hcloud.NewClient(hcloud.WithToken("your_api_token"))

    // Create a server
    server, _, err := client.Server.Create(context.Background(), hcloud.ServerCreateOpts{
        Name:       "my-server",
        ServerType: "cx22",
        Image:      "ubuntu-24.04",
        Location:   "fsn1",
    })
    if err != nil {
        panic(err)
    }

    // Wait for the create action to complete
    err = wait.WaitForAction(context.Background(), client, server.Action, waitOpts{
        PollInterval: 1 * time.Second,
    })
    if err != nil {
        panic(err)
    }

    fmt.Println("Server created successfully")
}
```

## Webhook Considerations

Hetzner Cloud API does not currently support webhook notifications for action completion. All action status monitoring requires polling:

- **No Action Webhooks**: Unlike some cloud providers, Hetzner does not send webhook notifications when actions complete
- **Polling Required**: You must periodically check action status using the Actions endpoints
- **Optimize Polling**: Use appropriate intervals to balance API usage and responsiveness

**Alternative Approach**: For long-running operations, consider:
1. Implementing a poll with exponential backoff
2. Using a queue system to manage action statuses
3. Monitoring server status independently (e.g., via SSH)
4. Implementing a custom event system

## Advanced Polling Patterns

### Exponential Backoff Strategy

Implement exponential backoff to handle rate limits and transient failures:

```typescript
async function waitForActionWithBackoff(
    apiClient: HetznerClient,
    actionId: string,
    maxRetries: number = 10
): Promise<Action> {
    let retryCount = 0;
    let delay = 1000; // Start with 1 second

    while (retryCount < maxRetries) {
        try {
            const action = await apiClient.getAction(actionId);

            if (action.status === 'success') {
                return action;
            }

            if (action.status === 'error') {
                throw new Error(`Action failed: ${action.error.message}`);
            }

            // Action still running, continue polling
            if (action.progress < 100) {
                console.log(`Action progress: ${action.progress}%`);
            }

            await sleep(delay);
            retryCount++;

        } catch (error) {
            // Handle rate limits with exponential backoff
            if (error.code === 'rate_limit_exceeded') {
                delay = Math.min(delay * 2, 60000); // Max 1 minute
                console.log(`Rate limited. Retrying in ${delay}ms...`);
            }

            retryCount++;
            if (retryCount >= maxRetries) throw error;
        }
    }

    throw new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Concurrent Action Polling

When monitoring multiple actions, use Promise.all for concurrent polling:

```typescript
async function waitForMultipleActions(
    apiClient: HetznerClient,
    actionIds: string[]
): Promise<Action[]> {
    const promises = actionIds.map(id =>
        waitForActionWithBackoff(apiClient, id)
    );

    return Promise.all(promises);
}

// Usage
const actionIds = [13, 14, 15];
const actions = await waitForMultipleActions(client, actionIds);
```

## Action Status Monitoring

### Progress Tracking

Monitor action progress for user feedback:

```typescript
interface ActionProgress {
    id: number;
    command: string;
    progress: number;
    status: 'running' | 'success' | 'error';
    started: string;
    finished?: string;
}

function formatProgress(action: ActionProgress): string {
    const command = action.command.replace(/_/g, ' ');
    const status = action.status.toUpperCase();
    const progress = action.progress;
    return `${status}: ${command} (${progress}%)`;
}

function monitorAction(
    apiClient: HetznerClient,
    actionId: string,
    onUpdate: (progress: string) => void
): Promise<Action> {
    let lastProgress = -1;

    while (true) {
        const action = await apiClient.getAction(actionId);

        // Only notify on progress change
        if (action.progress !== lastProgress) {
            lastProgress = action.progress;
            onUpdate(formatProgress(action));
        }

        if (action.status === 'success') {
            return action;
        }

        if (action.status === 'error') {
            throw new Error(`Action failed: ${action.error.message}`);
        }

        await sleep(2000); // Poll every 2 seconds
    }
}
```

## Action Timeout Handling

Set appropriate timeouts for different action types:

```typescript
const ACTION_TIMEOUTS = {
    // Short operations
    'poweron': 60000,      // 1 minute
    'poweroff': 60000,     // 1 minute
    'reboot': 120000,       // 2 minutes

    // Medium operations
    'create_server': 300000,  // 5 minutes
    'delete_server': 180000,  // 3 minutes
    'change_server_type': 600000, // 10 minutes

    // Long operations
    'rebuild_server': 900000, // 15 minutes
    'create_image': 1800000, // 30 minutes
};

async function waitForActionWithTimeout(
    apiClient: HetznerClient,
    actionId: string,
    command: string
): Promise<Action> {
    const timeout = ACTION_TIMEOUTS[command as keyof typeof ACTION_TIMEOUTS] || 300000;

    const timeoutPromise = new Promise<Action>((_, reject) => {
        setTimeout(() => reject(new Error(`Action timeout after ${timeout}ms`)), timeout);
    });

    try {
        return await Promise.race([
            waitForActionWithBackoff(apiClient, actionId),
            timeoutPromise
        ]);
    } catch (error) {
        // Log timeout and take action (e.g., notify user, check server status)
        console.error(`Action ${command} timed out:`, error);
        throw error;
    }
}
```

## Monitoring and Debugging

### Rate Limit Headers

Always check rate limit headers to avoid being blocked:

| Header | Description |
|--------|-------------|
| `RateLimit-Limit` | Total requests per hour (default: 3600) |
| `RateLimit-Remaining` | Requests remaining in current window |
| `RateLimit-Reset` | Unix timestamp when limit resets |

```typescript
function checkRateLimit(headers: Headers): void {
    const limit = headers.get('RateLimit-Limit');
    const remaining = headers.get('RateLimit-Remaining');
    const reset = headers.get('RateLimit-Reset');

    if (remaining && parseInt(remaining) < 100) {
        console.warn(`Low rate limit: ${remaining}/${limit} remaining. Resets at: ${new Date(parseInt(reset) * 1000).toISOString()}`);
    }
}
```

### Action History Retention

Actions are retained for a limited time:

- Actions are typically available for **30 days** or longer
- Old actions may be purged from the system
- Always persist critical action results to your own system for long-term tracking
- Consider implementing an action history table for audit purposes

## Common Action Scenarios

### 1. Create Server and Wait for SSH Access

```python
from hcloud import Client
from time import sleep

client = Client(token="your_api_token")

# Create server
server = client.servers.create(
    name="production-server",
    server_type="cpx22",
    image="ubuntu-24.04",
    location="fsn1",
    start_after_create=True
)

# Wait for server to be running
while server.status != "running":
    sleep(5)
    server = client.servers.get(server.id)

print(f"Server {server.name} is running at {server.public_net.ipv4.ip}")
```

### 2. Volume Attachment Sequence

```python
from hcloud import Client
from hcloud.volumes import Volume

client = Client(token="your_api_token")

# Create volume (asynchronous)
volume_action = client.volumes.create(
    name="database-storage",
    size=100,
    location="fsn1",
    format="xfs"
)

# Wait for volume creation
volume = client.volumes.wait_until_finished(volume_action.volume)

# Attach to server
attach_action = client.volumes.attach(
    volume=volume,
    server=42,
    automount=True
)

# Wait for attachment to complete
client.actions.wait_until_finished(attach_action)
print("Volume attached successfully")
```

### 3. Bulk Server Operations

```python
from hcloud import Client
from concurrent.futures import ThreadPoolExecutor, as_completed

client = Client(token="your_api_token")

def create_server(name: str, index: int) -> None:
    """Create a server and wait for it to be ready."""
    server = client.servers.create(
        name=f"{name}-{index}",
        server_type="cx22",
        image="ubuntu-24.04",
        location="fsn1",
        start_after_create=True
    )
    client.servers.wait_until_finished(server)

# Create multiple servers in parallel
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [
        executor.submit(create_server, "web-server", i)
        for i in range(5)
    ]

    for future in as_completed(futures):
        future.result()  # Will raise on error

print("All servers created and running")
```

## Error Recovery Strategies

### Handling Resource Locks

```typescript
async function handleLockedResource(operation: () => Promise<Action>, maxRetries: number = 5): Promise<Action> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (error.code === 'locked') {
                console.log(`Resource locked, waiting... (${i + 1}/${maxRetries})`);
                await sleep(5000); // Wait 5 seconds
            } else {
                throw error;
            }
        }
    }
    throw new Error('Resource remained locked after retries');
}
```

### Rate Limit Recovery

```typescript
async function waitForRateLimitReset(headers: Headers): Promise<void> {
    const reset = headers.get('RateLimit-Reset');
    const resetTime = reset ? parseInt(reset) * 1000 : 0;
    const now = Date.now();
    const waitTime = Math.max(0, resetTime - now);

    if (waitTime > 0) {
        const waitSeconds = Math.ceil(waitTime / 1000);
        console.log(`Rate limit exhausted. Waiting ${waitSeconds}s for reset...`);
        await sleep(waitTime);
    }
}
```

## Integration Examples

### CI/CD Integration

```yaml
name: Deploy to Hetzner

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Create server
      uses: hetznercloud/hcloud-action@v1
      with:
        api_token: ${{ secrets.HETZNER_API_TOKEN }}
        server_name: ci-runner-${{ github.sha }}
        server_type: cx22
        image: ubuntu-24.04
        location: fsn1

    - name: Wait for server
      run: |
        # Poll for server status
        until [ "$(curl -s ${{ secrets.HETZNER_API_TOKEN }} \
          https://api.hetzner.cloud/v1/servers/42/status | jq -r '.status')" == "running" ]; do
          echo "Server starting..."
          sleep 5
        done
```

### Ansible Integration

```yaml
- name: Create and wait for server
  hetzner.hcloud.server:
    name: application-server
    server_type: cx22
    image: ubuntu-24.04
    location: fsn1
    state: present
    wait_timeout: 600
    register: server

- name: Attach volume
  hetzner.hcloud.volume:
    name: data-volume
    server: "{{ server.id }}"
    location: fsn1
    size: 100
    automount: true
    state: present
```

## Performance Optimization

### Efficient Polling Strategies

```typescript
// Adaptive polling based on operation type
function getPollInterval(command: string): number {
    const intervals: Record<string, number> = {
        // Quick operations
        'poweron': 5000,     // 5 seconds
        'shutdown': 5000,  // 5 seconds
        'reboot': 10000,      // 10 seconds

        // Medium operations
        'create_server': 15000,     // 15 seconds
        'create_volume': 10000,      // 10 seconds
        'attach_volume': 8000,       // 8 seconds

        // Long operations
        'rebuild_server': 30000,     // 30 seconds
        'create_image': 60000,       // 60 seconds
    };

    return intervals[command] || 10000; // Default 10 seconds
}

// Smart polling that slows down as progress completes
function adaptivePolling(actionId: string): Promise<Action> {
    const intervals: Record<number, number> = {
        10: 2000,    // Quick progress
        50: 5000,    // Medium progress
        90: 10000,   // Slowing down
        100: 30000  // Near completion
    };

    while (true) {
        const action = await apiClient.getAction(actionId);

        // Increase polling interval as action nears completion
        const interval = intervals[action.progress] || 10000;

        if (action.status === 'success' || action.status === 'error') {
            return action;
        }

        await sleep(interval);
    }
}
```

### Batch Action Checking

```typescript
// Efficiently check multiple actions
async function batchCheckActionStatus(actionIds: string[]): Promise<Map<string, Action>> {
    // Use the /actions?id=42&id=43 endpoint to get multiple actions in one request
    const batchSize = 50; // Max ID count per request
    const results = new Map<string, Action>();

    for (let i = 0; i < actionIds.length; i += batchSize) {
        const batch = actionIds.slice(i, i + batchSize);
        const idParams = batch.map(id => `id=${id}`).join('&');

        const response = await fetch(
            `https://api.hetzner.cloud/v1/actions?${idParams}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`
                }
            }
        );

        const data = await response.json();

        for (const action of data.actions) {
            results.set(action.id.toString(), action);
        }
    }

    return results;
}
```

## Security Considerations

### API Token Protection

- Never commit API tokens to version control
- Use environment variables for token storage
- Implement token rotation policies
- Use read-only tokens where possible
- Restrict token permissions to required resources only

### Action Authorization

- Always verify user permissions before starting actions
- Implement proper resource ownership validation
- Log all action initiations for audit trails
- Implement IP whitelisting for critical actions
- Consider using temporary tokens for one-off operations

## TypeScript/TSX Integration

Since your backend uses TypeScript/TSX, here are specific patterns and community SDKs for Hetzner Cloud API integration.

### Community TypeScript SDKs

Hetzner does not maintain an official TypeScript SDK, but several excellent community options exist:

| Package | Status | Features | Repository |
|---------|--------|----------|------------|
| `@modexvpn/hcloud` | Stable (v1.x) | Zod validation, type-safe, modular | [github.com/modexvpn/hcloud-ts](https://github.com/modexvpn/hcloud-ts) |
| `hetzner-sdk-ts` | Active | OpenAPI-generated, auto-updated types | [github.com/thedjpetersen/hetzner-sdk-ts](https://github.com/thedjpetersen/hetzner-sdk-ts) |
| `@apiclient.xyz/hetznercloud` | Unofficial | Easy methods for servers, volumes, firewalls | [npmjs.com/package/@apiclient.xyz/hetznercloud](https://www.npmjs.com/package/@apiclient.xyz/hetznercloud) |

### Using @modexvpn/hcloud (Recommended for TSX/Bun)

The `@modexvpn/hcloud` SDK is ideal for TypeScript/TSX backends with excellent type safety and Zod runtime validation.

```bash
# Installation
bun add @modexvpn/hcloud
```

**Basic Setup with Environment Variables:**
```typescript
// .env
HCLOUD_API_TOKEN=your_token_here

// config/hetzner.ts
import { hcloud } from '@modexvpn/hcloud';

// Automatically reads HCLOUD_API_TOKEN from environment
export const hetzner = hcloud;
```

**TypeScript Interfaces for Actions:**
```typescript
// types/hetzner.ts
export interface HetznerAction {
  id: number;
  command: string;
  status: 'running' | 'success' | 'error';
  started: string;
  finished: string | null;
  progress: number;
  resources: Array<{
    id: number;
    type: 'server' | 'volume' | 'network' | 'floating_ip' | 'load_balancer';
  }>;
  error: {
    code: string;
    message: string;
  } | null;
}

export interface ServerCreateResult {
  server: {
    id: number;
    name: string;
    status: string;
    public_net: {
      ipv4: { ip: string };
      ipv6: { ip: string };
    };
  };
  action: HetznerAction;
  next_actions: HetznerAction[];
}
```

**Action Polling with Async/Await:**
```typescript
// utils/hetzner-actions.ts
import { hcloud } from '@modexvpn/hcloud';
import type { HetznerAction } from '../types/hetzner';

const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds
const DEFAULT_MAX_RETRIES = 60; // 2 minutes total

export async function waitForAction(
  actionId: number,
  options: {
    pollInterval?: number;
    maxRetries?: number;
    onProgress?: (action: HetznerAction) => void;
  } = {}
): Promise<HetznerAction> {
  const {
    pollInterval = DEFAULT_POLL_INTERVAL,
    maxRetries = DEFAULT_MAX_RETRIES,
    onProgress
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(
      `https://api.hetzner.cloud/v1/actions/${actionId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.HCLOUD_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const action: HetznerAction = await response.json();

    // Notify progress callback
    onProgress?.(action);

    if (action.status === 'success') {
      return action;
    }

    if (action.status === 'error') {
      throw new Error(
        `Action failed: ${action.error?.code} - ${action.error?.message}`
      );
    }

    // Still running - wait before next poll
    await Bun.sleep(pollInterval);
  }

  throw new Error(`Action ${actionId} timed out after ${maxRetries} attempts`);
}
```

**Server Creation with Action Polling:**
```typescript
// services/servers.ts
import { hcloud } from '@modexvpn/hcloud';
import { waitForAction } from '../utils/hetzner-actions';

export async function createServerAndWait(params: {
  name: string;
  serverType: string;
  image: string;
  location?: string;
  sshKeys?: string[];
}): Promise<{
  server: any;
  action: any;
}> {
  // Create server
  const result = await hcloud.servers.create({
    name: params.name,
    server_type: params.serverType,
    image: params.image,
    location: params.location || 'fsn1',
    ssh_keys: params.sshKeys,
  });

  // Wait for server creation action to complete
  const action = await waitForAction(result.action.id, {
    onProgress: (action) => {
      console.log(`Creating server: ${action.progress}%`);
    }
  });

  return { server: result.server, action };
}

// Usage in your TSX route handler
export async function POST(req: Request) {
  const { name } = await req.json();

  const { server, action } = await createServerAndWait({
    name,
    serverType: 'cpx22',
    image: 'ubuntu-24.04',
  });

  return Response.json({
    serverId: server.id,
    serverIp: server.public_net.ipv4.ip,
    status: action.status
  });
}
```

### Using hetzner-sdk-ts (OpenAPI-Generated)

This SDK is auto-generated from Hetzner's OpenAPI specification, ensuring type accuracy.

```bash
# Installation
bun add hetzner-sdk-ts
```

**Basic Usage:**
```typescript
import { OpenAPI, ServersService, ActionsService } from 'hetzner-sdk-ts';

// Configure API token globally
OpenAPI.TOKEN = process.env.HCLOUD_API_TOKEN;

// List all servers
const { servers } = await ServersService.getServers({});

// Get specific action
const action = await ActionsService.getAction({ id: 42 });

console.log(`Action ${action.command}: ${action.status}`);
```

**With Custom Configuration:**
```typescript
import { OpenAPI, ServersService } from 'hetzner-sdk-ts';

// Configure with custom base URL (useful for testing)
OpenAPI.BASE = process.env.HETZNER_API_BASE_URL || 'https://api.hetzner.cloud/v1';
OpenAPI.TOKEN = process.env.HCLOUD_API_TOKEN;
OpenAPI.HEADERS = {
  'User-Agent': 'MyApp/1.0'
};

// Create server
const result = await ServersService.createServer({
  requestBody: {
    name: 'my-server',
    server_type: 'cx22',
    image: 'ubuntu-24.04',
    location: 'fsn1'
  }
});

// Poll for action completion
const action = await ActionsService.getAction({
  id: result.action.id
});
```

### Native fetch() with TypeScript

For maximum control and minimal dependencies, use the native `fetch()` API with TypeScript.

```typescript
// lib/hetzner-client.ts
const HETZNER_API_BASE = 'https://api.hetzner.cloud/v1';

export class HetznerClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${HETZNER_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new HetznerAPIError(error.error);
    }

    return response.json();
  }

  async getAction(id: number): Promise<HetznerAction> {
    return this.request<HetznerAction>(`/actions/${id}`);
  }

  async getServer(id: number): Promise<Server> {
    return this.request<Server>(`/servers/${id}`);
  }

  async createServer(params: CreateServerParams): Promise<ServerCreateResult> {
    return this.request<ServerCreateResult>('/servers', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // Batch action checking
  async getActions(ids: number[]): Promise<HetznerAction[]> {
    const params = new URLSearchParams();
    ids.forEach(id => params.append('id', id.toString()));

    const result = await this.request<{ actions: HetznerAction[] }>(
      `/actions?${params.toString()}`
    );
    return result.actions;
  }
}

class HetznerAPIError extends Error {
  constructor(public error: { code: string; message: string }) {
    super(error.message);
    this.name = 'HetznerAPIError';
  }
}
```

### Bun-Specific Patterns

Since your backend uses Bun, leverage Bun-specific features for optimal performance.

**Using Bun's Built-in fetch:**
```typescript
// Bun's fetch is optimized and has zero-cost abstractions
export async function pollActionBun(actionId: number): Promise<HetznerAction> {
  const token = process.env.HCLOUD_API_TOKEN!;

  while (true) {
    const response = await fetch(
      `https://api.hetzner.cloud/v1/actions/${actionId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const action: HetznerAction = await response.json();

    if (action.status !== 'running') {
      return action;
    }

    // Bun's sleep function
    await Bun.sleep(2000);
  }
}
```

**Environment Variables with Bun:**
```typescript
// Bun automatically loads .env files
// No need for dotenv package

const config = {
  hetznerApiToken: process.env.HCLOUD_API_TOKEN!,
  hetznerApiBase: process.env.HETZNER_API_BASE_URL || 'https://api.hetzner.cloud/v1',
  pollInterval: parseInt(process.env.HETZNER_POLL_INTERVAL || '2000'),
  maxRetries: parseInt(process.env.HETZNER_MAX_RETRIES || '60')
};

// TypeScript type guard for runtime validation
function validateConfig(): asserts config is {
  hetznerApiToken: string;
  hetznerApiBase: string;
  pollInterval: number;
  maxRetries: number;
} {
  if (!config.hetznerApiToken) {
    throw new Error('HCLOUD_API_TOKEN is required');
  }
}

validateConfig();
```

**Bun.serve() Integration:**
```typescript
// server.ts
import { HetznerClient } from './lib/hetzner-client';
import { waitForAction } from './utils/hetzner-actions';

const hetzner = new HetznerClient(process.env.HCLOUD_API_TOKEN!);

Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/api/servers' && req.method === 'POST') {
      const body = await req.json();
      const result = await hetzner.createServer(body);

      // Wait for action in background
      waitForAction(result.action.id).then(action => {
        console.log(`Server ${result.server.id} ready: ${action.status}`);
      });

      return Response.json({
        serverId: result.server.id,
        actionId: result.action.id
      });
    }

    if (url.pathname === '/api/actions/:id') {
      const id = parseInt(url.pathname.split('/').pop()!);
      const action = await hetzner.getAction(id);
      return Response.json(action);
    }

    return new Response('Not Found', { status: 404 });
  }
});
```

### Type-Safe Action Handling

Create type-safe action wrappers with TypeScript enums and discriminated unions.

```typescript
// types/actions.ts
export enum ActionCommand {
  CreateServer = 'create_server',
  StartServer = 'start_server',
  StopServer = 'stop_server',
  RebootServer = 'reboot_server',
  DeleteServer = 'delete_server',
  CreateVolume = 'create_volume',
  AttachVolume = 'attach_volume',
  DetachVolume = 'detach_volume',
}

export enum ActionStatus {
  Running = 'running',
  Success = 'success',
  Error = 'error',
}

export type ActionResource = {
  id: number;
  type: 'server' | 'volume' | 'network' | 'floating_ip' | 'load_balancer';
};

export type BaseAction = {
  id: number;
  command: ActionCommand;
  status: ActionStatus;
  started: string;
  finished: string | null;
  progress: number;
  resources: ActionResource[];
};

export type SuccessAction = BaseAction & {
  status: ActionStatus.Success;
  error: null;
};

export type ErrorAction = BaseAction & {
  status: ActionStatus.Error;
  error: {
    code: string;
    message: string;
  };
};

export type RunningAction = BaseAction & {
  status: ActionStatus.Running;
  error: null;
};

export type HetznerAction = SuccessAction | ErrorAction | RunningAction;

// Type guard for success
export function isSuccessAction(action: HetznerAction): action is SuccessAction {
  return action.status === ActionStatus.Success;
}

// Type guard for error
export function isErrorAction(action: HetznerAction): action is ErrorAction {
  return action.status === ActionStatus.Error;
}
```

**Using the Type-Safe Actions:**
```typescript
import { HetznerAction, isSuccessAction, isErrorAction } from './types/actions';

async function handleAction(actionId: number): Promise<void> {
  const action: HetznerAction = await getAction(actionId);

  if (isSuccessAction(action)) {
    // TypeScript knows action.error is null here
    console.log(`Action ${action.command} completed successfully`);
    return;
  }

  if (isErrorAction(action)) {
    // TypeScript knows action.error exists here
    console.error(
      `Action failed: ${action.error.code} - ${action.error.message}`
    );
    throw new Error(action.error.message);
  }

  // Action is still running
  console.log(`Progress: ${action.progress}%`);
}
```

### React Query Integration

For TSX frontend integration with React Query:

```typescript
// hooks/useHetznerAction.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { waitForAction } from '../utils/hetzner-actions';
import type { HetznerAction } from '../types/hetzner';

export function useHetznerAction(actionId: number | null) {
  return useQuery({
    queryKey: ['hetzner-action', actionId],
    queryFn: () => fetch(`/api/actions/${actionId}`).then(r => r.json()),
    enabled: !!actionId,
    refetchInterval: (query) => {
      // Stop polling when action completes
      const action = query.state.data as HetznerAction;
      return action?.status === 'running' ? 2000 : false;
    }
  });
}

export function useCreateServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      serverType: string;
      image: string;
    }) => {
      const response = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch actions
      queryClient.invalidateQueries({
        queryKey: ['hetzner-action', data.actionId]
      });
    }
  });
}
```

### Error Handling with Zod

Using `@modexvpn/hcloud` with Zod for runtime validation:

```typescript
import { z } from 'zod';

export const ActionSchema = z.object({
  id: z.number(),
  command: z.string(),
  status: z.enum(['running', 'success', 'error']),
  started: z.string(),
  finished: z.string().nullable(),
  progress: z.number().min(0).max(100),
  resources: z.array(z.object({
    id: z.number(),
    type: z.enum(['server', 'volume', 'network', 'floating_ip', 'load_balancer'])
  })),
  error: z.object({
    code: z.string(),
    message: z.string()
  }).nullable()
});

export type ValidatedAction = z.infer<typeof ActionSchema>;

// Runtime validation
export async function getValidatedAction(id: number): Promise<ValidatedAction> {
  const response = await fetch(`https://api.hetzner.cloud/v1/actions/${id}`);
  const data = await response.json();

  return ActionSchema.parse(data);
}
```

## See Also

- [Hetzner Cloud API Reference](https://docs.hetzner.cloud/reference/cloud#actions)
- [Hetzner Cloud Python SDK](https://github.com/hetznercloudcloud/hcloud-python)
- [Hetzner Cloud Go SDK](https://github.com/hetznercloud/hcloud-go)
- [Hetzner Cloud Servers Overview](/docs/stack/hcloud/overview)
- [Hetzner Cloud Architecture](/docs/stack/hcloud/architecture)
