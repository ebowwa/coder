# Product Vision: Multi-Agent Orchestration Platform

**Goal:** Build a competitor to Ariana that maximizes z.ai subscription ROI
**Subscription:** 5 hours / 2400 prompts per month
**Target:** Burn tokens efficiently, get autonomous AI development work done

---

## The Opportunity

### Your Subscription = $X/month for 2400 prompts

```
Current Reality:
┌─────────────────────────────────────────────────────────────────┐
│  z.ai Subscription: 5 hours / 2400 prompts per month           │
│                                                                 │
│  ❌ NOT using prompts = Wasted money                             │
│  ❌ Manual prompting = Slow, inefficient                           │
│  ❌ Single-threaded work = Limited output                          │
│                                                                 │
│  Cost: $X/month                                                   │
│  Value: ??? (depends on how much you use it)                       │
└─────────────────────────────────────────────────────────────────┘

Target State:
┌─────────────────────────────────────────────────────────────────┐
│  Multi-Agent Orchestration Platform                              │
│                                                                 │
│  ✅ 24/7 autonomous agents burning prompts efficiently           │
│  ✅ Parallel execution = multiply your output                    │
│  ✅ While you sleep, agents work                                 │
│                                                                 │
│  Cost: $X/month (same)                                           │
│  Value: 10-100x output through automation                         │
└─────────────────────────────────────────────────────────────────┘
```

### The Math

**Single-threaded manual prompting:**
- 1 prompt every 2 minutes = 30 prompts/hour
- 2400 prompts ÷ 30 = 80 hours of work
- 80 hours ÷ 160 hours/work month = **50% of your month**

**Multi-agent autonomous (target):**
- 10 agents running in parallel
- Each agent uses 240 prompts = 2400 prompts total
- But: 10x the work done in same time
- Or: same work done in 1/10th the time

**ROI Multiplier:**
- Manual: 1x output per 80 hours
- Autonomous: 10x output per 80 hours (10 agents)
- **Or: same output in 8 hours instead of 80**

---

## Product Positioning

### Competitive Analysis

| Feature | Ariana | Your Product |
|---------|---------|--------------|
| **AI Provider** | Claude Code only | z.ai (multi-provider) |
| **Infrastructure** | Hetzner only | Hetzner + AWS + GCP + custom nodes |
| **Pricing** | $4.99/mo for 300 agents | Free (use your own cloud) + z.ai sub required |
| **Open Source** | Partial (IDE only) | Fully open source |
| **Self-Host** | No | Yes |
| **Multi-Cloud** | No | Yes |
| **Custom Nodes** | No | Yes (laptop, home server, etc.) |

### Your Differentiator

**"Use your z.ai subscription on YOUR infrastructure"**

```
Ariana Model:
├── Pay $4.99/mo for platform
├── Pay for your Claude Code subscription
├── Pay for Hetzner VPS (marked up)
└── Locked into their stack

Your Model:
├── Use existing z.ai subscription (already paying)
├── Use existing cloud accounts (Hetzner, AWS, etc.)
├── Open source = no platform fees
└── Multi-cloud = best pricing everywhere
```

---

## The Product: Multi-Agent Orchestration

### What It Does

