/**
 * Continuation System - Autonomous Loop Continuation Control
 *
 * This bridges the gap when the model returns `end_turn` WITHOUT using tools.
 * In Ralph-style loops, we want to continue working until verified completion.
 *
 * The stop hook pattern from Ralph:
 *   Model says end_turn → Check if truly done → If not, inject continuation prompt
 *
 * This is the in-process equivalent of Ralph's bash stop-hook.sh
 */

import type { Message, ContentBlock, TextBlock } from "../../schemas/index.js";

// ============================================
// TYPES
// ============================================

/**
 * Action to take when continuation is triggered
 */
export type ContinuationAction = "inject_prompt" | "stop" | "ask_user";

/**
 * Condition that determines if loop should continue
 */
export interface ContinuationCondition {
  /** Unique identifier */
  id: string;
  /** Description for logging */
  description?: string;
  /** Pattern in model output that suggests more work needed (regex) */
  workNeededPattern?: string;
  /** Pattern that suggests work is complete (regex) */
  completionPattern?: string;
  /** Check pending state (e.g., uncommitted changes, failing tests) */
  checkPendingState?: boolean;
  /** Action to take */
  action: ContinuationAction;
  /** Prompt to inject when continuing */
  continuationPrompt?: string;
  /** Priority (higher = checked first) */
  priority?: number;
}

/**
 * Configuration for continuation system
 */
export interface ContinuationConfig {
  /** Enable continuation system */
  enabled: boolean;
  /** Conditions to check */
  conditions: ContinuationCondition[];
  /** Maximum consecutive continuations before forcing stop */
  maxContinuations: number;
  /** Default prompt when no specific continuation prompt */
  defaultPrompt: string;
  /** Prompt when model seems stuck (repeated continuations) */
  stuckPrompt: string;
  /** Threshold for "stuck" detection (consecutive continuations) */
  stuckThreshold: number;
  /** Include context about why we're continuing */
  includeReasoning: boolean;

  // === NEW: Smart continuation controls ===

  /** Minimum turns between continuation checks (prevents rapid-fire) */
  cooldownTurns?: number;
  /** Tools that indicate active work (skip continuation if recently used) */
  activeWorkTools?: string[];
  /** Number of recent turns to check for active work */
  activeWorkWindow?: number;
  /** Require verification before accepting completion */
  requireVerification?: boolean;
  /** Verification tools that count as proof */
  verificationTools?: string[];
  /** Original goal/task for persistence through compaction */
  persistentGoal?: string;
}

/**
 * Context for continuation decision
 */
export interface ContinuationContext {
  /** Model's output text */
  lastOutput: string;
  /** All content blocks from last message */
  lastBlocks: ContentBlock[];
  /** Number of tools used in last turn */
  toolsUsedCount: number;
  /** Names of tools used in last turn */
  toolsUsedNames?: string[];
  /** Names of tools used in recent turns (for cooldown check) */
  recentToolNames?: string[];
  /** Current turn number */
  turnNumber: number;
  /** Number of consecutive continuations */
  consecutiveContinuations: number;
  /** Total cost so far */
  totalCost: number;
  /** Working directory */
  workingDirectory: string;
  /** Git status if available */
  gitStatus?: {
    hasUncommittedChanges: boolean;
    currentBranch: string;
  } | null;
  /** Whether model appears stuck */
  isStuck?: boolean;
  /** Custom state checker results */
  pendingState?: {
    hasPendingTests: boolean;
    hasBuildErrors: boolean;
    hasUncommittedChanges: boolean;
    taskList?: string[];
  };
  /** Whether context was just compacted */
  wasCompacted?: boolean;
  /** Persistent goal from original task */
  persistentGoal?: string;
  /** Pattern detected by stuck-loop analysis */
  stuckPattern?: string;
}

/**
 * Result of checking continuation
 */
