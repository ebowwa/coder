# Agents 201: Orchestrating Multiple Agents That Actually Work

After building your first single agent, the next challenge isn't making it smarter—it's making multiple agents work together without burning through your token budget or creating coordination chaos.

This guide covers what happens when you need more than one agent: orchestration patterns, communication strategies, and production lessons from real deployments.

## Why Multiple Agents?

Single agents hit limits fast. Context windows fill up, decision-making gets muddy, and debugging becomes impossible. Multi-agent systems solve this by distributing work across specialized agents, similar to how you'd structure a team.

### The Benefits

- **Specialization**: Each agent masters one domain instead of being mediocre at everything
- **Parallel processing**: Multiple agents can work simultaneously on independent subtasks
- **Maintainability**: When something breaks, you know exactly which agent to fix
- **Scalability**: Add new capabilities by adding new agents, not rewriting everything

### The Tradeoff

Coordination overhead. Agents need to communicate, share state, and avoid stepping on each other. Get this wrong and you've just built a more expensive failure mode.

## The Three Orchestration Patterns

There are three proven patterns for coordinating multiple agents. Pick based on your coordination needs, not what sounds coolest.

### 1. Supervisor Pattern (Centralized Control)

A supervisor agent coordinates all work. It receives the task, breaks it into subtasks, routes to worker agents, validates outputs, and synthesizes the final response.

**When to use it:**
- Tasks with clear decomposition into subtasks
- You need auditability and reasoning transparency
- Quality control matters more than speed
- Handling 3-8 worker agents max

**Example architecture:**
```
User Request
    ↓
[Supervisor Agent]
    ↓
Decompose → Route → Monitor → Validate → Synthesize
    ↓         ↓         ↓
[Worker 1] [Worker 2] [Worker 3]
```

**Real implementation**: The AI Hedge Fund example uses this pattern. Four specialized analysts (Fundamental, Portfolio, Risk, Technical) run in parallel while a supervisor coordinates:

```typescript
// Supervisor coordinates parallel analysis
const analyses = await Promise.all([
  fundamentalAgent.analyze(ticker),
  portfolioAgent.analyze(ticker),
  riskAgent.analyze(ticker),
  technicalAgent.analyze(ticker)
]);

// Supervisor synthesizes results
const report = await supervisorAgent.synthesize(analyses);
```

**The problem**: Supervisors become bottlenecks. Every decision flows through one agent, which means serial processing for coordination steps even when work happens in parallel. Token costs scale with coordination layers.

### 2. Swarm Pattern (Peer-to-Peer)

No central controller. Agents communicate directly, exchange information, and self-organize around the task. Think ant colonies, not org charts.

**When to use it:**
- Tasks benefit from multiple perspectives
- No clear decomposition into serial steps
- Real-time responsiveness matters
- Agents need to react to each other's work

**Example architecture:**
```
[Agent A] ←→ [Agent B]
    ↕  ↘     ↙  ↕
[Agent C] ←→ [Agent D]
```

Each agent can talk to any other agent. Information flows through the network until consensus emerges or the task is completed.

**Real implementation**: The SmartTravel Multi-Agent example demonstrates peer coordination. Six agents (Destination Explorer, Flight Search, Hotel Search, Dining, Itinerary, Budget) share information through a common state:

```typescript
// Each agent reads and writes to shared state
await destinationAgent.explore(state);
await flightAgent.search(state);  // Uses destination from previous agent
await hotelAgent.search(state);   // Uses destination and dates

// Agents update shared state
class TravelState {
  destination: string;
  flightOptions: Flight[];
  hotelOptions: Hotel[];
  // ... shared across all agents
}
```

**The problem**: Emergent behavior is hard to predict. Without a coordinator, agents might duplicate work, create infinite loops, or converge on suboptimal solutions. Debugging is brutal—you're tracing information flow through a mesh, not a tree.

### 3. Hierarchical Pattern (Multi-Level Control)

Supervisor pattern, but recursive. Top-level agent manages mid-level agents, which manage worker agents. Three or more layers.

**When to use it:**
- Tasks are too complex for flat supervision
- Different domains require different management strategies
- You're coordinating 10+ agents
- You need both strategic and tactical control

**Example architecture:**
```
[Top-Level Supervisor]
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
[Mid-Level A]      [Mid-Level B]
    ↓                   ↓
[Workers 1-3]      [Workers 4-6]
```

Each mid-level agent is itself a supervisor for its domain. The top level coordinates strategy, mid levels handle tactics.

**Real implementation**: The NVIDIA Docs Generator example uses hierarchical decomposition:

```typescript
// Top-level: Documentation orchestrator
const topLevel = {
  analyze: async (repo) => {
    // Delegates to analysis team
    const analysis = await analysisTeam.execute(repo);

    // Delegates to documentation team
    const docs = await docsTeam.execute(analysis);

    // Delegates to validation team
    return await validationTeam.execute(docs);
  }
};

// Mid-level: Analysis team supervises specific analyzers
const analysisTeam = {
  codeAnalyzer: new Agent(),
  archDiagrammer: new Agent(),
  testGenerator: new Agent()
};
```

**The problem**: Token costs explode. Each layer adds coordination overhead. A three-layer hierarchy with 5 agents per layer can easily burn 50K+ tokens on coordination alone. Only justified when flat patterns genuinely can't handle the complexity.

## Agent Communication Strategies

Orchestration patterns tell you the structure. Communication strategies tell you how information actually moves between agents.

### Shared State (Most Common)

All agents read from and write to a common state object. Changes are visible to everyone.

**Implementation:**
```typescript
interface SharedState {
  task: string;
  results: Map<string, any>;
  currentStep: string;
}

// Agent A writes
state.results.set('analysis', analysisResult);

// Agent B reads
const analysis = state.results.get('analysis');
```

**Advantages:**
- Simple to implement
- Easy to debug (just inspect state)
- No message passing complexity

**Disadvantages:**
- Race conditions if agents write simultaneously
- No isolation between agent contexts
- State grows unbounded without pruning

**When to use it**: Start here. Most agent systems should use shared state until they hit specific problems it can't solve.

### Message Passing (Event-Driven)

Agents send messages to each other. No direct state sharing.

**Implementation:**
```typescript
// Agent A publishes event
eventBus.publish('analysis.complete', {
  ticker: 'AAPL',
  analysis: result
});

// Agent B subscribes to event
eventBus.subscribe('analysis.complete', async (event) => {
  await portfolioAgent.process(event.analysis);
});
```

**Advantages:**
- Loose coupling between agents
- Natural for async work
- Easy to add new agents without changing existing ones

**Disadvantages:**
- Harder to debug (trace message flow)
- Potential for message loops
- Need infrastructure (event bus, queues)

**When to use it**: When agents are truly independent and shouldn't know about each other. Or when you need async processing across services.

### Handoff Mechanism (Explicit Control Transfer)

One agent explicitly passes control to another agent, often with context.

