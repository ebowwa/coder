/**
 * Status Writer - Comprehensive telemetry for Coder
 *
 * When running in long-running/background mode, Coder writes its status
 * to a file that can be monitored with `tail -f` or similar.
 *
 * Status file location: ~/.claude/coder-status.json
 * Metrics file location: ~/.claude/coder-metrics.prom (Prometheus format)
 *
 * Features:
 * - Token tracking (input/output per turn, context window %)
 * - Model info (name, extended thinking, effort level)
 * - Performance metrics (tool times, API latency)
 * - File tracking (read/edited/created)
 * - MCP server activity
 * - Hook execution tracking
 * - Enhanced error tracking with stack traces
 * - WebSocket/SSE streaming for real-time monitoring
 * - Prometheus metrics export
 *
 * @module status-writer
 */

import { writeFileSync, mkdirSync, existsSync, unlinkSync, appendFileSync, createReadStream } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from "http";
import { WebSocketServer, type WebSocket } from "ws";

// ============================================
// TYPES
// ============================================

export interface TokenMetrics {
  /** Total input tokens used */
  inputTokens: number;
  /** Total output tokens generated */
  outputTokens: number;
  /** Input tokens this turn */
  inputTokensThisTurn: number;
  /** Output tokens this turn */
  outputTokensThisTurn: number;
  /** Context window size for current model */
  contextWindowSize: number;
  /** Percentage of context window used */
  contextWindowPercent: number;
  /** Token history (last 10 turns) */
  tokenHistory: Array<{
    turn: number;
    input: number;
    output: number;
    timestamp: string;
  }>;
}

export interface ModelInfo {
  /** Model identifier */
  model: string;
  /** Model display name */
  modelName: string;
  /** Extended thinking enabled */
  extendedThinking: boolean;
  /** Thinking effort level */
  effortLevel?: "low" | "medium" | "high" | "max";
  /** Interleaved thinking enabled */
  interleaved: boolean;
  /** Max tokens setting */
  maxTokens: number;
}

export interface ToolPerformance {
  /** Tool name */
  tool: string;
  /** Execution time in ms */
  durationMs: number;
  /** Timestamp */
  timestamp: string;
  /** Success or error */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

export interface PerformanceMetrics {
  /** Total API calls made */
  apiCalls: number;
  /** Average API latency in ms */
  avgApiLatencyMs: number;
  /** Last API latency in ms */
  lastApiLatencyMs: number;
  /** Slowest API call in ms */
  maxApiLatencyMs: number;
  /** Tool execution times (last 20) */
  toolTimings: ToolPerformance[];
  /** Slow operations (>5s) */
  slowOperations: Array<{
    operation: string;
    durationMs: number;
    timestamp: string;
  }>;
  /** Average tool execution time */
  avgToolTimeMs: number;
}

export interface FileChange {
  /** File path */
  path: string;
  /** Operation type */
  operation: "read" | "edit" | "create" | "delete";
  /** Timestamp */
  timestamp: string;
  /** Size in bytes (if available) */
  size?: number;
  /** Lines changed (for edits) */
  linesChanged?: number;
  /** Brief description of change */
  description?: string;
}

export interface FileMetrics {
  /** Files read this session */
  filesRead: string[];
  /** Files edited this session */
  filesEdited: string[];
  /** Files created this session */
  filesCreated: string[];
  /** Files deleted this session */
  filesDeleted: string[];
  /** Detailed file changes (last 50) */
  recentChanges: FileChange[];
  /** Total bytes read */
  totalBytesRead: number;
  /** Total bytes written */
  totalBytesWritten: number;
}

export interface MCPServerActivity {
  /** Server name */
  server: string;
  /** Number of tool calls */
  callCount: number;
  /** Last tool called */
  lastTool?: string;
  /** Last call timestamp */
  lastCallTime?: string;
  /** Errors from this server */
  errorCount: number;
  /** Average response time in ms */
  avgResponseTimeMs: number;
}

export interface MCPMetrics {
  /** Connected MCP servers */
  connectedServers: string[];
  /** Server activity tracking */
  serverActivity: Record<string, MCPServerActivity>;
  /** Total MCP tool calls */
  totalMcpCalls: number;
  /** MCP errors this session */
  mcpErrors: number;
}

export interface HookExecution {
  /** Hook name */
  hook: string;
  /** Event type */
  event: string;
  /** Execution time in ms */
  durationMs: number;
  /** Timestamp */
  timestamp: string;
  /** Whether the hook blocked the action */
  blocked: boolean;
  /** Block reason if blocked */
  blockReason?: string;
}

export interface HookMetrics {
  /** Total hook executions */
  totalExecutions: number;
  /** Total blocked actions */
  blockedActions: number;
  /** Hook execution details (last 30) */
  recentExecutions: HookExecution[];
  /** Average hook execution time */
  avgExecutionTimeMs: number;
  /** Hooks that have failed */
  failedHooks: string[];
}

export interface ErrorRecord {
  /** Error message */
  message: string;
  /** Stack trace */
  stack?: string;
  /** Timestamp */
  timestamp: string;
  /** Error type */
  type: "tool" | "api" | "hook" | "mcp" | "internal";
  /** Tool or operation that caused the error */
  source?: string;
  /** Whether the error was recovered from */
  recovered: boolean;
  /** Recovery action taken */
  recoveryAction?: string;
}

export interface ErrorMetrics {
  /** Total errors this session */
  totalErrors: number;
  /** Errors by type */
  errorsByType: Record<string, number>;
  /** Recent errors (last 20) */
  recentErrors: ErrorRecord[];
  /** Error rate (errors per turn) */
  errorRate: number;
  /** Recovery rate */
  recoveryRate: number;
}

export interface CoderStatus {
  // === Basic Status ===
  /** Timestamp of last update */
  timestamp: string;
  /** Session ID */
  sessionId: string;
  /** Current turn number */
  turnNumber: number;
  /** Total cost so far */
  totalCost: number;
  /** Session duration in ms */
  durationMs: number;
  /** Number of tools used */
  toolUseCount: number;
  /** Number of messages in context */
  messageCount: number;
  /** Number of compactions */
  compactionCount: number;
  /** Last tool used */
  lastTool: string | null;
  /** Recent tools used (last 10) */
  recentTools: string[];
  /** Current activity description */
  currentActivity: string;
  /** Working directory */
  workingDirectory: string;
  /** Original goal */
  goal: string;
  /** Git status (if available) */
  gitStatus?: {
    branch: string;
    dirty: boolean;
    uncommittedFiles: number;
    ahead: number;
    behind: number;
  };
  /** Milestones achieved */
  milestones: string[];