```
┌─────────────────────────────────────────────────────────────────────┐
│  YOU (set up work before bed)                                       │
│                                                                       │
│  "Hey platform, I need 3 things done overnight:"                    │
│   1. Redesign the dashboard UI                                       │
│   2. Refactor the API for performance                               │
│   3. Get test coverage to 90%                                        │
│                                                                       │
│  "Spin up whatever compute you need, use z.ai agents, make it happen" │
└─────────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────────┐
│  PLATFORM (orchestrates everything)                                 │
│                                                                       │
│  1. Provision 3 VPSs (Hetzner cpx11 @ ~€4/mo each)                     │
│  2. Clone repository to each                                         │
│  3. Create worktrees for each task                                   │
│  4. Create branches for experiments                                  │
│  5. Start z.ai agents (Ralph loops) in each worktree                 │
│  6. Monitor progress, handle errors, report results                   │
└─────────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────────┐
│  NEXT MORNING                                                        │
│                                                                       │
│  ☕ You wake up, grab coffee                                         │
│                                                                       │
│  1. Check dashboard:                                                 │
│     ├── Task 1 (Dashboard UI): ✅ Completed, 47 iterations          │
│     ├── Task 2 (API Refactor): ✅ Completed, 23 iterations          │
│     └── Task 3 (Test Coverage): ⚠️  82%, needs more work            │
│                                                                       │
│  2. Review commits:                                                  │
│     ├── Browse code changes in each worktree                         │
│     ├── Merge good work to main                                      │
│     └── Delete failed experiments                                    │
│                                                                       │
│  3. Shutdown VPSs (cost optimization)                               │
│                                                                       │
│  4. Total cost: ~€12 + z.ai sub (already paid)                      │
│                                                                       │
│  5. Time you spent: 15 minutes to review, not 8 hours to code       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Architecture: How It Works

### The Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR APP (Web + Mobile)                      │
│                        com.hetzner.codespaces                   │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                             │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ VPS Manager │  │ Worktree Mgr│  │ Agent Mgr   │               │
│  │ (existing)  │  │   (new)     │  │   (new)     │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              Z.AI AGENT INTEGRATION                           │ │
│  │                                                                 │ │
│  │  - Connect to z.ai API                                          │ │
│  │  - Spawn agents with Ralph loop pattern                        │ │
│  │  - Stream responses back to dashboard                           │ │
│  │  - Track token usage                                           │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NODE AGENTS (on each VPS)                      │
│                                                                     │
│  Agent 1: Hetzner VPS (Frontend work)                             │
│  ├── git worktree operations                                      │
│  ├── z.ai agent integration                                        │
│  └── Status reporting                                              │
│                                                                     │
│  Agent 2: Hetzner VPS (Backend work)                              │
│  Agent 3: Home Server (Testing work)                              │
│  Agent 4: Your laptop (manual oversight)                         │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```typescript
// 1. User creates "Job" in UI
interface Job {
  id: string;
  name: string;
  tasks: Task[];
  maxDuration?: number;    // Hours
  maxCost?: number;        // Euros
  createdAt: Date;
}

interface Task {
  id: string;
  repository: string;
  branch?: string;
  prompt: string;
  nodeType?: string;       // VPS type to use
  maxIterations?: number;
  completionPromise?: string;
}

// 2. Platform provisions infrastructure
async function executeJob(job: Job): Promise<JobResult> {
  const results: TaskResult[] = [];

  for (const task of job.tasks) {
    // 2a. Create VPS (or reuse existing)
    const vps = await provisionVPS(task.nodeType);

    // 2b. Clone repository
    await cloneRepo(vps, task.repository);

    // 2c. Create worktree
    const worktree = await createWorktree(vps, task.repository, task.branch);

    // 2d. Start z.ai agent
    const agent = await startAgent(worktree, task.prompt, {
      provider: 'z.ai',
      model: 'claude-sonnet-4', // or user choice
      maxTokens: 200000,
      ralphLoop: true
    });

    results.push({
      taskId: task.id,
      vpsId: vps.id,
      agentId: agent.id,
      status: 'running'
    });
  }

  // 2e. Monitor all agents
  return await monitorJob(job, results);
}

// 3. Monitor progress
async function monitorJob(job: Job, tasks: TaskResult[]): Promise<JobResult> {
  const interval = setInterval(async () => {
    for (const task of tasks) {
      const status = await getAgentStatus(task.agentId);

      // Update dashboard in real-time
      broadcastUpdate({
        jobId: job.id,
        taskId: task.taskId,
        progress: status.progress,
        recentOutput: status.output,
        iterations: status.iteration
      });

      // Check completion
      if (status.completed) {
        await cleanup(task);
      }
    }
  }, 5000); // Every 5 seconds

  return await waitForCompletion(job);
}
```

---

## Token Burn Strategy

### Goal: Use All 2400 Prompts Efficiently

```
Inefficient (Manual Prompting):
┌─────────────────────────────────────────────────────────────────┐
│  You: "Fix this bug"                                               │
│  AI: "I'll look at it..."                                       │
│  [Wait 2 minutes for response]                                    │
│  AI: "Done"                                                       │
│  You: Review, "Good, now fix this other thing"                   │
│  [Repeat x50]                                                     │
│                                                                 │
│  Token usage: 50 prompts                                         │
│  Time spent: 100 minutes (1.7 hours)                             │
│  Work done: 50 small fixes                                       │
└─────────────────────────────────────────────────────────────────┘