**Implementation:**
```typescript
class Agent {
  async handoff(targetAgent: Agent, context: Context) {
    // Prepare handoff context
    const handoffContext = {
      previousAgent: this.name,
      taskContext: context,
      timestamp: Date.now()
    };

    // Transfer control
    return await targetAgent.execute(handoffContext);
  }
}
```

**Advantages:**
- Clear control flow
- Easy to audit who did what
- Context preservation across agents

**Disadvantages:**
- Tight coupling between agents
- Serial processing by default
- Handoff overhead on every transition

**When to use it**: When tasks must happen in specific order and context must flow through the chain.

## Memory Architecture for Multi-Agent Systems

Single agents use context windows and external memory. Multi-agent systems have an additional problem: agents need to coordinate state without duplicating it or creating conflicts.

### Session-Based Memory

Each agent interaction is a session. Sessions have isolated state that gets merged back into shared memory on completion.

**Pattern:**
```typescript
class MemoryManager {
  async createSession(agentId: string): Session {
    return {
      id: generateId(),
      agentId,
      localState: {},
      sharedSnapshot: this.getSnapshot()
    };
  }

  async commitSession(session: Session) {
    // Merge local changes back to shared state
    this.merge(session.localState);
  }
}
```

**Use case**: Parallel agents that need to read shared context but make isolated changes. Common in supervisor patterns where workers operate independently.

### Window Memory (Conversation Context)

Keep a sliding window of recent exchanges across all agents. Oldest entries get compressed or dropped.

**Pattern:**
```typescript
class WindowMemory {
  private window: Message[] = [];
  private maxSize = 50;

  add(message: Message) {
    this.window.push(message);

    if (this.window.length > this.maxSize) {
      // Compress oldest third
      this.compressOldest();
    }
  }

  compressOldest() {
    const toCompress = this.window.slice(0, this.maxSize / 3);
    const summary = await this.summarize(toCompress);
    this.window = [summary, ...this.window.slice(this.maxSize / 3)];
  }
}
```

**Use case**: Long-running agent conversations where context matters but you can't keep everything. The RAG applications in motia-examples use this pattern.

### Episodic Memory (Cross-Agent Learning)

Store interaction history between specific agents. Enables agents to learn from past coordination.

**Pattern:**
```typescript
interface Episode {
  agentA: string;
  agentB: string;
  interaction: Interaction;
  outcome: 'success' | 'failure';
  learnings: string[];
}

// Agent looks up past interactions before coordinating
const pastEpisodes = await memory.query({
  agents: ['supervisor', 'riskAnalyst'],
  outcome: 'success'
});
```

**Use case**: Agents that frequently collaborate and can improve based on what worked before.

## Production Considerations

Lab demos scale differently than production. Here's what actually matters when you run multiple agents under load.

### Token Economics

Multi-agent systems burn tokens fast. Four agents coordinating on a task can easily 10x your costs versus a single agent.

**Cost breakdown for typical supervisor system:**
- Supervisor decomposition: 1K tokens
- 4 worker agents: 3K tokens each (12K total)
- Supervisor synthesis: 2K tokens
- **Total: 15K tokens per task**

Compare to single agent: 4K tokens for same task. You're paying for coordination.

**Optimization strategies:**
- Cache supervisor instructions: Don't regenerate task decomposition every time
- Compress worker outputs: Workers don't need to return prose, structured data works
- Parallel execution: 4 agents running sequentially costs same as parallel but takes 4x longer
- Lazy agent activation: Only invoke agents when their output is needed

### Latency Management

Multiple agents means multiple LLM calls. Each call adds 2-5 seconds. Serial processing destroys user experience.

**The math:**
- 1 agent: 3 seconds
- 4 agents (serial): 12 seconds
- 4 agents (parallel): 3-4 seconds

Always parallelize independent work. The AI Hedge Fund example saves 9 seconds by running four analysts in parallel instead of serial.

### Error Propagation

In single-agent systems, failures are local. In multi-agent systems, one agent's failure can cascade.

**Failure modes:**
- Poison pills: One agent returns garbage that breaks downstream agents
- Deadlocks: Agents wait for each other in circular dependencies
- Resource exhaustion: Parallel agents all try to use the same rate-limited API
- Cascading failures: Supervisor fails, orphaning all workers

**Defense strategies:**
- Timeouts at every layer: Agents must complete within bounded time
- Circuit breakers: After N failures, stop calling problematic agents
- Graceful degradation: System should work with subset of agents
- Isolate state: Worker failures shouldn't corrupt shared state

### Monitoring & Observability

You can't debug what you can't see. Multi-agent systems need observability from day one.

**Essential metrics:**
- Per-agent success rate: Which agents are failing?
- Coordination overhead: How much time spent coordinating vs working?
- Token consumption by agent: Where are costs coming from?
- Agent interaction patterns: Which agents talk to which?