export interface ContinuationCheckResult {
  /** Whether to continue the loop */
  shouldContinue: boolean;
  /** The action to take */
  action: ContinuationAction;
  /** Prompt to inject (if action is inject_prompt) */
  prompt?: string;
  /** Reason for the decision */
  reason: string;
  /** Condition that triggered (if any) */
  triggeredCondition?: ContinuationCondition;
  /** Whether model appears stuck */
  isStuck: boolean;
}

/**
 * Compiled condition with regex
 */
interface CompiledCondition extends ContinuationCondition {
  _workNeededRegex?: RegExp;
  _completionRegex?: RegExp;
}

// ============================================
// DEFAULT PROMPTS
// ============================================

/**
 * Default continuation prompt - nudges model to keep working
 */
export const DEFAULT_CONTINUATION_PROMPT = `Continue working on the task. Follow this checklist:
1. What have you completed vs what remains?
2. cd into the project directory, then run the build (tsc --noEmit, bun build, etc.) to verify changes compile.
3. Run ONLY project-scoped tests (cd into the project dir first). NEVER run bare \`bun test\` from the repo root.
4. Pipe large outputs through \`head -50\` or \`tail -30\` to avoid context bloat.
5. For web projects: take a screenshot with vision tools (mcp__4_5v_mcp__analyze_image or tempglmvision), save to visuals/, and append to VISUAL_LOG.md with ![desc](visuals/file.png) + analysis.
6. If build passes, commit the working changes with a conventional commit message.
7. If build fails, fix the errors first.
8. Take the next logical step -- prefer writing/editing files over reasoning about them.`;

/**
 * Stuck prompt - when model seems to be looping without progress
 */
export const DEFAULT_STUCK_PROMPT = `You seem to be stuck. Reset your approach:

1. What is the actual goal? State it in one sentence.
2. cd into the project directory. Run the build to see current errors. Pipe through \`head -50\`.
3. Focus on ONE error at a time. Fix it, rebuild, verify.
4. Do NOT reason about code -- WRITE the fix. Prefer Edit/Write tools over Bash for code changes.
5. Once clean, commit what works and move on.
6. If truly done, prove it: run build + tests (scoped to project dir), show passing output, then commit.`;

/**
 * Work needed patterns - suggest more work is required
 */