Efficient (Autonomous Ralph Loops):
┌─────────────────────────────────────────────────────────────────┐
│  You: "Fix all bugs in test suite" (one prompt)                   │
│  Platform: [Starts Ralph loop]                                    │
│  AI: [Iterates autonomously for 4 hours]                         │
│     - Identifies bug                                              │
│     - Fixes bug                                                  │
│     - Runs tests                                                │
│     - Commits                                                   │
│     - Identifies next bug                                        │
│     - [Repeats 200x]                                             │
│                                                                 │
│  Token usage: 200 prompts (autonomous)                           │
│  Time spent: 0 minutes (you slept)                               │
│  Work done: 200 bugs fixed                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Token Optimization

```typescript
interface TokenBudget {
  total: number;           // 2400 prompts/month
  used: number;
  remaining: number;
  resetAt: Date;
}

interface JobConfig {
  maxTokensPerJob: number;
  priority: 'speed' | 'cost' | 'quality';
}

async function optimizeTokenUsage(budget: TokenBudget, job: Job) {
  // Calculate optimal allocation

  if (job.priority === 'speed') {
    // Use tokens fast, get results quick
    // More agents, higher concurrency
    return {
      agents: 10,
      tokensPerAgent: budget.remaining / 10
    };
  }

  if (job.priority === 'cost') {
    // Stretch tokens over month
    // Fewer agents, longer iteration
    return {
      agents: 3,
      tokensPerAgent: budget.remaining / 3
    };
  }

  if (job.priority === 'quality') {
    // Maximize quality per token
    // Ultrathink enabled, thorough analysis
    return {
      agents: 5,
      tokensPerAgent: budget.remaining / 5,
      agentConfig: {
        ultrathink: true,
        maxThinking: 10000
      }
    };
  }
}
```

---

## Cost Model

### Your Costs vs Ariana's

```
Ariana Model (per month):
├── Platform fee: $4.99
├── Claude Code: $20 (your subscription)
├── Hetzner VPS: ~$12 (marked up, estimated)
├── Total: ~$37/month

Your Model (per month):
├── Platform: $0 (open source, self-hosted)
├── z.ai: $20 (your subscription - already paying)
├── Hetzner VPS: ~$12 (direct pricing, your account)
├── Total: ~$32/month + z.ai sub (already paid)

BUT:

Your Advantages:
├── Multi-cloud (cheaper options available)
├── Custom nodes (use existing hardware)
├── No platform lock-in
├── Open source (community, forks, extensions)
└── You control the data
```

### Break-Even Analysis

```
Question: How much value do you need to get for this to be worth it?

Assumptions:
├── z.ai subscription: $20/month (already paying)
├── Cloud costs: $12-50/month depending on usage
├── Your time: $X/hour (opportunity cost)

If your time is worth $50/hour:
├── Manual: 80 hours of work = $4000 value
├── Autonomous: 8 hours of oversight = $400 value
├── Net gain: -$3600 (manual is better?)

BUT:

If autonomous gets you 10x the work in same 80 hours:
├── Manual: 80 hours = 1 unit of work
├── Autonomous: 80 hours = 10 units of work
├── Net value: 9 extra units of work = $4500 value

THEREFORE:
├── Cost: $32/month + $20 (z.ai) = $52/month
├── Value: $4500 (10x output)
├── ROI: 8500%

The real question: Can you monetize the extra output?
```

---

## MVP Feature Set

### Phase 1: Core Orchestration (MVP - 2 weeks)

**What it does:**
- Manual job creation
- Spin up Hetzner VPS
- Clone repository
- Start z.ai agent
- Basic monitoring
- Manual shutdown

**User workflow:**
```
1. Create job: "Fix bugs in X"
2. Click "Start"
3. Platform spins up VPS
4. Platform starts agent
5. Check dashboard next morning
6. Manual cleanup
```

### Phase 2: Automation (Weeks 3-4)