**Example instrumentation:**
```typescript
class ObservableAgent {
  async execute(task: Task): Result {
    const span = tracer.startSpan('agent.execute', {
      agentId: this.id,
      taskType: task.type
    });

    try {
      const result = await this.process(task);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

## Real Implementation Examples

The motia-examples repo contains production-ready multi-agent implementations:

### ChessArena AI (Competitive Multi-Agent)

Multiple LLMs compete in chess matches, evaluated by Stockfish. Demonstrates:
- Parallel agent execution
- Real-time streaming of agent decisions
- Quality-based ranking (move evaluation, not just wins)

[Source](https://github.com/motia-dev/motia-examples/tree/main/examples/chess-arena-ai)

### Finance Agent (Supervisor Pattern)

Combines multiple data sources with AI analysis. Shows:
- Supervisor coordinating data collection and analysis
- Parallel processing of financial data
- Synthesis of multiple perspectives

[Source](https://github.com/motia-dev/motia-examples/tree/main/examples/finance-agent)

### SmartTravel Multi-Agent (Swarm Pattern)

Six specialized agents collaborating on travel planning:
- Peer-to-peer communication via shared state
- Dynamic task routing based on agent availability
- Consensus building across agent recommendations

[Source](https://github.com/motia-dev/motia-examples/tree/main/examples/smart-travel-multi-agent)

## Common Anti-Patterns

Things that seem smart but break in production:

- **Over-coordination**: Don't make agents coordinate when they don't need to. If agents work on independent tasks, let them run independently.
- **Kitchen sink agents**: Don't make one agent do everything. The whole point of multiple agents is specialization.
- **Synchronous everything**: Don't block waiting for agents unless you must. Most coordination can be async.
- **Ignoring costs**: Don't deploy multi-agent systems without tracking token usage. You'll get a surprise bill.
- **No fallbacks**: Don't assume all agents will work. Build degraded modes.

## When to Use Which Pattern

### Use Supervisor when:
- You need auditability
- Tasks decompose clearly
- 3-8 specialized agents
- Quality > speed

### Use Swarm when:
- Multiple perspectives needed
- No clear task decomposition
- Real-time responsiveness critical
- Agents can self-organize

### Use Hierarchical when:
- Managing 10+ agents
- Multiple layers of abstraction needed
- Both strategic and tactical control required
- Token costs are acceptable

### Use single agent when:
- Task is simple enough
- One domain of expertise sufficient
- Minimizing costs matters
- You're not sure yet

## Getting Started

Pick the simplest pattern that could work. Most teams should start with supervisor pattern:

1. Build one capable agent
2. Identify where it struggles (usually specialization or parallel work)
3. Extract that into a second agent
4. Add supervisor to coordinate
5. Iterate

Don't build a complex multi-agent system from day one. Build one agent, see where it breaks, add another agent. Repeat.

## What's Next

You now understand how to orchestrate multiple agents. The next level is understanding production deployment: how do you run these systems at scale, handle failures gracefully, and keep costs under control?

For now, take these patterns and build something. Pick a task your single agent struggles with, break it into specialized agents, choose an orchestration pattern, and ship it.

The code is at [motia-examples](https://github.com/motia-dev/motia-examples) and [awesome-ai-apps](https://github.com/steven-tey/awesome-ai-apps). Fork them, break them, make them your own.

---

## TL;DR

- **Use multiple agents when**: Specialization, parallel work, or single agent hits limits
- **Three patterns**: Supervisor (centralized), Swarm (peer-to-peer), Hierarchical (multi-level)
- **Communication**: Shared state (start here), message passing (async work), handoffs (explicit control)
- **Memory**: Session-based for parallel work, window for long conversations, episodic for learning
- **Production**: Watch token costs, parallelize everything, expect failures, instrument everything
- **Start simple**: One agent → identify bottleneck → add second agent → add supervisor → iterate

**Build one system that uses two agents reliably before building ten.**

---

# Codebase Review: Hetzner CodeSpaces Multi-Agent Architecture

## Executive Summary

This codebase implements a **multi-agent orchestration platform** for autonomous AI development work using Hetzner VPS infrastructure. The architecture is in an **early implementation phase** with foundational patterns established but significant production capabilities still missing.

**Current Maturity Level**: Foundation (patterns defined, basic orchestration implemented, production readiness incomplete)

## Current Architecture

### Pattern: Supervised Orchestration with Hierarchical Elements

```
┌─────────────────────────────────────────────────────────────┐
│                   USER / LAYER 0                            │
│            (Creates jobs, monitors progress)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENT ORCHESTRATOR (Layer 1)                    │
│  - AgentOrchestrator class                                   │
│  - Manages task dependencies                                 │
│  - Budget enforcement                                       │
│  - Concurrency control (maxConcurrent: default 3)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ClaudeAgent  │ │ ClaudeAgent  │ │ ClaudeAgent  │
│   Client 1   │ │   Client 2   │ │   Client 3   │
│              │ │              │ │              │
│ (Worker)     │ │ (Worker)     │ │ (Worker)     │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Core Files

| Component | Location |
|-----------|----------|
| Agent Client | `app/backend/shared/lib/claudecodesdk/client.ts` |
| Orchestrator | `app/backend/shared/lib/claudecodesdk/orchestrator.ts` |
| Types | `app/backend/shared/lib/claudecodesdk/types.ts` |
| GLM AI Client | `app/backend/shared/lib/ai/client.ts` |
| Prompts | `app/backend/shared/lib/ai/prompts.ts` |

### Specialized Agents (Factory Functions)

**Location**: `app/backend/shared/lib/claudecodesdk/client.ts`

1. **CodeAnalyzer Agent**
   - Purpose: Static analysis, bug detection, security scanning
   - Tools: Read, Grep, Glob (read-only)
   - Use Case: Pre-deployment validation, code reviews

2. **RefactoringAgent Agent**
   - Purpose: Code restructuring, optimization, maintainability improvements
   - Tools: Read, Edit, Grep, Glob (read/write)
   - Use Case: Technical debt reduction, code modernization

3. **DocumentationAgent Agent**
   - Purpose: Generate and maintain technical documentation
   - Tools: Read, Write, Grep, Glob (read/write)
   - Use Case: API docs, README generation, inline documentation

### Orchestration Implementation

**Location**: `app/backend/shared/lib/claudecodesdk/orchestrator.ts`

**AgentOrchestrator Class** provides:
- Task Dependency Management: `dependsOn: string[]` for DAG-based execution
- Budget Control: `maxBudgetUsd` enforcement across all tasks
- Concurrency Limits: `maxConcurrent` (default: 3)
- Timeout Protection: `taskTimeout` (default: 5 min per task)
- Permission Mode: Configurable `permissionMode` (e.g., `acceptEdits`)
- Parallel Execution: Independent tasks run simultaneously
- Status Tracking: Real-time task status monitoring

## Alignment with Best Practices

### ✅ What's Implemented

| Practice | Status | Notes |
|----------|--------|-------|
| **Specialized Agents** | ✅ Implemented | 3 factory agents (analyzer, refactor, docs) |
| **Supervisor Pattern** | ✅ Implemented | AgentOrchestrator with DAG-based dependencies |
| **Parallel Execution** | ✅ Implemented | `Promise.all` for independent tasks (line 197-198) |
| **Budget Control** | ✅ Implemented | `maxBudgetUsd` enforcement |
| **Concurrency Limits** | ✅ Implemented | `maxConcurrent` default: 3 |
| **Timeout Protection** | ✅ Implemented | `taskTimeout` per task |
| **Token Tracking** | ✅ Implemented | Per-task and total cost tracking |
| **Type Safety** | ✅ Implemented | Comprehensive TypeScript types and Zod validation |

### ❌ What's Missing

| Practice | Status | Impact |
|----------|--------|--------|
| **Shared State** | ❌ Missing | Agents cannot collaborate directly |
| **Message Passing** | ❌ Missing | No event bus for async coordination |
| **Result Persistence** | ❌ Missing | No audit trail, costs not persisted |
| **Circuit Breakers** | ❌ Missing | No protection against failing agents |
| **Retry Logic** | ❌ Missing | Single failure can break workflow |
| **Per-Agent Metrics** | ❌ Missing | No visibility into which agents are expensive/slow |
| **Real-Time Streaming** | ❌ Missing | No progress updates during execution |
| **Memory Systems** | ❌ Missing | No session/episodic/window memory |
| **Distributed Tracing** | ❌ Missing | No OpenTelemetry/observability |

## Critical Production Gaps

### 1. No Agent Collaboration

**Currently**: `User → Orchestrator → Agent 1 → Orchestrator → Agent 2`

**Should support**:
```typescript
// Shared state pattern
const context = new SharedContext();
await Promise.all([
  analyzer.analyze(code, context),  // Writes to context
  refactor.suggest(context),         // Reads from context
  docs.generate(context)             // Reads from context
]);
```

### 2. No Observability

You track infrastructure metrics (CPU, memory) but not:
- Per-agent success rates
- Token consumption by agent type
- Coordination overhead vs actual work
- Agent interaction patterns

### 3. No Resilience Patterns

