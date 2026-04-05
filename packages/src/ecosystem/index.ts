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

// Plugin system
export type { EcosystemPlugin, PluginContext } from "./plugin.js";

// Cognitive Security
export * from "./cognitive-security/index.js";
export { createCognitiveSecurityPlugin } from "./cognitive-security/plugin.js";

// Prompts (identity, directives, builders)
export {
  buildBaseSystemPrompt,
  buildIdentitySection,
  buildCorePrinciplesSection,
  buildBehavioralPatternsSection,
  buildDirectivesSection,
  buildGitWorkflowSection,
  IDENTITY_PROMPT,
  CORE_PRINCIPLES,
  BEHAVIORAL_PATTERNS,
  DOING_TASKS_PROMPT,
  INTERNAL_PATTERNS,
  IMPORTANT_DIRECTIVES,
  GIT_WORKFLOW_DIRECTIVES,
  getDirectivesByCategory,
  getAllDirectives,
  getGitWorkflowDirectives,
  formatDirectivesForPrompt,
} from "./prompts/index.js";
export type { Directive } from "./prompts/index.js";
export { createPromptsPlugin } from "./prompts/plugin.js";

// Daemon (quality gate, task lifecycle, service management)
export { verifyQualityGate, buildRetryPrompt } from "./daemon/quality-gate.js";
export {
  isTaskFileExhausted,
  buildAuditPrompt,
  parseAuditResponseToTasks,
  runLifecycleCheck,
  completeLifecycleCycle,
} from "./daemon/task-lifecycle.js";
export { installService } from "./daemon/service/install.js";
export { uninstallService } from "./daemon/service/uninstall.js";
export { getServiceStatus } from "./daemon/service/status.js";
export { createDaemonPlugin } from "./daemon/plugin.js";

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