  // === Token Metrics ===
  tokens: TokenMetrics;

  // === Model Info ===
  model: ModelInfo;

  // === Performance Metrics ===
  performance: PerformanceMetrics;

  // === File Metrics ===
  files: FileMetrics;

  // === MCP Metrics ===
  mcp: MCPMetrics;

  // === Hook Metrics ===
  hooks: HookMetrics;

  // === Error Metrics ===
  errors: ErrorMetrics;

  // === Streaming Status ===
  streaming: {
    /** WebSocket server running */
    websocketEnabled: boolean;
    /** WebSocket port */
    websocketPort?: number;
    /** Number of connected clients */
    connectedClients: number;
    /** SSE enabled */
    sseEnabled: boolean;
    /** SSE port */
    ssePort?: number;
  };
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_DIR = join(homedir(), ".claude");
const STATUS_FILE = join(STATUS_DIR, "coder-status.json");
const STATUS_LOG = join(STATUS_DIR, "coder-status.log");
const METRICS_FILE = join(STATUS_DIR, "coder-metrics.prom");
const DEFAULT_WS_PORT = 9876;
const DEFAULT_SSE_PORT = 9877;

// ============================================
// DEFAULT VALUES
// ============================================

function createDefaultTokenMetrics(): TokenMetrics {
  return {
    inputTokens: 0,
    outputTokens: 0,
    inputTokensThisTurn: 0,
    outputTokensThisTurn: 0,
    contextWindowSize: 200000,
    contextWindowPercent: 0,
    tokenHistory: [],
  };
}

function createDefaultModelInfo(): ModelInfo {
  return {
    model: "unknown",
    modelName: "Unknown Model",
    extendedThinking: false,
    interleaved: false,
    maxTokens: 4096,
  };
}

function createDefaultPerformanceMetrics(): PerformanceMetrics {
  return {
    apiCalls: 0,
    avgApiLatencyMs: 0,
    lastApiLatencyMs: 0,
    maxApiLatencyMs: 0,
    toolTimings: [],
    slowOperations: [],
    avgToolTimeMs: 0,
  };
}

function createDefaultFileMetrics(): FileMetrics {
  return {
    filesRead: [],
    filesEdited: [],
    filesCreated: [],
    filesDeleted: [],
    recentChanges: [],
    totalBytesRead: 0,
    totalBytesWritten: 0,
  };
}

function createDefaultMCPMetrics(): MCPMetrics {
  return {
    connectedServers: [],
    serverActivity: {},
    totalMcpCalls: 0,
    mcpErrors: 0,
  };
}

function createDefaultHookMetrics(): HookMetrics {
  return {
    totalExecutions: 0,
    blockedActions: 0,
    recentExecutions: [],
    avgExecutionTimeMs: 0,
    failedHooks: [],
  };
}

function createDefaultErrorMetrics(): ErrorMetrics {
  return {
    totalErrors: 0,
    errorsByType: {},
    recentErrors: [],
    errorRate: 0,
    recoveryRate: 0,
  };
}

// ============================================
// STATUS WRITER CLASS
// ============================================

export interface StatusWriterOptions {
  /** Session ID */
  sessionId: string;
  /** Original goal */
  goal: string;
  /** Working directory */
  workingDirectory: string;
  /** Model identifier */
  model?: string;
  /** Max tokens setting */
  maxTokens?: number;
  /** Enable extended thinking */
  extendedThinking?: boolean;
  /** Effort level */
  effortLevel?: "low" | "medium" | "high" | "max";
  /** Enable interleaved thinking */
  interleaved?: boolean;
  /** Context window size */
  contextWindowSize?: number;
  /** Enable WebSocket streaming */
  enableWebSocket?: boolean;
  /** WebSocket port */
  websocketPort?: number;
  /** Enable SSE streaming */
  enableSSE?: boolean;
  /** SSE port */
  ssePort?: number;
  /** Connected MCP servers */
  mcpServers?: string[];
}

/**
 * StatusWriter manages comprehensive telemetry for Coder
 */
export class StatusWriter {
  private status: CoderStatus;
  private enabled: boolean;
  private lastLogTime: number = 0;
  private logIntervalMs: number = 5000;
  private startTime: number;

