# Node Agent Integration - Tailscale API

**Purpose:** Document how to integrate cheapspaces with Node Agent using Tailscale API for service discovery and communication.

**Date:** 2026-01-17
**Status:** Design Phase

---

## Overview

The Node Agent runs on each VPS and provides an HTTP API for managing git worktrees and Ralph loops. To communicate with Node Agents securely, cheapspaces uses Tailscale VPN to discover and reach each node.

```
┌─────────────────┐         Tailscale API          ┌──────────────┐
│                 │ ──────────────────────────────> │              │
│  Cheapspaces    │                                     │ Tailscale   │
│  (localhost)    │ <──────────────────────────────  │  Control     │
│                 │      List devices & IPs          │     Plane    │
└────────┬────────┘                                     └──────────────┘
         │                                                    │
         │ Tailscale VPN (100.x.x.x)                       │
         │                                                    │
         v                                                    │
┌─────────────────┐                                         │
│  Node Agent     │                                         │
│  (VPS :8911)    │                                         │
│  - /api/status  │                                         │
│  - /api/worktrees                                        │
│  - /api/ralph-loops                                       │
└─────────────────┘                                         │
```

---

## Architecture

### Components

| Component | Responsibility |
|-----------|---------------|
| **Tailscale API Client** | Query Tailscale for device list and IPs |
| **Environment Sync** | Match Tailscale devices to environments by hostname |
| **Node Agent Client** | HTTP client to call Node Agent APIs |
| **Database Layer** | Store Tailscale IPs for each environment |
| **API Proxy** | Expose Node Agent data through cheapspaces API |
| **UI Components** | Display worktrees, Ralph loops, and controls |

---

## Database Schema Changes

### 1. Add Tailscale Fields to Environments

```sql
-- Add Tailscale tracking fields
ALTER TABLE environments ADD COLUMN tailscale_ip TEXT;
ALTER TABLE environments ADD COLUMN tailscale_hostname TEXT;
ALTER TABLE environments ADD COLUMN tailscale_online BOOLEAN DEFAULT false;
ALTER TABLE environments ADD COLUMN tailscale_last_sync TIMESTAMP;

-- Add indexes for lookups
CREATE INDEX idx_environments_tailscale_ip ON environments(tailscale_ip);
CREATE INDEX idx_environments_tailscale_hostname ON environments(tailscale_hostname);
```

### 2. TypeScript Types

```typescript
// app/backend/shared/lib/schemas/api.ts

export const EnvironmentSchema = z.object({
  // ... existing fields ...
  tailscale_ip: z.string().nullable().optional(),
  tailscale_hostname: z.string().nullable().optional(),
  tailscale_online: z.boolean().optional(),
  tailscale_last_sync: z.string().datetime().nullable().optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;
```

---

## Tailscale API Integration

### 1. API Client

**File:** `app/backend/shared/lib/tailscale/client.ts`

```typescript
interface TailscaleDevice {
  name: string;
  addresses: string[];
  os: string;
  online: boolean;
  lastSeen: string;
  tags: string[];
}

interface TailscaleAPIResponse {
  devices: TailscaleDevice[];
}

export class TailscaleClient {
  private apiKey: string;
  private tailnet: string;
  private baseUrl = "https://api.tailscale.com/api/v2";

  constructor() {
    this.apiKey = process.env.TAILSCALE_API_KEY || "";
    this.tailnet = process.env.TAILNET_NAME || "";

    if (!this.apiKey) {
      throw new Error("TAILSCALE_API_KEY not set");
    }
    if (!this.tailnet) {
      throw new Error("TAILNET_NAME not set");
    }
  }

  async listDevices(): Promise<TailscaleDevice[]> {
    const response = await fetch(
      `${this.baseUrl}/tailnet/${this.tailnet}/devices`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Tailscale API error: ${response.statusText}`);
    }

    const data = await response.json() as TailscaleAPIResponse;
    return data.devices;
  }

  async getDeviceByName(name: string): Promise<TailscaleDevice | null> {
    const devices = await this.listDevices();
    return devices.find(d => d.name === name) || null;
  }
}
```

### 2. Sync Service

**File:** `app/backend/shared/services/tailscale-sync.ts`

```typescript
import { TailscaleClient } from "../lib/tailscale/client.js";

