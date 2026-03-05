# Scaling Strategies: Platform Architecture

**Goal:** Scale Cheapspaces beyond Hetzner's per-project limits
**Challenge:** Default quota of 5 servers per project (can be increased)
**Solution:** Multi-faceted scaling approach

---

## The Problem

### Hetzner's Default Limits

```
Per-Project Quotas:
├── Shared resource servers (CX, CPX, CAX): 5 default
├── Dedicated resource servers (CCX): 8 default
├── Networks per server: 3
├── Servers per network: 100
└── Floating IPs: No explicit limit
```

**For a platform running autonomous AI agents**, 5-8 servers is insufficient for:
- Multiple concurrent jobs
- High-availability deployments
- Multi-tenant isolation
- Overflow capacity

---

## Strategy 1: Request Quota Increase (Easiest)

### How It Works

Hetzner's limits are **quotas, not technical hard limits**. You can request increases directly from the console.

### Steps

1. Go to **Hetzner Console**
2. Click your **project name** (top menu)
3. Select **Quotas** from the left menu
4. Find `Servers` quota
5. Click **Request Increase**
6. Provide a clear use case:
   ```
   "Multi-agent development platform running parallel
   AI workflows. Need capacity for 50 concurrent
   autonomous agents working on isolated tasks."
   ```
7. Submit and wait for approval (usually hours, not days)

### Expected Results

| Request | Typical Approval | Notes |
|---------|------------------|-------|
| 10-20 servers | Almost always | No questions asked |
| 50 servers | Usually approved | Legitimate use case |
| 100+ servers | May require details | Business use, production workloads |

### Pros & Cons

```
✅ Pros:
   - Easiest solution (one-time request)
   - No architecture changes needed
   - Maintains single-project simplicity
   - Quick turnaround (hours to days)

❌ Cons:
   - Still has a hard limit (even if higher)
   - Single point of failure (one project)
   - All servers in one billing account
   - Harder to multi-tenant later
```

---

## Strategy 2: Multiple Hetzner Projects

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Cheapspaces Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Project A (50 servers)                              │  │
│  │  ├── Environment: dev                                │  │
│  │  ├── Environment: staging                            │  │
│  │  └── Environment: team-alpha                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Project B (50 servers)                              │  │
│  │  ├── Environment: production                         │  │
│  │  └── Environment: experiments                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Project C (50 servers)                              │  │
│  │  └── Environment: overflow-queue                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Total Capacity: 150 servers                               │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// Extend metadata to track project association
interface EnvironmentMetadata {
  id: string;                  // Hetzner server ID
  hetznerProjectId: string;    // NEW: Which Hetzner project
  description?: string;
  project?: string;            // Logical grouping (your app's concept)
  owner?: string;
  environmentType?: 'development' | 'staging' | 'production';
}

// HetznerClient needs project-aware initialization
class MultiProjectHetznerManager {
  private clients: Map<string, HetznerClient> = new Map();

  constructor(apiTokens: Record<string, string>) {
    // apiTokens = { projectA: 'token...', projectB: 'token...' }
    for (const [projectId, token] of Object.entries(apiTokens)) {
      this.clients.set(projectId, new HetznerClient(token));
    }
  }

  findAvailableProject(): string {
    // Find project with capacity
    for (const [projectId, client] of this.clients) {
      const usage = client.getCurrentUsage();
      const quota = client.getQuota();
      if (usage < quota) return projectId;
    }
    throw new Error('All projects at capacity');
  }

  async createServer(options: CreateServerOptions): Promise<Server> {
    const projectId = this.findAvailableProject();
    const client = this.clients.get(projectId)!;
    return await client.servers.create(options);
  }
}
```

### Pros & Cons

```
✅ Pros:
   - No single quota limit
   - Can scale indefinitely (more projects)
   - Natural isolation for environments
   - Separate billing per project if needed

❌ Cons:
   - More complex architecture
   - Multiple API tokens to manage
   - Need project-aware load balancing
   - UI needs to show project association
```

---

## Strategy 3: Multi-Cloud Support (Stated Vision)

### Architecture

```typescript
// Cloud provider abstraction
interface CloudProvider {
  type: 'hetzner' | 'aws' | 'gcp' | 'azure' | 'digitalocean';
  name: string;
  apiToken: string;
  quota: number;
  currentUsage: number;
  regions: string[];
  pricing: PricingInfo;
}

