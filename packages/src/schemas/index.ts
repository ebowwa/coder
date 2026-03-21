/**
 * Zod Validation Schemas Index
 * Exports all schemas, type guards, and inferred types for Coder
 * @version 3.0.0 - Single source of truth for types
 *
 * Usage:
 *   import { APIResponseSchema } from "@ebowwa/coder/schemas";  // Schema
 *   import type { APIResponse } from "@ebowwa/coder/schemas";   // Type (inferred)
 */

import { z } from "zod";

// ============================================
// IMPORT SCHEMAS
// ============================================

import {
  StopReasonSchema,
  CacheCreationSchema,
  UsageMetricsSchema,
  MediaTypeSchema,
  CacheTTLSchema,
  CacheControlSchema,
  TextBlockSchema,
  ImageBlockSchema,
  DocumentBlockSchema,
  ToolUseBlockSchema,
  ToolResultBlockSchema,
  ThinkingBlockSchema,
  RedactedThinkingBlockSchema,
  ContentBlockSchema,
  APIResponseSchema,
  APIRequestSchema,
  StreamingEventSchema,
  DeltaTypeSchema,
  OAuthConfigSchema,
  BackendTypeSchema,
  BackendConfigSchema,
  RateLimitConfigSchema,
  UserAgentComponentsSchema,
  BetaHeadersSchema,
  ApiKeyHelperConfigSchema,
  MessageRoleSchema,
  MessageSchema,
  SystemBlockSchema,
  JSONSchemaSchema,
  APIToolSchema,
  APIToolChoiceSchema,
  ThinkingConfigSchema,
  CacheConfigSchema,
  APICacheMetricsSchema,
  // Cache metrics extended
  CacheMetricsSchema,
  // Effort levels
  EffortLevelSchema,
  EffortLevelConfigSchema,
  EFFORT_LEVEL_CONFIGS,
  // Extended thinking
  ExtendedThinkingConfigSchema,
  DEFAULT_THINKING_CONFIG,
  // Model thinking support
  ModelThinkingSupportSchema,
  MODEL_THINKING_SUPPORT,
  THINKING_BETA_HEADERS,
  // Constants
  DEFAULT_CACHE_CONFIG,
  EFFORT_TO_BUDGET,
  calculateBudgetTokens,
  supportsExtendedThinking,
  // Query metrics and git status
  QueryMetricsSchema,
  GitStatusSchema,
  // JSON Schema for tools (from tools.zod.ts)
  JSONSchemaDefinitionSchema,
  SchemaPropertySchema,
  // Skill system
  SkillDefinitionSchema,
  // Type guards
  isTextBlock,
  isImageBlock,
  isDocumentBlock,
  isToolUseBlock,
  isToolResultBlock,
  isThinkingBlock,
  isRedactedThinkingBlock,
  isContentBlock,
  isAPIResponse,
  isAPIRequest,
  isUsageMetrics,
  isValidUsageMetrics,
  isMessage,
  isOAuthConfig,
  isBackendConfig,
  isRateLimitConfig,
  isCacheConfig,
  isAPICacheMetrics,
  isCacheMetrics,
  isEffortLevel,
  isExtendedThinkingConfig,
  isModelThinkingSupport,
  isQueryMetrics,
  isGitStatus,
  isJSONSchema,
  isSchemaProperty,
  isSkillDefinition,
} from "./api.zod.js";

import {
  KnownClaudeModelSchema,
  ClaudeModelSchema,
  ContextWindowsSchema,
  MaxOutputTokensSchema,
  ModelTierSchema,
  ModelDefinitionSchema,
  VertexRegionMappingSchema,
  ExtendedThinkingFeaturesSchema,
  ExtendedThinkingSettingsSchema,
  ModelPricingSchema,
  ModelPricingRegistrySchema,
  CostCalculationInputSchema,
  isClaudeModel,
  isKnownClaudeModel,
  isModelTier,
  isModelDefinition,
  isVertexRegionMapping,
  isModelPricing,
  isExtendedThinkingFeatures,
  isExtendedThinkingSettings,
  isCostCalculationInput,
  isValidModelId,
  isValidModelTier,
  isValidModelDefinition,
  isValidPricing,
  validateModelRegistry,
  validatePricingRegistry,
  validateVertexRegionMappings,
  hasExtendedContext,
  getBaseModelId,
  isValidModelIdFormat,
} from "./models.zod.js";

import {
  // Schemas
  TeammateStatusSchema as TeammateStatusAltSchema,
  TeammateSchema as TeammateAltSchema,
  TeamSchema as TeamAltSchema,
  TeammateMessageSchema as TeammateMessageAltSchema,
  CoordinationSettingsSchema as CoordinationSettingsAltSchema,
  // Claude Code parity - Agent types and tool restrictions
  AgentTypeSchema as AgentTypeAltSchema,
  ToolRestrictionsSchema as ToolRestrictionsAltSchema,
  WorktreeConfigSchema as TeammateWorktreeConfigSchema,
  // Type guards
  isTeammateStatus,
  isTeammate,
  isTeam,
  isTeammateMessage,
  isCoordinationSettings,
} from "./teammates.zod.js";

import {
  AgentTypeDefinitionSchema,
  SessionTypeSchema,
  SessionTypeDefinitionSchema,
  SessionSourceSchema,
  SessionIdentifierSchema,
  SessionStatusSchema,
  SessionStateSchema,
  AgentCapabilitiesSchema,
  PartialAgentCapabilitiesSchema,
  AgentConfigSchema,
  AgentStatusSchema,
  AgentLifecycleEventTypeSchema,
  AgentLifecycleEventSchema,
  isAgentTypeDefinition,
  isSessionType,
  isSessionTypeDefinition,
  isSessionSource,
  isSessionIdentifier,
  isSessionStatus,
  isSessionState,
  isAgentCapabilities,
  isAgentConfig,
  isAgentStatus,
  isAgentLifecycleEvent,
  isValidSessionType,
  isValidSessionSource,
  isValidAgentConfig,
  isValidAgentCapabilities,
  validateAgentTypesRegistry,
  validateSessionTypesRegistry,
  canSpawnSubagents,
  getToolsForAgentType,
  isTerminalSessionStatus,
  isActiveAgentStatus,
} from "./agents.zod.js";

import {
  PermissionModeSchema,
  PermissionModeDefinitionSchema,
  PermissionDecisionSchema,
  RiskLevelSchema,
  PermissionRequestSchema,
  PermissionResponseSchema,
  PermissionResultSchema,
  PermissionCacheEntrySchema,
  PermissionCacheSchema,
  ToolFilteringConfigSchema,
  PermissionToolChoiceSchema,
  RiskAssessmentSchema,
  PermissionPromptDecisionSchema,
  isValidPermissionMode,
  isValidPermissionRequest,
  isValidPermissionResponse,
  isValidRiskLevel,
} from "./permissions.zod.js";

import {
  MCPProtocolVersionSchema,
  TransportTypeSchema,
  MCPServerConfigSchema,
  MCPServerManagementSchema,
  JSONRPCErrorSchema,
  JSONRPCRequestSchema,
  JSONRPCResponseSchema,
  JSONRPCNotificationSchema,
  MCPPropertySchema,
  MCPInputSchemaSchema,
  MCPToolSchema,
  ToolListRequestSchema,
  ToolListResponseSchema,
  ToolCallRequestSchema,
  MCPResourceSchema,
  MCPContentSchema,
  ToolCallResponseSchema,
  isValidTransportType,
  isValidMCPServerConfig,
  isValidJSONRPCRequest,
  isValidJSONRPCResponse,
  isValidMCPTool,
  isValidToolCallRequest,
  isValidToolCallResponse,
  MCP_PROTOCOL_VERSION,
  MCP_TOOL_METHODS,
  MCP_RESOURCE_METHODS,
  MCP_PROMPT_METHODS,
  MCP_SAMPLING_METHODS,
  MCPMethods,
  MCPConfigKeys,
  TRANSPORT_TYPES,
  formatMCPToolName,
  isMCPToolName,
  parseMCPToolName,
  parseMCPToolNameSchema,
} from "./mcp.zod.js";

import {
  HookTypeSchema,
  HookEventSchema,
  ExtendedHookEventSchema,
  HookMatcherTypeSchema,
  HookExecutionConfigSchema,
  DEFAULT_HOOK_EXECUTION_SCHEMA,
  HookDefinitionSchema,
  HookConfigSchema,
  HookInputSchema,
  HookDecisionSchema,
  HookOutputSchema,
  HookExitCodeSchema,
  isValidHookType,
  isValidHookEvent,
  isValidExtendedHookEvent,
  isValidHookMatcherType,
  isValidHookDefinition,
  isValidHookInput,
  isValidHookOutput,
  isValidHookConfig,
  isValidHookExitCode,
} from "./hooks.zod.js";

import {
  SlashCommandSchema,
  SlashCommandRegistrySchema,
  ParsedCommandSchema,
  CommandCategorySchema,
  CommandCategoriesSchema,
  BuiltInCommandsArraySchema,
  SlashCommandNameSchema,
  SkillsAPIConfigSchema,
  isValidSlashCommand,
  isValidParsedCommand,
  isValidCommandCategory,
  isValidSkillsAPIConfig,
  isSlashCommandInput,
  parseSlashCommandSchema,
  isValidSlashCommandName,
} from "./slash-commands.zod.js";

