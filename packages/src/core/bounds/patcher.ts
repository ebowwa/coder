/**
 * Boundary Patcher - Generate boundary patches from failure signals
 *
 * This module analyzes failure signals and generates patches that
 * improve the boundary system. The key insight is that failures
 * contain information about what constraints should exist.
 *
 * "Failures become signals that improve the environment."
 */

import type {
  Boundary,
  BoundaryPatch,
  FailureSignal,
  BoundaryContext,
  BoundaryViolation,
  BoundarySeverity,
  NewBoundaryPatch,
} from "./types.js";
import { SignalAggregator, getAggregator } from "./signals.js";

/**
 * Patch generator function type
 */
export type PatchGenerator = (
  signals: FailureSignal[],
  aggregator: SignalAggregator
) => BoundaryPatch | null;

/**
 * Patch rule - defines when and how to generate a patch
 */
export interface PatchRule {
  /** Rule name */
  name: string;
  /** Description of what this rule does */
  description: string;
  /** Minimum signals to trigger */
  minSignals: number;
  /** Check if this rule applies */
  condition: (signals: FailureSignal[], aggregator: SignalAggregator) => boolean;
  /** Generate the patch */
  generate: (signals: FailureSignal[], aggregator: SignalAggregator) => BoundaryPatch | null;
}

/**
 * Generate a unique patch ID
 */