interface PricingInfo {
  hourlyRate: number;  // Euros per hour
  monthlyRate: number;
  freeTierIncluded?: string;
}

// Manager handles multiple providers
class CloudResourceManager {
  providers: CloudProvider[] = [];

  async findBestProvider(requirements: JobRequirements): Promise<CloudProvider> {
    // Consider:
    // - Available capacity
    // - Cost optimization
    // - Geographic region
    // - Provider-specific features

    const available = this.providers.filter(p => p.currentUsage < p.quota);

    if (requirements.priority === 'cost') {
      return available.sort((a, b) =>
        a.pricing.hourlyRate - b.pricing.hourlyRate
      )[0];
    }

    if (requirements.priority === 'speed') {
      return available.sort((a, b) =>
        (b.quota - b.currentUsage) - (a.quota - a.currentUsage)
      )[0];
    }

    return available[0];
  }
}
```

### Provider Comparison

| Provider | Min Cost | Typical Cost | Quota Approach | Notes |
|----------|----------|--------------|----------------|-------|
| **Hetzner** | €4/mo | €8-20/mo | Request increase | Best value EU |
| **DigitalOcean** | $4/mo | $6-24/mo | Default high limits | Easy to use |
| **AWS** (EC2) | ~$8/mo | $15-50/mo | Service quotas | Expensive but powerful |
| **GCP** (Compute) | ~$6/mo | $10-40/mo | Resource policies | Free tier credits |
| **Azure** (VM) | ~$7/mo | $12-45/mo | Subscription limits | Enterprise features |

### Pros & Cons

```
✅ Pros:
   - True platform independence
   - Geographic distribution
   - Price optimization across providers
   - Provider-specific feature access
   - No single point of failure

❌ Cons:
   - Most complex to implement
   - Provider-specific quirks to handle
   - Different APIs to abstract
   - Billing fragmentation
   - Network complexity (cross-provider)
```

---

## Strategy 4: Job Queue Model (Server Reuse)

### The Problem with Persistent Servers

```
Current Model (Inefficient):
├── 100 jobs queued
├── Spin up 100 servers (€800/mo)
├── Each runs 1 job
├── All idle after 2 hours
└── Cost: €800 for 2 hours of work
```

### The Solution: Sequential Job Processing

```
Queue Model (Efficient):
├── 100 jobs queued
├── Spin up 10 servers (€80/mo)
├── Process jobs sequentially (10 rounds)
├── Each server handles 10 jobs
└── Cost: €80 for 20 hours of work (but overnight!)
```

### Implementation

```typescript
interface Job {
  id: string;
  repository: string;
  prompt: string;
  priority: 'high' | 'normal' | 'low';
  estimatedDuration: number;  // minutes
  maxCost: number;  // euros
}

class JobScheduler {
  private maxConcurrent = 10;
  private queue: Job[] = [];
  private running = new Map<string, Job>();

  async enqueue(job: Job): Promise<void> {
    this.queue.push(job);
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const job = this.queue.shift()!;

      // Find or create server
      const server = await this.ensureCapacity();

      // Run job
      this.running.set(server.id, job);
      this.runJob(server, job).finally(() => {
        this.running.delete(server.id);
        this.processQueue();  // Process next job
      });
    }
  }

  private async ensureCapacity(): Promise<Server> {
    const activeServers = this.running.size;

    if (activeServers < this.maxConcurrent) {
      // Can we reuse an idle server?
      const idleServer = await this.findIdleServer();
      if (idleServer) return idleServer;

      // Need to create new server
      return await this.createServer();
    }

    throw new Error('No capacity available');
  }

  private async runJob(server: Server, job: Job): Promise<JobResult> {
    const result = await this.executeOnServer(server, job);

    // Decide: terminate or recycle?
    const nextJob = this.queue[0];

    if (nextJob && this.canReuse(server, nextJob)) {
      // Keep server alive for next job
      await this.prepareForNextJob(server, nextJob);
      return server;
    } else {
      // Terminate to save costs
      await this.terminateServer(server);
      return result;
    }
  }

  private canReuse(server: Server, nextJob: Job): boolean {
    // Reuse if:
    // - Same repository (no need to re-clone)
    // - Server is healthy
    // - Not approaching hourly billing boundary
    return server.repository === nextJob.repository &&
           server.isHealthy &&
           this.minutesUntilNextBilling(server) > 10;
  }
}
```

### Cost Comparison

| Scenario | Servers | Jobs | Cost/Month | Notes |
|----------|---------|------|------------|-------|
| Persistent | 100 | 100 (parallel) | €800 | Fast, expensive |
| Queue (10 concurrent) | 10 | 100 (sequential) | €80 | Slower, 10x cheaper |
| Queue (5 concurrent) | 5 | 100 (sequential) | €40 | Slower, 20x cheaper |

**For overnight jobs (8 hours):**
- 10 servers × 8 hours = 80 server-hours
- Can process ~40 jobs (assuming 12 min/job + overhead)
- Cost: €80/mo ÷ 720 hours × 80 hours = **€8.89 per night**

### Pros & Cons

```
✅ Pros:
   - Massive cost savings
   - Fewer servers to manage
   - Better resource utilization
   - Scales with queue depth, not concurrency

