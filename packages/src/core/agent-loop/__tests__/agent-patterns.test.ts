/**
 * Tests for Agent Patterns - Microsoft Research patterns implementation
 */

import { describe, test, expect } from "bun:test";
import {
  // Pattern 1: Planning
  generatePlan,
  updatePlanStep,
  getNextStep,
  isPlanComplete,
  ExecutionPlanSchema,
  PlanStepSchema,
  // Pattern 2: Verification
  createVerificationResult,
  shouldRetryVerification,
  incrementRetry,
  VerificationResultSchema,
  DEFAULT_VERIFICATION_OPTIONS,
  // Pattern 3: Tool Selection
  selectTool,
  getNextToolInWorkflow,
  validateToolSequence,
  TOOL_CATEGORIES,
  TASK_TOOL_MAP,
  // Pattern 4: Error Taxonomy
  classifyError,
  getRecoveryStrategy,
  ErrorCategorySchema,
  ClassifiedErrorSchema,
  // Pattern 5: Progressive Refinement
  createRefinementState,
  canAdvanceLevel,
  advanceLevel,
  getRefinementGuidance,
  isRefinementComplete,
  RefinementLevelSchema,
  RefinementStateSchema,
  DEFAULT_REFINEMENT_OPTIONS,
  // Combined context
  createPatternContext,
  processToolResult,
} from "../agent-patterns.js";

// ============================================
// PATTERN 1: STRUCTURED PLANNING
// ============================================

describe("Pattern 1: Structured Planning", () => {
  test("generatePlan creates plan with steps from goal", () => {
    const plan = generatePlan({ goal: "Fix the login bug" });

    expect(plan.id).toBeDefined();
    expect(plan.goal).toBe("Fix the login bug");
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.status).toBe("planning");
  });

  test("generatePlan respects maxSteps option", () => {
    const plan = generatePlan({
      goal: "Implement user authentication system",
      maxSteps: 3,
    });

    expect(plan.steps.length).toBeLessThanOrEqual(3);
  });

  test("updatePlanStep updates step status", () => {
    const plan = generatePlan({ goal: "Test task" });
    const stepId = plan.steps[0].id;

    const updated = updatePlanStep(plan, stepId, {
      status: "completed",
      actualResult: "Step completed successfully",
    });

    const step = updated.steps.find((s) => s.id === stepId);
    expect(step?.status).toBe("completed");
    expect(step?.actualResult).toBe("Step completed successfully");
  });

  test("getNextStep returns first pending step", () => {
    const plan = generatePlan({ goal: "Test task" });
    const nextStep = getNextStep(plan);

    expect(nextStep).toBeDefined();
    expect(nextStep?.status).toBe("pending");
  });

  test("getNextStep respects dependencies", () => {
    const plan = generatePlan({ goal: "Test task" });

    // Mark first step as in_progress
    const step1 = plan.steps[0];
    updatePlanStep(plan, step1.id, { status: "in_progress" });

    // Get next step (should be the one in progress)
    const nextStep = getNextStep(plan);
    expect(nextStep?.id).toBe(step1.id);
  });

  test("isPlanComplete returns false when steps pending", () => {
    const plan = generatePlan({ goal: "Test task" });
    expect(isPlanComplete(plan)).toBe(false);
  });

  test("isPlanComplete returns true when all steps completed", () => {
    const plan = generatePlan({ goal: "Test task" });

    // Complete all steps by updating the plan object directly
    for (const step of plan.steps) {
      step.status = "completed";
    }

    expect(isPlanComplete(plan)).toBe(true);
  });

  test("ExecutionPlanSchema validates valid plan", () => {
    const plan = {
      id: "plan-123",
      goal: "Test goal",
      steps: [],
      currentStepIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "planning" as const,
    };

    const result = ExecutionPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
  });

  test("PlanStepSchema validates valid step", () => {
    const step = {
      id: "step-1",
      description: "Test step",
      status: "pending" as const,
      dependencies: [],
      estimatedComplexity: "medium" as const,
    };

    const result = PlanStepSchema.safeParse(step);
    expect(result.success).toBe(true);
  });
});

// ============================================
// PATTERN 2: VERIFICATION LOOPS
// ============================================

