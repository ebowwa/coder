/**
 * Core Types for Claude Code Remake
 * Based on binary analysis of Claude Code v2.1.50
 */

// ============================================
// MESSAGE TYPES
// ============================================

export interface Message {
  role: "user" | "assistant";
  content: ContentBlock[];
}

export type ContentBlock =
  | TextBlock
  | ImageBlock
  | ToolUseBlock
  | ToolResultBlock
  | ThinkingBlock
  | RedactedThinkingBlock;

export interface TextBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

export interface ImageBlock {
  type: "image";
  source: {
    type: "base64";
    data: string;
    media_type: MediaType;
  };
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
}

export interface ThinkingBlock {
  type: "thinking";
  thinking: string;
}

export interface RedactedThinkingBlock {
  type: "redacted_thinking";
  data: string;
}

export interface CacheControl {
  type: "ephemeral";
  ttl?: CacheTTL;
}

export type CacheTTL = "1h" | "5m";

export interface CacheConfig {
  enabled: boolean;
  ttl: CacheTTL;
  cacheSystemPrompt: boolean;
  cacheTools: boolean;
  minTokensForCache: number;
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: "1h",
  cacheSystemPrompt: true,
  cacheTools: true,
  minTokensForCache: 1024,
};

export type MediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// ============================================
// TOOL DEFINITIONS
// ============================================

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: JSONSchema;
  handler: ToolHandler;
}

export interface JSONSchema {
  type: "object";
  properties: Record<string, SchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface SchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolContext
) => Promise<ToolResult>;

export interface ToolContext {
  workingDirectory: string;
  permissionMode: PermissionMode;
  abortSignal?: AbortSignal;
  onProgress?: (message: string) => void;
}

export interface ToolResult {
  content: string | ContentBlock[];
  is_error?: boolean;
}

// ============================================
// PERMISSION SYSTEM
// ============================================

export type PermissionMode =
  | "default" // Standard - prompts for dangerous
  | "acceptEdits" // Auto-accept file edits
  | "bypassPermissions" // Skip all (dangerous!)
  | "plan" // Planning mode
  | "dontAsk" // Deny if not pre-approved
  | "interactive"; // Ask each time

export interface PermissionResult {
  decision: "allow" | "deny" | "ask";
  reason?: string;
}

export interface PermissionContext {
  mode: PermissionMode;
  allowedTools: Set<string>;
  disallowedTools: Set<string>;
  riskTolerance: RiskLevel;
}

export type RiskLevel = "low" | "medium" | "high";

// ============================================
// CONFIGURATION
// ============================================

export interface ClaudeConfig {
  model: ModelConfig;
  mcp: MCPConfig;
  permissions: PermissionConfig;
  hooks?: HookConfig;
  skills?: SkillConfig;
  telemetry?: TelemetryConfig;
}

export interface ModelConfig {
  model: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  thinking?: ThinkingConfig;
  effort?: EffortLevel;
}

export type ClaudeModel =
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5"
  | string;

export type ThinkingConfig =
  | { type: "disabled" }
  | { type: "enabled"; budget_tokens: number }
  | { type: "adaptive" };

export type EffortLevel = "low" | "medium" | "high" | "max";

/**
 * Extended Thinking configuration with effort levels
 * Budget tokens control how many tokens the model can use for thinking
 */
export interface ExtendedThinkingConfig {
  /** Enable extended thinking */
  enabled: boolean;
  /** Budget in tokens (1024-100000), or use effort level */
  budgetTokens?: number;
  /** Effort level: low (1k), medium (4k), high (16k), max (100k) */
  effort?: EffortLevel;
  /** Allow interleaved thinking (thinking during tool use) */
  interleaved?: boolean;
  /** Model-specific budget multiplier */
  modelMultiplier?: number;
}

/**
 * Map effort levels to budget tokens
 */
export const EFFORT_TO_BUDGET: Record<EffortLevel, number> = {
  low: 1024,      // ~1k tokens - quick thinking
  medium: 4096,   // ~4k tokens - standard thinking
  high: 16384,    // ~16k tokens - deep reasoning
  max: 100000,    // ~100k tokens - maximum reasoning
};