❌ Cons:
   - Jobs take longer (sequential)
   - Need robust job scheduling
   - State management between jobs
   - Failure recovery complexity
```

---

## Strategy 5: User-Provided Infrastructure (True Multi-Tenant)

### The Model

```
Traditional SaaS:
├── User pays you $10/mo
├── You pay Hetzner $8/mo
├── You manage infrastructure
└── You absorb quota limits

Bring-Your-Own-Cloud (BYOC):
├── User uses their own Hetzner account
├── User manages their own quota
├── You provide orchestration software
└── You charge for platform features (or free + support)
```

### Implementation

```typescript
interface UserConfig {
  userId: string;
  cloudProviders: {
    type: 'hetzner' | 'aws' | 'gcp';
    apiToken: string;
    quotaLimit: number;
    regions: string[];
  }[];
  subscription: {
    tier: 'free' | 'pro' | 'enterprise';
    maxConcurrentJobs: number;
    features: string[];
  };
}

class MultiTenantCloudManager {
  private users: Map<string, UserConfig> = new Map();

  async provisionServerForUser(userId: string, job: Job): Promise<Server> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    // Find user's available capacity
    const provider = user.cloudProviders.find(p =>
      p.currentUsage < p.quotaLimit
    );

    if (!provider) {
      throw new Error(
        'User quota exceeded. Please increase your Hetzner quota.'
      );
    }

    // Create server in user's account
    return await this.createServer(provider, job);
  }

  async checkUserQuota(userId: string): Promise<QuotaStatus> {
    const user = this.users.get(userId)!;
    const provider = user.cloudProviders[0];

    const client = new HetznerClient(provider.apiToken);
    const current = await client.servers.list();

    return {
      used: current.length,
      limit: provider.quotaLimit,
      remaining: provider.quotaLimit - current.length,
      percentage: (current.length / provider.quotaLimit) * 100
    };
  }
}
```

### Pros & Cons

```
✅ Pros:
   - Infinitely scalable (no central quota)
   - Users control their costs
   - No infrastructure costs for you
   - Natural isolation and security
   - Can charge for platform, not infra

❌ Cons:
   - Need authentication/authorization
   - Multi-tenant security complexity
   - Support burden increases
   - User onboarding friction
   - Billing complexity (if charging)
```

---

## Recommended Approach for Cheapspaces

### Phase 1: Quick Win (Week 1)

```
1. Request quota increase to 50 servers
   - Takes: 10 minutes
   - Impact: 10x capacity immediately
   - Risk: None

2. Implement job queue model
   - Takes: 3-5 days
   - Impact: 10x cost efficiency
   - Risk: Medium (state management)

Result: 50 servers can process 500+ jobs/night sequentially
```

### Phase 2: Multi-Project (Week 2-3)

```
1. Add project tracking to metadata
2. Implement MultiProjectHetznerManager
3. Create 2-3 additional Hetzner projects
4. Add project selection to UI

Result: 150+ server capacity, better isolation
```

### Phase 3: Multi-Cloud (Month 2+)

```
1. Design CloudProvider interface
2. Add DigitalOcean support (easiest second provider)
3. Add AWS/GCP as needed
4. Price optimization routing

Result: True platform independence, geographic distribution
```

### Phase 4: Multi-Tenant (Future)

```
1. Add user authentication
2. Implement BYOC model
3. Build user management UI
4. Add quota monitoring per user