import {
  ToolCategorySchema,
  ToolParameterTypeSchema,
  ToolParameterSchema,
  BuiltInToolSchema,
  BuiltInToolsArraySchema,
  ToolExecutionConfigSchema,
  DEFAULT_TOOL_EXECUTION_SCHEMA,
  ToolContextSchema,
  ToolInputSchemaDefinitionSchema,
  ToolDefinitionSchema,
  OutputModeSchema,
  ToolResultSchema,
  BACKGROUND_TASK_TOOLS_SCHEMA,
  isValidToolCategory,
  isValidToolParameter,
  isValidBuiltInTool,
  isValidToolExecutionConfig,
  isValidToolDefinition,
  isValidToolResult,
  isValidOutputMode,
  isValidToolContext,
  isBuiltInToolName,
  supportsBackgroundExecution,
} from "./tools.zod.js";

// ============================================
// NEW SCHEMA IMPORTS (25 new files)
// ============================================

import {
  AbortControllerConfigSchema,
  ProcessSignalNameSchema,
  ProcessSignalConfigSchema,
  PROCESS_SIGNALS_SCHEMA,
  CleanupBehaviorSchema,
  OrphanDetectionConfigSchema,
  MCPCancelNotificationSchema,
  MCPRequestCancellationConfigSchema,
  TaskStatusSchema,
  TaskCancellationFlowSchema,
  ControlRequestInterruptSchema,
  StdinRawModeConfigSchema,
  CancellationErrorConfigSchema,
  RetryWithAbortConfigSchema,
  RetryDecisionSchema,
  ChildProcessCleanupResultSchema,
  WeakRefCleanupSchema,
} from "./abort.zod.js";

import {
  VersionInfoSchema,
  SlashCommandChangeSchema,
  ApiFeatureChangeSchema,
  EnvironmentVariableChangeSchema,
  BinaryStructureSchema,
  VersionChangesSchema,
  BinaryFormatSchema,
  BetaHeadersSchema as ChangelogBetaHeadersSchema,
  VersionHistorySchema,
} from "./changelog.zod.js";

import {
  ChromeBridgeFeaturesSchema,
  ChromeBridgeToolNameSchema,
  ChromeBridgeToolSchema,
  ChromeConnectionEventNameSchema,
  ChromeConnectionEventSchema,
  ChromeBridgeAuthenticationSchema,
  ChromeBridgeMessageTypeSchema,
  ChromeBridgeMessageSchema,
  ChromeBridgeReconnectConfigSchema,
  TabContextSchema,
  TabsContextResultSchema,
  ScreenshotOptionsSchema,
  ScreenshotResultSchema,
  ConsoleLogEntrySchema,
  NetworkRequestEntrySchema,
} from "./chrome-bridge.zod.js";

import {
  FileReferenceSchema,
  GitStateSchema,
  CheckpointMetadataSchema,
  CheckpointSchema,
  CheckpointStoreSchema,
} from "./checkpoints.zod.js";

import {
  EnvironmentInfoSchema,
  GitStatusInfoSchema,
  ToolsInfoSchema,
  SystemSignatureSchema,
  ClaudeMdConfigSchema,
  ClaudeMdResultSchema,
  DEFAULT_CLAUDE_MD_CONFIG,
} from "./claude-md.zod.js";

import {
  ClaudeMainConfigSchema,
  ProjectConfigSchema,
  SettingsConfigSchema,
  HookMatcherConfigSchema,
  KeybindingConfigSchema,
  LoadedConfigSchema,
} from "./config.zod.js";

import {
  RetryOptionsSchema,
  DEFAULT_RETRY_OPTIONS,
} from "./retry.zod.js";

import {
  TokenWarningOptionsSchema,
  CostUpdateOptionsSchema,
  ToolSummaryOptionsSchema,
  EnvInfoOptionsSchema,
  SystemReminderConfigSchema,
  CombinedReminderOptionsSchema,
  DEFAULT_REMINDER_CONFIG,
} from "./system-reminders.zod.js";

import {
  MessageSubTypeSchema,
  UIMessageSchema,
  StatusLineOptionsSchema,
  ContextInfoSchema,
  TerminalSizeSchema,
  UseTerminalSizeOptionsSchema,
  MessageAreaPropsSchema,
  StatusBarPropsSchema,
  InputFieldPropsSchema,
  TerminalLayoutSchema,
  SessionInfoSchema,
  CLIArgsSchema,
  LoadingStateDataSchema,
  LoadingStateEventsSchema,
  QueryOptionsSchema,
  BufferedMessageSchema,
  SuppressOptionsSchema,
  SpinnerOptionsSchema,
  SpinnerStateSchema,
  ProgressUpdateSchema,
  InputHistoryOptionsSchema,
} from "./ui.zod.js";

import {
  ContextWindowSizeTypeSchema,
  ContextWindowSizesSchema as CompactionContextWindowSizesSchema,
  TokenThresholdsSchema,
  ThresholdCheckResultSchema,
  CompactionTriggerSchema,
  CompactionConditionsSchema,
  CompactionStepSchema,
  CompactionOptionsSchema,
  CompactionResultSchema,
  SummaryPromptConfigSchema,
  CompactionEnvConfigSchema,
  // New compaction types
  LLMSummarizationOptionsSchema,
  AgentLoopCompactionOptionsSchema,
  ContextCompactionOptionsSchema,
  AgentLoopCompactionResultSchema,
  ContextCompactionResultSchema,
} from "./compaction.zod.js";

import {
  ContextDefaultsSchema,
  ContextWindowConfigSchema,
  TokenUsageSchema,
  TokenCounterSchema,
  CompressionTriggerSchema,
  CompressionBehaviorSchema,
  CompressionConfigSchema,
  ContinuationSummarySchema,
  ContinuationSummaryConfigSchema,
  ContextFunctionsSchema,
  GitStatusSnapshotSchema,
  GitStatusSchema as ContextGitStatusSchema,
  FileHistoryEntrySchema,
  ContextSnapshotSchema,
  QueryUsageSchema,
  QueryMetricsSchema as ContextQueryMetricsSchema,
} from "./context.zod.js";

import {
  ModelUsageSchema,
  CostTrackingStateSchema,
  ModelPricingConfigSchema,
  UsageForCostSchema,
  CacheMetricsSchema as CostCacheMetricsSchema,
  CostDisplayConfigSchema,
  EffortLevelSchema as CostEffortLevelSchema,
  EffortGuidanceSchema,
} from "./cost.zod.js";

import {
  CoreEnvironmentVariablesSchema,
  DebuggingEnvironmentVariablesSchema,
  BackendEnvironmentVariablesSchema,
  ContextEnvironmentVariablesSchema,
  PluginEnvironmentVariablesSchema,
  RemoteEnvironmentVariablesSchema,
  GitEnvironmentVariablesSchema,
  OAuthEnvironmentVariablesSchema,
  AgentSdkEnvironmentVariablesSchema,
  TelemetryEnvironmentVariablesSchema,
  MemoryEnvironmentVariablesSchema,
  ClaudeCodeEnvironmentSchema,
  EnvironmentVariableMetadataSchema,
} from "./environment.zod.js";

import {
  AnthropicErrorCodeSchema,
  AnthropicErrorSchema,
  APIErrorConfigSchema,
  InternalErrorConfigSchema,
  StatusCodeRetryConfigSchema,
  ExponentialBackoffConfigSchema,
  RetryAfterHeaderSchema,
  RetryFlowConfigSchema,
  RetryResultSchema,
  ErrorClassificationSchema,
  ErrorClassificationConfigSchema,
  ErrorContextSchema,
  SpecialErrorConfigSchema,
} from "./error-handling.zod.js";

import {
  ExtendedThinkingConfigSchema as ExtendedThinkingConfigAltSchema,
  ExtendedThinkingFeaturesSchema as ExtendedThinkingFeaturesAltSchema,
  ExtendedThinkingSettingsSchema as ExtendedThinkingSettingsAltSchema,
  ModelThinkingSupportSchema as ModelThinkingSupportAltSchema,
  ThinkingBetaHeadersSchema,
} from "./extended-thinking.zod.js";

import {
  MediaTypeSchema as ImageMediaTypeSchema,
  ImageSourceSchema,
  ImageBlockSchema as ImageBlockAltSchema,
  ImageProcessingConfigSchema,
  ImageProcessingResultSchema,
  ImageValidationConfigSchema,
  ImageValidationResultSchema,
  ImageCaptureConfigSchema,
} from "./image.zod.js";

import {
  MemoryConfigSchema,
  MemoryFileSchema,
  MemoryEntrySchema,
  MemoryStoreSchema,
  AutoMemorySettingsSchema,
  MemoryOperationSchema,
  MemoryOperationResultSchema,
} from "./memory.zod.js";

import {
  ModelTierSchema as ModelSelectionTierSchema,
  ModelCapabilitySchema,
  ModelSelectionCriteriaSchema,
  ModelSelectionResultSchema,
  ModelAvailabilitySchema,
  ModelSelectionGuidanceSchema,
} from "./model-selection.zod.js";

import {
  NativeModuleNameSchema,
  NativeModuleCapabilitySchema,
  GrepMatchSchema,
  GrepResultSchema,
  HashAlgorithmSchema,
  HashResultSchema,
  HighlightLanguageSchema as NativeHighlightLanguageSchema,
  HighlightResultSchema as NativeHighlightResultSchema,
  TokenCountResultSchema,
  DiffHunkSchema,
  DiffResultSchema,
  MultiEditOperationSchema,
  MultiEditResultSchema as NativeMultiEditResultSchema,
  // New native types
  HighlightDiffResultSchema,
  DiffOptionsSchema,
  MultiEditEntrySchema,
  MultiEditPreviewEntrySchema,
  OHLCVSchema,
  AMMStateSchema,
  AMMCostResultSchema,
  AMMPriceImpactResultSchema,
  LMSRPriceResultSchema,
  ArbitrageResultSchema,
  OddsConversionSchema,
  VaRResultSchema,
  DrawdownResultSchema,
  SharpeResultSchema,
  KeyEventKindSchema,
  NativeKeyEventSchema,
  TuiMessageSchema,
  TuiStateSchema,
  InputResultSchema,
  GrepSearchResultSchema,
  GrepOptionsSchema,
} from "./native.zod.js";

