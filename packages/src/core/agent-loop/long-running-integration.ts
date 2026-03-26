/**
 * Long-Running Loop Integration - Connects memory system to agent loop
 *
 * This module provides:
 * - Automatic milestone detection from tool results
 * - Context injection for compaction recovery
 * - Auto-resume support
 * - Verification tracking
 *
 * @module long-running-integration
 */

import type { Message, ContentBlock, ToolResult, ToolResultBlock, ToolUseBlock } from "../../schemas/index.js";
import type {
  LongRunningMemoryManager,
  LongRunningMemory,
  Decision,
  Discovery,
  VerificationResult,
  MilestoneCheckpoint,
} from "./long-running-memory.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ============================================
// TYPES
// ============================================

/**
 * Configuration for long-running integration
 */
export interface LongRunningIntegrationConfig {
  /** Enable long-running features */
  enabled: boolean;
  /** Session ID */
  sessionId: string;
  /** Original goal */
  originalGoal: string;
  /** Auto-detect milestones */
  autoDetectMilestones: boolean;
  /** Auto-record verifications */
  autoRecordVerifications: boolean;
  /** Inject context on compaction */
  injectContextOnCompaction: boolean;
  /** Verification commands to run */
  verificationCommands: VerificationCommand[];
  /** Enable WebSocket streaming for real-time status */
  enableWebSocket?: boolean;
  /** WebSocket port for streaming */
  websocketPort?: number;
  /** Enable SSE streaming for real-time status */
  enableSSE?: boolean;
  /** SSE port for streaming */
  ssePort?: number;
}

/**
 * Verification command configuration
 */
