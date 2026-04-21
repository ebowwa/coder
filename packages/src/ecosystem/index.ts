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
export type { EcosystemPlugin, PluginContext, LoadedPlugin, PluginLoadResult } from "./plugins/index.js";
export type { PluginError } from "./plugins/index.js";
export { PluginRegistry, BUILTIN_SOURCE, getPluginErrorMessage } from "./plugins/index.js";

// Cognitive Security
export * from "./plugins/cognitive-security/index.js";
export { createCognitiveSecurityPlugin } from "./plugins/index.js";

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
} from "./plugins/prompts/index.js";
export type { Directive } from "./plugins/prompts/index.js";
export { createPromptsPlugin } from "./plugins/index.js";

// Daemon (quality gate, task lifecycle, service management)
export { verifyQualityGate, buildRetryPrompt } from "./plugins/daemon/quality-gate.js";
export {
  isTaskFileExhausted,
  buildAuditPrompt,
  parseAuditResponseToTasks,
  runLifecycleCheck,
  completeLifecycleCycle,
} from "./plugins/daemon/task-lifecycle.js";
export { installService } from "./plugins/daemon/service/install.js";
export { uninstallService } from "./plugins/daemon/service/uninstall.js";
export { getServiceStatus } from "./plugins/daemon/service/status.js";
export { createDaemonPlugin } from "./plugins/index.js";

// Bounds (code quality rules, absorbed into cognitive-security)
export {
  BoundaryRegistry,
  getRegistry,
  getAllBoundaries,
  builtInBoundaries,
  strictBuiltInBoundaries,
  SignalAnalyzer,
  SignalAggregator,
  BoundaryPatcher,
} from "./plugins/cognitive-security/bounds/index.js";
export type {
  Boundary,
  BoundaryViolation,
  BoundaryCheckResult,
  BoundaryContext,
  BoundarySeverity,
  FailureSignal,
  BoundaryPatch,
  BoundaryStats,
} from "./plugins/cognitive-security/bounds/index.js";

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