```typescript
// Missing: Circuit breaker
class CircuitBreaker {
  private failureCount = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute(agent, task) {
    if (this.state === 'open') {
      throw new Error('Agent disabled after failures');
    }
    // ... execute and track failures
  }
}
```

## Recommended Implementation Priorities

### Priority 1: Production Readiness (COMPLEX - 2-3 weeks)

**A. Add Result Persistence**
```typescript
// Store AgentResult in database for audit trail
interface AgentExecution {
  id: string;
  agentType: string;
  prompt: string;
  result: AgentResult;
  timestamp: Date;
  costUsd: number;
  tokenUsage: { input: number; output: number };
}
```

**B. Implement Circuit Breakers**
```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private threshold = 5; // Open after 5 consecutive failures
  private resetTimeoutMs = 60000; // Reset after 1 minute

  async execute(agent: ClaudeAgentClient, task: string): Promise<AgentResult> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.resetTimeoutMs) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN - agent disabled');
      }
    }

    try {
      const result = await agent.run(task);
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = new Date();
      if (this.failureCount >= this.threshold) {
        this.state = 'open';
      }
      throw error;
    }
  }
}
```

**C. Add Per-Agent Metrics**
```typescript
// Track per-agent performance
interface AgentMetrics {
  agentType: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgTokenUsage: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  lastExecution: Date;
  lastFailure?: Date;
}

class MetricsCollector {
  private metrics: Map<string, AgentMetrics> = new Map();

  recordExecution(agentType: string, result: AgentResult, durationMs: number) {
    const current = this.metrics.get(agentType) || this.createEmpty(agentType);
    current.totalExecutions++;
    current.totalCostUsd += result.totalCostUsd;
    current.avgTokenUsage = (current.avgTokenUsage * (current.totalExecutions - 1) + result.usage.inputTokens + result.usage.outputTokens) / current.totalExecutions;
    current.avgLatencyMs = (current.avgLatencyMs * (current.totalExecutions - 1) + durationMs) / current.totalExecutions;
    current.lastExecution = new Date();

    if (result.errors.length > 0) {
      current.failedExecutions++;
      current.lastFailure = new Date();
    } else {
      current.successfulExecutions++;
    }

    current.successRate = current.successfulExecutions / current.totalExecutions;
    this.metrics.set(agentType, current);
  }

  getMetrics(agentType: string): AgentMetrics | undefined {
    return this.metrics.get(agentType);
  }

  getAllMetrics(): AgentMetrics[] {
    return Array.from(this.metrics.values());
  }
}
```

### Priority 2: Enhanced Communication (MEDIUM - 1 week)

**A. Implement Shared State Pattern**
```typescript
// Allow agents to collaborate via shared state
class SharedContext {
  private state: Map<string, any> = new Map();
  private history: Array<{ key: string; value: any; timestamp: Date; agentId: string }> = [];

  set(agentId: string, key: string, value: any) {
    this.state.set(key, value);
    this.history.push({ key, value, timestamp: new Date(), agentId });
  }

  get(key: string): any {
    return this.state.get(key);
  }

  has(key: string): boolean {
    return this.state.has(key);
  }

  getHistory(): ReadonlyArray<{ key: string; value: any; timestamp: Date; agentId: string }> {
    return this.history;
  }

  // Agent A writes
  // context.set('analyzer', 'analysisResult', analysis);

  // Agent B reads
  // const analysis = context.get('analysisResult');
}
```

**B. Add Streaming to Orchestrator**
```typescript
// Emit progress events during execution
interface OrchestratorEvents {
  on(event: 'task:start', callback: (task: Task) => void): this;
  on(event: 'task:progress', callback: (task: Task, progress: number) => void): this;
  on(event: 'task:complete', callback: (task: Task, result: AgentResult) => void): this;
  on(event: 'task:error', callback: (task: Task, error: Error) => void): this;
}

class AgentOrchestrator {
  private eventEmitter = new EventEmitter();

  // Integrate with existing stream() method from ClaudeAgentClient
  async executeWithStreaming(): Promise<Map<string, AgentResult>> {
    // ... existing logic
    this.eventEmitter.emit('task:start', task);

    for await (const chunk of client.stream(task.prompt)) {
      this.eventEmitter.emit('task:progress', task, chunk.progress);
    }
  }
}
```

### Priority 3: Memory & Learning (COMPLEX - 1-2 weeks)

**A. Implement Episodic Memory**
```typescript
// Remember successful agent coordination patterns
interface Episode {
  id: string;
  agents: string[];
  task: string;
  outcome: 'success' | 'failure';
  learnings: string[];
  timestamp: Date;
  coordinationPattern: string; // e.g., "parallel", "sequential", "mixed"
}

class EpisodicMemory {
  private db: Database;

  async record(episode: Episode) {
    this.db.insert('episodes', episode);
  }

  async query(criteria: {
    agents?: string[];
    outcome?: 'success' | 'failure';
    taskPattern?: string;
  }): Promise<Episode[]> {
    // Query similar past episodes
    const episodes = this.db.query('episodes', criteria);
    return episodes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getSuccessfulPattern(agents: string[]): Promise<string | null> {
    const successful = await this.query({ agents, outcome: 'success' });
    if (successful.length === 0) return null;

    // Return most common successful pattern
    const patterns = successful.map(e => e.coordinationPattern);
    return mostCommon(patterns);
  }
}
```

**B. Add Prompt Caching**
```typescript
// Cache repeated prompts to reduce token usage
class PromptCache {
  private cache = new Map<string, { result: string; timestamp: Date; hitCount: number }>();
  private ttl = 3600000; // 1 hour

  generateKey(prompt: string, agentType: string): string {
    return `${agentType}:${crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16)}`;
  }

  get(prompt: string, agentType: string): string | null {
    const key = this.generateKey(prompt, agentType);
    const cached = this.cache.get(key);

    if (!cached) return null;
    if (Date.now() - cached.timestamp.getTime() > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    cached.hitCount++;
    return cached.result;
  }

  set(prompt: string, agentType: string, result: string) {
    const key = this.generateKey(prompt, agentType);
    this.cache.set(key, { result, timestamp: new Date(), hitCount: 0 });
  }

  getStats() {
    return {
      size: this.cache.size,
      totalHits: Array.from(this.cache.values()).reduce((sum, c) => sum + c.hitCount, 0),
    };
  }
}
```

### Priority 4: Observability (MEDIUM - 1 week)