/**
 * Default extended thinking config
 */
export const DEFAULT_THINKING_CONFIG: ExtendedThinkingConfig = {
  enabled: false,
  effort: "medium",
  interleaved: true,
};

/**
 * Calculate budget tokens from config
 */
export function calculateBudgetTokens(
  config: ExtendedThinkingConfig,
  model: string
): number {
  if (config.budgetTokens) {
    return config.budgetTokens;
  }

  const effort = config.effort || "medium";
  const baseBudget = EFFORT_TO_BUDGET[effort];

  // Apply model multiplier (Opus gets more thinking budget by default)
  const multiplier = config.modelMultiplier ?? (model.includes("opus") ? 2 : 1);

  return Math.min(baseBudget * multiplier, 100000);
}

/**
 * Check if model supports extended thinking
 */
export function supportsExtendedThinking(model: string): boolean {
  // Extended thinking is supported on Claude 4.x models
  return model.includes("claude-opus-4") ||
         model.includes("claude-sonnet-4") ||
         model.includes("claude-haiku-4") ||
         model.includes("claude-4");
}

export interface MCPConfig {
  servers: Record<string, MCPServerConfig>;
}

export interface MCPServerConfig {
  type: "stdio" | "http" | "sse" | "ws";
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  disabled?: boolean;
}

export interface PermissionConfig {
  mode: PermissionMode;
  allowedTools?: string[];
  disallowedTools?: string[];
}

export interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
}

// ============================================
// HOOK SYSTEM
// ============================================

export type HookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "Stop"
  | "UserPromptSubmit"
  | "SessionStart"
  | "SessionEnd"
  | "Notification"
  | "ConfigChange"
  | "WorktreeCreate";

export interface HookDefinition {
  event: HookEvent;
  command: string;
  timeout?: number;
  enabled?: boolean;
}

export interface HookConfig {
  hooks: Record<HookEvent, HookDefinition[]>;
}

export interface HookInput {
  event: HookEvent;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: ToolResult;
  error?: string;
  session_id?: string;
  timestamp: number;
}

export interface HookOutput {
  decision?: "allow" | "block" | "deny";
  reason?: string;
  modified_input?: Record<string, unknown>;
}

// ============================================
// SKILL SYSTEM
// ============================================

export interface SkillDefinition {
  name: string;
  description: string;
  prompt: string;
  tools?: string[];
  model?: ClaudeModel;
  color?: string;
  source: "built-in" | "project" | "user";
}

export interface SkillConfig {
  skills: Record<string, SkillDefinition>;
}

// ============================================
// TEAMMATE SYSTEM
// ============================================

export interface Teammate {
  teammateId: string;
  name: string;
  teamName: string;
  color: string;
  prompt: string;
  planModeRequired: boolean;
  paneId?: string;
  status: TeammateStatus;
}

export type TeammateStatus =
  | "pending"
  | "in_progress"
  | "idle"
  | "completed"
  | "failed";

export interface Team {
  name: string;
  description: string;
  teammates: Teammate[];
  taskListId: string;
  status: "active" | "paused" | "completed" | "archived";
  coordination: CoordinationSettings;
}

export interface CoordinationSettings {
  dependencyOrder: string[];
  communicationProtocol: "broadcast" | "direct" | "mixed";
  taskAssignmentStrategy: "manual" | "auto" | "priority";
}

export interface TeammateMessage {
  type: "broadcast" | "direct" | "notification";
  from: string;
  to?: string;
  content: string;
  timestamp: number;
}

// ============================================
// API TYPES
// ============================================

export interface APIRequest {
  model: string;
  max_tokens: number;
  messages: Message[];
  system?: string | SystemBlock[];
  tools?: APITool[];
  tool_choice?: ToolChoice;
  thinking?: ThinkingConfig;
  stream?: boolean;
}

export interface SystemBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

export interface APITool {
  name: string;
  description: string;
  input_schema: JSONSchema;
}

