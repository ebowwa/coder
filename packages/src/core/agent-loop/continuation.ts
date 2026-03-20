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
export const DEFAULT_CONTINUATION_PROMPT = `Continue working on the task. Check your progress:
- What have you completed?
- What remains to be done?
- Are there any tests to run or verify?
- Do you need to commit your changes?

Take the next logical step.`;

/**
 * Stuck prompt - when model seems to be looping without progress
 */
export const DEFAULT_STUCK_PROMPT = `You seem to be stuck. Let's reassess:

1. What is the actual goal you're trying to achieve?
2. What approaches have you tried?
3. Is there a different way to approach this?

If you're truly done, use a tool to verify (run tests, check build, etc.) and explain what was accomplished.`;

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
  // Incomplete code
  /\/\/\s*(?:TODO|FIXME|HACK|XXX)/i,
  /\b(?:pass|placeholder|stub)\b/i,
];

/**
 * Completion patterns - suggest work is done
 */
export const COMPLETION_PATTERNS = [
  // Explicit completion
  /\b(?:done|complete|finished|completed|accomplished|success(?:ful)?)\b/i,
  /\b(?:all (?:tests?|tasks?|items?) (?:passed|done|complete))\b/i,
  /\b(?:everything (?:looks|is|seems) (?:good|complete|done))\b/i,
  // Promise tags (Ralph pattern)
  /<promise>.*?<\/promise>/is,
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
 */
export const RALPH_CONTINUATION_CONFIG: ContinuationConfig = {
  enabled: true,
  conditions: [
    {
      id: "explicit_incomplete",
      description: "Model mentions incomplete work",
      workNeededPattern: WORK_NEEDED_PATTERNS.map(p => p.source).join("|"),
      action: "inject_prompt",
      priority: 100,
    },
    {
      id: "completion_detected",
      description: "Model indicates completion",
      completionPattern: COMPLETION_PATTERNS.map(p => p.source).join("|"),
      action: "stop",
      priority: 200, // Higher priority - completion wins
    },
    {
      id: "uncommitted_changes",
      description: "Check for uncommitted changes",
      checkPendingState: true,
      action: "inject_prompt",
      continuationPrompt: "You have uncommitted changes. Review them and commit if appropriate, or explain why they shouldn't be committed.",
      priority: 50,
    },
  ],
  maxContinuations: 100,
  defaultPrompt: DEFAULT_CONTINUATION_PROMPT,
  stuckPrompt: DEFAULT_STUCK_PROMPT,
  stuckThreshold: 5,
  includeReasoning: true,
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

  // Compile and check conditions
  const compiled = compileContinuationConfig(config);

  for (const condition of compiled.conditions) {
    const triggered = checkCondition(condition, context);

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
  context: ContinuationContext
): boolean {
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