**A. Add OpenTelemetry Tracing**
```typescript
// Trace agent execution end-to-end
import { trace } from '@opentelemetry/api';

class ObservableAgent {
  private tracer = trace.getTracer('agent-orchestrator');

  async execute(task: Task): Promise<AgentResult> {
    const span = this.tracer.startSpan('agent.execute', {
      attributes: {
        'agent.type': this.config.agentType,
        'task.id': task.id,
        'task.prompt.length': task.prompt.length,
      },
    });

    try {
      const result = await this.process(task);
      span.setAttribute('result.cost.usd', result.totalCostUsd);
      span.setAttribute('result.tokens.input', result.usage.inputTokens);
      span.setAttribute('result.tokens.output', result.usage.outputTokens);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

**B. Build Real-Time Dashboard**
- Show active agents and their progress
- Display token usage in real-time
- Visualize task dependencies and execution flow
- Per-agent success rate and latency charts

## What's Working Well

1. **Clean separation of concerns**: `ClaudeAgentClient` handles single-agent execution, `AgentOrchestrator` handles multi-agent coordination
2. **Budget awareness**: Budget enforcement prevents runaway costs
3. **Dependency management**: DAG-based task scheduling prevents premature execution
4. **Extensibility**: Factory pattern makes it easy to add new agent types
5. **Type safety**: Comprehensive TypeScript types with Zod validation

## Conclusion

**Current State**: Foundationally sound but production-incomplete

**What's Built**:
- ✅ Agent factory pattern with 3 specialized agents
- ✅ Orchestrator with dependency resolution and budget control
- ✅ Parallel execution with concurrency limits
- ✅ Basic error handling and timeout protection

**What's Missing**:
- ❌ Shared state and agent collaboration
- ❌ Result persistence and audit trails
- ❌ Real-time streaming and progress updates
- ❌ Circuit breakers and retry logic
- ❌ Per-agent metrics and observability
- ❌ Memory and learning systems

**Estimated Effort for Production-Ready Multi-Agent System**: 6-8 weeks

**Recommendation**: Prioritize **Priority 1 (Production Readiness)** items first—persistence, circuit breakers, and metrics—before adding more complex features like memory systems.

---

# Production Readiness: Implementation Guide

This section provides concrete implementation details for adding production readiness features (persistence, circuit breakers, metrics) to the Hetzner CodeSpaces multi-agent architecture.

## Overview

The three production features work together to create a resilient, observable, and auditable multi-agent system:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AgentOrchestrator                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. PERSISTENCE: Create execution record in DB             │   │
│  │     - Tracks: task_id, agent_type, prompt, status          │   │
│  │     - Updates with: result, cost, tokens, duration        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  2. CIRCUIT BREAKER: Check if agent is healthy             │   │
│  │     - CLOSED: Allow execution                               │   │
│  │     - OPEN: Reject (too many recent failures)              │   │
│  │     - HALF-OPEN: Test with limited requests                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  3. EXECUTE: Run ClaudeAgentClient                         │   │
│  │     - With timeout protection                               │   │
│  │     - Budget enforcement                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  4. METRICS: Update circuit breaker state                  │   │
│  │     - Success → Close circuit                               │   │
│  │     - Failure → Increment counter, potentially open         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  5. PERSISTENCE: Complete execution record                 │   │
│  │     - Update with results/errors                           │   │
│  │     - Queryable for historical analysis                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 1. Persistence: Agent Execution Tracking

### Database Schema

Add to `app/backend/shared/lib/metadata.ts` in the `getDb()` function (after line 36):

```typescript
// In getDb() function, after environment_metadata table creation
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_executions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL,
    result_json TEXT,
    error_message TEXT,
    cost_usd REAL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    duration_ms INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
  )
`)

// Indexes for faster queries
db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_executions_task_id
  ON agent_executions(task_id)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_type
  ON agent_executions(agent_type)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at
  ON agent_executions(created_at DESC)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_executions_status
  ON agent_executions(status)`)
```

### Persistence Layer

Create `app/backend/shared/lib/agent-executions.ts`:

```typescript
/**
 * Agent Execution Persistence Layer
 *
 * Provides database operations for tracking agent executions,
 * enabling audit trails, cost analysis, and performance metrics.
 */

import { Database } from 'bun:sqlite'
import { getDb } from './metadata'

export interface AgentExecutionRecord {
  id: string
  taskId: string
  agentType: string
  prompt: string
  status: 'running' | 'completed' | 'failed' | 'timeout'
  resultJson?: string
  errorMessage?: string
  costUsd?: number
  inputTokens?: number
  outputTokens?: number
  durationMs?: number
  createdAt: string
  completedAt?: string
}

/**
 * Create a new agent execution record
 *
 * Called when a task starts execution. Returns the execution ID
 * for later update.
 */
export function createAgentExecution(
  record: Omit<AgentExecutionRecord, 'id' | 'createdAt'>
): string {
  const db = getDb()
  const id = crypto.randomUUID()

  const stmt = db.prepare(`
    INSERT INTO agent_executions (
      id, task_id, agent_type, prompt, status, created_at
    ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `)

  stmt.run(
    id,
    record.taskId,
    record.agentType,
    record.prompt,
    record.status
  )

  return id
}

/**
 * Update an agent execution with results
 *
 * Called when task completes, fails, or times out.
 */
export function completeAgentExecution(
  id: string,
  updates: Partial<Pick<AgentExecutionRecord,
    'status' | 'resultJson' | 'errorMessage' | 'costUsd'
    | 'inputTokens' | 'outputTokens' | 'durationMs'
  >>
): void {
  const db = getDb()

  const setClauses: string[] = []
  const values: any[] = []

  if (updates.status !== undefined) {
    setClauses.push('status = ?')
    values.push(updates.status)
  }
  if (updates.resultJson !== undefined) {
    setClauses.push('result_json = ?')
    values.push(updates.resultJson)
  }
  if (updates.errorMessage !== undefined) {
    setClauses.push('error_message = ?')
    values.push(updates.errorMessage)
  }
  if (updates.costUsd !== undefined) {
    setClauses.push('cost_usd = ?')
    values.push(updates.costUsd)
  }
  if (updates.inputTokens !== undefined) {
    setClauses.push('input_tokens = ?')
    values.push(updates.inputTokens)
  }
  if (updates.outputTokens !== undefined) {
    setClauses.push('output_tokens = ?')
    values.push(updates.outputTokens)
  }
  if (updates.durationMs !== undefined) {
    setClauses.push('duration_ms = ?')
    values.push(updates.durationMs)
  }

  setClauses.push('completed_at = CURRENT_TIMESTAMP')
  values.push(id)

  const stmt = db.prepare(`
    UPDATE agent_executions
    SET ${setClauses.join(', ')}
    WHERE id = ?
  `)

  stmt.run(...values)
}

/**
 * Get execution history for a specific task
 */