export class TailscaleSyncService {
  private tailscale: TailscaleClient;

  constructor() {
    this.tailscale = new TailscaleClient();
  }

  async syncEnvironment(envId: string): Promise<{
    tailscale_ip?: string;
    tailscale_hostname?: string;
    tailscale_online?: boolean;
  }> {
    // Get environment from database
    const env = await getEnvironment(envId);
    if (!env) {
      throw new Error("Environment not found");
    }

    // Find matching Tailscale device by hostname
    const device = await this.tailscale.getDeviceByName(env.name);

    if (!device) {
      return {
        tailscale_hostname: env.name,
        tailscale_online: false,
      };
    }

    // Update environment with Tailscale data
    const update = {
      tailscale_ip: device.addresses[0] || null,
      tailscale_hostname: device.name,
      tailscale_online: device.online,
      tailscale_last_sync: new Date().toISOString(),
    };

    await updateEnvironment(envId, update);
    return update;
  }

  async syncAllEnvironments(): Promise<void> {
    const envs = await getAllEnvironments();

    for (const env of envs) {
      try {
        await this.syncEnvironment(env.id);
      } catch (error) {
        console.error(`Failed to sync ${env.name}:`, error);
      }
    }
  }
}
```

---

## Node Agent Client

### HTTP Client

**File:** `app/backend/shared/lib/node-agent/client.ts`

```typescript
interface NodeAgentStatus {
  node_id: string;
  hostname: string;
  tailscale_ip: string;
  capacity: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
  };
  worktrees: Worktree[];
  ralph_loops: RalphLoop[];
}

interface Worktree {
  id: string;
  path: string;
  branch: string;
  created_at: string;
  commits: number;
}

interface RalphLoop {
  id: string;
  worktree_id: string;
  status: "running" | "stopped" | "completed" | "failed";
  iteration: number;
  max_iterations: number;
  completion_promise: string;
  created_at: string;
  commits: number;
}

export class NodeAgentClient {
  private baseUrl: string;

  constructor(tailscaleIp: string) {
    this.baseUrl = `http://${tailscaleIp}:8911`;
  }

  async getStatus(): Promise<NodeAgentStatus> {
    const response = await fetch(`${this.baseUrl}/api/status`);
    if (!response.ok) {
      throw new Error(`Node Agent error: ${response.statusText}`);
    }
    return response.json();
  }

  // Worktree operations
  async listWorktrees(): Promise<{ worktrees: Worktree[] }> {
    const response = await fetch(`${this.baseUrl}/api/worktrees`);
    return response.json();
  }

  async createWorktree(params: {
    id: string;
    branch: string;
    repository_url?: string;
  }): Promise<{ worktree: Worktree }> {
    const response = await fetch(`${this.baseUrl}/api/worktrees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return response.json();
  }

  async deleteWorktree(worktreeId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/worktrees/${worktreeId}`, {
      method: "DELETE",
    });
  }

  // Ralph Loop operations
  async listRalphLoops(): Promise<{ ralph_loops: RalphLoop[] }> {
    const response = await fetch(`${this.baseUrl}/api/ralph-loops`);
    return response.json();
  }

  async startRalphLoop(params: {
    worktree_id: string;
    prompt: string;
    max_iterations?: number;
    completion_promise?: string;
  }): Promise<{ ralph_loop: RalphLoop }> {
    const response = await fetch(`${this.baseUrl}/api/ralph-loops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return response.json();
  }

  async stopRalphLoop(loopId: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/ralph-loops/${loopId}`, {
      method: "DELETE",
    });
  }

