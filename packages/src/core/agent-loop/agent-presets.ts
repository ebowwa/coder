/**
 * Agent Presets - Re-exports from ecosystem/presets
 *
 * This module provides agent preset types and utilities for the agent loop.
 * The actual implementations are in ecosystem/presets/types.ts
 */

import { z } from "zod";

// Re-export types
export type {
  CompactionStrategy,
  ErrorHandling,
  CostThresholds,
  LoopBehavior,
} from "../../ecosystem/presets/index.js";

export type { TeammateTemplate as AgentPreset } from "../../ecosystem/presets/index.js";

// Re-export schemas
export {
  CompactionStrategySchema,
  ErrorHandlingSchema,
  CostThresholdsSchema,
  LoopBehaviorSchema,
  DEFAULT_LOOP_BEHAVIOR,
  getLoopBehavior,
} from "../../ecosystem/presets/index.js";

// Agent preset type schema (alias for TeammateTemplate)
export const AgentPresetTypeSchema = z.enum([
  "general-purpose",
  "explore",
  "plan",
  "claude-code-guide",
]).describe("Type of agent preset");

export type AgentPresetType = z.infer<typeof AgentPresetTypeSchema>;

// Re-export TeammateTemplateSchema as AgentPresetSchema
export { TeammateTemplateSchema as AgentPresetSchema } from "../../ecosystem/presets/index.js";

// Re-export template constants
export {
  TEAMMATE_TEMPLATES as AGENT_PRESETS,
  TEAMMATE_TEMPLATE_NAMES,
  BUILTIN_PRESETS,
} from "../../ecosystem/presets/index.js";

// Default preset type
export const DEFAULT_PRESET: AgentPresetType = "general-purpose";

/**
 * Get agent preset by name
 */
export function getAgentPreset(name: string) {
  const { TEAMMATE_TEMPLATES } = require("../../ecosystem/presets/types.js");
  return TEAMMATE_TEMPLATES[name as keyof typeof TEAMMATE_TEMPLATES] ?? null;
}

/**
 * Check if a preset type is valid
 */
export function isValidPresetType(type: string): type is AgentPresetType {
  return AgentPresetTypeSchema.safeParse(type).success;
}

/**
 * Merge preset with custom options
 */
export function mergePreset<T extends Record<string, unknown>>(
  preset: T,
  custom: Partial<T>
): T {
  return { ...preset, ...custom };
}

/**
 * Get preset for teammate
 */
export function getPresetForTeammate(name: string) {
  return getAgentPreset(name);
}

/**
 * Check if tool is allowed for preset
 */
export function isToolAllowedForPreset(
  presetName: string,
  toolName: string
): boolean {
  const preset = getAgentPreset(presetName);
  if (!preset?.permissions?.allowedTools) {
    return true; // If no restrictions, allow all
  }
  return preset.permissions.allowedTools.includes(toolName);
}

/**
 * Get compaction options for preset
 */
export function getCompactionOptionsForPreset(presetName: string) {
  const preset = getAgentPreset(presetName);
  if (!preset?.loopBehavior) {
    return {
      strategy: "balanced" as const,
      threshold: 0.75,
      autoCompact: true,
    };
  }
  return {
    strategy: preset.loopBehavior.compactionStrategy ?? "balanced",
    threshold: preset.loopBehavior.compactionThreshold ?? 0.75,
    autoCompact: preset.loopBehavior.autoCompact ?? true,
  };
}

/**
 * Check cost threshold
 */
export function checkCostThreshold(
  presetName: string,
  currentCost: number
): { warn: boolean; stop: boolean } {
  const preset = getAgentPreset(presetName);
  const thresholds = preset?.loopBehavior?.costThresholds;

  if (!thresholds?.enabled) {
    return { warn: false, stop: false };
  }

  return {
    warn: currentCost >= (thresholds.warnAt ?? 1.0),
    stop: currentCost >= (thresholds.stopAt ?? 10.0),
  };
}

/**
 * Get default preset for type
 */
export function getDefaultPresetForType(type: AgentPresetType) {
  // Map preset types to teammate templates
  const mapping: Record<AgentPresetType, string> = {
    "general-purpose": "general",
    explore: "explorer",
    plan: "planner",
    "claude-code-guide": "coder",
  };

  return getAgentPreset(mapping[type] ?? "general");
}