export function getTaskExecutions(taskId: string): AgentExecutionRecord[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM agent_executions
    WHERE task_id = ?
    ORDER BY created_at DESC
  `)

  return stmt.all(taskId) as AgentExecutionRecord[]
}

/**
 * Get recent executions (for dashboard/activity feed)
 */
export function getRecentExecutions(limit: number = 50): AgentExecutionRecord[] {
  const db = getDb()
  const stmt = db.prepare(`
    SELECT * FROM agent_executions
    ORDER BY created_at DESC
    LIMIT ?
  `)

  return stmt.all(limit) as AgentExecutionRecord[]
}

/**
 * Get aggregated metrics for an agent type
 *
 * Returns performance statistics that can be used for:
 * - Cost analysis
 * - Performance optimization
 * - Success rate tracking
 */
export function getAgentMetrics(
  agentType: string,
  since?: Date
): {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  timeoutExecutions: number
  totalCostUsd: number
  avgDurationMs: number
  avgInputTokens: number
  avgOutputTokens: number
  successRate: number
} {
  const db = getDb()

  let whereClause = 'WHERE agent_type = ? AND status != "running"'
  const params: any[] = [agentType]

  if (since) {
    whereClause += ' AND created_at >= ?'
    params.push(since.toISOString())
  }

  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeout,
      SUM(cost_usd) as total_cost,
      AVG(duration_ms) as avg_duration,
      AVG(input_tokens) as avg_input_tokens,
      AVG(output_tokens) as avg_output_tokens
    FROM agent_executions
    ${whereClause}
  `)

  const row = stmt.get(...params) as {
    total: number
    successful: number
    failed: number
    timeout: number
    total_cost: number
    avg_duration: number
    avg_input_tokens: number
    avg_output_tokens: number
  }

  const totalExecutions = row.total || 0
  const successfulExecutions = row.successful || 0

  return {
    totalExecutions,
    successfulExecutions,
    failedExecutions: row.failed || 0,
    timeoutExecutions: row.timeout || 0,
    totalCostUsd: row.total_cost || 0,
    avgDurationMs: row.avg_duration || 0,
    avgInputTokens: row.avg_input_tokens || 0,
    avgOutputTokens: row.avg_output_tokens || 0,
    successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
  }
}

/**
 * Get cost summary across all agents
 */
export function getCostSummary(since?: Date): {
  totalCostUsd: number
  totalExecutions: number
  costByAgentType: Array<{ agentType: string; costUsd: number; executions: number }>
} {
  const db = getDb()

  let whereClause = 'WHERE status != "running"'
  const params: any[] = []

  if (since) {
    whereClause += ' AND created_at >= ?'
    params.push(since.toISOString())
  }

  // Get totals
  const totalStmt = db.prepare(`
    SELECT
      SUM(cost_usd) as total_cost,
      COUNT(*) as total_executions
    FROM agent_executions
    ${whereClause}
  `)
  const totals = totalStmt.get(...params) as { total_cost: number; total_executions: number }

  // Get breakdown by agent type
  const byTypeStmt = db.prepare(`
    SELECT
      agent_type,
      SUM(cost_usd) as cost,
      COUNT(*) as executions
    FROM agent_executions
    ${whereClause}
    GROUP BY agent_type
    ORDER BY cost DESC
  `)

  const costByAgentType = byTypeStmt.all(...params).map((row: any) => ({
    agentType: row.agent_type,
    costUsd: row.cost || 0,
    executions: row.executions,
  }))

  return {
    totalCostUsd: totals.total_cost || 0,
    totalExecutions: totals.total_executions || 0,
    costByAgentType,
  }
}
```

## 2. Circuit Breaker: Failure Protection

Create `app/backend/shared/lib/circuit-breaker.ts`:

```typescript
/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by disabling agents that repeatedly fail.
 * Based on the circuit breaker pattern from Martin Fowler/Ruby.
 *
 * Three States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, requests fail immediately
 * - HALF-OPEN: Testing if service has recovered
 *
 * State Transitions:
 * CLOSED --(threshold failures)--> OPEN
 * OPEN --(reset timeout)--> HALF-OPEN
 * HALF-OPEN --(success threshold)--> CLOSED
 * HALF-OPEN --(any failure)--> OPEN
 */

export type CircuitState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  failureThreshold?: number
  /** How long to stay open before trying again (ms) */
  resetTimeoutMs?: number
  /** Number of successful calls to close circuit in half-open state */
  successThreshold?: number
  /** Time window to count failures (ms) */
  failureWindowMs?: number
}

interface FailureRecord {
  timestamp: number
  error: string
}

/**
 * Circuit Breaker for protecting against failing agents
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime?: number
  private openedAt?: number
  private failures: FailureRecord[] = []
  private config: Required<CircuitBreakerConfig>

  constructor(
    private readonly agentType: string,
    config: CircuitBreakerConfig = {}
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeoutMs: config.resetTimeoutMs ?? 60000, // 1 minute
      successThreshold: config.successThreshold ?? 2,
      failureWindowMs: config.failureWindowMs ?? 300000, // 5 minutes
    }
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @throws Error if circuit is OPEN
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should attempt execution
    if (!this.allowRequest()) {
      const timeUntilReset = this.getTimeUntilReset()
      throw new Error(
        `Circuit breaker OPEN for ${this.agentType} - too many recent failures. ` +
        `Will retry in ${timeUntilReset}ms. ` +
        `Recent errors: ${this.failures.slice(-3).map(f => f.error).join(', ')}`
      )
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Check if request should be allowed based on current state
   */
  private allowRequest(): boolean {
    this.cleanOldFailures()

    switch (this.state) {
      case 'closed':
        return true

      case 'open':
        // Check if reset timeout has passed
        if (this.openedAt && Date.now() - this.openedAt >= this.config.resetTimeoutMs) {
          this.state = 'half-open'
          this.successCount = 0
          console.log(`[CircuitBreaker] ${this.agentType}: HALF-OPEN (testing recovery)`)
          return true
        }
        return false

      case 'half-open':
        return true

      default:
        return false
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0
    this.failures = []

    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= this.config.successThreshold) {
        this.state = 'closed'
        console.log(`[CircuitBreaker] ${this.agentType}: CLOSED (recovered after ${this.successCount} successes)`)
      }
    } else if (this.state !== 'closed') {
      this.state = 'closed'
      console.log(`[CircuitBreaker] ${this.agentType}: CLOSED`)
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(errorMessage: string): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    this.failures.push({
      timestamp: Date.now(),
      error: errorMessage,
    })

    // Check if we should open the circuit
    if (this.failureCount >= this.config.failureThreshold) {
      const wasClosed = this.state === 'closed'
      this.state = 'open'
      this.openedAt = Date.now()

      console.warn(
        `[CircuitBreaker] ${this.agentType}: OPEN ` +
        `(${this.failureCount} consecutive failures in ${this.config.failureWindowMs}ms window). ` +
        `Recent errors: ${this.failures.slice(-3).map(f => f.error).join(', ')}`
      )
    }
  }

  /**
   * Remove failures outside the time window
   */
  private cleanOldFailures(): void {
    const cutoff = Date.now() - this.config.failureWindowMs
    this.failures = this.failures.filter(f => f.timestamp > cutoff)

    // Recalculate failure count based on remaining failures
    if (this.failures.length < this.failureCount) {
      this.failureCount = this.failures.length
    }
  }

  /**
   * Get time until circuit resets (ms)
   */
  private getTimeUntilReset(): number {
    if (!this.openedAt) return 0
    const elapsed = Date.now() - this.openedAt
    return Math.max(0, this.config.resetTimeoutMs - elapsed)
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    this.cleanOldFailures()
    return this.state
  }

  /**
   * Get stats for monitoring/observability
   */
  getStats() {
    this.cleanOldFailures()
    return {
      agentType: this.agentType,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      recentFailures: this.failures.slice(-10),
      openedAt: this.openedAt ? new Date(this.openedAt) : null,
      timeUntilReset: this.getTimeUntilReset(),
    }
  }

  /**
   * Manually reset the circuit breaker (for admin operations)
   */
  reset(): void {
    const prevState = this.state
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.failures = []
    this.openedAt = undefined
    console.log(`[CircuitBreaker] ${this.agentType}: MANUALLY RESET (was ${prevState})`)
  }
}