  // Streaming
  private wsServer?: WebSocketServer;
  private wsClients: Set<WebSocket> = new Set();
  private sseServer?: HttpServer;
  private sseClients: Set<ServerResponse> = new Set();

  // Performance tracking
  private apiLatencies: number[] = [];
  private toolTimes: number[] = [];

  constructor(options: StatusWriterOptions) {
    this.enabled = true;
    this.startTime = Date.now();

    const {
      sessionId,
      goal,
      workingDirectory,
      model = "unknown",
      maxTokens = 4096,
      extendedThinking = false,
      effortLevel,
      interleaved = false,
      contextWindowSize = 200000,
      enableWebSocket = false,
      websocketPort = DEFAULT_WS_PORT,
      enableSSE = false,
      ssePort = DEFAULT_SSE_PORT,
      mcpServers = [],
    } = options;

    this.status = {
      timestamp: new Date().toISOString(),
      sessionId,
      turnNumber: 0,
      totalCost: 0,
      durationMs: 0,
      toolUseCount: 0,
      messageCount: 0,
      compactionCount: 0,
      lastTool: null,
      recentTools: [],
      currentActivity: "Initializing",
      workingDirectory,
      goal,
      milestones: [],
      tokens: { ...createDefaultTokenMetrics(), contextWindowSize },
      model: {
        model,
        modelName: this.getModelDisplayName(model),
        extendedThinking,
        effortLevel,
        interleaved,
        maxTokens,
      },
      performance: createDefaultPerformanceMetrics(),
      files: createDefaultFileMetrics(),
      mcp: {
        ...createDefaultMCPMetrics(),
        connectedServers: mcpServers,
      },
      hooks: createDefaultHookMetrics(),
      errors: createDefaultErrorMetrics(),
      streaming: {
        websocketEnabled: enableWebSocket,
        websocketPort: enableWebSocket ? websocketPort : undefined,
        connectedClients: 0,
        sseEnabled: enableSSE,
        ssePort: enableSSE ? ssePort : undefined,
      },
    };

    // Ensure status directory exists
    if (!existsSync(STATUS_DIR)) {
      mkdirSync(STATUS_DIR, { recursive: true });
    }

    // Start streaming servers if enabled
    if (enableWebSocket) {
      this.startWebSocketServer(websocketPort);
    }
    if (enableSSE) {
      this.startSSEServer(ssePort);
    }

    // Write initial status
    this.write();
  }

  // ============================================
  // BASIC UPDATES
  // ============================================

  /**
   * Update the status with new information
   */
  update(updates: Partial<Omit<CoderStatus, "timestamp" | "sessionId" | "workingDirectory" | "goal">>): void {
    if (!this.enabled) return;

    Object.assign(this.status, updates);
    this.status.timestamp = new Date().toISOString();
    this.status.durationMs = Date.now() - this.startTime;
    this.write();
    this.broadcast();
  }