export const WORK_NEEDED_PATTERNS = [
  // Incomplete actions
  /\b(?:need to|should|must|have to|going to|will)\s+(?:continue|work|implement|fix|add|update|refactor)/i,
  /\b(?:todo|pending|remaining|left to|still need)/i,
  /\b(?:next|then|after that|following)/i,
  /\b(?:not (?:yet|done|complete|finished))/i,
  // Error states
  /\b(?:error|failed|exception|bug|issue|problem)/i,
  /\b(?:doesn't work|not working|broken)/i,
  // Test/build failures - flexible matching
  /\b(?:tests?|build)\b.{0,20}\b(?:not (?:passing|succeeded|successful)|fail)/i,
  /\b(?:failing|failed)\s+(?:tests?|build)/i,
  /\b(?:tests?|build)\s+(?:fail|failed|failing)/i,
  /\b(?:aren't|isn't|not)\s+(?:passing|succeeded|successful)\b/i,
  // Incomplete code
  /\/\/\s*(?:TODO|FIXME|HACK|XXX)/i,
  /\b(?:pass|placeholder|stub)\b/i,
];

/**
 * Completion patterns - VERIFIED completion only
 *
 * IMPORTANT: We do NOT match words like "done" or "complete" because
 * the model often says these without actually verifying. Instead, we
 * require explicit verification signals like:
 * - Tests passing (with output shown)
 * - Build succeeding (with output shown)
 * - Server running (with proof)
 */
export const COMPLETION_PATTERNS = [
  // Verified test success (multiple formats models use)
  /\b(?:all\s+)?tests?\s+(?:passed|succeeded|are\s+passing|pass)\s*[\(\[]?/i,
  /\btest\s+results?\s*:\s*(?:\d+\s+passed|all\s+passed)/i,
  /\b\d+\s+pass(?:ed|ing)?,?\s*0\s+fail/i,

  // Verified build success
  /\bbuild\s+(?:succeeded|completed\s+successfully|passed|is\s+successful)\s*[\(\[]?/i,

  // Verified server running
  /\bserver\s+(?:running|started|listening)\s+(?:on|at)\s+port\s+\d+/i,
  /\b(?:listening|running)\s+on\s+(?:http:\/\/)?localhost:\d+/i,

  // Explicit task completion with evidence (model says "Task complete" after commits/tests)
  /\btask\s+complete\b/i,
  /\bno\s+remaining\s+uncommitted\s+changes\b/i,

  // Promise tags (Ralph pattern) - explicit completion marker
  /<promise>.*?(?:verified|tested|confirmed).*?<\/promise>/is,

  // Explicit verification statement
  /\b(?:verified|confirmed|tested)\s+(?:that\s+)?(?:everything|all|the\s+app|the\s+system)\s+(?:works?|is\s+working|is\s+functional)/i,
];

// ============================================
// CONFIGURATION
// ============================================

/**
 * Default continuation configuration
 */
export const DEFAULT_CONTINUATION_CONFIG: ContinuationConfig = {
  enabled: false, // Off by default, must explicitly enable
  conditions: [],
  maxContinuations: 100, // Safety net
  defaultPrompt: DEFAULT_CONTINUATION_PROMPT,
  stuckPrompt: DEFAULT_STUCK_PROMPT,
  stuckThreshold: 5,
  includeReasoning: true,
};

/**
 * Ralph-style continuation config (autonomous loops)
 *
 * KEY PRINCIPLES:
 * 1. Never stop on "done" words alone - require VERIFIED completion
 * 2. Respect active work - don't interrupt if tools were recently used
 * 3. Cooldown between checks - prevent rapid-fire continuations
 * 4. Goal persistence - keep original task in context
 */
export const RALPH_CONTINUATION_CONFIG: ContinuationConfig = {
  enabled: true,
  conditions: [
    // === HIGHEST PRIORITY: Goal reminder after compaction ===
    {
      id: "goal_reminder",
      description: "Remind of original goal after context compaction",
      action: "inject_prompt",
      continuationPrompt: "Your context was compacted. Remember your original task and continue. cd into the project directory, run the build to see current state. Fix any errors, then commit. For web projects: use vision/screenshot tools to verify UI renders correctly after every significant change. Save screenshots to visuals/ and append each to VISUAL_LOG.md with ![desc](visuals/file.png) + analysis. Verify with tool output, not words. Prefer writing code over reasoning.",
      priority: 300,
    },
    // === HIGH PRIORITY: Stuck detection ===
    {
      id: "stuck_detection",
      description: "Model appears stuck in a loop",
      action: "inject_prompt",
      continuationPrompt: DEFAULT_STUCK_PROMPT,
      priority: 250,
    },
    // === VERIFIED COMPLETION (requires proof, not just words) ===
    {
      id: "verified_completion",
      description: "Model has VERIFIED completion with tests/builds",
      completionPattern: COMPLETION_PATTERNS.map(p => p.source).join("|"),
      action: "stop",
      priority: 200,
    },
    // === ACTIVE WORK DETECTED: Don't interrupt ===
    {
      id: "active_work",
      description: "Model is actively using tools - don't interrupt",
      action: "stop", // This is a "don't continue" condition
      priority: 150,
    },
    // === WORK NEEDED: Continue if model mentions incomplete work ===
    {
      id: "explicit_incomplete",
      description: "Model mentions incomplete work",
      workNeededPattern: WORK_NEEDED_PATTERNS.map(p => p.source).join("|"),
      action: "inject_prompt",
      priority: 100,
    },
    // === VISION GATE: Use browser MCP to capture visuals for web projects ===
    {
      id: "vision_documentation",
      description: "Use browser MCP to capture and document visuals after UI changes",
      action: "inject_prompt",
      continuationPrompt: [
        "VISION CHECK: You made UI changes. Before moving on:",
        "1) Start the dev server if not running.",
        "2) Use mcp__browser__browser_navigate to load the page.",
        "3) Use mcp__browser__browser_screenshot to capture the current state.",
        "4) For interactive flows: use mcp__browser__browser_click / browser_fill to reach different UI states, screenshot each one.",
        "5) Use mcp__browser__browser_snapshot for AI-readable DOM structure.",
        "6) Analyze screenshots with mcp__4_5v_mcp__analyze_image.",
        "7) Save screenshots to visuals/ (project root) with descriptive names.",
        "8) Append to VISUAL_LOG.md: ## [timestamp] - Description, ![desc](visuals/file.png), **Analysis:** vision result.",
        "The visuals/ directory + VISUAL_LOG.md are your visual audit trail. Capture EVERY UI state.",
      ].join(" "),
      priority: 50,
    },
    // === LOWEST PRIORITY: Uncommitted changes -- build gate before commit ===
    {
      id: "uncommitted_changes",
      description: "Build-verify-commit gate for pending changes",
      checkPendingState: true,
      action: "inject_prompt",
      continuationPrompt: "You have uncommitted changes. Before committing: 1) cd into the project directory, run build/typecheck. 2) Run project-scoped tests (never bare `bun test` from root). 3) For web projects: take a screenshot with vision tools, save to visuals/, and append to VISUAL_LOG.md with ![desc](visuals/file.png) + analysis. 4) If clean, commit with a conventional message. If not clean, fix errors first.",
      priority: 10,
    },
  ],
  maxContinuations: 100,
  defaultPrompt: DEFAULT_CONTINUATION_PROMPT,
  stuckPrompt: DEFAULT_STUCK_PROMPT,
  stuckThreshold: 5,
  includeReasoning: true,

  // === NEW: Smart continuation controls ===
  cooldownTurns: 2,
  activeWorkTools: ["Edit", "Write", "Bash", "Read", "Grep", "Glob"],
  activeWorkWindow: 3,
  requireVerification: true,
  verificationTools: ["Bash", "mcp__4_5v_mcp__analyze_image", "tempglmvision", "mcp__browser__browser_screenshot", "mcp__browser__browser_navigate", "mcp__browser__browser_snapshot"],
};

// ============================================
// CONDITION COMPILATION
// ============================================

/**
 * Compile a condition's patterns into regex objects
 */
function compileCondition(condition: ContinuationCondition): CompiledCondition {
  const compiled: CompiledCondition = { ...condition };

  if (condition.workNeededPattern) {
    try {
      compiled._workNeededRegex = new RegExp(condition.workNeededPattern, "is");
    } catch (e) {
      console.warn(`[Continuation] Invalid workNeededPattern for ${condition.id}: ${e}`);
    }
  }

  if (condition.completionPattern) {
    try {
      compiled._completionRegex = new RegExp(condition.completionPattern, "is");
    } catch (e) {
      console.warn(`[Continuation] Invalid completionPattern for ${condition.id}: ${e}`);
    }
  }

  return compiled;
}

/**
 * Compile all conditions in a config
 */
export function compileContinuationConfig(config: ContinuationConfig): {
  conditions: CompiledCondition[];
} & Omit<ContinuationConfig, "conditions"> {
  return {
    ...config,
    conditions: config.conditions
      .map(compileCondition)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)), // Higher priority first
  };
}

// ============================================
// CONTINUATION CHECKING
// ============================================

/**
 * Check if continuation should be triggered
 */
export function checkContinuation(
  context: ContinuationContext,
  config: ContinuationConfig
): ContinuationCheckResult {
  if (!config.enabled) {
    return {
      shouldContinue: false,
      action: "stop",
      reason: "Continuation system disabled",
      isStuck: false,
    };
  }

  // Check max continuations
  if (context.consecutiveContinuations >= config.maxContinuations) {
    return {
      shouldContinue: false,
      action: "stop",
      reason: `Max continuations reached (${config.maxContinuations})`,
      isStuck: true,
    };
  }

  // Check if stuck
  const isStuck = context.consecutiveContinuations >= config.stuckThreshold;

  // === NEW: Check cooldown ===
  const cooldownTurns = config.cooldownTurns ?? 0;
  if (cooldownTurns > 0 && context.consecutiveContinuations > 0) {
    // If we've had continuations recently, check if we should wait
    // This prevents rapid-fire interruptions
    // Use consecutive continuations as proxy for turns since last check
    // If we've had continuations, we're in a continuation streak
    const turnsSinceLastCheck = context.consecutiveContinuations;
    if (turnsSinceLastCheck < cooldownTurns && context.toolsUsedCount > 0) {
      return {
        shouldContinue: false,
        action: "stop",
        reason: `Cooldown active - model is working (used ${context.toolsUsedCount} tools)`,
        isStuck,
      };
    }
  }

  // === NEW: Check for active work ===
  const activeWorkTools = config.activeWorkTools ?? [];
  const recentTools = context.recentToolNames ?? context.toolsUsedNames ?? [];
  const hasActiveWork = recentTools.some(tool => activeWorkTools.includes(tool));

  if (hasActiveWork && context.toolsUsedCount > 0) {
    // Model is actively working - don't interrupt
    return {
      shouldContinue: false,
      action: "stop",
      reason: `Active work detected - tools used: ${recentTools.join(", ")}`,
      isStuck,
    };
  }

  // === NEW: Check for goal reminder after compaction ===
  if (context.wasCompacted && config.persistentGoal) {
    return {
      shouldContinue: true,
      action: "inject_prompt",
      prompt: `Your context was compacted. Your original goal was: ${config.persistentGoal}\n\nContinue working toward this goal. Verify progress with actual commands, not just statements.`,
      reason: "Context compacted - reminding of original goal",
      isStuck,
    };
  }

  // Compile and check conditions
  const compiled = compileContinuationConfig(config);

  for (const condition of compiled.conditions) {
    // Skip special conditions that are handled above
    if (condition.id === "goal_reminder" || condition.id === "active_work") {
      continue;
    }

    const triggered = checkCondition(condition, context, config);

    if (triggered) {
      // Handle based on action
      switch (condition.action) {
        case "stop":
          return {
            shouldContinue: false,
            action: "stop",
            reason: condition.description ?? `Condition ${condition.id} triggered stop`,
            triggeredCondition: condition,
            isStuck,
          };

        case "inject_prompt":
          const prompt = isStuck
            ? config.stuckPrompt
            : (condition.continuationPrompt ?? config.defaultPrompt);

          return {
            shouldContinue: true,
            action: "inject_prompt",
            prompt: config.includeReasoning
              ? `${prompt}\n\n[Continuation reason: ${condition.description ?? condition.id}]`
              : prompt,
            reason: condition.description ?? `Condition ${condition.id} triggered continuation`,
            triggeredCondition: condition,
            isStuck,
          };

        case "ask_user":
          return {
            shouldContinue: false,
            action: "ask_user",
            reason: condition.description ?? `Condition ${condition.id} requires user input`,
            triggeredCondition: condition,
            isStuck,
          };
      }
    }
  }

  // No condition matched - check for default behavior
  // If no tools were used and model said end_turn, default to continue
  if (context.toolsUsedCount === 0) {
    const prompt = isStuck ? config.stuckPrompt : config.defaultPrompt;

    return {
      shouldContinue: true,
      action: "inject_prompt",
      prompt: config.includeReasoning
        ? `${prompt}\n\n[Continuation reason: Model ended without using tools]`
        : prompt,
      reason: "Model ended turn without using tools - default continuation",
      isStuck,
    };
  }

  // Default: don't continue
  return {
    shouldContinue: false,
    action: "stop",
    reason: "No continuation conditions triggered",
    isStuck,
  };
}

/**
 * Check a single condition
 */
function checkCondition(
  condition: CompiledCondition,
  context: ContinuationContext,
  config?: ContinuationConfig
): boolean {
  // === Special conditions ===

  // Goal reminder: only trigger after compaction
  if (condition.id === "goal_reminder") {
    return context.wasCompacted === true && !!config?.persistentGoal;
  }

  // Stuck detection: check consecutive continuations
  if (condition.id === "stuck_detection") {
    return context.consecutiveContinuations >= (config?.stuckThreshold ?? 5);
  }

  // Active work: check if model is using tools
  if (condition.id === "active_work") {
    const activeWorkTools = config?.activeWorkTools ?? [];
    const recentTools = context.recentToolNames ?? context.toolsUsedNames ?? [];
    return recentTools.some(tool => activeWorkTools.includes(tool));
  }

  // === Pattern-based conditions ===

  // Check work needed pattern
  if (condition._workNeededRegex) {
    if (condition._workNeededRegex.test(context.lastOutput)) {
      return true;
    }
  }

  // Check completion pattern (negates work needed)
  if (condition._completionRegex) {
    if (condition._completionRegex.test(context.lastOutput)) {
      // Completion pattern matched - only trigger if action is "stop"
      return condition.action === "stop";
    }
  }

  // === State-based conditions ===

  // Check pending state
  if (condition.checkPendingState && context.pendingState) {
    const { pendingState } = context;
    if (
      pendingState.hasUncommittedChanges ||
      pendingState.hasPendingTests ||
      pendingState.hasBuildErrors
    ) {
      return true;
    }
  }

  // Check git status for uncommitted changes
  if (condition.checkPendingState && context.gitStatus?.hasUncommittedChanges) {
    return true;
  }

  return false;
}

// ============================================
// PROMPT GENERATION
// ============================================

/**
 * Build a continuation user message
 */
export function buildContinuationMessage(
  prompt: string,
  context: ContinuationContext
): Message {
  const content: TextBlock[] = [
    {
      type: "text",
      text: prompt,
    },
  ];

  // Add context if stuck
  if (context.isStuck) {
    content.push({
      type: "text",
      text: `\n\n[Context: Turn ${context.turnNumber}, ${context.consecutiveContinuations} consecutive continuations]`,
    });
  }

  return {
    role: "user",
    content,
  };
}

// ============================================
// CONFIG FACTORY
// ============================================

/**
 * Create continuation config from various inputs
 */
export function createContinuationConfig(
  input?: Partial<ContinuationConfig> | boolean | "ralph"
): ContinuationConfig {
  // Boolean shorthand
  if (input === true) {
    return { ...RALPH_CONTINUATION_CONFIG };
  }

  if (input === false || input === undefined) {
    return { ...DEFAULT_CONTINUATION_CONFIG };
  }

  // Ralph preset
  if (input === "ralph") {
    return { ...RALPH_CONTINUATION_CONFIG };
  }

  // Partial config
  return {
    ...DEFAULT_CONTINUATION_CONFIG,
    ...input,
    conditions: input.conditions ?? DEFAULT_CONTINUATION_CONFIG.conditions,
  };
}

// ============================================
// UTILITY: Extract text from content blocks
// ============================================

/**
 * Extract text content from message blocks
 */
export function extractTextFromBlocks(blocks: ContentBlock[]): string {
  return blocks
    .filter((block): block is TextBlock => block.type === "text")
    .map(block => block.text)
    .join("\n");
}

// ============================================
// UTILITY: Check pending state
// ============================================

/**
 * Pending state checker interface
 */
export interface PendingStateChecker {
  checkUncommittedChanges(dir: string): Promise<boolean>;
  checkPendingTests(dir: string): Promise<boolean>;
  checkBuildErrors(dir: string): Promise<boolean>;
}

/**
 * Default (no-op) pending state checker
 */
export const noopPendingStateChecker: PendingStateChecker = {
  checkUncommittedChanges: async () => false,
  checkPendingTests: async () => false,
  checkBuildErrors: async () => false,
};

// Re-export types
export type { ContinuationAction as Action, ContinuationCondition as Condition };