import {
  PermissionModeSchema as PermissionModeAltSchema,
  PermissionModeConfigSchema,
  PermissionModeTransitionSchema,
} from "./permission-modes.zod.js";

import {
  PlanModeSchema,
  PlanModeConfigSchema,
  PlanStepSchema,
  PlanSchema,
  PlanApprovalRequestSchema,
  PlanApprovalResultSchema,
  PlanGenerationOptionsSchema,
} from "./plan-mode.zod.js";

import {
  SettingsFilePathSchema,
  HookEventSchema as SettingsHookEventSchema,
  HookConfigSchema as SettingsHookConfigSchema,
  SettingsSchema as ConfigSettingsSchema,
  KeybindingSchema,
  KeybindingsConfigSchema,
} from "./settings.zod.js";

import {
  SkillDefinitionSchema as SkillDefinitionAltSchema,
  SkillRegistrySchema,
  SkillExecutionContextSchema,
  SkillExecutionResultSchema,
} from "./skills.zod.js";

import {
  StreamingEventTypeSchema,
  StreamingEventSchema as StreamingEventAltSchema,
  DeltaTypeSchema as StreamingDeltaTypeSchema,
  TextDeltaSchema,
  InputJsonDeltaSchema,
  ThinkingDeltaSchema,
  StreamingConfigSchema,
  StreamingStateSchema,
  StreamOptionsSchema,
  StreamResultSchema,
} from "./streaming.zod.js";

import {
  SyntaxLanguageSchema,
  SyntaxTokenKindSchema,
  SyntaxTokenSchema,
  SyntaxHighlightResultSchema,
  SyntaxHighlightConfigSchema,
} from "./syntax.zod.js";

import {
  TelemetryConfigSchema,
  TelemetryEventTypeSchema,
  TelemetryEventSchema,
  TelemetryMetricsSchema,
} from "./telemetry.zod.js";

import {
  TodoStatusSchema,
  TodoPrioritySchema,
  TodoItemSchema,
  TodoListSchema,
  TodoOperationSchema,
  TodoOperationResultSchema,
} from "./todo-list.zod.js";

import {
  TUISessionStateSchema,
  TUISessionSchema,
  TUIInputKeySchema,
  TUIInputMouseSchema,
  TUIOutputSchema,
  ANSI_ESCAPE_CODES,
} from "./tui-bridge.zod.js";

import {
  VoiceConfigSchema,
  VoiceInputResultSchema,
  VoiceOutputConfigSchema,
} from "./voice.zod.js";

import {
  WebSearchConfigSchema,
  WebSearchResultSchema,
  WebFetchConfigSchema,
  WebFetchResultSchema,
  WebContentTypeSchema,
  WebContentOptionsSchema,
} from "./web-search-fetch.zod.js";

import {
  WorktreeConfigSchema,
  WorktreeInfoSchema,
  WorktreeListSchema,
  WorktreeOperationSchema,
  WorktreeOperationResultSchema,
  WorktreeSessionSchema,
} from "./worktree.zod.js";

// Sessions
import {
  SessionMetadataSchema,
  SessionMessageSchema,
  SessionToolUseSchema,
  SessionMetricsSchema,
  SessionContextSchema,
  SessionCheckpointSchema,
  SessionEntrySchema,
  LoadedSessionSchema,
  SessionSummarySchema,
  SessionFilterSchema,
  SessionEventTypeSchema,
  SessionEventSchema,
  ExportFormatSchema,
  isSessionMetadata,
  isSessionToolUse,
  isSessionEvent,
  isLoadedSession,
  isSessionSummary,
} from "./sessions.zod.js";

// Agent Loop
import {
  AgentLoopOptionsSchema,
  AgentLoopResultSchema,
  LoopStateSchema,
  TurnOptionsSchema,
  TurnResultSchema,
  ToolExecutionOptionsSchema,
  isAgentLoopResult,
  isLoopState,
  isTurnResult,
} from "./agent-loop.zod.js";

// ============================================
// EXPORT SCHEMAS
// ============================================

