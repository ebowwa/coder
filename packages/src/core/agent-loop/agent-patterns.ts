/**
 * Agent Patterns - Microsoft Research "Autonomous Coding Agents" patterns
 *
 * This module implements 5 key patterns from the research paper:
 * 1. Structured Planning Phase - Before acting, generate explicit plan with steps
 * 2. Verification Loops - Run tests after changes, iterate on failures
 * 3. Tool Selection Strategy - Match tools to task type (read → edit → test → commit)
 * 4. Error Taxonomy - Classify errors (syntax, logic, integration) for targeted fixes
 * 5. Progressive Refinement - Start simple, add complexity incrementally
 *
 * Reference: Microsoft Research "Autonomous Coding Agents" (2506.04168v3)
 */

import { z } from "zod";

// ============================================
// 1. STRUCTURED PLANNING PHASE
// ============================================

/**
 * Planning phase types
 */
export const PlanStepSchema = z.object({
  id: z.string(),
  description: z.string(),
  tool: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "failed", "skipped"]),
  dependencies: z.array(z.string()).default([]),
  estimatedComplexity: z.enum(["low", "medium", "high"]).default("medium"),
  actualResult: z.string().optional(),
});

export const ExecutionPlanSchema = z.object({
  id: z.string(),
  goal: z.string(),
  steps: z.array(PlanStepSchema),
  currentStepIndex: z.number().default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
  status: z.enum(["planning", "executing", "completed", "failed", "abandoned"]),
  metadata: z.record(z.unknown()).optional(),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

/**
 * Plan generator options
 */
export interface PlanGeneratorOptions {
  goal: string;
  context?: string;
  availableTools?: string[];
  maxSteps?: number;
  complexityThreshold?: "low" | "medium" | "high";
}

/**
 * Generate a structured execution plan
 */
export function generatePlan(options: PlanGeneratorOptions): ExecutionPlan {
  const {
    goal,
    context,
    availableTools = [],
    maxSteps = 10,
    complexityThreshold = "medium",
  } = options;

  const planId = `plan-${Date.now().toString(36)}`;
  const now = Date.now();

  // Parse goal into steps using heuristics
  const steps = parseGoalIntoSteps(goal, availableTools, maxSteps);

  return {
    id: planId,
    goal,
    steps,
    currentStepIndex: 0,
    createdAt: now,
    updatedAt: now,
    status: "planning",
    metadata: {
      context,
      complexityThreshold,
      availableTools,
    },
  };
}

/**
 * Parse a goal string into executable steps
 */
function parseGoalIntoSteps(
  goal: string,
  availableTools: string[],
  maxSteps: number
): PlanStep[] {
  const steps: PlanStep[] = [];
  const lowerGoal = goal.toLowerCase();

  // Detect task type and generate appropriate steps
  if (lowerGoal.includes("fix") || lowerGoal.includes("bug")) {
    steps.push(
      { id: "read-1", description: "Read and understand the current code", tool: "Read", status: "pending", dependencies: [], estimatedComplexity: "low" },
      { id: "analyze-1", description: "Analyze the error or bug report", tool: "Grep", status: "pending", dependencies: ["read-1"], estimatedComplexity: "medium" },
      { id: "edit-1", description: "Apply the fix", tool: "Edit", status: "pending", dependencies: ["analyze-1"], estimatedComplexity: "medium" },
      { id: "test-1", description: "Verify the fix with tests", tool: "Bash", status: "pending", dependencies: ["edit-1"], estimatedComplexity: "medium" }
    );
  } else if (lowerGoal.includes("add") || lowerGoal.includes("implement") || lowerGoal.includes("create")) {
    steps.push(
      { id: "read-1", description: "Read existing codebase to understand patterns", tool: "Read", status: "pending", dependencies: [], estimatedComplexity: "low" },
      { id: "plan-1", description: "Design the implementation approach", tool: undefined, status: "pending", dependencies: ["read-1"], estimatedComplexity: "medium" },
      { id: "edit-1", description: "Implement core functionality", tool: "Edit", status: "pending", dependencies: ["plan-1"], estimatedComplexity: "high" },
      { id: "test-1", description: "Add tests for new functionality", tool: "Bash", status: "pending", dependencies: ["edit-1"], estimatedComplexity: "medium" },
      { id: "commit-1", description: "Commit the changes", tool: "Bash", status: "pending", dependencies: ["test-1"], estimatedComplexity: "low" }
    );
  } else if (lowerGoal.includes("refactor") || lowerGoal.includes("clean")) {
    steps.push(
      { id: "read-1", description: "Read code to understand current structure", tool: "Read", status: "pending", dependencies: [], estimatedComplexity: "low" },
      { id: "analyze-1", description: "Identify refactoring opportunities", tool: "Grep", status: "pending", dependencies: ["read-1"], estimatedComplexity: "medium" },
      { id: "edit-1", description: "Apply refactoring changes", tool: "Edit", status: "pending", dependencies: ["analyze-1"], estimatedComplexity: "medium" },
      { id: "test-1", description: "Run tests to verify behavior unchanged", tool: "Bash", status: "pending", dependencies: ["edit-1"], estimatedComplexity: "medium" }
    );
  } else {
    // Generic task breakdown
    steps.push(
      { id: "understand-1", description: "Understand the task requirements", tool: "Read", status: "pending", dependencies: [], estimatedComplexity: "low" },
      { id: "execute-1", description: "Execute the main task", tool: undefined, status: "pending", dependencies: ["understand-1"], estimatedComplexity: "medium" },
      { id: "verify-1", description: "Verify the results", tool: "Bash", status: "pending", dependencies: ["execute-1"], estimatedComplexity: "low" }
    );
  }

  return steps.slice(0, maxSteps);
}

/**
 * Update plan step status
 */
export function updatePlanStep(
  plan: ExecutionPlan,
  stepId: string,
  update: Partial<PlanStep>
): ExecutionPlan {
  return {
    ...plan,
    steps: plan.steps.map((step) =>
      step.id === stepId ? { ...step, ...update } : step
    ),
    updatedAt: Date.now(),
  };
}

/**
 * Get next executable step from plan
 */
export function getNextStep(plan: ExecutionPlan): PlanStep | null {
  const pendingSteps = plan.steps.filter(
    (step) => step.status === "pending" || step.status === "in_progress"
  );

  for (const step of pendingSteps) {
    // Check if all dependencies are completed
    const depsCompleted = step.dependencies.every((depId) =>
      plan.steps.find((s) => s.id === depId)?.status === "completed"
    );
    if (depsCompleted) {
      return step;
    }
  }

  return null;
}

/**
 * Check if plan is complete
 */
export function isPlanComplete(plan: ExecutionPlan): boolean {
  return plan.steps.every(
    (step) => step.status === "completed" || step.status === "skipped"
  );
}

// ============================================
// 2. VERIFICATION LOOPS
// ============================================

/**
 * Verification result types
 */
export const VerificationResultSchema = z.object({
  stepId: z.string(),
  success: z.boolean(),
  output: z.string(),
  errors: z.array(z.string()).default([]),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  shouldRetry: z.boolean().default(false),
  fixSuggestions: z.array(z.string()).default([]),
});

export type VerificationResult = z.infer<typeof VerificationResultSchema>;

/**
 * Verification loop options
 */
export interface VerificationLoopOptions {
  maxRetries: number;
  retryDelayMs: number;
  onRetry?: (attempt: number, error: string) => void;
  onSuccess?: (result: VerificationResult) => void;
  onFailure?: (result: VerificationResult) => void;
}

/**
 * Default verification options
 */
export const DEFAULT_VERIFICATION_OPTIONS: VerificationLoopOptions = {
  maxRetries: 3,
  retryDelayMs: 1000,
};

/**
 * Create verification result
 */
export function createVerificationResult(
  stepId: string,
  success: boolean,
  output: string,
  errors: string[] = []
): VerificationResult {
  return {
    stepId,
    success,
    output,
    errors,
    retryCount: 0,
    maxRetries: 3,
    shouldRetry: !success && errors.length > 0,
    fixSuggestions: success ? [] : generateFixSuggestions(output, errors),
  };
}

/**
 * Generate fix suggestions based on error output
 */
function generateFixSuggestions(output: string, errors: string[]): string[] {
  const suggestions: string[] = [];

  for (const error of errors) {
    const lowerError = error.toLowerCase();

    if (lowerError.includes("type") && lowerError.includes("error")) {
      suggestions.push("Check type annotations and ensure correct types are used");
    }
    if (lowerError.includes("syntax") && lowerError.includes("error")) {
      suggestions.push("Review syntax - check for missing brackets, semicolons, or quotes");
    }
    if (lowerError.includes("cannot find") || lowerError.includes("not found")) {
      suggestions.push("Verify the file path or import statement is correct");
    }
    if (lowerError.includes("permission")) {
      suggestions.push("Check file permissions or use appropriate access mode");
    }
    if (lowerError.includes("test") && lowerError.includes("fail")) {
      suggestions.push("Review test output and ensure implementation matches expected behavior");
    }
    if (lowerError.includes("expected") && lowerError.includes("got")) {
      suggestions.push("Review assertion - expected value differs from actual result");
    }
  }

  // Dedupe
  return [...new Set(suggestions)];
}

/**
 * Check if verification should trigger a retry
 */
export function shouldRetryVerification(
  result: VerificationResult,
  options: VerificationLoopOptions = DEFAULT_VERIFICATION_OPTIONS
): boolean {
  return !result.success && result.retryCount < options.maxRetries;
}

/**
 * Increment retry count
 */
export function incrementRetry(result: VerificationResult): VerificationResult {
  return {
    ...result,
    retryCount: result.retryCount + 1,
    shouldRetry: result.retryCount + 1 < result.maxRetries,
  };
}

// ============================================
// 3. TOOL SELECTION STRATEGY
// ============================================

/**
 * Tool categories for task matching
 */
export const TOOL_CATEGORIES: Record<string, string[]> = {
  READ: ["Read", "Glob", "Grep", "LSP"],
  EDIT: ["Edit", "Write", "NotebookEdit"],
  TEST: ["Bash", "TaskOutput"],
  COMMIT: ["Bash"],
  SEARCH: ["Grep", "Glob", "LSP"],
  EXECUTE: ["Bash", "Agent"],
};

/**
 * Task type to tool mapping
 */
export const TASK_TOOL_MAP: Record<string, string[]> = {
  understand: ["Read", "Glob", "Grep", "LSP"],
  read: ["Read", "Glob", "Grep", "LSP"],
  search: ["Grep", "Glob", "LSP"],
  edit: ["Edit", "Write", "NotebookEdit"],
  write: ["Edit", "Write", "NotebookEdit"],
  test: ["Bash", "TaskOutput"],
  verify: ["Bash", "TaskOutput"],
  commit: ["Bash"],
  execute: ["Bash", "Agent"],
};

/**
 * Tool selection context
 */
export interface ToolSelectionContext {
  taskType: string;
  previousTools: string[];
  availableTools: string[];
  plan?: ExecutionPlan;
}

/**
 * Select appropriate tool for a task
 */
export function selectTool(context: ToolSelectionContext): string | null {
  const { taskType, availableTools } = context;

  // Get recommended tools for task type
  const recommendedTools = TASK_TOOL_MAP[taskType.toLowerCase()] || [];

  // Find first available recommended tool
  for (const tool of recommendedTools) {
    if (availableTools.includes(tool)) {
      return tool;
    }
  }

  // Fallback to first available tool
  return availableTools[0] || null;
}

/**
 * Get next tool in the read → edit → test → commit workflow
 */
export function getNextToolInWorkflow(previousTool: string): string | null {
  const workflow = ["read", "edit", "test", "commit"];

  const prevIndex = workflow.findIndex(
    (t) => previousTool.toLowerCase().includes(t)
  );

  if (prevIndex === -1 || prevIndex >= workflow.length - 1) {
    return null;
  }

  return workflow[prevIndex + 1] ?? null;
}

/**
 * Validate tool sequence follows best practices
 */
export function validateToolSequence(tools: string[]): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for edit before read
  const editIndex = tools.findIndex((t) =>
    t.toLowerCase().includes("edit") || t.toLowerCase().includes("write")
  );
  const readIndex = tools.findIndex((t) =>
    t.toLowerCase().includes("read") || t.toLowerCase().includes("glob")
  );

  if (editIndex !== -1 && readIndex !== -1 && editIndex < readIndex) {
    warnings.push("Edit tool used before Read tool - consider reading first");
  }

  // Check for commit without test
  const commitIndex = tools.findIndex((t) =>
    t.toLowerCase().includes("commit") || t.toLowerCase().includes("push")
  );
  const testIndex = tools.findIndex((t) =>
    t.toLowerCase().includes("test") || t.toLowerCase().includes("check")
  );

  if (commitIndex !== -1 && testIndex !== -1 && commitIndex < testIndex) {
    warnings.push("Commit attempted before running tests");
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

// ============================================
// 4. ERROR TAXONOMY
// ============================================

/**
 * Error classification types
 */
export const ErrorCategorySchema = z.enum([
  "syntax",
  "type",
  "logic",
  "integration",
  "runtime",
  "permission",
  "network",
  "timeout",
  "resource",
  "unknown",
]);

export const ClassifiedErrorSchema = z.object({
  category: ErrorCategorySchema,
  message: z.string(),
  rawError: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  isRecoverable: z.boolean(),
  suggestedFix: z.string().optional(),
  relatedTools: z.array(z.string()).default([]),
  context: z.record(z.unknown()).optional(),
});

export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;
export type ClassifiedError = z.infer<typeof ClassifiedErrorSchema>;

/**
 * Error pattern matching rules
 */
const ERROR_PATTERNS: Array<{
  patterns: RegExp[];
  category: ErrorCategory;
  severity: "low" | "medium" | "high" | "critical";
  isRecoverable: boolean;
  suggestedFix?: string;
}> = [
  {
    patterns: [/syntax\s*error/i, /unexpected\s*token/i, /parse\s*error/i],
    category: "syntax",
    severity: "medium",
    isRecoverable: true,
    suggestedFix: "Check for missing brackets, quotes, or invalid syntax",
  },
  {
    patterns: [/type\s*error/i, /type\s*mismatch/i, /cannot\s*assign/i, /type\s*is\s*not/i],
    category: "type",
    severity: "medium",
    isRecoverable: true,
    suggestedFix: "Verify type annotations and ensure correct types",
  },
  {
    patterns: [/assertion\s*failed/i, /expected.*but\s*got/i, /test\s*failed/i],
    category: "logic",
    severity: "medium",
    isRecoverable: true,
    suggestedFix: "Review logic and ensure implementation matches expected behavior",
  },
  {
    patterns: [/cannot\s*find\s*module/i, /import\s*error/i, /dependency\s*not\s*found/i],
    category: "integration",
    severity: "high",
    isRecoverable: true,
    suggestedFix: "Install missing dependencies or fix import paths",
  },
  {
    patterns: [/runtime\s*error/i, /undefined\s*is\s*not/i, /null\s*pointer/i, /reference\s*error/i],
    category: "runtime",
    severity: "high",
    isRecoverable: true,
    suggestedFix: "Add null checks and validate inputs",
  },
  {
    patterns: [/permission\s*denied/i, /eacces/i, /access\s*denied/i],
    category: "permission",
    severity: "medium",
    isRecoverable: false,
    suggestedFix: "Check file permissions or run with appropriate privileges",
  },
  {
    patterns: [/network\s*error/i, /econnrefused/i, /enotfound/i, /fetch\s*failed/i],
    category: "network",
    severity: "high",
    isRecoverable: true,
    suggestedFix: "Check network connection and retry",
  },
  {
    patterns: [/timeout/i, /timed\s*out/i, /etimedout/i],
    category: "timeout",
    severity: "medium",
    isRecoverable: true,
    suggestedFix: "Increase timeout or optimize operation",
  },
  {
    patterns: [/out\s*of\s*memory/i, /enomem/i, /heap\s*limit/i],
    category: "resource",
    severity: "critical",
    isRecoverable: false,
    suggestedFix: "Reduce data size or increase resources",
  },
];

/**
 * Classify an error based on its message
 */
export function classifyError(errorMessage: string): ClassifiedError {
  for (const rule of ERROR_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(errorMessage)) {
        return {
          category: rule.category,
          message: extractMeaningfulMessage(errorMessage),
          rawError: errorMessage,
          severity: rule.severity,
          isRecoverable: rule.isRecoverable,
          suggestedFix: rule.suggestedFix,
          relatedTools: getRelatedToolsForCategory(rule.category),
        };
      }
    }
  }

  // Unknown error type
  return {
    category: "unknown",
    message: extractMeaningfulMessage(errorMessage),
    rawError: errorMessage,
    severity: "medium",
    isRecoverable: true,
    relatedTools: [],
  };
}

/**
 * Extract meaningful message from error
 */
function extractMeaningfulMessage(error: string): string {
  // Get first line or first 200 chars
  const firstLine = error.split("\n")[0] ?? "";
  return firstLine.length > 200 ? firstLine.slice(0, 200) + "..." : firstLine;
}

/**
 * Get related tools for error category
 */
function getRelatedToolsForCategory(category: ErrorCategory): string[] {
  const toolMap: Record<ErrorCategory, string[]> = {
    syntax: ["Read", "Edit"],
    type: ["Read", "LSP"],
    logic: ["Read", "Bash", "Grep"],
    integration: ["Bash", "Read"],
    runtime: ["Read", "Bash"],
    permission: ["Bash"],
    network: ["Bash"],
    timeout: ["Bash"],
    resource: ["Bash"],
    unknown: ["Read", "Bash"],
  };

  return toolMap[category] || [];
}

/**
 * Get recovery strategy for error
 */
export function getRecoveryStrategy(error: ClassifiedError): {
  shouldRetry: boolean;
  maxRetries: number;
  delayMs: number;
  alternativeApproach?: string;
} {
  if (!error.isRecoverable) {
    return {
      shouldRetry: false,
      maxRetries: 0,
      delayMs: 0,
      alternativeApproach: error.suggestedFix,
    };
  }

  switch (error.category) {
    case "network":
    case "timeout":
      return {
        shouldRetry: true,
        maxRetries: 3,
        delayMs: 2000,
      };
    case "integration":
      return {
        shouldRetry: true,
        maxRetries: 2,
        delayMs: 1000,
        alternativeApproach: "Try alternative dependency or manual implementation",
      };
    case "logic":
    case "runtime":
      return {
        shouldRetry: false,
        maxRetries: 0,
        delayMs: 0,
        alternativeApproach: error.suggestedFix,
      };
    default:
      return {
        shouldRetry: true,
        maxRetries: 2,
        delayMs: 1000,
      };
  }
}

// ============================================
// 5. PROGRESSIVE REFINEMENT
// ============================================

/**
 * Refinement level
 */
export const RefinementLevelSchema = z.enum([
  "skeleton",    // Basic structure only
  "core",        // Core functionality
  "edge_cases",  // Edge case handling
  "polish",      // Polish and optimization
  "complete",    // Fully complete
]);

export type RefinementLevel = z.infer<typeof RefinementLevelSchema>;

/**
 * Refinement state
 */
export const RefinementStateSchema = z.object({
  currentLevel: RefinementLevelSchema,
  targetLevel: RefinementLevelSchema,
  iterations: z.number().default(0),
  maxIterations: z.number().default(10),
  improvements: z.array(z.object({
    level: RefinementLevelSchema,
    description: z.string(),
    timestamp: z.number(),
  })).default([]),
  metrics: z.record(z.number()).optional(),
});

export type RefinementState = z.infer<typeof RefinementStateSchema>;

/**
 * Progressive refinement options
 */
export interface ProgressiveRefinementOptions {
  startLevel?: RefinementLevel;
  targetLevel?: RefinementLevel;
  maxIterations?: number;
  onLevelComplete?: (level: RefinementLevel, metrics: Record<string, number>) => void;
}

/**
 * Default refinement options
 */
export const DEFAULT_REFINEMENT_OPTIONS: ProgressiveRefinementOptions = {
  startLevel: "skeleton",
  targetLevel: "complete",
  maxIterations: 10,
};

/**
 * Create initial refinement state
 */
export function createRefinementState(
  options: ProgressiveRefinementOptions = DEFAULT_REFINEMENT_OPTIONS
): RefinementState {
  return {
    currentLevel: options.startLevel || "skeleton",
    targetLevel: options.targetLevel || "complete",
    iterations: 0,
    maxIterations: options.maxIterations || 10,
    improvements: [],
  };
}

/**
 * Get refinement level order
 */
function getLevelOrder(level: RefinementLevel): number {
  const order: RefinementLevel[] = ["skeleton", "core", "edge_cases", "polish", "complete"];
  return order.indexOf(level);
}

/**
 * Check if can advance to next level
 */
export function canAdvanceLevel(state: RefinementState): boolean {
  const currentOrder = getLevelOrder(state.currentLevel);
  const targetOrder = getLevelOrder(state.targetLevel);

  return currentOrder < targetOrder && state.iterations < state.maxIterations;
}

/**
 * Advance to next refinement level
 */
export function advanceLevel(
  state: RefinementState,
  description: string
): RefinementState {
  const levels: RefinementLevel[] = ["skeleton", "core", "edge_cases", "polish", "complete"];
  const currentIndex = levels.indexOf(state.currentLevel);

  if (currentIndex >= levels.length - 1) {
    return state; // Already at max level
  }

  const nextLevel = levels[currentIndex + 1] ?? state.currentLevel;

  return {
    ...state,
    currentLevel: nextLevel,
    iterations: state.iterations + 1,
    improvements: [
      ...state.improvements,
      {
        level: state.currentLevel,
        description,
        timestamp: Date.now(),
      },
    ],
  };
}

/**
 * Get guidance for current refinement level
 */
export function getRefinementGuidance(level: RefinementLevel): string[] {
  const guidance: Record<RefinementLevel, string[]> = {
    skeleton: [
      "Focus on basic structure and interfaces",
      "Use placeholder implementations",
      "Ensure code compiles/runs",
      "Don't worry about edge cases yet",
    ],
    core: [
      "Implement main functionality",
      "Handle happy path scenarios",
      "Add basic error handling",
      "Write core tests",
    ],
    edge_cases: [
      "Handle boundary conditions",
      "Add null/undefined checks",
      "Handle error paths",
      "Add edge case tests",
    ],
    polish: [
      "Optimize performance if needed",
      "Improve code clarity",
      "Add documentation",
      "Refactor for maintainability",
    ],
    complete: [
      "Final review of all code",
      "Ensure all tests pass",
      "Verify against requirements",
      "Prepare for commit",
    ],
  };

  return guidance[level];
}

/**
 * Check if refinement is complete
 */
export function isRefinementComplete(state: RefinementState): boolean {
  return (
    state.currentLevel === state.targetLevel ||
    state.iterations >= state.maxIterations
  );
}

// ============================================
// INTEGRATION: COMBINED PATTERN EXECUTOR
// ============================================

/**
 * Combined pattern execution context
 */
export interface PatternExecutionContext {
  plan: ExecutionPlan;
  verification: VerificationLoopOptions;
  refinement: RefinementState;
  errorHistory: ClassifiedError[];
  toolHistory: string[];
}

/**
 * Create pattern execution context
 */
export function createPatternContext(
  goal: string,
  options?: {
    verification?: Partial<VerificationLoopOptions>;
    refinement?: Partial<ProgressiveRefinementOptions>;
  }
): PatternExecutionContext {
  return {
    plan: generatePlan({ goal }),
    verification: { ...DEFAULT_VERIFICATION_OPTIONS, ...options?.verification },
    refinement: createRefinementState(options?.refinement),
    errorHistory: [],
    toolHistory: [],
  };
}

/**
 * Process tool result with all patterns
 */
export function processToolResult(
  context: PatternExecutionContext,
  toolName: string,
  result: { content: string; is_error?: boolean }
): {
  context: PatternExecutionContext;
  shouldContinue: boolean;
  nextAction?: string;
} {
  // Update tool history
  context.toolHistory.push(toolName);

  // Classify error if present
  if (result.is_error) {
    const classified = classifyError(result.content);
    context.errorHistory.push(classified);

    // Get recovery strategy
    const strategy = getRecoveryStrategy(classified);

    if (!strategy.shouldRetry) {
      return {
        context,
        shouldContinue: false,
        nextAction: strategy.alternativeApproach,
      };
    }
  }

  // Update plan step if verification passed
  const currentStep = getNextStep(context.plan);
  if (currentStep && !result.is_error) {
    context.plan = updatePlanStep(context.plan, currentStep.id, {
      status: "completed",
      actualResult: result.content.slice(0, 200),
    });

    // Advance refinement if plan step completed
    if (isPlanComplete(context.plan)) {
      context.refinement = advanceLevel(
        context.refinement,
        `Completed plan: ${context.plan.id}`
      );
    }
  }

  // Determine next action
  const nextStep = getNextStep(context.plan);
  const shouldContinue = nextStep !== null || canAdvanceLevel(context.refinement);

  return {
    context,
    shouldContinue,
    nextAction: nextStep?.description,
  };
}