export type ToolChoice =
  | { type: "auto" }
  | { type: "any" }
  | { type: "tool"; name: string }
  | undefined;

export interface APIResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  model: string;
  stop_reason: StopReason;
  stop_sequence: string | null;
  usage: UsageMetrics;
}

export type StopReason =
  | "end_turn"
  | "max_tokens"
  | "stop_sequence"
  | "tool_use"
  | null;

export interface UsageMetrics {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: CacheCreation;
  /** Extended thinking tokens used */
  thinking_tokens?: number;
  /** Redacted thinking tokens (counted but not exposed) */
  redacted_thinking_tokens?: number;
}

export interface CacheCreation {
  ephemeral_1h_input_tokens: number;
  ephemeral_5m_input_tokens: number;
}

export interface CacheMetrics {
  cacheHits: number;
  cacheMisses: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  cacheHitRate: number;
  estimatedSavingsUSD: number;
}

// ============================================
// STREAMING TYPES
// ============================================

export type SSEEvent =
  | "message_start"
  | "content_block_start"
  | "content_block_delta"
  | "content_block_stop"
  | "message_delta"
  | "message_stop"
  | "error";

export interface SSEMessage {
  event: SSEEvent;
  data: string;
}

export interface MessageStartEvent {
  type: "message_start";
  message: APIResponse;
}

export interface ContentBlockStartEvent {
  type: "content_block_start";
  index: number;
  content_block: ContentBlock;
}

export interface ContentBlockDeltaEvent {
  type: "content_block_delta";
  index: number;
  delta: TextDelta | ToolUseDelta | ThinkingDelta;
}

export interface TextDelta {
  type: "text_delta";
  text: string;
}

export interface ToolUseDelta {
  type: "input_json_delta";
  partial_json: string;
}

export interface ThinkingDelta {
  type: "thinking_delta";
  thinking: string;
}

export interface RedactedThinkingDelta {
  type: "redacted_thinking_delta";
  data: string;
}

export type ContentDelta = TextDelta | ToolUseDelta | ThinkingDelta | RedactedThinkingDelta;

// ============================================
// AGENT LOOP TYPES
// ============================================

export interface AgentState {
  messages: Message[];
  tools: ToolDefinition[];
  context: ContextSnapshot;
  metrics: QueryMetrics;
  abortController: AbortController;
}

export interface ContextSnapshot {
  workingDirectory: string;
  gitStatus?: GitStatus;
  fileHistory: FileHistorySnapshot[];
  systemPrompt: string;
  systemReminders: string[];
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicted: string[];
}

export interface FileHistorySnapshot {
  path: string;
  content: string;
  timestamp: number;
}

export interface QueryMetrics {
  model: string;
  messageCount: number;
  messageTokens: number;
  usage: UsageMetrics;
  cacheMetrics?: CacheMetrics;
  durationMs: number;
  ttftMs: number;
  costUSD: number;
  stopReason: StopReason;
  requestId: string;
}

// ============================================
// SESSION TYPES
// ============================================

export interface SessionState {
  sessionId: string;
  messages: Message[];
  context: ContextSnapshot;
  fileHistory: FileHistorySnapshot[];
  agentName?: string;
  agentColor?: string;
  timestamp: number;
}

export interface SessionStorage {
  path: string;
  format: "jsonl" | "json";
  compression: boolean;
}

// ============================================
// COST TRACKING
// ============================================

export interface ModelPricing {
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-6": {
    input: 15,
    output: 75,
    cache_write: 18.75,
    cache_read: 1.5,
  },
  "claude-sonnet-4-6": {
    input: 3,
    output: 15,
    cache_write: 3.75,
    cache_read: 0.3,
  },
  "claude-haiku-4-5": {
    input: 0.8,
    output: 4,
    cache_write: 1,
    cache_read: 0.08,
  },
};

// ============================================
// MCP TYPES
// ============================================

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

export interface MCPClient {
  name: string;
  config: MCPServerConfig;
  connected: boolean;
  tools: MCPTool[];
}