  async getRalphLoopLogs(loopId: string): Promise<{ logs: string[] }> {
    const response = await fetch(`${this.baseUrl}/api/ralph-loops/${loopId}/logs`);
    return response.json();
  }
}
```

---

## API Endpoints

### New Endpoints

**File:** `app/backend/shared/index.ts`

```typescript
// GET /api/environments/:id/tailscale - Get Tailscale info
app.get("/api/environments/:id/tailscale", async (c) => {
  const envId = c.req.param("id");
  const env = await getEnvironment(envId);

  return c.json({
    tailscale_ip: env.tailscale_ip,
    tailscale_hostname: env.tailscale_hostname,
    tailscale_online: env.tailscale_online,
    tailscale_last_sync: env.tailscale_last_sync,
  });
});

// POST /api/environments/:id/sync-tailscale - Sync Tailscale IP
app.post("/api/environments/:id/sync-tailscale", async (c) => {
  const envId = c.req.param("id");
  const syncService = new TailscaleSyncService();

  const result = await syncService.syncEnvironment(envId);
  return c.json({ success: true, ...result });
});

// POST /api/environments/sync-tailscale - Sync all environments
app.post("/api/environments/sync-tailscale", async (c) => {
  const syncService = new TailscaleSyncService();
  await syncService.syncAllEnvironments();
  return c.json({ success: true });
});

// GET /api/environments/:id/node-agent - Get Node Agent status
app.get("/api/environments/:id/node-agent", async (c) => {
  const envId = c.req.param("id");
  const env = await getEnvironment(envId);

  if (!env.tailscale_ip) {
    return c.json({
      success: false,
      error: "Tailscale IP not found. Sync Tailscale first."
    }, 400);
  }

  const client = new NodeAgentClient(env.tailscale_ip);
  const status = await client.getStatus();

  return c.json({ success: true, status });
});

// GET /api/environments/:id/worktrees - List worktrees
app.get("/api/environments/:id/worktrees", async (c) => {
  const envId = c.req.param("id");
  const env = await getEnvironment(envId);

  if (!env.tailscale_ip) {
    return c.json({ success: false, error: "No Tailscale IP" }, 400);
  }

  const client = new NodeAgentClient(env.tailscale_ip);
  const result = await client.listWorktrees();

  return c.json({ success: true, ...result });
});

// POST /api/environments/:id/worktrees - Create worktree
app.post("/api/environments/:id/worktrees", async (c) => {
  const envId = c.req.param("id");
  const env = await getEnvironment(envId);

  if (!env.tailscale_ip) {
    return c.json({ success: false, error: "No Tailscale IP" }, 400);
  }

  const body = await c.req.json();
  const client = new NodeAgentClient(env.tailscale_ip);
  const result = await client.createWorktree(body);

  return c.json({ success: true, ...result });
});

// DELETE /api/environments/:id/worktrees/:worktreeId - Delete worktree
app.delete("/api/environments/:id/worktrees/:worktreeId", async (c) => {
  const envId = c.req.param("id");
  const worktreeId = c.req.param("worktreeId");
  const env = await getEnvironment(envId);

  if (!env.tailscale_ip) {
    return c.json({ success: false, error: "No Tailscale IP" }, 400);
  }

  const client = new NodeAgentClient(env.tailscale_ip);
  await client.deleteWorktree(worktreeId);

  return c.json({ success: true });
});

// GET /api/environments/:id/ralph-loops - List Ralph loops
app.get("/api/environments/:id/ralph-loops", async (c) => {
  const envId = c.req.param("id");
  const env = await getEnvironment(envId);

  if (!env.tailscale_ip) {
    return c.json({ success: false, error: "No Tailscale IP" }, 400);
  }

  const client = new NodeAgentClient(env.tailscale_ip);
  const result = await client.listRalphLoops();

  return c.json({ success: true, ...result });
});

// POST /api/environments/:id/ralph-loops - Start Ralph loop
app.post("/api/environments/:id/ralph-loops", async (c) => {
  const envId = c.req.param("id");
  const env = await getEnvironment(envId);

  if (!env.tailscale_ip) {
    return c.json({ success: false, error: "No Tailscale IP" }, 400);
  }

  const body = await c.req.json();
  const client = new NodeAgentClient(env.tailscale_ip);
  const result = await client.startRalphLoop(body);

  return c.json({ success: true, ...result });
});

