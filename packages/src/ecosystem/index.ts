/**
 * Ecosystem - Extension systems for Coder
 *
 * Includes:
 * - Skills: Custom agent behaviors (local + marketplace)
 * - Hooks: Lifecycle event handlers
 * - Tools: Built-in and custom tools
 * - Presets: Configuration templates
 */

// Skills system (local files)
export {
  type SkillFile,
  SkillManager,
  parseSkillFile,
  buildSkillPrompt,
  builtInSkills,
  isSkillInvocation,
  getSkillArgs,
} from "./skills/index.js";

// Skills marketplace client
export {
  type MarketplaceSkill,
  type SkillVersion,
  type ListSkillsOptions,
  type ListSkillsResponse,
  SkillsClient,
  SkillsCache,
  SkillResolver,
} from "./skills/skills-client.js";

// Hooks system
export {
  type HookHandler,
  type PromptEvaluator,
  type ExtendedHookDefinition,
  HookManager,
  builtInHooks,
  hookEventDocs,
  hookExitCodes,
  createPromptEvaluator,
  createMockPromptEvaluator,
  type PromptEvaluatorOptions,
} from "./hooks/index.js";

// Tools
export {
  builtInTools,
  getToolByName,
} from "./tools/index.js";

// Re-export tool types from schemas
export type { ToolDefinition, ToolResult, ToolContext } from "../schemas/index.js";

// Presets (teammate templates)
export {
  TeammateTemplateManager,
  templateManager,
  TEAMMATE_TEMPLATES,
  TEAMMATE_TEMPLATE_NAMES,
  BUILTIN_PRESETS,
  PresetSchema,
  TeammateTemplateSchema,
  type TeammateTemplate,
  type TeammateTemplatePermissions,
  type Preset,
} from "./presets/index.js";