export interface VerificationCommand {
  /** Type of verification */
  type: VerificationResult["type"];
  /** Command to run */
  command: string;
  /** Working directory */
  cwd?: string;
  /** Run automatically on milestone */
  autoRun: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_LONG_RUNNING_INTEGRATION_CONFIG: LongRunningIntegrationConfig = {
  enabled: true,
  sessionId: "",
  originalGoal: "",
  autoDetectMilestones: true,
  autoRecordVerifications: true,
  injectContextOnCompaction: true,
  verificationCommands: [
    { type: "test", command: "bun test", autoRun: false },
    { type: "lint", command: "bun run lint", autoRun: false },
    { type: "typecheck", command: "bun run typecheck", autoRun: false },
  ],
};

// ============================================
// MILESTONE DETECTOR
// ============================================

/**
 * Milestone patterns to detect from tool results
 */
const MILESTONE_PATTERNS: Array<{
  pattern: RegExp;
  type: MilestoneCheckpoint["type"];
  extractDescription: (match: RegExpMatchArray) => string;
}> = [
  {
    pattern: /(?:commit|committed|pushed|pushing).*?([a-f0-9]{7,40})/i,
    type: "commit",
    extractDescription: (m: RegExpMatchArray) => `Committed: ${m[1]?.slice(0, 7) ?? "unknown"}`,
  },
  {
    pattern: /(?:all|all\s+\d+)\s+tests?\s+(?:passed|passing)/i,
    type: "test_pass",
    extractDescription: () => "All tests passed",
  },
  {
    pattern: /(?:feature|functionality|task)\s+(?:complete|completed|done|finished)/i,
    type: "feature_complete",
    extractDescription: (m) => m[0],
  },
  {
    pattern: /(?:fixed|resolved|solved)\s+(?:the\s+)?(?:error|bug|issue)/i,
    type: "error_resolved",
    extractDescription: (m) => m[0],
  },
  {
    pattern: /(?:goal|objective|task)\s+(?:complete|completed|achieved)/i,
    type: "goal_complete",
    extractDescription: () => "Goal completed",
  },
];

/**
 * Detect milestones from tool result
 */
export function detectMilestoneFromResult(
  toolName: string,
  result: ToolResultBlock
): Omit<MilestoneCheckpoint, "id" | "timestamp" | "turnNumber" | "isRecoveryPoint"> | null {
  // Check tool name patterns
  if (toolName === "Bash") {
    // Extract content from result
    const rawContent: unknown = result.content;
    let content: string;

    if (typeof rawContent === "string") {
      content = rawContent;
    } else if (Array.isArray(rawContent)) {
      // Handle array content - extract text from text blocks
      content = (rawContent as unknown[])
        .map((b: unknown) => {
          if (typeof b === "object" && b !== null && "type" in b && (b as Record<string, unknown>).type === "text" && "text" in b) {
            return String((b as Record<string, unknown>).text);
          }
          return "";
        })
        .join("");
    } else {
      content = "";
    }

    for (const pattern of MILESTONE_PATTERNS) {
      const match = content.match(pattern.pattern);
      if (match) {
        return {
          type: pattern.type,
          description: pattern.extractDescription(match),
        };
      }
    }
  }

  return null;
}

// ============================================
// DECISION EXTRACTOR
// ============================================

/**
 * Extract decisions from model output
 */
export function extractDecisionFromOutput(
  output: string,
  turnNumber: number
): Omit<Decision, "id" | "timestamp"> | null {
  // Look for explicit decision markers
  const decisionPatterns = [
    /(?:I\s+(?:will|'ll|am\s+going\s+to)|decision:\s*)([^.]+(?:because|since|as)[^.]+)/i,
    /(?:chose|selected|picked|decided\s+(?:on|to))\s+([^,]+),?\s*(?:because|since|as|reason:)\s*([^.]+)/i,
    /(?:the\s+(?:best|right|correct)\s+(?:approach|solution|way)\s+(?:is|would\s+be))\s+([^,]+),?\s*(?:because|since)\s*([^.]+)/i,
  ];

  for (const pattern of decisionPatterns) {
    const match = output.match(pattern);
    if (match && match[1]) {
      return {
        decision: match[1].trim(),
        reasoning: match[2]?.trim() ?? "Implicit from context",
        turnNumber,
      };
    }
  }

  return null;
}

// ============================================
// DISCOVERY EXTRACTOR
// ============================================

/**
 * Extract discoveries from tool results
 */
export function extractDiscoveryFromToolResult(
  toolName: string,
  toolResult: ToolResultBlock,
  turnNumber: number
): Omit<Discovery, "id" | "timestamp"> | null {
  // Extract content from result
  const rawContent: unknown = toolResult.content;
  let content: string;

  if (typeof rawContent === "string") {
    content = rawContent;
  } else if (Array.isArray(rawContent)) {
    content = (rawContent as unknown[])
      .map((b: unknown) => {
        if (typeof b === "object" && b !== null && "type" in b && (b as Record<string, unknown>).type === "text" && "text" in b) {
          return String((b as Record<string, unknown>).text);
        }
        return "";
      })
      .join("");
  } else {
    return null;
  }

  // Determine category based on tool name
  let category: Discovery["category"] = "finding";
  let importance: Discovery["importance"] = "low";

  if (toolName === "Read" || toolName === "Glob" || toolName === "Grep") {
    category = "architecture";
    importance = "low";
  } else if (toolName === "Bash") {
    // Check for errors in bash output
    if (content.toLowerCase().includes("error") ||
        content.toLowerCase().includes("failed") ||
        content.toLowerCase().includes("exception")) {
      category = "bug";
      importance = "high";
    } else if (content.includes("commit") || content.includes("pushed")) {
      category = "milestone";
      importance = "medium";
    }
  }

  // Only record if there's meaningful content
  if (!content || content.length < 50) {
    return null;
  }

  // Truncate finding for storage
  const finding = content.length > 200
    ? `Read file content: ${content.slice(0, 200)}...`
    : `Read file content: ${content}`;

  return {
    finding,
    category,
    importance,
    turnNumber,
  };
}

// ============================================
// VERIFICATION TRACKER
// ============================================

/**
 * Run verification command and record result
 */
export async function runVerification(
  config: VerificationCommand,
  memoryManager: LongRunningMemoryManager,
  sessionId: string,
  turnNumber: number
): Promise<VerificationResult> {
  try {
    const { stdout, stderr } = await execAsync(config.command, {
      cwd: config.cwd ?? process.cwd(),
      timeout: 60000, // 1 minute timeout
    });

    const passed = !stderr.toLowerCase().includes("error") &&
                   !stderr.toLowerCase().includes("failed");

    const result: Omit<VerificationResult, "id" | "timestamp"> = {
      type: config.type,
      passed,
      summary: passed
        ? `${config.type} passed`
        : `${config.type} failed`,
      details: passed ? undefined : [stderr.slice(0, 500)],
      turnNumber,
    };

    await memoryManager.recordVerification(sessionId, result);
    return { ...result, id: "", timestamp: Date.now() };
  } catch (error) {
    const result: Omit<VerificationResult, "id" | "timestamp"> = {
      type: config.type,
      passed: false,
      summary: `${config.type} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      details: [error instanceof Error ? error.message : String(error)],
      turnNumber,
    };

    await memoryManager.recordVerification(sessionId, result);
    return { ...result, id: "", timestamp: Date.now() };
  }
}

// ============================================
// CONTEXT INJECTOR
// ============================================

/**
 * Build context injection message for compaction recovery
 */
export function buildCompactionRecoveryMessage(
  memoryManager: LongRunningMemoryManager,
  sessionId: string
): string {
  const recoveryContext = memoryManager.getRecoveryContext(sessionId);

  return `[CONTEXT RECOVERY - Your context was compacted]

${recoveryContext}

**Instructions**:
1. Review the context above to understand where you are
2. Continue working toward the current goal
3. Use actual commands to verify progress, not just statements
4. Record any important decisions or discoveries

Continue your work.`;
}

/**
 * Build periodic context reminder (every N turns)
 */
export function buildPeriodicReminder(
  memoryManager: LongRunningMemoryManager,
  sessionId: string
): string {
  const summary = memoryManager.generateContextSummary(sessionId);

  return `[PROGRESS CHECK - Long-Running Session]

${summary}

Keep working. Remember to:
- Verify changes with actual commands
- Commit working code
- Record important decisions

Continue your work.`;
}

// ============================================
// LONG-RUNNING INTEGRATION CLASS
// ============================================

/**
 * Main integration class for long-running loops
 */
export class LongRunningIntegration {
  private config: LongRunningIntegrationConfig;
  private memoryManager: LongRunningMemoryManager;
  private lastReminderTurn: number = 0;
  private reminderInterval: number = 10; // Every 10 turns

  constructor(
    config: Partial<LongRunningIntegrationConfig>,
    memoryManager: LongRunningMemoryManager
  ) {
    this.config = { ...DEFAULT_LONG_RUNNING_INTEGRATION_CONFIG, ...config };
    this.memoryManager = memoryManager;
  }

  /**
   * Initialize long-running session
   */
  async initialize(): Promise<LongRunningMemory> {
    if (!this.config.enabled || !this.config.sessionId) {
      throw new Error("Long-running integration not properly configured");
    }

    return this.memoryManager.initialize(
      this.config.sessionId,
      this.config.originalGoal
    );
  }

  /**
   * Process turn completion - detect milestones, extract decisions
   */
  async processTurnCompletion(
    turnNumber: number,
    toolUses: ToolUseBlock[],
    toolResults: ToolResultBlock[],
    modelOutput: string,
    cost: number
  ): Promise<{
    milestone: MilestoneCheckpoint | null;
    decision: Decision | null;
    shouldInjectReminder: boolean;
    reminderMessage: string | null;
  }> {
    const result = {
      milestone: null as MilestoneCheckpoint | null,
      decision: null as Decision | null,
      shouldInjectReminder: false,
      reminderMessage: null as string | null,
    };

    if (!this.config.enabled) return result;

    const sessionId = this.config.sessionId;

    // Update progress
    await this.memoryManager.updateProgress(sessionId, turnNumber, cost);

    // Detect milestones from tool results
    if (this.config.autoDetectMilestones) {
      for (let i = 0; i < toolUses.length; i++) {
        const toolUse = toolUses[i];
        const toolResult = toolResults[i];
        if (!toolUse || !toolResult) continue;

        const milestone = detectMilestoneFromResult(toolUse.name ?? "unknown", toolResult);
        if (milestone) {
          await this.memoryManager.recordMilestone(sessionId, {
            ...milestone,
            turnNumber,
          });
          result.milestone = {
            ...milestone,
            id: "",
            timestamp: Date.now(),
            turnNumber,
            isRecoveryPoint: milestone.type === "commit" || milestone.type === "feature_complete",
          };

          // Run auto verifications on milestone
          if (this.config.autoRecordVerifications) {
            for (const cmd of this.config.verificationCommands) {
              if (cmd.autoRun) {
                await runVerification(cmd, this.memoryManager, sessionId, turnNumber);
              }
            }
          }
        }
      }
    }

    // Extract discoveries from tool results
    for (let i = 0; i < toolUses.length; i++) {
      const toolUse = toolUses[i];
      const toolResult = toolResults[i];
      if (!toolUse || !toolResult) continue;

      const discovery = extractDiscoveryFromToolResult(
        toolUse.name ?? "unknown",
        toolResult,
        turnNumber
      );
      if (discovery) {
        await this.memoryManager.recordDiscovery(sessionId, discovery);
      }
    }

    // Extract decisions from output
    const decision = extractDecisionFromOutput(modelOutput, turnNumber);
    if (decision) {
      await this.memoryManager.recordDecision(sessionId, decision);
      result.decision = { ...decision, id: "", timestamp: Date.now() };
    }

    // Check if periodic reminder needed
    if (turnNumber - this.lastReminderTurn >= this.reminderInterval) {
      this.lastReminderTurn = turnNumber;
      result.shouldInjectReminder = true;
      result.reminderMessage = buildPeriodicReminder(this.memoryManager, sessionId);
    }

    return result;
  }

  /**
   * Handle compaction - inject recovery context
   */
  buildCompactionRecovery(): string | null {
    if (!this.config.enabled || !this.config.injectContextOnCompaction) {
      return null;
    }

    return buildCompactionRecoveryMessage(this.memoryManager, this.config.sessionId);
  }

  /**
   * Get current memory state
   */
  getMemory(): LongRunningMemory | undefined {
    return this.memoryManager.getMemory(this.config.sessionId);
  }

  /**
   * Get context summary for display
   */
  getContextSummary(): string {
    return this.memoryManager.generateContextSummary(this.config.sessionId);
  }
}

// Types are already exported above, no need to re-export