  /**
   * Record a tool use with performance tracking
   */
  recordToolUse(toolName: string, durationMs?: number, success?: boolean, error?: string): void {
    if (!this.enabled) return;

    this.status.lastTool = toolName;
    this.status.recentTools = [...this.status.recentTools, toolName].slice(-10);
    this.status.toolUseCount++;
    this.status.currentActivity = `Using ${toolName}`;

    // Track performance
    if (durationMs !== undefined) {
      const timing: ToolPerformance = {
        tool: toolName,
        durationMs,
        timestamp: new Date().toISOString(),
        success: success ?? true,
        error,
      };
      this.status.performance.toolTimings = [...this.status.performance.toolTimings, timing].slice(-20);
      this.toolTimes.push(durationMs);
      this.updateAvgToolTime();

      // Track slow operations (>5s)
      if (durationMs > 5000) {
        this.status.performance.slowOperations = [
          ...this.status.performance.slowOperations,
          { operation: toolName, durationMs, timestamp: timing.timestamp },
        ].slice(-10);
      }
    }

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  /**
   * Record a milestone
   */
  recordMilestone(milestone: string): void {
    if (!this.enabled) return;

    this.status.milestones.push(milestone);
    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
    this.log(`MILESTONE: ${milestone}`);
  }

  // ============================================
  // TOKEN TRACKING
  // ============================================

  /**
   * Update token metrics
   */
  updateTokens(inputTokens: number, outputTokens: number): void {
    if (!this.enabled) return;

    const prevInput = this.status.tokens.inputTokens;
    const prevOutput = this.status.tokens.outputTokens;

    this.status.tokens.inputTokens = inputTokens;
    this.status.tokens.outputTokens = outputTokens;
    this.status.tokens.inputTokensThisTurn = inputTokens - prevInput;
    this.status.tokens.outputTokensThisTurn = outputTokens - prevOutput;

    // Calculate context window percentage
    const totalTokens = inputTokens + outputTokens;
    this.status.tokens.contextWindowPercent =
      (totalTokens / this.status.tokens.contextWindowSize) * 100;

    // Add to history
    this.status.tokens.tokenHistory = [
      ...this.status.tokens.tokenHistory,
      {
        turn: this.status.turnNumber,
        input: this.status.tokens.inputTokensThisTurn,
        output: this.status.tokens.outputTokensThisTurn,
        timestamp: new Date().toISOString(),
      },
    ].slice(-10);

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  // ============================================
  // PERFORMANCE TRACKING
  // ============================================

  /**
   * Record API call latency
   */
  recordApiLatency(latencyMs: number): void {
    if (!this.enabled) return;

    this.status.performance.apiCalls++;
    this.status.performance.lastApiLatencyMs = latencyMs;
    this.status.performance.maxApiLatencyMs = Math.max(
      this.status.performance.maxApiLatencyMs,
      latencyMs
    );

    this.apiLatencies.push(latencyMs);
    if (this.apiLatencies.length > 50) {
      this.apiLatencies.shift();
    }
    this.status.performance.avgApiLatencyMs =
      this.apiLatencies.reduce((a, b) => a + b, 0) / this.apiLatencies.length;

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  private updateAvgToolTime(): void {
    if (this.toolTimes.length === 0) return;
    if (this.toolTimes.length > 50) {
      this.toolTimes = this.toolTimes.slice(-50);
    }
    this.status.performance.avgToolTimeMs =
      this.toolTimes.reduce((a, b) => a + b, 0) / this.toolTimes.length;
  }

  // ============================================
  // FILE TRACKING
  // ============================================

  /**
   * Record file read
   */
  recordFileRead(path: string, size?: number): void {
    if (!this.enabled) return;

    if (!this.status.files.filesRead.includes(path)) {
      this.status.files.filesRead.push(path);
    }
    if (size !== undefined) {
      this.status.files.totalBytesRead += size;
    }

    const change: FileChange = {
      path,
      operation: "read" as const,
      timestamp: new Date().toISOString(),
      size,
    };

    this.status.files.recentChanges = [
      ...this.status.files.recentChanges,
      change,
    ].slice(-50);

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  /**
   * Record file edit
   */
  recordFileEdit(path: string, linesChanged?: number, description?: string): void {
    if (!this.enabled) return;

    if (!this.status.files.filesEdited.includes(path)) {
      this.status.files.filesEdited.push(path);
    }

    const change: FileChange = {
      path,
      operation: "edit" as const,
      timestamp: new Date().toISOString(),
      linesChanged,
      description,
    };

    this.status.files.recentChanges = [
      ...this.status.files.recentChanges,
      change,
    ].slice(-50);

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  /**
   * Record file creation
   */
  recordFileCreate(path: string, size?: number): void {
    if (!this.enabled) return;

    if (!this.status.files.filesCreated.includes(path)) {
      this.status.files.filesCreated.push(path);
    }
    if (size !== undefined) {
      this.status.files.totalBytesWritten += size;
    }

    const change: FileChange = {
      path,
      operation: "create" as const,
      timestamp: new Date().toISOString(),
      size,
    };

    this.status.files.recentChanges = [
      ...this.status.files.recentChanges,
      change,
    ].slice(-50);

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  /**
   * Record file deletion
   */
  recordFileDelete(path: string): void {
    if (!this.enabled) return;

    if (!this.status.files.filesDeleted.includes(path)) {
      this.status.files.filesDeleted.push(path);
    }

    const change: FileChange = {
      path,
      operation: "delete" as const,
      timestamp: new Date().toISOString(),
    };

    this.status.files.recentChanges = [
      ...this.status.files.recentChanges,
      change,
    ].slice(-50);

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  // ============================================
  // MCP TRACKING
  // ============================================

  /**
   * Record MCP tool call
   */
  recordMcpCall(server: string, tool: string, durationMs?: number, error?: boolean): void {
    if (!this.enabled) return;

    this.status.mcp.totalMcpCalls++;

    if (!this.status.mcp.serverActivity[server]) {
      this.status.mcp.serverActivity[server] = {
        server,
        callCount: 0,
        errorCount: 0,
        avgResponseTimeMs: 0,
      };
    }

    const activity = this.status.mcp.serverActivity[server];
    activity.callCount++;
    activity.lastTool = tool;
    activity.lastCallTime = new Date().toISOString();

    if (error) {
      activity.errorCount++;
      this.status.mcp.mcpErrors++;
    }

    if (durationMs !== undefined) {
      // Update average response time
      activity.avgResponseTimeMs =
        (activity.avgResponseTimeMs * (activity.callCount - 1) + durationMs) / activity.callCount;
    }

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  /**
   * Update connected MCP servers
   */
  updateMcpServers(servers: string[]): void {
    if (!this.enabled) return;

    this.status.mcp.connectedServers = servers;
    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  // ============================================
  // HOOK TRACKING
  // ============================================

  /**
   * Record hook execution
   */
  recordHookExecution(
    hook: string,
    event: string,
    durationMs: number,
    blocked: boolean = false,
    blockReason?: string
  ): void {
    if (!this.enabled) return;

    this.status.hooks.totalExecutions++;
    if (blocked) {
      this.status.hooks.blockedActions++;
    }

    this.status.hooks.recentExecutions = [
      ...this.status.hooks.recentExecutions,
      {
        hook,
        event,
        durationMs,
        timestamp: new Date().toISOString(),
        blocked,
        blockReason,
      },
    ].slice(-30);

    // Update average execution time
    const times = this.status.hooks.recentExecutions.map(e => e.durationMs);
    this.status.hooks.avgExecutionTimeMs =
      times.reduce((a, b) => a + b, 0) / times.length;

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  /**
   * Record failed hook
   */
  recordHookFailure(hook: string): void {
    if (!this.enabled) return;

    if (!this.status.hooks.failedHooks.includes(hook)) {
      this.status.hooks.failedHooks.push(hook);
    }

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  // ============================================
  // ERROR TRACKING
  // ============================================

  /**
   * Record an error with full details
   */
  recordError(
    message: string,
    type: ErrorRecord["type"] = "internal",
    source?: string,
    stack?: string
  ): void {
    if (!this.enabled) return;

    const error: ErrorRecord = {
      message,
      stack,
      timestamp: new Date().toISOString(),
      type,
      source,
      recovered: false,
    };

    this.status.errors.totalErrors++;
    this.status.errors.recentErrors = [...this.status.errors.recentErrors, error].slice(-20);

    // Update errors by type
    this.status.errors.errorsByType[type] = (this.status.errors.errorsByType[type] || 0) + 1;

    // Update error rate
    this.status.errors.errorRate =
      this.status.turnNumber > 0 ? this.status.errors.totalErrors / this.status.turnNumber : 0;

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
    this.log(`ERROR [${type}]: ${message}${source ? ` (${source})` : ""}`);
  }

  /**
   * Mark last error as recovered
   */
  recordErrorRecovery(recoveryAction?: string): void {
    if (!this.enabled) return;

    const lastError = this.status.errors.recentErrors[this.status.errors.recentErrors.length - 1];
    if (lastError) {
      lastError.recovered = true;
      lastError.recoveryAction = recoveryAction;
    }

    // Update recovery rate
    const recovered = this.status.errors.recentErrors.filter(e => e.recovered).length;
    this.status.errors.recoveryRate =
      this.status.errors.totalErrors > 0 ? recovered / this.status.errors.totalErrors : 0;

    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  /**
   * Clear the last error
   */
  clearError(): void {
    if (!this.enabled) return;
    // Errors are now tracked in errors.recentErrors, not a single field
    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  // ============================================
  // GIT STATUS
  // ============================================

  /**
   * Update git status
   */
  updateGitStatus(
    branch: string,
    dirty: boolean,
    uncommittedFiles: number,
    ahead: number = 0,
    behind: number = 0
  ): void {
    if (!this.enabled) return;

    this.status.gitStatus = { branch, dirty, uncommittedFiles, ahead, behind };
    this.status.timestamp = new Date().toISOString();
    this.write();
    this.broadcast();
  }

  // ============================================
  // ACTIVITY & STATE
  // ============================================

  /**
   * Set current activity
   */
  setActivity(activity: string): void {
    if (!this.enabled) return;

    this.status.currentActivity = activity;
    this.status.timestamp = new Date().toISOString();
    this.status.durationMs = Date.now() - this.startTime;
    this.write();
    this.broadcast();
  }

  /**
   * Get the current status
   */
  getStatus(): CoderStatus {
    return { ...this.status };
  }

  /**
   * Disable status writing
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Enable status writing
   */
  enable(): void {
    this.enabled = true;
  }

  // ============================================
  // STREAMING
  // ============================================

  private startWebSocketServer(port: number): void {
    try {
      this.wsServer = new WebSocketServer({ port });

      this.wsServer.on("connection", (ws: WebSocket) => {
        this.wsClients.add(ws);
        this.status.streaming.connectedClients = this.wsClients.size;

        // Send current status immediately
        ws.send(JSON.stringify(this.status));

        ws.on("close", () => {
          this.wsClients.delete(ws);
          this.status.streaming.connectedClients = this.wsClients.size;
        });

        ws.on("error", () => {
          this.wsClients.delete(ws);
          this.status.streaming.connectedClients = this.wsClients.size;
        });
      });

      this.log(`WebSocket server started on port ${port}`);
    } catch (error) {
      this.log(`Failed to start WebSocket server: ${error}`);
    }
  }

  private startSSEServer(port: number): void {
    try {
      this.sseServer = createServer((req: IncomingMessage, res: ServerResponse) => {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });

        this.sseClients.add(res);
        this.status.streaming.connectedClients = this.wsClients.size + this.sseClients.size;

        // Send initial status
        res.write(`data: ${JSON.stringify(this.status)}\n\n`);

        req.on("close", () => {
          this.sseClients.delete(res);
          this.status.streaming.connectedClients = this.wsClients.size + this.sseClients.size;
        });
      });

      this.sseServer.listen(port);
      this.log(`SSE server started on port ${port}`);
    } catch (error) {
      this.log(`Failed to start SSE server: ${error}`);
    }
  }

  /**
   * Broadcast status to all connected clients
   */
  private broadcast(): void {
    const data = JSON.stringify(this.status);

    // WebSocket broadcast
    this.wsClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    });

    // SSE broadcast
    this.sseClients.forEach(client => {
      client.write(`data: ${data}\n\n`);
    });
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Clean up status files and streaming servers
   */
  cleanup(): void {
    // Close WebSocket server
    if (this.wsServer) {
      this.wsClients.forEach(client => client.close());
      this.wsServer.close();
    }

    // Close SSE server
    if (this.sseServer) {
      this.sseClients.forEach(client => client.end());
      this.sseServer.close();
    }

    // Remove status file
    try {
      if (existsSync(STATUS_FILE)) {
        unlinkSync(STATUS_FILE);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  // ============================================
  // WRITING
  // ============================================

  /**
   * Write status to JSON file
   */
  private write(): void {
    try {
      writeFileSync(STATUS_FILE, JSON.stringify(this.status, null, 2));
      this.writePrometheusMetrics();
    } catch {
      // Ignore write errors
    }
  }

  /**
   * Write Prometheus metrics file
   */
  private writePrometheusMetrics(): void {
    try {
      const metrics: string[] = [
        "# HELP coder_session_duration_ms Session duration in milliseconds",
        "# TYPE coder_session_duration_ms gauge",
        `coder_session_duration_ms{session="${this.status.sessionId}"} ${this.status.durationMs}`,
        "",
        "# HELP coder_turn_number Current turn number",
        "# TYPE coder_turn_number gauge",
        `coder_turn_number{session="${this.status.sessionId}"} ${this.status.turnNumber}`,
        "",
        "# HELP coder_total_cost_usd Total cost in USD",
        "# TYPE coder_total_cost_usd gauge",
        `coder_total_cost_usd{session="${this.status.sessionId}"} ${this.status.totalCost}`,
        "",
        "# HELP coder_tool_use_count Total tool uses",
        "# TYPE coder_tool_use_count counter",
        `coder_tool_use_count{session="${this.status.sessionId}"} ${this.status.toolUseCount}`,
        "",
        "# HELP coder_tokens_input_total Input tokens used",
        "# TYPE coder_tokens_input_total counter",
        `coder_tokens_input_total{session="${this.status.sessionId}"} ${this.status.tokens.inputTokens}`,
        "",
        "# HELP coder_tokens_output_total Output tokens generated",
        "# TYPE coder_tokens_output_total counter",
        `coder_tokens_output_total{session="${this.status.sessionId}"} ${this.status.tokens.outputTokens}`,
        "",
        "# HELP coder_context_window_percent Context window usage percentage",
        "# TYPE coder_context_window_percent gauge",
        `coder_context_window_percent{session="${this.status.sessionId}"} ${this.status.tokens.contextWindowPercent}`,
        "",
        "# HELP coder_api_latency_ms API latency in milliseconds",
        "# TYPE coder_api_latency_ms gauge",
        `coder_api_latency_ms{session="${this.status.sessionId}"} ${this.status.performance.lastApiLatencyMs}`,
        "",
        "# HELP coder_api_latency_avg_ms Average API latency",
        "# TYPE coder_api_latency_avg_ms gauge",
        `coder_api_latency_avg_ms{session="${this.status.sessionId}"} ${this.status.performance.avgApiLatencyMs}`,
        "",
        "# HELP coder_tool_time_avg_ms Average tool execution time",
        "# TYPE coder_tool_time_avg_ms gauge",
        `coder_tool_time_avg_ms{session="${this.status.sessionId}"} ${this.status.performance.avgToolTimeMs}`,
        "",
        "# HELP coder_files_read_total Files read",
        "# TYPE coder_files_read_total counter",
        `coder_files_read_total{session="${this.status.sessionId}"} ${this.status.files.filesRead.length}`,
        "",
        "# HELP coder_files_edited_total Files edited",
        "# TYPE coder_files_edited_total counter",
        `coder_files_edited_total{session="${this.status.sessionId}"} ${this.status.files.filesEdited.length}`,
        "",
        "# HELP coder_errors_total Total errors",
        "# TYPE coder_errors_total counter",
        `coder_errors_total{session="${this.status.sessionId}"} ${this.status.errors.totalErrors}`,
        "",
        "# HELP coder_error_rate Errors per turn",
        "# TYPE coder_error_rate gauge",
        `coder_error_rate{session="${this.status.sessionId}"} ${this.status.errors.errorRate}`,
        "",
        "# HELP coder_mcp_calls_total MCP tool calls",
        "# TYPE coder_mcp_calls_total counter",
        `coder_mcp_calls_total{session="${this.status.sessionId}"} ${this.status.mcp.totalMcpCalls}`,
        "",
        "# HELP coder_hooks_blocked_total Hook blocked actions",
        "# TYPE coder_hooks_blocked_total counter",
        `coder_hooks_blocked_total{session="${this.status.sessionId}"} ${this.status.hooks.blockedActions}`,
        "",
        "# HELP coder_connected_clients Connected streaming clients",
        "# TYPE coder_connected_clients gauge",
        `coder_connected_clients{session="${this.status.sessionId}"} ${this.status.streaming.connectedClients}`,
      ];

      // Add per-server MCP metrics
      for (const [server, activity] of Object.entries(this.status.mcp.serverActivity)) {
        metrics.push("");
        metrics.push(`coder_mcp_server_calls{session="${this.status.sessionId}",server="${server}"} ${activity.callCount}`);
        metrics.push(`coder_mcp_server_errors{session="${this.status.sessionId}",server="${server}"} ${activity.errorCount}`);
        metrics.push(`coder_mcp_server_latency_ms{session="${this.status.sessionId}",server="${server}"} ${activity.avgResponseTimeMs}`);
      }

      // Add error type breakdown
      for (const [type, count] of Object.entries(this.status.errors.errorsByType)) {
        metrics.push("");
        metrics.push(`coder_errors_by_type{session="${this.status.sessionId}",type="${type}"} ${count}`);
      }

      writeFileSync(METRICS_FILE, metrics.join("\n"));
    } catch {
      // Ignore write errors
    }
  }

  /**
   * Append to log file (rate-limited)
   */
  private log(message: string): void {
    const now = Date.now();
    if (now - this.lastLogTime < this.logIntervalMs) return;

    this.lastLogTime = now;
    try {
      const timestamp = new Date().toISOString();
      const logLine = `[${timestamp}] ${message}\n`;
      appendFileSync(STATUS_LOG, logLine);
    } catch {
      // Ignore log errors
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private getModelDisplayName(model: string): string {
    const modelNames: Record<string, string> = {
      "claude-opus-4-6": "Claude Opus 4.6",
      "claude-sonnet-4-6": "Claude Sonnet 4.6",
      "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
      "glm-5": "GLM-5",
    };
    return modelNames[model] || model;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get the path to the status file
 */
export function getStatusFilePath(): string {
  return STATUS_FILE;
}

/**
 * Get the path to the status log file
 */
export function getStatusLogPath(): string {
  return STATUS_LOG;
}

/**
 * Get the path to the Prometheus metrics file
 */
export function getMetricsFilePath(): string {
  return METRICS_FILE;
}

/**
 * Read the current status (if any)
 */
export function readStatus(): CoderStatus | null {
  try {
    if (!existsSync(STATUS_FILE)) return null;
    const content = require("fs").readFileSync(STATUS_FILE, "utf-8");
    return JSON.parse(content) as CoderStatus;
  } catch {
    return null;
  }
}

/**
 * Format status for display (enhanced)
 */
export function formatStatus(status: CoderStatus): string {
  const lines: string[] = [
    `Coder Status - ${status.timestamp}`,
    `─`.repeat(60),
    `Session: ${status.sessionId}`,
    `Turn: ${status.turnNumber} | Cost: $${status.totalCost.toFixed(4)}`,
    `Duration: ${formatDuration(status.durationMs)}`,
    "",
    "─── Model ───",
    `${status.model.modelName} (${status.model.model})`,
    `Max tokens: ${status.model.maxTokens} | Extended thinking: ${status.model.extendedThinking ? "ON" : "OFF"}`,
    "",
    "─── Tokens ───",
    `Input: ${formatNumber(status.tokens.inputTokens)} | Output: ${formatNumber(status.tokens.outputTokens)}`,
    `Context: ${status.tokens.contextWindowPercent.toFixed(1)}% used`,
    "",
    "─── Activity ───",
    `Current: ${status.currentActivity}`,
    `Tools: ${status.toolUseCount} | Recent: ${status.recentTools.slice(-5).join(" → ") || "none"}`,
    "",
    "─── Performance ───",
    `API calls: ${status.performance.apiCalls} | Avg latency: ${status.performance.avgApiLatencyMs.toFixed(0)}ms`,
    `Avg tool time: ${status.performance.avgToolTimeMs.toFixed(0)}ms`,
    "",
    "─── Files ───",
    `Read: ${status.files.filesRead.length} | Edited: ${status.files.filesEdited.length} | Created: ${status.files.filesCreated.length}`,
    "",
    "─── MCP ───",
    `Servers: ${status.mcp.connectedServers.length} | Calls: ${status.mcp.totalMcpCalls} | Errors: ${status.mcp.mcpErrors}`,
    "",
    "─── Errors ───",
    `Total: ${status.errors.totalErrors} | Rate: ${status.errors.errorRate.toFixed(2)}/turn | Recovery: ${(status.errors.recoveryRate * 100).toFixed(0)}%`,
    "",
    "─── Hooks ───",
    `Executions: ${status.hooks.totalExecutions} | Blocked: ${status.hooks.blockedActions}`,
  ];

  if (status.gitStatus) {
    lines.push("");
    lines.push("─── Git ───");
    lines.push(`Branch: ${status.gitStatus.branch}${status.gitStatus.dirty ? " (dirty)" : ""}`);
    if (status.gitStatus.ahead > 0 || status.gitStatus.behind > 0) {
      lines.push(`Ahead: ${status.gitStatus.ahead} | Behind: ${status.gitStatus.behind}`);
    }
  }

  if (status.milestones.length > 0) {
    lines.push("");
    lines.push("─── Milestones ───");
    status.milestones.slice(-5).forEach(m => {
      lines.push(`  ✓ ${m}`);
    });
  }

  if (status.streaming.websocketEnabled || status.streaming.sseEnabled) {
    lines.push("");
    lines.push("─── Streaming ───");
    if (status.streaming.websocketEnabled) {
      lines.push(`WebSocket: port ${status.streaming.websocketPort}`);
    }
    if (status.streaming.sseEnabled) {
      lines.push(`SSE: port ${status.streaming.ssePort}`);
    }
    lines.push(`Clients: ${status.streaming.connectedClients}`);
  }

  if (status.errors.recentErrors.length > 0) {
    lines.push("");
    lines.push("─── Recent Errors ───");
    status.errors.recentErrors.slice(-3).forEach(e => {
      lines.push(`  [${e.type}] ${e.message.slice(0, 60)}${e.message.length > 60 ? "..." : ""}`);
    });
  }

  return lines.join("\n");
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) {
    return `${(n / 1000000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return n.toString();
}

// Default export
export default StatusWriter;