export {
  // API schemas
  StopReasonSchema,
  CacheCreationSchema,
  UsageMetricsSchema,
  MediaTypeSchema,
  CacheTTLSchema,
  CacheControlSchema,
  TextBlockSchema,
  ImageBlockSchema,
  DocumentBlockSchema,
  ToolUseBlockSchema,
  ToolResultBlockSchema,
  ThinkingBlockSchema,
  RedactedThinkingBlockSchema,
  ContentBlockSchema,
  APIResponseSchema,
  APIRequestSchema,
  StreamingEventSchema,
  DeltaTypeSchema,
  OAuthConfigSchema,
  BackendTypeSchema,
  BackendConfigSchema,
  RateLimitConfigSchema,
  UserAgentComponentsSchema,
  BetaHeadersSchema,
  ApiKeyHelperConfigSchema,
  MessageRoleSchema,
  MessageSchema,
  SystemBlockSchema,
  JSONSchemaSchema,
  APIToolSchema,
  APIToolChoiceSchema,
  ThinkingConfigSchema,
  CacheConfigSchema,
  APICacheMetricsSchema,
  // Cache metrics extended
  CacheMetricsSchema,
  // Effort levels
  EffortLevelSchema,
  EffortLevelConfigSchema,
  // Extended thinking
  ExtendedThinkingConfigSchema,
  ModelThinkingSupportSchema,
  // API constants
  DEFAULT_CACHE_CONFIG,
  DEFAULT_THINKING_CONFIG,
  EFFORT_LEVEL_CONFIGS,
  EFFORT_TO_BUDGET,
  MODEL_THINKING_SUPPORT,
  THINKING_BETA_HEADERS,
  calculateBudgetTokens,
  supportsExtendedThinking,
  // Query metrics and git status
  QueryMetricsSchema,
  GitStatusSchema,
  // JSON Schema for tools (from tools.zod.ts)
  JSONSchemaDefinitionSchema,
  SchemaPropertySchema,
  // Skill system
  SkillDefinitionSchema,
  // Teammate system (using enhanced schemas from teammates.zod.ts)
  TeammateStatusAltSchema as TeammateStatusSchema,
  TeammateAltSchema as TeammateSchema,
  TeamAltSchema as TeamSchema,
  TeammateMessageAltSchema as TeammateMessageSchema,
  CoordinationSettingsAltSchema as CoordinationSettingsSchema,
  // Claude Code parity - Agent types and tool restrictions
  AgentTypeAltSchema as AgentTypeSchema,
  ToolRestrictionsAltSchema as ToolRestrictionsSchema,
  TeammateWorktreeConfigSchema,
  // Type guards for teammates
  isTeammateStatus,
  isTeammate,
  isTeam,
  isTeammateMessage,
  isCoordinationSettings,
  // Model schemas
  KnownClaudeModelSchema,
  ClaudeModelSchema,
  ContextWindowsSchema,
  MaxOutputTokensSchema,
  ModelTierSchema,
  ModelDefinitionSchema,
  VertexRegionMappingSchema,
  ExtendedThinkingFeaturesSchema,
  ExtendedThinkingSettingsSchema,
  ModelPricingSchema,
  ModelPricingRegistrySchema,
  CostCalculationInputSchema,
  // Agent schemas
  AgentTypeDefinitionSchema,
  SessionTypeSchema,
  SessionTypeDefinitionSchema,
  SessionSourceSchema,
  SessionIdentifierSchema,
  SessionStatusSchema,
  SessionStateSchema,
  AgentCapabilitiesSchema,
  PartialAgentCapabilitiesSchema,
  AgentConfigSchema,
  AgentStatusSchema,
  AgentLifecycleEventTypeSchema,
  AgentLifecycleEventSchema,
  // Permission schemas
  PermissionModeSchema,
  PermissionModeDefinitionSchema,
  PermissionDecisionSchema,
  PermissionPromptDecisionSchema,
  RiskLevelSchema,
  PermissionRequestSchema,
  PermissionResponseSchema,
  PermissionResultSchema,
  PermissionCacheEntrySchema,
  PermissionCacheSchema,
  ToolFilteringConfigSchema,
  PermissionToolChoiceSchema,
  RiskAssessmentSchema,
  // MCP schemas
  MCPProtocolVersionSchema,
  TransportTypeSchema,
  MCPServerConfigSchema,
  MCPServerManagementSchema,
  JSONRPCErrorSchema,
  JSONRPCRequestSchema,
  JSONRPCResponseSchema,
  JSONRPCNotificationSchema,
  MCPPropertySchema,
  MCPInputSchemaSchema,
  MCPToolSchema,
  ToolListRequestSchema,
  ToolListResponseSchema,
  ToolCallRequestSchema,
  MCPResourceSchema,
  MCPContentSchema,
  ToolCallResponseSchema,
  // Hook schemas
  HookTypeSchema,
  HookEventSchema,
  ExtendedHookEventSchema,
  HookMatcherTypeSchema,
  HookExecutionConfigSchema,
  DEFAULT_HOOK_EXECUTION_SCHEMA,
  HookDefinitionSchema,
  HookConfigSchema,
  HookInputSchema,
  HookDecisionSchema,
  HookOutputSchema,
  HookExitCodeSchema,
  // Slash command schemas
  SlashCommandSchema,
  SlashCommandRegistrySchema,
  ParsedCommandSchema,
  CommandCategorySchema,
  CommandCategoriesSchema,
  BuiltInCommandsArraySchema,
  SlashCommandNameSchema,
  SkillsAPIConfigSchema,
  // Tool schemas
  ToolCategorySchema,
  ToolParameterTypeSchema,
  ToolParameterSchema,
  BuiltInToolSchema,
  BuiltInToolsArraySchema,
  ToolExecutionConfigSchema,
  DEFAULT_TOOL_EXECUTION_SCHEMA,
  ToolContextSchema,
  ToolInputSchemaDefinitionSchema,
  ToolDefinitionSchema,
  OutputModeSchema,
  ToolResultSchema,
  BACKGROUND_TASK_TOOLS_SCHEMA,

  // ============================================
  // NEW SCHEMA EXPORTS (25 new files)
  // ============================================

  // Abort schemas
  AbortControllerConfigSchema,
  ProcessSignalNameSchema,
  ProcessSignalConfigSchema,
  PROCESS_SIGNALS_SCHEMA,
  CleanupBehaviorSchema,
  OrphanDetectionConfigSchema,
  MCPCancelNotificationSchema,
  MCPRequestCancellationConfigSchema,
  TaskStatusSchema,
  TaskCancellationFlowSchema,
  ControlRequestInterruptSchema,
  StdinRawModeConfigSchema,
  CancellationErrorConfigSchema,
  RetryWithAbortConfigSchema,
  RetryDecisionSchema,
  ChildProcessCleanupResultSchema,
  WeakRefCleanupSchema,

  // Changelog schemas
  VersionInfoSchema,
  SlashCommandChangeSchema,
  ApiFeatureChangeSchema,
  EnvironmentVariableChangeSchema,
  BinaryStructureSchema,
  VersionChangesSchema,
  BinaryFormatSchema,
  ChangelogBetaHeadersSchema,
  VersionHistorySchema,

  // Chrome bridge schemas
  ChromeBridgeFeaturesSchema,
  ChromeBridgeToolNameSchema,
  ChromeBridgeToolSchema,
  ChromeConnectionEventNameSchema,
  ChromeConnectionEventSchema,
  ChromeBridgeAuthenticationSchema,
  ChromeBridgeMessageTypeSchema,
  ChromeBridgeMessageSchema,
  ChromeBridgeReconnectConfigSchema,
  TabContextSchema,
  TabsContextResultSchema,
  ScreenshotOptionsSchema,
  ScreenshotResultSchema,
  ConsoleLogEntrySchema,
  NetworkRequestEntrySchema,

  // Compaction schemas
  ContextWindowSizeTypeSchema,
  CompactionContextWindowSizesSchema,
  TokenThresholdsSchema,
  ThresholdCheckResultSchema,
  CompactionTriggerSchema,
  CompactionConditionsSchema,
  CompactionStepSchema,
  CompactionOptionsSchema,
  CompactionResultSchema,
  SummaryPromptConfigSchema,
  CompactionEnvConfigSchema,
  // New compaction types
  LLMSummarizationOptionsSchema,
  AgentLoopCompactionOptionsSchema,
  ContextCompactionOptionsSchema,
  AgentLoopCompactionResultSchema,
  ContextCompactionResultSchema,

  // Context schemas
  ContextDefaultsSchema,
  ContextWindowConfigSchema,
  TokenUsageSchema,
  TokenCounterSchema,
  CompressionTriggerSchema,
  CompressionBehaviorSchema,
  CompressionConfigSchema,
  ContinuationSummarySchema,
  ContinuationSummaryConfigSchema,
  ContextFunctionsSchema,
  GitStatusSnapshotSchema,
  ContextGitStatusSchema,
  FileHistoryEntrySchema,
  ContextSnapshotSchema,
  QueryUsageSchema,
  ContextQueryMetricsSchema,

  // Cost schemas
  ModelUsageSchema,
  CostTrackingStateSchema,
  ModelPricingConfigSchema,
  UsageForCostSchema,
  CostCacheMetricsSchema,
  CostDisplayConfigSchema,
  CostEffortLevelSchema,
  EffortGuidanceSchema,

  // Environment schemas
  CoreEnvironmentVariablesSchema,
  DebuggingEnvironmentVariablesSchema,
  BackendEnvironmentVariablesSchema,
  ContextEnvironmentVariablesSchema,
  PluginEnvironmentVariablesSchema,
  RemoteEnvironmentVariablesSchema,
  GitEnvironmentVariablesSchema,
  OAuthEnvironmentVariablesSchema,
  AgentSdkEnvironmentVariablesSchema,
  TelemetryEnvironmentVariablesSchema,
  MemoryEnvironmentVariablesSchema,
  ClaudeCodeEnvironmentSchema,
  EnvironmentVariableMetadataSchema,

  // Error handling schemas
  AnthropicErrorCodeSchema,
  AnthropicErrorSchema,
  APIErrorConfigSchema,
  InternalErrorConfigSchema,
  StatusCodeRetryConfigSchema,
  ExponentialBackoffConfigSchema,
  RetryAfterHeaderSchema,
  RetryFlowConfigSchema,
  RetryResultSchema,
  ErrorClassificationSchema,
  ErrorClassificationConfigSchema,
  ErrorContextSchema,
  SpecialErrorConfigSchema,

  // Extended thinking schemas (alt)
  ExtendedThinkingConfigAltSchema,
  ExtendedThinkingFeaturesAltSchema,
  ExtendedThinkingSettingsAltSchema,
  ModelThinkingSupportAltSchema,
  ThinkingBetaHeadersSchema,

  // Image schemas
  ImageMediaTypeSchema,
  ImageSourceSchema,
  ImageBlockAltSchema,
  ImageProcessingConfigSchema,
  ImageProcessingResultSchema,
  ImageValidationConfigSchema,
  ImageValidationResultSchema,
  ImageCaptureConfigSchema,

  // Memory schemas
  MemoryConfigSchema,
  MemoryFileSchema,
  MemoryEntrySchema,
  MemoryStoreSchema,
  AutoMemorySettingsSchema,
  MemoryOperationSchema,
  MemoryOperationResultSchema,

  // Model selection schemas
  ModelSelectionTierSchema,
  ModelCapabilitySchema,
  ModelSelectionCriteriaSchema,
  ModelSelectionResultSchema,
  ModelAvailabilitySchema,
  ModelSelectionGuidanceSchema,

  // Native module schemas
  NativeModuleNameSchema,
  NativeModuleCapabilitySchema,
  GrepMatchSchema,
  GrepResultSchema,
  HashAlgorithmSchema,
  HashResultSchema,
  NativeHighlightLanguageSchema as HighlightLanguageSchema,
  NativeHighlightResultSchema as NativeHighlightResultSchema,
  TokenCountResultSchema,
  DiffHunkSchema,
  DiffResultSchema,
  MultiEditOperationSchema,
  NativeMultiEditResultSchema as NativeMultiEditResultSchema,
  // New native types
  HighlightDiffResultSchema,
  DiffOptionsSchema,
  MultiEditEntrySchema,
  MultiEditPreviewEntrySchema,
  OHLCVSchema,
  AMMStateSchema,
  AMMCostResultSchema,
  AMMPriceImpactResultSchema,
  LMSRPriceResultSchema,
  ArbitrageResultSchema,
  OddsConversionSchema,
  VaRResultSchema,
  DrawdownResultSchema,
  SharpeResultSchema,
  KeyEventKindSchema,
  NativeKeyEventSchema,
  TuiMessageSchema,
  TuiStateSchema,
  InputResultSchema,
  GrepSearchResultSchema,
  GrepOptionsSchema,

  // Permission mode schemas (alt)
  PermissionModeAltSchema,
  PermissionModeConfigSchema,
  PermissionModeTransitionSchema,

  // Plan mode schemas
  PlanModeSchema,
  PlanModeConfigSchema,
  PlanStepSchema,
  PlanSchema,
  PlanApprovalRequestSchema,
  PlanApprovalResultSchema,
  PlanGenerationOptionsSchema,

  // Settings schemas
  SettingsFilePathSchema,
  SettingsHookEventSchema,
  SettingsHookConfigSchema,
  ConfigSettingsSchema,
  KeybindingSchema,
  KeybindingsConfigSchema,

  // Skills schemas (alt)
  SkillDefinitionAltSchema,
  SkillRegistrySchema,
  SkillExecutionContextSchema,
  SkillExecutionResultSchema,

  // Streaming schemas
  StreamingEventTypeSchema,
  StreamingEventAltSchema,
  StreamingDeltaTypeSchema,
  TextDeltaSchema,
  InputJsonDeltaSchema,
  ThinkingDeltaSchema,
  StreamingConfigSchema,
  StreamingStateSchema,
  StreamOptionsSchema,
  StreamResultSchema,

  // Checkpoint schemas
  FileReferenceSchema,
  GitStateSchema,
  CheckpointMetadataSchema,
  CheckpointSchema,
  CheckpointStoreSchema,

  // CLAUDE.md schemas
  EnvironmentInfoSchema,
  GitStatusInfoSchema,
  ToolsInfoSchema,
  SystemSignatureSchema,
  ClaudeMdConfigSchema,
  ClaudeMdResultSchema,
  DEFAULT_CLAUDE_MD_CONFIG,

  // Config schemas
  ClaudeMainConfigSchema,
  ProjectConfigSchema,
  SettingsConfigSchema,
  HookMatcherConfigSchema,
  KeybindingConfigSchema,
  LoadedConfigSchema,

  // Retry schemas
  RetryOptionsSchema,
  DEFAULT_RETRY_OPTIONS,

  // System reminder schemas
  TokenWarningOptionsSchema,
  CostUpdateOptionsSchema,
  ToolSummaryOptionsSchema,
  EnvInfoOptionsSchema,
  SystemReminderConfigSchema,
  CombinedReminderOptionsSchema,
  DEFAULT_REMINDER_CONFIG,

  // UI schemas
  MessageSubTypeSchema,
  UIMessageSchema,
  StatusLineOptionsSchema,
  ContextInfoSchema,
  TerminalSizeSchema,
  UseTerminalSizeOptionsSchema,
  MessageAreaPropsSchema,
  StatusBarPropsSchema,
  InputFieldPropsSchema,
  TerminalLayoutSchema,
  SessionInfoSchema,
  CLIArgsSchema,
  LoadingStateDataSchema,
  LoadingStateEventsSchema,
  QueryOptionsSchema,

  // Syntax schemas
  SyntaxLanguageSchema,
  SyntaxTokenKindSchema,
  SyntaxTokenSchema,
  SyntaxHighlightResultSchema,
  SyntaxHighlightConfigSchema,

  // Teammates schemas (alt)
  TeammateStatusAltSchema,
  TeammateAltSchema,
  TeamAltSchema,
  TeammateMessageAltSchema,
  CoordinationSettingsAltSchema,

  // Telemetry schemas
  TelemetryConfigSchema,
  TelemetryEventTypeSchema,
  TelemetryEventSchema,
  TelemetryMetricsSchema,

  // Todo list schemas
  TodoStatusSchema,
  TodoPrioritySchema,
  TodoItemSchema,
  TodoListSchema,
  TodoOperationSchema,
  TodoOperationResultSchema,

  // TUI bridge schemas
  TUISessionStateSchema,
  TUISessionSchema,
  TUIInputKeySchema,
  TUIInputMouseSchema,
  TUIOutputSchema,
  ANSI_ESCAPE_CODES,

  // Voice schemas
  VoiceConfigSchema,
  VoiceInputResultSchema,
  VoiceOutputConfigSchema,

  // Web search/fetch schemas
  WebSearchConfigSchema,
  WebSearchResultSchema,
  WebFetchConfigSchema,
  WebFetchResultSchema,
  WebContentTypeSchema,
  WebContentOptionsSchema,

  // Worktree schemas
  WorktreeConfigSchema,
  WorktreeInfoSchema,
  WorktreeListSchema,
  WorktreeOperationSchema,
  WorktreeOperationResultSchema,
  WorktreeSessionSchema,

  // Session schemas
  SessionMetadataSchema,
  SessionMessageSchema,
  SessionToolUseSchema,
  SessionMetricsSchema,
  SessionContextSchema,
  SessionCheckpointSchema,
  SessionEntrySchema,
  LoadedSessionSchema,
  SessionSummarySchema,
  SessionFilterSchema,
  SessionEventTypeSchema,
  SessionEventSchema,
  ExportFormatSchema,

  // Agent Loop schemas
  AgentLoopOptionsSchema,
  AgentLoopResultSchema,
  LoopStateSchema,
  TurnOptionsSchema,
  TurnResultSchema,
  ToolExecutionOptionsSchema,

  // Re-export zod
  z,
};