/**
 * Registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>()

  get(agentType: string): CircuitBreaker {
    if (!this.breakers.has(agentType)) {
      this.breakers.set(agentType, new CircuitBreaker(agentType))
    }
    return this.breakers.get(agentType)!
  }

  getAllStats() {
    return Array.from(this.breakers.values()).map(b => b.getStats())
  }

  reset(agentType: string): void {
    const breaker = this.breakers.get(agentType)
    if (breaker) {
      breaker.reset()
    }
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset()
    }
  }

  getOpenCircuits(): string[] {
    return Array.from(this.breakers.entries())
      .filter(([_, breaker]) => breaker.getState() === 'open')
      .map(([agentType, _]) => agentType)
  }
}

// Singleton registry for application-wide circuit breaker management
export const circuitBreakerRegistry = new CircuitBreakerRegistry()
```

## 3. Enhanced Orchestrator Integration

Update `app/backend/shared/lib/claudecodesdk/orchestrator.ts` to integrate all three features:

```typescript
/**
 * Enhanced Agent Orchestrator Configuration
 */
export interface OrchestratorConfig {
  cwd?: string;
  maxBudgetUsd?: number;
  maxConcurrent?: number;
  taskTimeout?: number;
  permissionMode?: ClaudeAgentConfig["permissionMode"];

  // NEW: Production feature flags
  enablePersistence?: boolean;        // Enable execution logging to DB
  enableCircuitBreakers?: boolean;    // Enable circuit breaker protection
  enableMetrics?: boolean;            // Enable metrics collection
}

/**
 * Enhanced Task Result with execution metadata
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: AgentResult;
  error?: string;
  durationMs: number;

  // NEW: Execution metadata
  executionId?: string;
  circuitBreakerTripped?: boolean;
}

/**
 * Enhanced Agent Orchestrator with Production Features
 */
export class AgentOrchestrator {
  private config: Required<
    Pick<OrchestratorConfig, "cwd" | "maxConcurrent" | "taskTimeout" |
    "enablePersistence" | "enableCircuitBreakers" | "enableMetrics">
  > & Omit<OrchestratorConfig, "cwd" | "maxConcurrent" | "taskTimeout" |
    "enablePersistence" | "enableCircuitBreakers" | "enableMetrics">;

  private tasks: Map<string, AgentTask>;
  private completedTasks: Set<string>;
  private totalCostUsd: number;

  // NEW: Circuit breakers per agent type
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      cwd: config.cwd ?? process.cwd(),
      maxConcurrent: config.maxConcurrent ?? 3,
      taskTimeout: config.taskTimeout ?? 300000,
      maxBudgetUsd: config.maxBudgetUsd,
      permissionMode: config.permissionMode,
      // NEW: Production features enabled by default
      enablePersistence: config.enablePersistence ?? true,
      enableCircuitBreakers: config.enableCircuitBreakers ?? true,
      enableMetrics: config.enableMetrics ?? true,
    };
    this.tasks = new Map();
    this.completedTasks = new Set();
    this.totalCostUsd = 0;
  }

  addTask(task: AgentTask): this {
    this.tasks.set(task.id, task);
    return this;
  }

  addTasks(tasks: AgentTask[]): this {
    for (const task of tasks) {
      this.addTask(task);
    }
    return this;
  }

  /**
   * Execute all tasks with production features enabled
   */
  async execute(): Promise<Map<string, TaskResult>> {
    const results = new Map<string, TaskResult>();
    const executing = new Set<string>();

    const executeTask = async (task: AgentTask): Promise<void> => {
      // Check budget
      if (
        this.config.maxBudgetUsd &&
        this.totalCostUsd >= this.config.maxBudgetUsd
      ) {
        results.set(task.id, {
          taskId: task.id,
          success: false,
          error: "Budget exceeded",
          durationMs: 0,
        });
        return;
      }

      // Check dependencies
      for (const depId of task.dependsOn ?? []) {
        if (!this.completedTasks.has(depId)) {
          return;
        }
      }

      const startTime = Date.now();
      executing.add(task.id);

      // NEW: Determine agent type from task
      const agentType = task.agentType ?? this.inferAgentType(task);

      // NEW: Get or create circuit breaker for this agent type
      if (this.config.enableCircuitBreakers && !this.circuitBreakers.has(agentType)) {
        this.circuitBreakers.set(agentType, circuitBreakerRegistry.get(agentType));
      }
      const circuitBreaker = this.circuitBreakers.get(agentType);

      // NEW: Create execution record in database
      let executionId: string | undefined;
      if (this.config.enablePersistence) {
        executionId = createAgentExecution({
          taskId: task.id,
          agentType,
          prompt: task.prompt,
          status: 'running',
        });
      }

      try {
        // NEW: Wrap execution with circuit breaker protection
        const executeWithProtection = async (): Promise<AgentResult> => {
          const client = new ClaudeAgentClient({
            cwd: this.config.cwd,
            permissionMode: this.config.permissionMode,
            maxBudgetUsd: task.maxBudgetUsd ?? this.config.maxBudgetUsd,
            maxTurns: task.maxTurns,
          });

          return await Promise.race([
            client.run(task.prompt),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error("Task timeout")),
                this.config.taskTimeout
              )
            ),
          ]);
        };

        // Execute with or without circuit breaker
        const result = circuitBreaker && this.config.enableCircuitBreakers
          ? await circuitBreaker.execute(executeWithProtection)
          : await executeWithProtection();

        const duration = Date.now() - startTime;
        this.totalCostUsd += result.totalCostUsd;
        this.completedTasks.add(task.id);

        // NEW: Persist successful execution to database
        if (this.config.enablePersistence && executionId) {
          completeAgentExecution(executionId, {
            status: 'completed',
            resultJson: JSON.stringify(result),
            costUsd: result.totalCostUsd,
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            durationMs: duration,
          });
        }

        results.set(task.id, {
          taskId: task.id,
          success: result.success,
          result,
          durationMs: duration,
          executionId,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // NEW: Persist failed execution to database
        if (this.config.enablePersistence && executionId) {
          completeAgentExecution(executionId, {
            status: errorMessage === 'Task timeout' ? 'timeout' : 'failed',
            errorMessage,
            durationMs: duration,
          });
        }

        results.set(task.id, {
          taskId: task.id,
          success: false,
          error: errorMessage,
          durationMs: duration,
          executionId,
          // NEW: Mark if circuit breaker was involved
          circuitBreakerTripped: circuitBreaker?.getState() === 'open',
        });
      } finally {
        executing.delete(task.id);
      }
    };

    // Execute until all tasks are done (existing logic)
    while (this.completedTasks.size < this.tasks.size) {
      const batchSize = Math.min(
        this.config.maxConcurrent - executing.size,
        this.tasks.size - this.completedTasks.size - executing.size
      );

      if (batchSize <= 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      const readyTasks: AgentTask[] = [];
      for (const [id, task] of this.tasks) {
        if (
          !this.completedTasks.has(id) &&
          !executing.has(id) &&
          readyTasks.length < batchSize
        ) {
          const depsReady = (task.dependsOn ?? []).every(
            (depId) => this.completedTasks.has(depId)
          );
          if (depsReady) {
            readyTasks.push(task);
          }
        }
      }

      await Promise.all(readyTasks.map((task) => executeTask(task)));
    }

    return results;
  }

  /**
   * NEW: Get metrics for all agent types used in this orchestrator
   */
  getMetrics(since?: Date): Map<string, ReturnType<typeof getAgentMetrics>> {
    const metrics = new Map();

    if (this.config.enableMetrics) {
      for (const agentType of this.circuitBreakers.keys()) {
        metrics.set(agentType, getAgentMetrics(agentType, since));
      }
    }

    return metrics;
  }

  /**
   * NEW: Get circuit breaker status for all agents
   */
  getCircuitBreakerStatus(): Array<{
    agentType: string
    state: CircuitState
    failureCount: number
    openedAt: Date | null
    timeUntilReset: number
  }> {
    return Array.from(this.circuitBreakers.values()).map(breaker => {
      const stats = breaker.getStats()
      return {
        agentType: stats.agentType,
        state: stats.state,
        failureCount: stats.failureCount,
        openedAt: stats.openedAt,
        timeUntilReset: stats.timeUntilReset,
      }
    })
  }

  /**
   * NEW: Reset a specific circuit breaker (admin operation)
   */
  resetCircuitBreaker(agentType: string): void {
    const breaker = this.circuitBreakers.get(agentType)
    if (breaker) {
      breaker.reset()
    }
  }

  /**
   * NEW: Reset all circuit breakers (admin operation)
   */
  resetAllCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset()
    }
  }

  /**
   * Infer agent type from task prompt (used when not explicitly set)
   */
  private inferAgentType(task: AgentTask): string {
    const prompt = task.prompt.toLowerCase()

    if (prompt.includes('analyze') || prompt.includes('review') || prompt.includes('audit')) {
      return 'CodeAnalyzer'
    }
    if (prompt.includes('refactor') || prompt.includes('rewrite') || prompt.includes('optimize')) {
      return 'RefactoringAgent'
    }
    if (prompt.includes('document') || prompt.includes('readme') || prompt.includes('doc')) {
      return 'DocumentationAgent'
    }

    return 'GenericAgent'
  }

  // ... existing methods (getBudgetUsage, getTaskStatus) remain unchanged
}
```

## 4. Usage Example

```typescript
import { AgentOrchestrator } from './orchestrator.js'
import { getAgentMetrics, getRecentExecutions, getCostSummary } from './agent-executions.js'

