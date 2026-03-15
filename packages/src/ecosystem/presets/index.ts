/**
 * Teammate Templates - Agent configuration templates for autonomous teammates
 *
 * Templates define:
 * - MCP servers (tools available to the agent)
 * - CLAUDE.md (identity/behavior instructions)
 * - Permissions (what the agent can do)
 * - Skills (specialized prompts)
 *
 * Usage:
 *   const template = TEAMMATE_TEMPLATES.quant;
 *   teammate.spawn({
 *     name: "trader-1",
 *     template: "quant",
 *     task: "monitor markets"
 *   });
 */

export { TeammateTemplateManager, templateManager } from "./manager.js";
export {
  TEAMMATE_TEMPLATES,
  TEAMMATE_TEMPLATE_NAMES,
  BUILTIN_PRESETS,
  PresetSchema,
  // Loop behavior exports
  LoopBehaviorSchema,
  CompactionStrategySchema,
  ErrorHandlingSchema,
  CostThresholdsSchema,
  DEFAULT_LOOP_BEHAVIOR,
  getLoopBehavior,
} from "./types.js";
export type {
  TeammateTemplate,
  TeammateTemplatePermissions,
  Preset,
  LoopBehavior,
  CompactionStrategy,
  ErrorHandling,
  CostThresholds,
} from "./types.js";
export { TeammateTemplateSchema } from "./types.js";