Result: Infinitely scalable SaaS platform
```

---

## Decision Matrix

| Strategy | Time to Implement | Complexity | Scalability | Cost Impact | Priority |
|----------|-------------------|------------|-------------|-------------|----------|
| **Quota Increase** | Hours | Low | 10x | Neutral | **Do first** |
| **Job Queue** | Days | Medium | 10x | 10x cheaper | **Do second** |
| **Multi-Project** | 1-2 weeks | Medium | 30x | Neutral | **Do third** |
| **Multi-Cloud** | 1-2 months | High | Unlimited | Variable | **Do later** |
| **Multi-Tenant** | 2-3 months | Very High | Unlimited | Revenue+ | **Do last** |

---

## Code Examples

### Quota Monitoring

```typescript
// API endpoint to check quota status
app.get('/api/quota/status', async (c) => {
  const hetzner = new HetznerClient();  // Uses env token

  const servers = await hetzner.servers.list();
  const quota = await hetzner.getQuota();

  return c.json({
    project: hetzner.projectName,
    servers: {
      used: servers.length,
      limit: quota.servers,
      remaining: quota.servers - servers.length,
      percentage: ((servers.length / quota.servers) * 100).toFixed(1)
    },
    networks: {
      used: countNetworks(servers),
      limit: 3,  // Per server
      remaining: 'N/A'
    },
    recommendation: generateRecommendation(servers.length, quota.servers)
  });
});

function generateRecommendation(used: number, limit: number): string {
  const percentage = (used / limit) * 100;

  if (percentage >= 90) {
    return 'CRITICAL: Request quota increase or use job queue model';
  } else if (percentage >= 70) {
    return 'WARNING: Approaching quota limit. Consider job queue.';
  } else if (percentage >= 50) {
    return 'INFO: Half capacity used. Monitor usage.';
  }

  return 'OK: Plenty of capacity available.';
}
```

### Job Queue API

```typescript
// Submit job to queue
app.post('/api/jobs', async (c) => {
  const body = await c.req.json();
  const job: Job = {
    id: crypto.randomUUID(),
    repository: body.repository,
    prompt: body.prompt,
    priority: body.priority || 'normal',
    estimatedDuration: body.estimatedDuration || 30,
    maxCost: body.maxCost || 10,
    createdAt: new Date()
  };

  await jobScheduler.enqueue(job);

  return c.json({
    jobId: job.id,
    status: 'queued',
    position: jobScheduler.getQueuePosition(job.id),
    estimatedStart: jobScheduler.estimateStartTime(job.id)
  });
});

// Get job status
app.get('/api/jobs/:id', async (c) => {
  const jobId = c.req.param('id');
  const status = await jobScheduler.getJobStatus(jobId);

  return c.json({
    jobId: status.id,
    status: status.status,  // queued | running | completed | failed
    progress: status.progress,
    currentIteration: status.iteration,
    startedAt: status.startedAt,
    estimatedCompletion: status.estimatedCompletion,
    serverId: status.serverId,
    costSoFar: status.cost
  });
});
```

---

## Monitoring & Alerts

### Dashboard Metrics

```typescript
interface PlatformMetrics {
  servers: {
    total: number;
    running: number;
    idle: number;
    error: number;
  };
  jobs: {
    queued: number;
    running: number;
    completedToday: number;
    avgDuration: number;
  };
  costs: {
    projectedDaily: number;
    projectedMonthly: number;
    actualToday: number;
  };
  quota: {
    used: number;
    limit: number;
    percentage: number;
  };
}

// Real-time updates via WebSocket
ws.broadcast({
  type: 'metrics',
  data: await collectPlatformMetrics()
});
```

---

## Summary

**The key insight:** You don't need 100 persistent servers. You need:

1. **Higher quota** (ask Hetzner, they'll say yes)
2. **Job queue** (process 500 jobs with 10 servers)
3. **Smart reuse** (keep servers alive between jobs)
4. **Multi-project** (when single project isn't enough)

**For MVP:**
- Request 50 server quota
- Implement job queue with 10 concurrent servers
- Process 500+ jobs/night sequentially
- Cost: ~€40/month instead of €400/month

**For scale:**
- Add more Hetzner projects as needed
- Add multi-cloud for independence
- Add multi-tenant for SaaS model

---

**Document Last Updated:** 2026-01-16
**Status:** Ready for implementation