// ============================================
// EXPORT TYPE GUARDS
// ============================================

export {
  isTextBlock,
  isImageBlock,
  isDocumentBlock,
  isToolUseBlock,
  isToolResultBlock,
  isThinkingBlock,
  isRedactedThinkingBlock,
  isContentBlock,
  isAPIResponse,
  isAPIRequest,
  isUsageMetrics,
  isValidUsageMetrics,
  isMessage,
  isOAuthConfig,
  isBackendConfig,
  isRateLimitConfig,
  isCacheConfig,
  isAPICacheMetrics,
  isCacheMetrics,
  isEffortLevel,
  isExtendedThinkingConfig,
  isModelThinkingSupport,
  isClaudeModel,
  isKnownClaudeModel,
  isModelTier,
  isModelDefinition,
  isVertexRegionMapping,
  isModelPricing,
  isExtendedThinkingFeatures,
  isExtendedThinkingSettings,
  isCostCalculationInput,
  isValidModelId,
  isValidModelTier,
  isValidModelDefinition,
  isValidPricing,
  isAgentTypeDefinition,
  isSessionType,
  isSessionTypeDefinition,
  isSessionSource,
  isSessionIdentifier,
  isSessionStatus,
  isSessionState,
  isAgentCapabilities,
  isAgentConfig,
  isAgentStatus,
  isAgentLifecycleEvent,
  isValidSessionType,
  isValidSessionSource,
  isValidAgentConfig,
  isValidAgentCapabilities,
  isValidPermissionMode,
  isValidPermissionRequest,
  isValidPermissionResponse,
  isValidRiskLevel,
  isValidTransportType,
  isValidMCPServerConfig,
  isValidJSONRPCRequest,
  isValidJSONRPCResponse,
  isValidMCPTool,
  isValidToolCallRequest,
  isValidToolCallResponse,
  MCP_PROTOCOL_VERSION,
  MCP_TOOL_METHODS,
  MCP_RESOURCE_METHODS,
  MCP_PROMPT_METHODS,
  MCP_SAMPLING_METHODS,
  MCPMethods,
  MCPConfigKeys,
  TRANSPORT_TYPES,
  formatMCPToolName,
  isMCPToolName,
  parseMCPToolName,
  parseMCPToolNameSchema,
  isValidHookType,
  isValidHookEvent,
  isValidExtendedHookEvent,
  isValidHookMatcherType,
  isValidHookDefinition,
  isValidHookInput,
  isValidHookOutput,
  isValidHookConfig,
  isValidHookExitCode,
  isValidSlashCommand,
  isValidParsedCommand,
  isValidCommandCategory,
  isValidSkillsAPIConfig,
  isSlashCommandInput,
  parseSlashCommandSchema,
  isValidSlashCommandName,
  isValidToolCategory,
  isValidToolParameter,
  isValidBuiltInTool,
  isValidToolExecutionConfig,
  isValidToolDefinition,
  isValidToolResult,
  isValidOutputMode,
  isValidToolContext,
  isBuiltInToolName,
  supportsBackgroundExecution,
  // New type guards from api.zod.js
  isQueryMetrics,
  isGitStatus,
  isJSONSchema,
  isSchemaProperty,
  isSkillDefinition,
  // Teammate type guards (imported from teammates.zod.ts)
  // isTeammateStatus, isTeammate, isTeam, isTeammateMessage, isCoordinationSettings are exported separately
  // Session type guards
  isSessionMetadata,
  isSessionToolUse,
  isSessionEvent,
  isLoadedSession,
  isSessionSummary,
  // Agent Loop type guards
  isAgentLoopResult,
  isLoopState,
  isTurnResult,
};

// ============================================
// EXPORT UTILITIES
// ============================================

export {
  validateModelRegistry,
  validatePricingRegistry,
  validateVertexRegionMappings,
  hasExtendedContext,
  getBaseModelId,
  isValidModelIdFormat,
  validateAgentTypesRegistry,
  validateSessionTypesRegistry,
  canSpawnSubagents,
  getToolsForAgentType,
  isTerminalSessionStatus,
  isActiveAgentStatus,
};

// ============================================
// INFERRED TYPES (Single source of truth)
// ============================================

// API Types
export type StopReason = z.infer<typeof StopReasonSchema>;
export type CacheCreation = z.infer<typeof CacheCreationSchema>;
export type UsageMetrics = z.infer<typeof UsageMetricsSchema>;
export type MediaType = z.infer<typeof MediaTypeSchema>;
export type CacheTTL = z.infer<typeof CacheTTLSchema>;
export type CacheControl = z.infer<typeof CacheControlSchema>;
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type ImageBlock = z.infer<typeof ImageBlockSchema>;
export type DocumentBlock = z.infer<typeof DocumentBlockSchema>;
export type ToolUseBlock = z.infer<typeof ToolUseBlockSchema>;
export type ToolResultBlock = z.infer<typeof ToolResultBlockSchema>;
export type ThinkingBlock = z.infer<typeof ThinkingBlockSchema>;
export type RedactedThinkingBlock = z.infer<typeof RedactedThinkingBlockSchema>;
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type APIResponse = z.infer<typeof APIResponseSchema>;
export type APIRequest = z.infer<typeof APIRequestSchema>;
export type StreamingEvent = z.infer<typeof StreamingEventSchema>;
export type DeltaType = z.infer<typeof DeltaTypeSchema>;
export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;
export type BackendType = z.infer<typeof BackendTypeSchema>;
export type BackendConfig = z.infer<typeof BackendConfigSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type UserAgentComponents = z.infer<typeof UserAgentComponentsSchema>;
export type BetaHeaders = z.infer<typeof BetaHeadersSchema>;
export type ApiKeyHelperConfig = z.infer<typeof ApiKeyHelperConfigSchema>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type SystemBlock = z.infer<typeof SystemBlockSchema>;
export type APITool = z.infer<typeof APIToolSchema>;
export type APIToolChoice = z.infer<typeof APIToolChoiceSchema>;
export type ThinkingConfig = z.infer<typeof ThinkingConfigSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type APICacheMetrics = z.infer<typeof APICacheMetricsSchema>;

// Extended Cache Metrics
export type CacheMetrics = z.infer<typeof CacheMetricsSchema>;
export type EffortLevel = z.infer<typeof EffortLevelSchema>;
export type EffortLevelConfig = z.infer<typeof EffortLevelConfigSchema>;
export type ExtendedThinkingConfig = z.infer<typeof ExtendedThinkingConfigSchema>;
export type ModelThinkingSupport = z.infer<typeof ModelThinkingSupportSchema>;

// Query Metrics & Git Status
export type QueryMetrics = z.infer<typeof QueryMetricsSchema>;
export type GitStatus = z.infer<typeof GitStatusSchema>;

// JSON Schema types
// JSONSchema = API tool schema format (from api.zod.ts)
export type JSONSchema = z.infer<typeof JSONSchemaSchema>;
// JSONSchemaType = alias for JSONSchema (backward compat)
export type JSONSchemaType = z.infer<typeof JSONSchemaSchema>;
// JSONSchemaDefinition = Tool definition schema format (from tools.zod.ts)
export type JSONSchemaDefinition = z.infer<typeof JSONSchemaDefinitionSchema>;
export type SchemaProperty = z.infer<typeof SchemaPropertySchema>;