// DELETE /api/environments/:id/ralph-loops/:loopId - Stop Ralph loop
app.delete("/api/environments/:id/ralph-loops/:loopId", async (c) => {
  const envId = c.req.param("id");
  const loopId = c.req.param("loopId");
  const env = await getEnvironment(envId);

  if (!env.tailscale_ip) {
    return c.json({ success: false, error: "No Tailscale IP" }, 400);
  }

  const client = new NodeAgentClient(env.tailscale_ip);
  await client.stopRalphLoop(loopId);

  return c.json({ success: true });
});

// GET /api/environments/:id/ralph-loops/:loopId/logs - Get loop logs
app.get("/api/environments/:id/ralph-loops/:loopId/logs", async (c) => {
  const envId = c.req.param("id");
  const loopId = c.req.param("loopId");
  const env = await getEnvironment(envId);

  if (!env.tailscale_ip) {
    return c.json({ success: false, error: "No Tailscale IP" }, 400);
  }

  const client = new NodeAgentClient(env.tailscale_ip);
  const result = await client.getRalphLoopLogs(loopId);

  return c.json({ success: true, ...result });
});
```

---

## Configuration

### Environment Variables

Add to `.env` or environment:

```bash
# Tailscale API Configuration
TAILSCALE_API_KEY=tskey-api-xxxxxxxxx
TAILNET_NAME=ebowwa.github  # Your tailnet name

# Node Agent Configuration
NODE_AGENT_PORT=8911
NODE_AGENT_TIMEOUT=30000  # 30 seconds
```

### Getting Tailscale API Key

1. Go to https://login.tailscale.com/admin/settings/keys
2. Click "Generate API key"
3. Select "Read" scope (need to list devices)
4. Copy the key (starts with `tskey-api-`)
5. Add to environment variables

### Finding Your Tailnet Name

Your tailnet name is typically:
- `yourname.github` for GitHub accounts
- `yourname@gmail.com` for Google accounts
- Or check Tailscale admin console: https://login.tailscale.com/admin/dns

---

## UI Components Needed

### 1. Environment Card Enhancements

```typescript
// Show Tailscale status
<div className="tailscale-status">
  <StatusDot online={env.tailscale_online} />
  <span>Tailscale: {env.tailscale_ip || "Not synced"}</span>
  <Button onClick={() => syncTailscale(env.id)}>Sync</Button>
</div>

// Show Node Agent capacity
{env.tailscale_ip && (
  <div className="node-agent-capacity">
    <ProgressBar label="CPU" value={status.capacity.cpu_percent} />
    <ProgressBar label="Memory" value={status.capacity.memory_percent} />
    <ProgressBar label="Disk" value={status.capacity.disk_percent} />
  </div>
)}
```

### 2. Worktrees Panel

```typescript
// List worktrees for an environment
<div className="worktrees-panel">
  <Header>
    <h3>Worktrees</h3>
    <Button onClick={() => createWorktree()}>+ New Worktree</Button>
  </Header>

  <WorktreeList>
    {worktrees.map(wt => (
      <WorktreeItem key={wt.id}>
        <span>{wt.branch}</span>
        <span>{wt.commits} commits</span>
        <Button onClick={() => deleteWorktree(wt.id)}>Delete</Button>
      </WorktreeItem>
    ))}
  </WorktreeList>
</div>
```

### 3. Ralph Loops Panel

```typescript
// List active Ralph loops
<div className="ralph-loops-panel">
  <Header>
    <h3>Active Tasks</h3>
    <Button onClick={() => startLoop()}>+ Start Task</Button>
  </Header>

  <LoopList>
    {ralphLoops.map(loop => (
      <LoopItem key={loop.id}>
        <LoopStatus status={loop.status} />
        <span>Iteration {loop.iteration}/{loop.max_iterations}</span>
        <span>{loop.commits} commits</span>
        <Button onClick={() => viewLogs(loop.id)}>Logs</Button>
        <Button onClick={() => stopLoop(loop.id)}>Stop</Button>
      </LoopItem>
    ))}
  </LoopList>