describe("Pattern 2: Verification Loops", () => {
  test("createVerificationResult creates result with defaults", () => {
    const result = createVerificationResult("step-1", true, "Tests passed");

    expect(result.stepId).toBe("step-1");
    expect(result.success).toBe(true);
    expect(result.output).toBe("Tests passed");
    expect(result.retryCount).toBe(0);
  });

  test("createVerificationResult includes errors when failed", () => {
    const result = createVerificationResult("step-1", false, "Tests failed", [
      "Error 1",
      "Error 2",
    ]);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(["Error 1", "Error 2"]);
  });

  test("shouldRetryVerification returns true under max retries", () => {
    const result = createVerificationResult("step-1", false, "Failed", ["Error"]);

    expect(shouldRetryVerification(result)).toBe(true);
  });

  test("shouldRetryVerification returns false at max retries", () => {
    const result = createVerificationResult("step-1", false, "Failed", ["Error"]);
    result.retryCount = DEFAULT_VERIFICATION_OPTIONS.maxRetries;

    expect(shouldRetryVerification(result)).toBe(false);
  });

  test("shouldRetryVerification returns false when passed", () => {
    const result = createVerificationResult("step-1", true, "Passed");

    expect(shouldRetryVerification(result)).toBe(false);
  });

  test("incrementRetry increases retry count", () => {
    const result = createVerificationResult("step-1", false, "Failed", ["Error"]);
    const updated = incrementRetry(result);

    expect(updated.retryCount).toBe(1);
  });

  test("VerificationResultSchema validates valid result", () => {
    const result = {
      stepId: "step-1",
      success: false,
      output: "Test output",
      errors: ["Error 1"],
      retryCount: 1,
      maxRetries: 3,
      shouldRetry: true,
      fixSuggestions: [],
    };

    const parsed = VerificationResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

// ============================================
// PATTERN 3: TOOL SELECTION STRATEGY
// ============================================

describe("Pattern 3: Tool Selection Strategy", () => {
  test("selectTool returns appropriate tool for read task", () => {
    const tool = selectTool({
      taskType: "read",
      availableTools: ["Read", "Glob", "Grep"],
    });

    expect(tool).toBe("Read");
  });

  test("selectTool returns appropriate tool for edit task", () => {
    const tool = selectTool({
      taskType: "edit",
      availableTools: ["Read", "Edit", "Write"],
    });

    expect(tool).toBe("Edit");
  });

  test("selectTool respects previous tools used", () => {
    const tool = selectTool({
      taskType: "edit",
      previousTools: ["Read"],
      availableTools: ["Read", "Edit", "Bash"],
    });

    expect(tool).toBe("Edit");
  });

  test("selectTool falls back to first available tool when no match", () => {
    const tool = selectTool({
      taskType: "edit",
      availableTools: ["Grep", "Glob"], // No edit tools
    });

    // Falls back to first available tool
    expect(tool).toBe("Grep");
  });

  test("getNextToolInWorkflow returns next tool in workflow", () => {
    const next = getNextToolInWorkflow("Read");
    expect(next).not.toBeNull();
  });

  test("getNextToolInWorkflow returns null for commit (end of workflow)", () => {
    const next = getNextToolInWorkflow("Bash");
    expect(next).toBeNull();
  });

  test("validateToolSequence validates correct sequence", () => {
    const { valid, warnings } = validateToolSequence(["Read", "Edit", "Bash"]);

    expect(valid).toBe(true);
    expect(warnings.length).toBe(0);
  });

  test("validateToolSequence warns about edit before read", () => {
    const { valid, warnings } = validateToolSequence(["Edit", "Read"]);

    expect(valid).toBe(false);
    expect(warnings.length).toBeGreaterThan(0);
  });

  test("TOOL_CATEGORIES contains expected categories", () => {
    expect(TOOL_CATEGORIES.READ).toBeDefined();
    expect(TOOL_CATEGORIES.EDIT).toBeDefined();
    expect(TOOL_CATEGORIES.TEST).toBeDefined();
  });

  test("TASK_TOOL_MAP contains expected task mappings", () => {
    expect(TASK_TOOL_MAP.read).toBeDefined();
    expect(TASK_TOOL_MAP.edit).toBeDefined();
  });
});

// ============================================
// PATTERN 4: ERROR TAXONOMY
// ============================================

describe("Pattern 4: Error Taxonomy", () => {
  test("classifyError classifies syntax errors", () => {
    const error = classifyError("SyntaxError: Unexpected token");

    expect(error.category).toBe("syntax");
    expect(error.isRecoverable).toBe(true);
  });

  test("classifyError classifies type errors", () => {
    const error = classifyError("TypeError: Cannot read property");

    expect(error.category).toBe("type");
  });

  test("classifyError classifies assertion errors", () => {
    const error = classifyError("Assertion failed: expected 5 to equal 3");

    expect(error.category).toBe("logic");
  });

  test("classifyError classifies import errors", () => {
    const error = classifyError("Error: Cannot find module 'foo'");

    expect(error.category).toBe("integration");
  });

  test("classifyError classifies permission errors", () => {
    const error = classifyError("Error: EACCES permission denied");

    expect(error.category).toBe("permission");
  });

  test("classifyError classifies network errors", () => {
    const error = classifyError("Error: ECONNREFUSED connection refused");

    expect(error.category).toBe("network");
  });

  test("classifyError classifies timeout errors", () => {
    const error = classifyError("Error: ETIMEDOUT operation timed out");

    expect(error.category).toBe("timeout");
  });

  test("getRecoveryStrategy returns appropriate strategy", () => {
    const error = classifyError("SyntaxError: Unexpected token");
    const strategy = getRecoveryStrategy(error);

    expect(strategy.shouldRetry).toBeDefined();
    expect(strategy.maxRetries).toBeDefined();
  });

  test("ErrorCategorySchema validates valid category", () => {
    const result = ErrorCategorySchema.safeParse("syntax");
    expect(result.success).toBe(true);
  });

  test("ClassifiedErrorSchema validates valid error", () => {
    const error = {
      category: "syntax",
      message: "Syntax error found",
      rawError: "SyntaxError: Unexpected token",
      severity: "medium",
      isRecoverable: true,
      suggestedFix: "Check syntax",
      relatedTools: [],
    };

    const result = ClassifiedErrorSchema.safeParse(error);
    expect(result.success).toBe(true);
  });
});

// ============================================
// PATTERN 5: PROGRESSIVE REFINEMENT
// ============================================

describe("Pattern 5: Progressive Refinement", () => {
  test("createRefinementState initializes with skeleton level", () => {
    const state = createRefinementState();

    expect(state.currentLevel).toBe("skeleton");
    expect(state.improvements).toEqual([]);
  });

  test("createRefinementState respects startLevel option", () => {
    const state = createRefinementState({
      startLevel: "core",
    });

    expect(state.currentLevel).toBe("core");
  });

  test("canAdvanceLevel returns true when iterations under max", () => {
    const state = createRefinementState();
    state.iterations = 0;

    expect(canAdvanceLevel(state)).toBe(true);
  });

  test("canAdvanceLevel returns false when at max iterations", () => {
    const state = createRefinementState();
    state.iterations = state.maxIterations;

    expect(canAdvanceLevel(state)).toBe(false);
  });

  test("canAdvanceLevel returns false when at target level", () => {
    const state = createRefinementState();
    state.currentLevel = "complete";

    expect(canAdvanceLevel(state)).toBe(false);
  });

  test("advanceLevel moves to next level", () => {
    const state = createRefinementState();

    const updated = advanceLevel(state, "Skeleton complete");

    expect(updated.currentLevel).toBe("core");
    expect(updated.improvements.length).toBe(1);
    expect(updated.improvements[0].level).toBe("skeleton");
  });

  test("advanceLevel stays at complete level when already complete", () => {
    const state = createRefinementState();
    state.currentLevel = "complete";

    const updated = advanceLevel(state, "Already complete");

    expect(updated.currentLevel).toBe("complete");
  });

  test("getRefinementGuidance returns guidance for each level", () => {
    const skeletonGuidance = getRefinementGuidance("skeleton");
    const coreGuidance = getRefinementGuidance("core");
    const completeGuidance = getRefinementGuidance("complete");

    expect(skeletonGuidance.length).toBeGreaterThan(0);
    expect(coreGuidance.length).toBeGreaterThan(0);
    expect(completeGuidance.length).toBeGreaterThan(0);
  });

  test("isRefinementComplete returns true at complete level", () => {
    const state = createRefinementState();
    state.currentLevel = "complete";

    expect(isRefinementComplete(state)).toBe(true);
  });

  test("isRefinementComplete returns false at other levels", () => {
    const state = createRefinementState();

    expect(isRefinementComplete(state)).toBe(false);
  });

  test("RefinementLevelSchema validates valid level", () => {
    const result = RefinementLevelSchema.safeParse("skeleton");
    expect(result.success).toBe(true);
  });

  test("RefinementStateSchema validates valid state", () => {
    const state = {
      currentLevel: "skeleton",
      targetLevel: "complete",
      iterations: 0,
      maxIterations: 10,
      improvements: [],
    };

    const result = RefinementStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  test("DEFAULT_REFINEMENT_OPTIONS has expected values", () => {
    expect(DEFAULT_REFINEMENT_OPTIONS.startLevel).toBeDefined();
    expect(DEFAULT_REFINEMENT_OPTIONS.targetLevel).toBeDefined();
    expect(DEFAULT_REFINEMENT_OPTIONS.maxIterations).toBeDefined();
  });
});

// ============================================
// COMBINED PATTERN CONTEXT
// ============================================

describe("Combined Pattern Context", () => {
  test("createPatternContext initializes all patterns", () => {
    const context = createPatternContext("Test task");

    expect(context.plan).toBeDefined();
    expect(context.refinement).toBeDefined();
    expect(context.toolHistory).toEqual([]);
    expect(context.errorHistory).toEqual([]);
  });

  test("processToolResult updates tool history", () => {
    const context = createPatternContext("Test task");

    const result = processToolResult(context, "Read", {
      content: "File contents",
    });

    expect(result.context.toolHistory).toContain("Read");
  });

  test("processToolResult processes error results", () => {
    const context = createPatternContext("Test task");

    const result = processToolResult(context, "Bash", {
      content: "Error: Command failed",
      is_error: true,
    });

    expect(result.context.errorHistory.length).toBeGreaterThan(0);
  });

  test("processToolResult processes test results", () => {
    const context = createPatternContext("Test task");

    const result = processToolResult(context, "Bash", {
      content: "Test passed",
    });

    // Tool history should include Bash
    expect(result.context.toolHistory).toContain("Bash");
  });

  test("context tracks iteration count", () => {
    const context = createPatternContext("Test task");

    processToolResult(context, "Read", { content: "File" });
    processToolResult(context, "Edit", { content: "Edited" });
    const result = processToolResult(context, "Bash", { content: "Done" });

    expect(result.context.toolHistory.length).toBe(3);
  });
});