// Skill & Teammate types
export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>;
export type TeammateStatus = z.infer<typeof TeammateStatusAltSchema>;
export type Teammate = z.infer<typeof TeammateAltSchema>;
export type Team = z.infer<typeof TeamAltSchema>;
export type TeammateMessage = z.infer<typeof TeammateMessageAltSchema>;
export type CoordinationSettings = z.infer<typeof CoordinationSettingsAltSchema>;

// Claude Code parity - Agent types and tool restrictions
export type AgentType = z.infer<typeof AgentTypeAltSchema>;
export type ToolRestrictions = z.infer<typeof ToolRestrictionsAltSchema>;
// Note: WorktreeConfig is also exported from worktree.zod.ts, so we use TeammateWorktreeConfigSchema for the teammate-specific one
export type TeammateWorktreeConfig = z.infer<typeof TeammateWorktreeConfigSchema>;

// Model Types
export type KnownClaudeModel = z.infer<typeof KnownClaudeModelSchema>;
export type ClaudeModel = z.infer<typeof ClaudeModelSchema>;
export type ContextWindows = z.infer<typeof ContextWindowsSchema>;
export type MaxOutputTokens = z.infer<typeof MaxOutputTokensSchema>;
export type ModelTier = z.infer<typeof ModelTierSchema>;
export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;
export type VertexRegionMapping = z.infer<typeof VertexRegionMappingSchema>;
export type ExtendedThinkingFeatures = z.infer<typeof ExtendedThinkingFeaturesSchema>;
export type ExtendedThinkingSettings = z.infer<typeof ExtendedThinkingSettingsSchema>;
export type ModelPricing = z.infer<typeof ModelPricingSchema>;
export type ModelPricingRegistry = z.infer<typeof ModelPricingRegistrySchema>;
export type CostCalculationInput = z.infer<typeof CostCalculationInputSchema>;

// Agent Types
export type AgentTypeDefinition = z.infer<typeof AgentTypeDefinitionSchema>;
export type SessionType = z.infer<typeof SessionTypeSchema>;
export type SessionTypeDefinition = z.infer<typeof SessionTypeDefinitionSchema>;
export type SessionSource = z.infer<typeof SessionSourceSchema>;
export type SessionIdentifier = z.infer<typeof SessionIdentifierSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;
export type PartialAgentCapabilities = z.infer<typeof PartialAgentCapabilitiesSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type AgentLifecycleEventType = z.infer<typeof AgentLifecycleEventTypeSchema>;
export type AgentLifecycleEvent = z.infer<typeof AgentLifecycleEventSchema>;

// Permission Types
export type PermissionMode = z.infer<typeof PermissionModeSchema>;
export type PermissionModeDefinition = z.infer<typeof PermissionModeDefinitionSchema>;
export type PermissionDecision = z.infer<typeof PermissionDecisionSchema>;
export type PermissionPromptDecision = z.infer<typeof PermissionPromptDecisionSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type PermissionRequest = z.infer<typeof PermissionRequestSchema>;
export type PermissionResponse = z.infer<typeof PermissionResponseSchema>;
export type PermissionResult = z.infer<typeof PermissionResultSchema>;
export type PermissionCacheEntry = z.infer<typeof PermissionCacheEntrySchema>;
export type PermissionCache = z.infer<typeof PermissionCacheSchema>;
export type ToolFilteringConfig = z.infer<typeof ToolFilteringConfigSchema>;
export type PermissionToolChoice = z.infer<typeof PermissionToolChoiceSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

// MCP Types
export type MCPProtocolVersion = z.infer<typeof MCPProtocolVersionSchema>;
export type TransportType = z.infer<typeof TransportTypeSchema>;
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type MCPServerManagement = z.infer<typeof MCPServerManagementSchema>;
export type JSONRPCError = z.infer<typeof JSONRPCErrorSchema>;
export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>;
export type JSONRPCResponse = z.infer<typeof JSONRPCResponseSchema>;
export type JSONRPCNotification = z.infer<typeof JSONRPCNotificationSchema>;
export type MCPProperty = z.infer<typeof MCPPropertySchema>;
export type MCPInputSchema = z.infer<typeof MCPInputSchemaSchema>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type ToolListRequest = z.infer<typeof ToolListRequestSchema>;
export type ToolListResponse = z.infer<typeof ToolListResponseSchema>;
export type ToolCallRequest = z.infer<typeof ToolCallRequestSchema>;
export type MCPResource = z.infer<typeof MCPResourceSchema>;
export type MCPContent = z.infer<typeof MCPContentSchema>;
export type ToolCallResponse = z.infer<typeof ToolCallResponseSchema>;

// Hook Types
export type HookType = z.infer<typeof HookTypeSchema>;
export type HookEvent = z.infer<typeof HookEventSchema>;
export type ExtendedHookEvent = z.infer<typeof ExtendedHookEventSchema>;
export type HookMatcherType = z.infer<typeof HookMatcherTypeSchema>;
export type HookExecutionConfig = z.infer<typeof HookExecutionConfigSchema>;
export type HookDefinition = z.infer<typeof HookDefinitionSchema>;
export type HookConfig = z.infer<typeof HookConfigSchema>;
export type HookInput = z.infer<typeof HookInputSchema>;
export type HookDecision = z.infer<typeof HookDecisionSchema>;
export type HookOutput = z.infer<typeof HookOutputSchema>;
export type HookExitCode = z.infer<typeof HookExitCodeSchema>;

// Slash Command Types
export type SlashCommand = z.infer<typeof SlashCommandSchema>;
export type SlashCommandRegistry = z.infer<typeof SlashCommandRegistrySchema>;
export type ParsedCommand = z.infer<typeof ParsedCommandSchema>;
export type CommandCategory = z.infer<typeof CommandCategorySchema>;
export type SkillsAPIConfig = z.infer<typeof SkillsAPIConfigSchema>;

// Tool Types
export type ToolCategory = z.infer<typeof ToolCategorySchema>;
export type ToolParameterType = z.infer<typeof ToolParameterTypeSchema>;
export type ToolParameter = z.infer<typeof ToolParameterSchema>;
export type BuiltInTool = z.infer<typeof BuiltInToolSchema>;
export type ToolExecutionConfig = z.infer<typeof ToolExecutionConfigSchema>;
export type ToolContext = z.infer<typeof ToolContextSchema>;
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
export type OutputMode = z.infer<typeof OutputModeSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;

// ============================================
// NEW TYPE EXPORTS (from 25 new schema files)
// ============================================

// Abort Types
export type AbortControllerConfig = z.infer<typeof AbortControllerConfigSchema>;
export type ProcessSignalName = z.infer<typeof ProcessSignalNameSchema>;
export type ProcessSignalConfig = z.infer<typeof ProcessSignalConfigSchema>;
export type CleanupBehavior = z.infer<typeof CleanupBehaviorSchema>;
export type OrphanDetectionConfig = z.infer<typeof OrphanDetectionConfigSchema>;
export type MCPCancelNotification = z.infer<typeof MCPCancelNotificationSchema>;
export type MCPRequestCancellationConfig = z.infer<typeof MCPRequestCancellationConfigSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskCancellationFlow = z.infer<typeof TaskCancellationFlowSchema>;
export type ControlRequestInterrupt = z.infer<typeof ControlRequestInterruptSchema>;
export type StdinRawModeConfig = z.infer<typeof StdinRawModeConfigSchema>;
export type CancellationErrorConfig = z.infer<typeof CancellationErrorConfigSchema>;
export type RetryWithAbortConfig = z.infer<typeof RetryWithAbortConfigSchema>;
export type RetryDecision = z.infer<typeof RetryDecisionSchema>;
export type ChildProcessCleanupResult = z.infer<typeof ChildProcessCleanupResultSchema>;
export type WeakRefCleanup = z.infer<typeof WeakRefCleanupSchema>;

// Changelog Types
export type VersionInfo = z.infer<typeof VersionInfoSchema>;
export type SlashCommandChange = z.infer<typeof SlashCommandChangeSchema>;
export type ApiFeatureChange = z.infer<typeof ApiFeatureChangeSchema>;
export type EnvironmentVariableChange = z.infer<typeof EnvironmentVariableChangeSchema>;
export type BinaryStructure = z.infer<typeof BinaryStructureSchema>;
export type VersionChanges = z.infer<typeof VersionChangesSchema>;
export type BinaryFormat = z.infer<typeof BinaryFormatSchema>;
export type VersionHistory = z.infer<typeof VersionHistorySchema>;

// Chrome Bridge Types
export type ChromeBridgeFeatures = z.infer<typeof ChromeBridgeFeaturesSchema>;
export type ChromeBridgeToolName = z.infer<typeof ChromeBridgeToolNameSchema>;
export type ChromeBridgeTool = z.infer<typeof ChromeBridgeToolSchema>;
export type ChromeConnectionEventName = z.infer<typeof ChromeConnectionEventNameSchema>;
export type ChromeConnectionEvent = z.infer<typeof ChromeConnectionEventSchema>;
export type ChromeBridgeAuthentication = z.infer<typeof ChromeBridgeAuthenticationSchema>;
export type ChromeBridgeMessageType = z.infer<typeof ChromeBridgeMessageTypeSchema>;
export type ChromeBridgeMessage = z.infer<typeof ChromeBridgeMessageSchema>;
export type ChromeBridgeReconnectConfig = z.infer<typeof ChromeBridgeReconnectConfigSchema>;
export type TabContext = z.infer<typeof TabContextSchema>;
export type TabsContextResult = z.infer<typeof TabsContextResultSchema>;
export type ScreenshotOptions = z.infer<typeof ScreenshotOptionsSchema>;
export type ScreenshotResult = z.infer<typeof ScreenshotResultSchema>;
export type ConsoleLogEntry = z.infer<typeof ConsoleLogEntrySchema>;
export type NetworkRequestEntry = z.infer<typeof NetworkRequestEntrySchema>;