</div>
```

### 4. Create Task Dialog

```typescript
// Dialog to start a new Ralph loop
<Dialog>
  <FormField label="Worktree">
    <Select options={worktrees} />
  </FormField>

  <FormField label="Task Prompt">
    <Textarea placeholder="Describe what Claude should do..." />
  </FormField>

  <FormField label="Max Iterations">
    <Input type="number" defaultValue={100} />
  </FormField>

  <FormField label="Completion Promise">
    <Input placeholder="e.g., 'DONE' or 'Task complete'" />
  </FormField>

  <Button onClick={startRalphLoop}>Start Autonomous Task</Button>
</Dialog>
```

---

## Implementation Steps

### Phase 1: Tailscale Integration
1. Add database schema for Tailscale fields
2. Implement Tailscale API client
3. Add sync endpoints (`/api/environments/:id/sync-tailscale`)
4. Add sync button to environment cards
5. Test syncing device IPs

### Phase 2: Node Agent Client
1. Implement NodeAgentClient class
2. Add proxy endpoints for Node Agent API
3. Test fetching status from deployed agent
4. Add error handling for offline nodes

### Phase 3: UI Components
1. Add Tailscale status display
2. Add worktrees panel
3. Add Ralph loops panel
4. Add create task dialog
5. Add logs viewer

### Phase 4: Integration Testing
1. Deploy to test VPS with Tailscale
2. Test full flow: sync → create worktree → start loop → view results
3. Test error cases: offline nodes, failed tasks
4. Performance testing with multiple nodes

---

## API Reference

### Tailscale Sync Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/environments/:id/sync-tailscale` | POST | Sync single environment |
| `/api/environments/:id/tailscale` | GET | Get Tailscale info |
| `/api/environments/sync-tailscale` | POST | Sync all environments |

### Node Agent Proxy Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/environments/:id/node-agent` | GET | Get node status |
| `/api/environments/:id/worktrees` | GET/POST | List/create worktrees |
| `/api/environments/:id/worktrees/:wid` | DELETE | Delete worktree |
| `/api/environments/:id/ralph-loops` | GET/POST | List/start loops |
| `/api/environments/:id/ralph-loops/:lid` | DELETE | Stop loop |
| `/api/environments/:id/ralph-loops/:lid/logs` | GET | Get loop logs |

---

## Security Considerations

1. **Tailscale API Key**: Store securely, use read-only key
2. **Node Agent Access**: Only accessible via Tailscale VPN
3. **API Authentication**: Consider adding API keys to Node Agent
4. **Rate Limiting**: Add rate limits to prevent abuse
5. **Input Validation**: Validate all inputs to Node Agent endpoints

---

## Troubleshooting

### Tailscale Sync Issues

**Problem**: `tailscale_ip` remains null after sync
- Check: API key is valid
- Check: Tailnet name is correct
- Check: VPS hostname matches Tailscale device name
- Check: VPS has run `sudo tailscale up`

### Node Agent Connection Issues

**Problem**: Cannot connect to Node Agent
- Check: Tailscale IP is correct
- Check: Node Agent is running (`systemctl status node-agent`)
- Check: Port 8911 is accessible through firewall
- Check: VPS is online in Tailscale admin console

### Worktree Creation Issues

**Problem**: Worktree creation fails
- Check: Git repository is configured on VPS
- Check: Repository URL is accessible
- Check: Branch exists on remote
- Check: File permissions on target directory

---

## Related Documentation

- [NODE-AGENT.md](./NODE-AGENT.md) - Full Node Agent architecture
- [NODE-AGENT-FLOW.md](./NODE-AGENT-FLOW.md) - End-to-end process
- [NODE-AGENT-TLDR.md](./NODE-AGENT-TLDR.md) - Quick reference