**What it does:**
- Job templates
- Auto-provisioning
- Multi-agent parallel execution
- Auto-merge on completion
- Auto-shutdown VPS on complete/error

**User workflow:**
```
1. Select template: "Overnight bug bash"
2. Configure: repo, branches, prompts
3. Click "Schedule for tonight"
4. Wake up to completed work
5. One-click review & merge
```

### Phase 3: Optimization (Weeks 5-6)

**What it does:**
- Token usage optimization
- Smart VPS sizing
- Error recovery & retry
- Cost tracking per job
- ROI dashboard

**User workflow:**
```
1. Dashboard shows: "This job will cost $8 and use 400 tokens"
2. You approve
3. Optimizes agent count based on budget
4. Shows ROI: "Estimated value: $5000"
5. You make the call
```

---

## Go-To-Market Strategy

### Positioning Statement

```
"For developers who already pay for AI coding subscriptions,
com.hetzner.codespaces is a multi-agent orchestration platform
that maximizes your subscription ROI through autonomous 24/7 development,
unlike Ariana which locks you into their infrastructure."

```

### Target Audience

**Primary:**
- Solo developers with AI subscriptions
- Small teams wanting autonomous development
- People paying for AI but not using it efficiently

**Secondary:**
- Teams wanting multi-cloud flexibility
- Developers wanting open-source alternative
- Privacy-conscious teams (self-hosting)

### Distribution

**Channels:**
1. **GitHub** (open source core)
   - Build community
   - Get contributors
   - Establish credibility

2. **Product Hunt** (launch)
   - "AI coding assistant that works while you sleep"
   - Show real demos
   - Target remote developers

3. **Twitter/X** (organic growth)
   - Show time-lapse of autonomous coding
   - Share ROI metrics
   - Build following

4. **Dev.to / Hacker News** (content marketing)
   - "How I built an alternative to Ariana"
   - "Maximizing AI subscription ROI"
   - "Multi-agent orchestration patterns"

---

## Success Metrics

### Technical

- [ ] Provision VPS in < 60 seconds
- [ ] Agent start in < 30 seconds
- [ ] Dashboard latency < 2 seconds
- [ ] Support 10 concurrent agents
- [ ] Token tracking accuracy > 99%

### Business

- [ ] 100 active users by month 3
- [ ] 1000 active users by month 6
- [ ] Average 5+ jobs per user per week
- [ ] > 80% token utilization rate
- [ ] $0 acquisition cost (organic growth)

### Product-Market Fit

- [ ] Users say "I can't live without this"
- [ ] Users invite team members
- [ ] Users deploy to production
- [ ] GitHub stars > 1000
- [ ] Community contributors

---

## The Real Question

**Not: "Can we build this?"** (Yes, we can)

**Not: "Is this technically feasible?"** (Yes, it is)

**But: "Will people PAY for this?"**

Or more specifically:
- Will they use it instead of Ariana?
- Will they switch from manual prompting?
- Does the ROI actually make sense?

**The answer: Unknown until you ship.**

---

## Recommendation

### Build MVP, Validate Demand

```
Week 1-2: Core orchestration
Week 3-4: Polish UI/UX
Week 5-6: Launch & gather feedback

Decision point (after week 6):
├── If users love it → Double down, build business
├── If users like it → Improve, add features
└── If users meh → Pivot or kill gracefully

Investment so far: 6 weeks of your time
Risk: Low (you're building on existing infrastructure)
Upside: High (product with real demand)
```

### Don't Over-Engineer

```
❌ Don't build:
   - Multi-provider support yet (Hetzner only is fine for MVP)
   - Complex scheduling (first-come, first-served works)
   - Advanced features (add when users ask)

✅ Do build:
   - Simple, reliable orchestration
   - Clear value proposition (use your AI sub efficiently)
   - Great UX (easy to set up jobs)
   - Transparent pricing (token costs, VPS costs)
```

---

## The Vision

**"Turn your AI subscription from a tool into an employee."**

Manual prompting: You drive the AI
Autonomous orchestration: AI drives itself (while you sleep)

The former is a productivity tool.
The latter is a workforce multiplier.

**That's the product.**

---

**Document Last Updated:** 2026-01-14
**Status:** Ready for MVP development