// Compaction Types
export type ContextWindowSizeType = z.infer<typeof ContextWindowSizeTypeSchema>;
export type TokenThresholds = z.infer<typeof TokenThresholdsSchema>;
export type ThresholdCheckResult = z.infer<typeof ThresholdCheckResultSchema>;
export type CompactionTrigger = z.infer<typeof CompactionTriggerSchema>;
export type CompactionConditions = z.infer<typeof CompactionConditionsSchema>;
export type CompactionStep = z.infer<typeof CompactionStepSchema>;
export type CompactionOptions = z.infer<typeof CompactionOptionsSchema>;
export type CompactionResult = z.infer<typeof CompactionResultSchema>;
export type SummaryPromptConfig = z.infer<typeof SummaryPromptConfigSchema>;
export type CompactionEnvConfig = z.infer<typeof CompactionEnvConfigSchema>;
// New compaction types
export type LLMSummarizationOptions = z.infer<typeof LLMSummarizationOptionsSchema>;
export type AgentLoopCompactionOptions = z.infer<typeof AgentLoopCompactionOptionsSchema>;
export type ContextCompactionOptions = z.infer<typeof ContextCompactionOptionsSchema>;
export type AgentLoopCompactionResult = z.infer<typeof AgentLoopCompactionResultSchema>;
export type ContextCompactionResult = z.infer<typeof ContextCompactionResultSchema>;

// Context Types
export type ContextDefaults = z.infer<typeof ContextDefaultsSchema>;
export type ContextWindowConfig = z.infer<typeof ContextWindowConfigSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
export type TokenCounter = z.infer<typeof TokenCounterSchema>;
export type CompressionTrigger = z.infer<typeof CompressionTriggerSchema>;
export type CompressionBehavior = z.infer<typeof CompressionBehaviorSchema>;
export type CompressionConfig = z.infer<typeof CompressionConfigSchema>;
export type ContinuationSummary = z.infer<typeof ContinuationSummarySchema>;
export type ContinuationSummaryConfig = z.infer<typeof ContinuationSummaryConfigSchema>;
export type ContextFunctions = z.infer<typeof ContextFunctionsSchema>;
export type GitStatusSnapshot = z.infer<typeof GitStatusSnapshotSchema>;
export type FileHistoryEntry = z.infer<typeof FileHistoryEntrySchema>;
export type ContextSnapshot = z.infer<typeof ContextSnapshotSchema>;
export type QueryUsage = z.infer<typeof QueryUsageSchema>;

// Cost Types
export type ModelUsage = z.infer<typeof ModelUsageSchema>;
export type CostTrackingState = z.infer<typeof CostTrackingStateSchema>;
export type ModelPricingConfig = z.infer<typeof ModelPricingConfigSchema>;
export type UsageForCost = z.infer<typeof UsageForCostSchema>;
export type CostDisplayConfig = z.infer<typeof CostDisplayConfigSchema>;
export type EffortGuidance = z.infer<typeof EffortGuidanceSchema>;

// Environment Types
export type CoreEnvironmentVariables = z.infer<typeof CoreEnvironmentVariablesSchema>;
export type DebuggingEnvironmentVariables = z.infer<typeof DebuggingEnvironmentVariablesSchema>;
export type BackendEnvironmentVariables = z.infer<typeof BackendEnvironmentVariablesSchema>;
export type ContextEnvironmentVariables = z.infer<typeof ContextEnvironmentVariablesSchema>;
export type PluginEnvironmentVariables = z.infer<typeof PluginEnvironmentVariablesSchema>;
export type RemoteEnvironmentVariables = z.infer<typeof RemoteEnvironmentVariablesSchema>;
export type GitEnvironmentVariables = z.infer<typeof GitEnvironmentVariablesSchema>;
export type OAuthEnvironmentVariables = z.infer<typeof OAuthEnvironmentVariablesSchema>;
export type AgentSdkEnvironmentVariables = z.infer<typeof AgentSdkEnvironmentVariablesSchema>;
export type TelemetryEnvironmentVariables = z.infer<typeof TelemetryEnvironmentVariablesSchema>;
export type MemoryEnvironmentVariables = z.infer<typeof MemoryEnvironmentVariablesSchema>;
export type ClaudeCodeEnvironment = z.infer<typeof ClaudeCodeEnvironmentSchema>;
export type EnvironmentVariableMetadata = z.infer<typeof EnvironmentVariableMetadataSchema>;

// Error Handling Types
export type AnthropicErrorCode = z.infer<typeof AnthropicErrorCodeSchema>;
export type AnthropicError = z.infer<typeof AnthropicErrorSchema>;
export type APIErrorConfig = z.infer<typeof APIErrorConfigSchema>;
export type InternalErrorConfig = z.infer<typeof InternalErrorConfigSchema>;
export type StatusCodeRetryConfig = z.infer<typeof StatusCodeRetryConfigSchema>;
export type ExponentialBackoffConfig = z.infer<typeof ExponentialBackoffConfigSchema>;
export type RetryAfterHeader = z.infer<typeof RetryAfterHeaderSchema>;
export type RetryFlowConfig = z.infer<typeof RetryFlowConfigSchema>;
export type RetryResult<T> = z.infer<typeof RetryResultSchema>;
export type ErrorClassification = z.infer<typeof ErrorClassificationSchema>;
export type ErrorClassificationConfig = z.infer<typeof ErrorClassificationConfigSchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;
export type SpecialErrorConfig = z.infer<typeof SpecialErrorConfigSchema>;

// Extended Thinking Alt Types (ThinkingBlock already exported from api.zod.ts)
export type ThinkingBetaHeaders = z.infer<typeof ThinkingBetaHeadersSchema>;

// Image Types
export type ImageSource = z.infer<typeof ImageSourceSchema>;
export type ImageProcessingConfig = z.infer<typeof ImageProcessingConfigSchema>;
export type ImageProcessingResult = z.infer<typeof ImageProcessingResultSchema>;
export type ImageValidationConfig = z.infer<typeof ImageValidationConfigSchema>;
export type ImageValidationResult = z.infer<typeof ImageValidationResultSchema>;
export type ImageCaptureConfig = z.infer<typeof ImageCaptureConfigSchema>;

// Memory Types
export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;
export type MemoryFile = z.infer<typeof MemoryFileSchema>;
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;
export type MemoryStore = z.infer<typeof MemoryStoreSchema>;
export type AutoMemorySettings = z.infer<typeof AutoMemorySettingsSchema>;
export type MemoryOperation = z.infer<typeof MemoryOperationSchema>;
export type MemoryOperationResult = z.infer<typeof MemoryOperationResultSchema>;

// Model Selection Types
export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;
export type ModelSelectionCriteria = z.infer<typeof ModelSelectionCriteriaSchema>;
export type ModelSelectionResult = z.infer<typeof ModelSelectionResultSchema>;
export type ModelAvailability = z.infer<typeof ModelAvailabilitySchema>;
export type ModelSelectionGuidance = z.infer<typeof ModelSelectionGuidanceSchema>;

// Native Module Types
export type NativeModuleName = z.infer<typeof NativeModuleNameSchema>;
export type NativeModuleCapability = z.infer<typeof NativeModuleCapabilitySchema>;
export type GrepMatch = z.infer<typeof GrepMatchSchema>;
export type GrepResult = z.infer<typeof GrepResultSchema>;
export type HashAlgorithm = z.infer<typeof HashAlgorithmSchema>;
export type HashResult = z.infer<typeof HashResultSchema>;
export type NativeHighlightLanguage = z.infer<typeof NativeHighlightLanguageSchema>;
export type NativeHighlightResult = z.infer<typeof NativeHighlightResultSchema>;
export type TokenCountResult = z.infer<typeof TokenCountResultSchema>;
export type DiffHunk = z.infer<typeof DiffHunkSchema>;
export type DiffResult = z.infer<typeof DiffResultSchema>;
export type MultiEditOperation = z.infer<typeof MultiEditOperationSchema>;
export type NativeMultiEditResult = z.infer<typeof NativeMultiEditResultSchema>;
// New native types
export type HighlightDiffResult = z.infer<typeof HighlightDiffResultSchema>;
export type DiffOptions = z.infer<typeof DiffOptionsSchema>;
export type MultiEditEntry = z.infer<typeof MultiEditEntrySchema>;
export type MultiEditPreviewEntry = z.infer<typeof MultiEditPreviewEntrySchema>;
export type OHLCV = z.infer<typeof OHLCVSchema>;
export type AMMState = z.infer<typeof AMMStateSchema>;
export type AMMCostResult = z.infer<typeof AMMCostResultSchema>;
export type AMMPriceImpactResult = z.infer<typeof AMMPriceImpactResultSchema>;
export type LMSRPriceResult = z.infer<typeof LMSRPriceResultSchema>;
export type ArbitrageResult = z.infer<typeof ArbitrageResultSchema>;
export type OddsConversion = z.infer<typeof OddsConversionSchema>;
export type VaRResult = z.infer<typeof VaRResultSchema>;
export type DrawdownResult = z.infer<typeof DrawdownResultSchema>;
export type SharpeResult = z.infer<typeof SharpeResultSchema>;
export type KeyEventKind = z.infer<typeof KeyEventKindSchema>;
export type NativeKeyEvent = z.infer<typeof NativeKeyEventSchema>;
export type TuiMessage = z.infer<typeof TuiMessageSchema>;
export type TuiState = z.infer<typeof TuiStateSchema>;
export type InputResult = z.infer<typeof InputResultSchema>;
export type GrepSearchResult = z.infer<typeof GrepSearchResultSchema>;
export type GrepOptions = z.infer<typeof GrepOptionsSchema>;