// Create orchestrator with production features enabled
const orchestrator = new AgentOrchestrator({
  cwd: process.cwd(),
  maxConcurrent: 3,
  maxBudgetUsd: 5.00,
  enablePersistence: true,        // Log all executions to DB
  enableCircuitBreakers: true,    // Prevent cascading failures
  enableMetrics: true,            // Collect performance data
})

// Add tasks with explicit agent types
orchestrator
  .addTask({
    id: 't1',
    prompt: 'Analyze this code for security issues',
    agentType: 'CodeAnalyzer',
  })
  .addTask({
    id: 't2',
    prompt: 'Refactor the authentication module',
    agentType: 'RefactoringAgent',
    dependsOn: ['t1'],
  })
  .addTask({
    id: 't3',
    prompt: 'Generate API documentation',
    agentType: 'DocumentationAgent',
    dependsOn: ['t2'],
  })

// Execute with production protections
const results = await orchestrator.execute()

// Check circuit breaker status
const cbStatus = orchestrator.getCircuitBreakerStatus()
console.log('Circuit breaker status:', cbStatus)
// Output:
// [
//   { agentType: 'CodeAnalyzer', state: 'closed', failureCount: 0, ... },
//   { agentType: 'RefactoringAgent', state: 'open', failureCount: 6, ... },
//   { agentType: 'DocumentationAgent', state: 'closed', failureCount: 0, ... }
// ]

// Get metrics for a specific agent
const analyzerMetrics = getAgentMetrics('CodeAnalyzer')
console.log('CodeAnalyzer stats:', {
  successRate: `${(analyzerMetrics.successRate * 100).toFixed(1)}%`,
  avgCost: `$${(analyzerMetrics.totalCostUsd / analyzerMetrics.totalExecutions).toFixed(4)}`,
  avgDuration: `${analyzerMetrics.avgDurationMs}ms`,
})

// Get cost summary
const costSummary = getCostSummary()
console.log('Total costs:', costSummary)
// Output:
// {
//   totalCostUsd: 12.50,
//   totalExecutions: 150,
//   costByAgentType: [
//     { agentType: 'CodeAnalyzer', costUsd: 5.00, executions: 60 },
//     { agentType: 'RefactoringAgent', costUsd: 6.00, executions: 50 },
//     { agentType: 'DocumentationAgent', costUsd: 1.50, executions: 40 },
//   ]
// }

// Get recent executions for dashboard
const recent = getRecentExecutions(20)
console.log('Recent activity:', recent.map(e => ({
  task: e.taskId,
  agent: e.agentType,
  status: e.status,
  cost: e.costUsd,
  duration: e.durationMs,
})))
```

## Benefits Summary

| Feature | Problem Solved | Production Value |
|---------|----------------|------------------|
| **Persistence** | No audit trail, costs not tracked, can't debug past runs | Full execution history, cost analysis, post-mortem debugging |
| **Circuit Breakers** | Failing agents waste budget, cascade failures | Automatic failure isolation, cost control, self-healing |
| **Metrics** | No visibility into which agents are expensive/slow | Performance optimization, cost reduction, capacity planning |

## File Structure

```
app/backend/shared/lib/
├── metadata.ts              # Existing: DB setup (add agent_executions table)
├── agent-executions.ts      # NEW: Persistence layer
├── circuit-breaker.ts       # NEW: Circuit breaker implementation
└── claudecodesdk/
    ├── orchestrator.ts      # UPDATE: Integrate production features
    ├── client.ts            # Existing: Agent client (unchanged)
    └── types.ts             # Existing: Type definitions (unchanged)
```

## Configuration Options

All production features can be toggled via config:

```typescript
const orchestrator = new AgentOrchestrator({
  // ... existing config
  enablePersistence: false,      // Disable DB logging
  enableCircuitBreakers: false,  // Disable circuit breakers
  enableMetrics: false,          // Disable metrics collection
})
```