function generatePatchId(): string {
  return `patch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Generate a unique boundary ID
 */
function generateBoundaryId(): string {
  return `learned_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Built-in patch rules
 */
const BUILTIN_RULES: PatchRule[] = [
  // Rule: Repeated permission errors suggest adding permission boundary
  {
    name: "permission-pattern",
    description: "Generate boundary for repeated permission errors",
    minSignals: 2,
    condition: (signals, agg) => {
      const byType = agg.byErrorType();
      const permSignals = byType.get("permission") || [];
      return permSignals.length >= 2;
    },
    generate: (signals, agg) => {
      const byType = agg.byErrorType();
      const permSignals = byType.get("permission") || [];
      if (permSignals.length < 2) return null;

      // Extract paths from context
      const paths = new Set<string>();
      for (const sig of permSignals) {
        const ctx = sig.context as Record<string, unknown> | undefined;
        if (ctx?.path) paths.add(String(ctx.path));
        if (ctx?.filePath) paths.add(String(ctx.filePath));
      }

      const boundaryId = generateBoundaryId();
      const boundary: Boundary = {
        id: boundaryId,
        name: `Permission Protection: ${Array.from(paths).slice(0, 2).join(", ")}`,
        description: `Learned boundary from ${permSignals.length} permission errors`,
        severity: "warn" as BoundarySeverity,
        learned: true,
        tags: ["permission", "auto-generated"],
        enabled: true,
        check: (context: BoundaryContext): BoundaryViolation | null => {
          const inputPath = context.tool_input.file_path || context.tool_input.path;
          if (!inputPath) return null;

          for (const protectedPath of paths) {
            if (String(inputPath).startsWith(protectedPath)) {
              return {
                boundaryId,
                reason: `Access to protected path requires permission: ${protectedPath}`,
                suggestion: "Request permission or use a different path",
                autoFixable: false,
              };
            }
          }
          return null;
        },
      };

      return {
        id: generatePatchId(),
        boundaryId,
        source: "signal",
        sourceSignalId: permSignals[0]!.id,
        patch: { type: "new", boundary } as NewBoundaryPatch,
        createdAt: Date.now(),
        applied: false,
      };
    },
  },

  // Rule: Repeated validation errors on same tool suggest schema boundary
  {
    name: "validation-pattern",
    description: "Generate boundary for repeated validation errors",
    minSignals: 3,
    condition: (signals, agg) => {
      const byType = agg.byErrorType();
      const valSignals = byType.get("validation") || [];
      return valSignals.length >= 3;
    },
    generate: (signals, agg) => {
      const byType = agg.byErrorType();
      const valSignals = byType.get("validation") || [];
      if (valSignals.length < 3) return null;

      // Group by tool
      const byTool = new Map<string, FailureSignal[]>();
      for (const sig of valSignals) {
        const existing = byTool.get(sig.tool_name) || [];
        existing.push(sig);
        byTool.set(sig.tool_name, existing);
      }

      // Find tool with most validation errors
      let maxTool = "";
      let maxCount = 0;
      for (const [tool, sigs] of byTool) {
        if (sigs.length > maxCount) {
          maxCount = sigs.length;
          maxTool = tool;
        }
      }

      if (maxCount < 2) return null;

      const boundaryId = generateBoundaryId();
      const boundary: Boundary = {
        id: boundaryId,
        name: `Validation Guard: ${maxTool}`,
        description: `Learned boundary from ${maxCount} validation errors on ${maxTool}`,
        severity: "warn" as BoundarySeverity,
        learned: true,
        tags: ["validation", "auto-generated", maxTool],
        enabled: true,
        check: (context: BoundaryContext): BoundaryViolation | null => {
          if (context.tool_name !== maxTool) return null;

          // Check for common validation issues
          const input = context.tool_input;
          const issues: string[] = [];

          // Check for empty required fields
          for (const [key, value] of Object.entries(input)) {
            if (value === undefined || value === null || value === "") {
              issues.push(`Field '${key}' is empty`);
            }
          }

          if (issues.length > 0) {
            return {
              boundaryId,
              reason: `Potential validation issues: ${issues.join(", ")}`,
              suggestion: "Check tool input parameters",
              autoFixable: false,
            };
          }

          return null;
        },
      };

      return {
        id: generatePatchId(),
        boundaryId,
        source: "signal",
        sourceSignalId: valSignals[0]!.id,
        patch: { type: "new", boundary } as NewBoundaryPatch,
        createdAt: Date.now(),
        applied: false,
      };
    },
  },

  // Rule: Repeated timeout errors suggest timeout boundary
  {
    name: "timeout-pattern",
    description: "Generate boundary for repeated timeout errors",
    minSignals: 2,
    condition: (signals, agg) => {
      const byType = agg.byErrorType();
      const timeoutSignals = byType.get("timeout") || [];
      return timeoutSignals.length >= 2;
    },
    generate: (signals, agg) => {
      const byType = agg.byErrorType();
      const timeoutSignals = byType.get("timeout") || [];
      if (timeoutSignals.length < 2) return null;

      // Group by tool
      const byTool = new Map<string, FailureSignal[]>();
      for (const sig of timeoutSignals) {
        const existing = byTool.get(sig.tool_name) || [];
        existing.push(sig);
        byTool.set(sig.tool_name, existing);
      }

      // Find tools with timeout issues
      const timeoutTools = Array.from(byTool.entries())
        .filter(([, sigs]) => sigs.length >= 2)
        .map(([tool]) => tool);

      if (timeoutTools.length === 0) return null;

      const boundaryId = generateBoundaryId();
      const boundary: Boundary = {
        id: boundaryId,
        name: `Timeout Warning: ${timeoutTools.join(", ")}`,
        description: `Learned boundary from ${timeoutSignals.length} timeout errors`,
        severity: "warn" as BoundarySeverity,
        learned: true,
        tags: ["timeout", "auto-generated"],
        enabled: true,
        check: (context: BoundaryContext): BoundaryViolation | null => {
          if (!timeoutTools.includes(context.tool_name)) return null;

          // Check for potentially long-running operations
          const input = context.tool_input as Record<string, unknown>;
          if (input.timeout !== undefined) {
            const timeout = Number(input.timeout);
            if (timeout > 60000) {
              return {
                boundaryId,
                reason: `Tool ${context.tool_name} has history of timeouts`,
                suggestion: "Consider reducing timeout or breaking into smaller operations",
                autoFixable: false,
              };
            }
          }

          return null;
        },
      };

      return {
        id: generatePatchId(),
        boundaryId,
        source: "signal",
        sourceSignalId: timeoutSignals[0]!.id,
        patch: { type: "new", boundary } as NewBoundaryPatch,
        createdAt: Date.now(),
        applied: false,
      };
    },
  },
];

/**
 * Boundary Patcher - Analyzes signals and generates patches
 */
export class BoundaryPatcher {
  private rules: PatchRule[];
  private aggregator: SignalAggregator;
  private generatedPatches: BoundaryPatch[] = [];

  constructor(customRules?: PatchRule[], aggregator?: SignalAggregator) {
    this.rules = customRules || BUILTIN_RULES;
    this.aggregator = aggregator || getAggregator();
  }

  /**
   * Add a signal for analysis
   */
  addSignal(signal: FailureSignal): void {
    this.aggregator.add(signal);
  }

  /**
   * Add multiple signals
   */
  addSignals(signals: FailureSignal[]): void {
    for (const signal of signals) {
      this.aggregator.add(signal);
    }
  }

  /**
   * Process all signals and generate patches
   */
  process(): BoundaryPatch[] {
    const signals = this.aggregator.getAll();
    const patches: BoundaryPatch[] = [];

    for (const rule of this.rules) {
      if (signals.length < rule.minSignals) continue;

      if (rule.condition(signals, this.aggregator)) {
        const patch = rule.generate(signals, this.aggregator);
        if (patch) {
          patches.push(patch);
          this.generatedPatches.push(patch);
        }
      }
    }

    return patches;
  }

  /**
   * Add a custom patch rule
   */
  addRule(rule: PatchRule): void {
    this.rules.unshift(rule); // Add at start for priority
  }

  /**
   * Get all generated patches
   */
  getGeneratedPatches(): BoundaryPatch[] {
    return [...this.generatedPatches];
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.aggregator.clear();
    this.generatedPatches = [];
  }

  /**
   * Get available rules
   */
  getRules(): PatchRule[] {
    return [...this.rules];
  }
}

// Singleton patcher
let defaultPatcher: BoundaryPatcher | null = null;

/**
 * Get the default patcher instance
 */
export function getPatcher(): BoundaryPatcher {
  if (!defaultPatcher) {
    defaultPatcher = new BoundaryPatcher();
  }
  return defaultPatcher;
}

/**
 * Reset the default patcher (for testing)
 */
export function resetPatcher(): void {
  defaultPatcher = null;
}