// Permission Mode Types
export type PermissionModeConfig = z.infer<typeof PermissionModeConfigSchema>;
export type PermissionModeTransition = z.infer<typeof PermissionModeTransitionSchema>;

// Plan Mode Types
export type PlanMode = z.infer<typeof PlanModeSchema>;
export type PlanModeConfig = z.infer<typeof PlanModeConfigSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanApprovalRequest = z.infer<typeof PlanApprovalRequestSchema>;
export type PlanApprovalResult = z.infer<typeof PlanApprovalResultSchema>;
export type PlanGenerationOptions = z.infer<typeof PlanGenerationOptionsSchema>;

// Settings Types
export type SettingsFilePath = z.infer<typeof SettingsFilePathSchema>;
export type Settings = z.infer<typeof ConfigSettingsSchema>;
export type Keybinding = z.infer<typeof KeybindingSchema>;
export type KeybindingsConfig = z.infer<typeof KeybindingsConfigSchema>;

// Skills Types
export type SkillRegistry = z.infer<typeof SkillRegistrySchema>;
export type SkillExecutionContext = z.infer<typeof SkillExecutionContextSchema>;
export type SkillExecutionResult = z.infer<typeof SkillExecutionResultSchema>;

// Streaming Types
export type StreamingEventType = z.infer<typeof StreamingEventTypeSchema>;
export type TextDelta = z.infer<typeof TextDeltaSchema>;
export type InputJsonDelta = z.infer<typeof InputJsonDeltaSchema>;
export type ThinkingDelta = z.infer<typeof ThinkingDeltaSchema>;
export type StreamingConfig = z.infer<typeof StreamingConfigSchema>;
export type StreamingState = z.infer<typeof StreamingStateSchema>;
export type StreamOptions = z.infer<typeof StreamOptionsSchema>;
export type StreamResult = z.infer<typeof StreamResultSchema>;

// Checkpoint Types
export type FileReference = z.infer<typeof FileReferenceSchema>;
export type GitState = z.infer<typeof GitStateSchema>;
export type CheckpointMetadata = z.infer<typeof CheckpointMetadataSchema>;
export type Checkpoint = z.infer<typeof CheckpointSchema>;
export type CheckpointStore = z.infer<typeof CheckpointStoreSchema>;

// CLAUDE.md Types
export type EnvironmentInfo = z.infer<typeof EnvironmentInfoSchema>;
export type GitStatusInfo = z.infer<typeof GitStatusInfoSchema>;
export type ToolsInfo = z.infer<typeof ToolsInfoSchema>;
export type SystemSignature = z.infer<typeof SystemSignatureSchema>;
export type ClaudeMdConfig = z.infer<typeof ClaudeMdConfigSchema>;
export type ClaudeMdResult = z.infer<typeof ClaudeMdResultSchema>;

// Config Types
export type ClaudeMainConfig = z.infer<typeof ClaudeMainConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type SettingsConfig = z.infer<typeof SettingsConfigSchema>;
export type HookMatcherConfig = z.infer<typeof HookMatcherConfigSchema>;
export type KeybindingConfig = z.infer<typeof KeybindingConfigSchema>;
export type LoadedConfig = z.infer<typeof LoadedConfigSchema>;

// Retry Types
export type RetryOptions = z.infer<typeof RetryOptionsSchema>;

// System Reminder Types
export type TokenWarningOptions = z.infer<typeof TokenWarningOptionsSchema>;
export type CostUpdateOptions = z.infer<typeof CostUpdateOptionsSchema>;
export type ToolSummaryOptions = z.infer<typeof ToolSummaryOptionsSchema>;
export type EnvInfoOptions = z.infer<typeof EnvInfoOptionsSchema>;
export type SystemReminderConfig = z.infer<typeof SystemReminderConfigSchema>;
export type CombinedReminderOptions = z.infer<typeof CombinedReminderOptionsSchema>;

// UI Types
export type MessageSubType = z.infer<typeof MessageSubTypeSchema>;
export type UIMessage = z.infer<typeof UIMessageSchema>;
export type StatusLineOptions = z.infer<typeof StatusLineOptionsSchema>;
export type ContextInfo = z.infer<typeof ContextInfoSchema>;
export type TerminalSize = z.infer<typeof TerminalSizeSchema>;
export type UseTerminalSizeOptions = z.infer<typeof UseTerminalSizeOptionsSchema>;
export type MessageAreaProps = z.infer<typeof MessageAreaPropsSchema>;
export type StatusBarProps = z.infer<typeof StatusBarPropsSchema>;
export type InputFieldProps = z.infer<typeof InputFieldPropsSchema>;
export type TerminalLayout = z.infer<typeof TerminalLayoutSchema>;
export type SessionInfo = z.infer<typeof SessionInfoSchema>;
export type CLIArgs = z.infer<typeof CLIArgsSchema>;
export type LoadingStateData = z.infer<typeof LoadingStateDataSchema>;
export type LoadingStateEvents = z.infer<typeof LoadingStateEventsSchema>;
export type QueryOptions = z.infer<typeof QueryOptionsSchema>;
export type BufferedMessage = z.infer<typeof BufferedMessageSchema>;
export type SuppressOptions = z.infer<typeof SuppressOptionsSchema>;
export type SpinnerOptions = z.infer<typeof SpinnerOptionsSchema>;
export type SpinnerState = z.infer<typeof SpinnerStateSchema>;
export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;
export type InputHistoryOptions = z.infer<typeof InputHistoryOptionsSchema>;

// Syntax Types
export type SyntaxLanguage = z.infer<typeof SyntaxLanguageSchema>;
export type SyntaxTokenKind = z.infer<typeof SyntaxTokenKindSchema>;
export type SyntaxToken = z.infer<typeof SyntaxTokenSchema>;
export type SyntaxHighlightResult = z.infer<typeof SyntaxHighlightResultSchema>;
export type SyntaxHighlightConfig = z.infer<typeof SyntaxHighlightConfigSchema>;

// Telemetry Types
export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema>;
export type TelemetryEventType = z.infer<typeof TelemetryEventTypeSchema>;
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
export type TelemetryMetrics = z.infer<typeof TelemetryMetricsSchema>;

// Todo List Types
export type TodoStatus = z.infer<typeof TodoStatusSchema>;
export type TodoPriority = z.infer<typeof TodoPrioritySchema>;
export type TodoItem = z.infer<typeof TodoItemSchema>;
export type TodoList = z.infer<typeof TodoListSchema>;
export type TodoOperation = z.infer<typeof TodoOperationSchema>;
export type TodoOperationResult = z.infer<typeof TodoOperationResultSchema>;

// TUI Bridge Types
export type TUISessionState = z.infer<typeof TUISessionStateSchema>;
export type TUISession = z.infer<typeof TUISessionSchema>;
export type TUIInputKey = z.infer<typeof TUIInputKeySchema>;
export type TUIInputMouse = z.infer<typeof TUIInputMouseSchema>;
export type TUIOutput = z.infer<typeof TUIOutputSchema>;

// Voice Types
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;
export type VoiceInputResult = z.infer<typeof VoiceInputResultSchema>;
export type VoiceOutputConfig = z.infer<typeof VoiceOutputConfigSchema>;

// Web Search/Fetch Types
export type WebSearchConfig = z.infer<typeof WebSearchConfigSchema>;
export type WebSearchResult = z.infer<typeof WebSearchResultSchema>;
export type WebFetchConfig = z.infer<typeof WebFetchConfigSchema>;
export type WebFetchResult = z.infer<typeof WebFetchResultSchema>;
export type WebContentType = z.infer<typeof WebContentTypeSchema>;
export type WebContentOptions = z.infer<typeof WebContentOptionsSchema>;

// Worktree Types
export type WorktreeConfig = z.infer<typeof WorktreeConfigSchema>;
export type WorktreeInfo = z.infer<typeof WorktreeInfoSchema>;
export type WorktreeList = z.infer<typeof WorktreeListSchema>;
export type WorktreeOperation = z.infer<typeof WorktreeOperationSchema>;
export type WorktreeOperationResult = z.infer<typeof WorktreeOperationResultSchema>;
export type WorktreeSession = z.infer<typeof WorktreeSessionSchema>;

// Session types
export type SessionMetadata = z.infer<typeof SessionMetadataSchema>;
export type SessionMessage = z.infer<typeof SessionMessageSchema>;
export type SessionToolUse = z.infer<typeof SessionToolUseSchema>;
export type SessionMetrics = z.infer<typeof SessionMetricsSchema>;
export type SessionContext = z.infer<typeof SessionContextSchema>;
export type SessionCheckpoint = z.infer<typeof SessionCheckpointSchema>;
export type SessionEntry = z.infer<typeof SessionEntrySchema>;
export type LoadedSession = z.infer<typeof LoadedSessionSchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type SessionFilter = z.infer<typeof SessionFilterSchema>;
export type SessionEventType = z.infer<typeof SessionEventTypeSchema>;
export type SessionEvent = z.infer<typeof SessionEventSchema>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

// Agent Loop types
export type AgentLoopOptions = z.infer<typeof AgentLoopOptionsSchema>;
export type AgentLoopResult = z.infer<typeof AgentLoopResultSchema>;
export type LoopState = z.infer<typeof LoopStateSchema>;
export type TurnOptions = z.infer<typeof TurnOptionsSchema>;
export type TurnResult = z.infer<typeof TurnResultSchema>;
export type ToolExecutionOptions = z.infer<typeof ToolExecutionOptionsSchema>;

