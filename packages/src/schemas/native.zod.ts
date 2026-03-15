/**
 * Native Module Schemas
 * Zod schemas for native module interfaces
 */

import { z } from "zod";

// ============================================
// NATIVE MODULE SCHEMAS
// ============================================

export const NativeModuleNameSchema = z.enum([
  "grep",
  "hash",
  "highlight",
  "tokens",
  "diff",
  "compact",
  "structure",
  "multi_edit",
  "patterns",
  "tool_pairs",
  "input",
  "tui",
]);

// ============================================
// NATIVE MODULE CAPABILITY SCHEMAS
// ============================================

export const NativeModuleCapabilitySchema = z.object({
  name: NativeModuleNameSchema,
  description: z.string(),
  available: z.boolean(),
  version: z.string().optional(),
  fallbackAvailable: z.boolean(),
});

// ============================================
// HIGHLIGHT RESULT SCHEMAS
// ============================================

export const HighlightLanguageSchema = z.enum([
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "bash",
  "json",
  "yaml",
  "markdown",
  "html",
  "css",
]);

export const HighlightResultSchema = z.object({
  html: z.string(),
  theme: z.string(),
  language: HighlightLanguageSchema.optional(),
  linesOfCode: z.number().optional(),
});

export const HighlightDiffResultSchema = z.object({
  output: z.string(),
  additions: z.number(),
  deletions: z.number(),
  hunks: z.number(),
});

export const DiffOptionsSchema = z.object({
  file_path: z.string().optional(),
  context_lines: z.number().optional(),
});

// ============================================
// GREP RESULT SCHEMAS
// ============================================

export const GrepMatchSchema = z.object({
  path: z.string(),
  line: z.number(),
  column: z.number().optional(),
  text: z.string(),
  context: z.object({
    before: z.array(z.string()).optional(),
    after: z.array(z.string()).optional(),
  }).optional(),
});

export const GrepResultSchema = z.object({
  matches: z.array(GrepMatchSchema),
  totalMatches: z.number(),
  durationMs: z.number(),
});

export const GrepSearchResultSchema = z.object({
  path: z.string(),
  line_number: z.number(),
  column: z.number().optional(),
  line: z.string(),
  context_before: z.array(z.string()).optional(),
  context_after: z.array(z.string()).optional(),
});

export const GrepOptionsSchema = z.object({
  case_insensitive: z.boolean().optional(),
  max_results: z.number().optional(),
  include_patterns: z.array(z.string()).optional(),
  exclude_patterns: z.array(z.string()).optional(),
  context_lines: z.number().optional(),
  show_line_numbers: z.boolean().optional(),
  show_column: z.boolean().optional(),
});

// ============================================
// HASH RESULT SCHEMAS
// ============================================

export const HashAlgorithmSchema = z.enum(["xxhash3", "sha256"]);

export const HashResultSchema = z.object({
  algorithm: HashAlgorithmSchema,
  hash: z.string(),
  inputSize: z.number(),
  durationMs: z.number(),
});

// ============================================
// TOKEN COUNT RESULT SCHEMAS
// ============================================

export const TokenCountResultSchema = z.object({
  count: z.number(),
  method: z.enum(["exact", "estimated", "cl100k_base"]),
  durationMs: z.number(),
});

// ============================================
// DIFF RESULT SCHEMAS
// ============================================

export const DiffHunkSchema = z.object({
  oldStart: z.number(),
  oldLines: z.number(),
  newStart: z.number(),
  newLines: z.number(),
  content: z.string(),
});

export const DiffResultSchema = z.object({
  hunks: z.array(DiffHunkSchema),
  additions: z.number(),
  deletions: z.number(),
  durationMs: z.number(),
});

// ============================================
// MULTI-EDIT RESULT SCHEMAS
// ============================================

export const MultiEditEntrySchema = z.object({
  filePath: z.string(),
  oldString: z.string(),
  newString: z.string(),
  replaceAll: z.boolean().optional(),
});

export const MultiEditOperationSchema = z.object({
  path: z.string(),
  edits: z.array(z.object({
    oldText: z.string(),
    newText: z.string(),
  })),
});

export const MultiEditResultSchema = z.object({
  success: z.boolean(),
  filesModified: z.array(z.string()),
  totalReplacements: z.number(),
  error: z.string().optional(),
  rolledBack: z.boolean(),
});

export const MultiEditPreviewEntrySchema = z.object({
  filePath: z.string(),
  replacementCount: z.number(),
});

// ============================================
// QUANT TYPES SCHEMAS (Prediction Markets)
// ============================================

export const OHLCVSchema = z.object({
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});

export const AMMStateSchema = z.object({
  pool_yes: z.number(),
  pool_no: z.number(),
  k: z.number(),
  fee: z.number(),
  price_yes: z.number(),
  price_no: z.number(),
});

export const AMMCostResultSchema = z.object({
  cost: z.number(),
  avg_price: z.number(),
});

export const AMMPriceImpactResultSchema = z.object({
  price_before: z.number(),
  price_after: z.number(),
  price_impact: z.number(),
  slippage: z.number(),
});

export const LMSRPriceResultSchema = z.object({
  yes_price: z.number(),
  no_price: z.number(),
  spread: z.number(),
});

export const ArbitrageResultSchema = z.object({
  has_arbitrage: z.boolean(),
  yes_price: z.number(),
  no_price: z.number(),
  total: z.number(),
  profit_per_share: z.number(),
});

export const OddsConversionSchema = z.object({
  probability: z.number(),
  decimal_odds: z.number(),
  american_odds: z.number(),
});

export const VaRResultSchema = z.object({
  var: z.number(),
  cvar: z.number(),
  confidence_level: z.number(),
});

export const DrawdownResultSchema = z.object({
  max_drawdown: z.number(),
  max_duration: z.number(),
  current_drawdown: z.number(),
  recovery_factor: z.number(),
});

export const SharpeResultSchema = z.object({
  sharpe_ratio: z.number(),
  annualized_sharpe: z.number(),
  risk_free_rate: z.number(),
  avg_return: z.number(),
  std_dev: z.number(),
});

// ============================================
// TERMINAL INPUT TYPES SCHEMAS
// ============================================

export const KeyEventKindSchema = z.enum(["press", "release", "repeat"]);

export const NativeKeyEventSchema = z.object({
  code: z.string(),
  is_special: z.boolean(),
  ctrl: z.boolean(),
  alt: z.boolean(),
  shift: z.boolean(),
  kind: KeyEventKindSchema,
});

// ============================================
// NATIVE TUI TYPES SCHEMAS
// ============================================

export const TuiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.number().optional(),
  subType: z.string().optional(),
  toolName: z.string().optional(),
  isError: z.boolean().optional(),
});

export const TuiStateSchema = z.object({
  messages: z.array(TuiMessageSchema),
  inputValue: z.string(),
  cursorPos: z.number(),
  isLoading: z.boolean(),
  spinnerFrame: z.number(),
  model: z.string(),
  tokensUsed: z.number(),
  permissionMode: z.string(),
  streamingText: z.string(),
  scrollOffset: z.number(),
  contextWarning: z.string().optional(),
});

export const InputResultSchema = z.object({
  submitted: z.boolean(),
  text: z.string().optional(),
  exitRequested: z.boolean(),
  command: z.string().optional(),
  scrollUp: z.boolean(),
  scrollDown: z.boolean(),
  inputValue: z.string(),
  cursorPos: z.number(),
  historyNavigated: z.boolean(),
  historyDirection: z.number(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type NativeModuleName = z.infer<typeof NativeModuleNameSchema>;
export type NativeModuleCapability = z.infer<typeof NativeModuleCapabilitySchema>;
export type HighlightLanguage = z.infer<typeof HighlightLanguageSchema>;
export type HighlightResult = z.infer<typeof HighlightResultSchema>;
export type HighlightDiffResult = z.infer<typeof HighlightDiffResultSchema>;
export type DiffOptions = z.infer<typeof DiffOptionsSchema>;
export type GrepMatch = z.infer<typeof GrepMatchSchema>;
export type GrepResult = z.infer<typeof GrepResultSchema>;
export type GrepSearchResult = z.infer<typeof GrepSearchResultSchema>;
export type GrepOptions = z.infer<typeof GrepOptionsSchema>;
export type HashAlgorithm = z.infer<typeof HashAlgorithmSchema>;
export type HashResult = z.infer<typeof HashResultSchema>;
export type TokenCountResult = z.infer<typeof TokenCountResultSchema>;
export type DiffHunk = z.infer<typeof DiffHunkSchema>;
export type DiffResult = z.infer<typeof DiffResultSchema>;
export type MultiEditEntry = z.infer<typeof MultiEditEntrySchema>;
export type MultiEditOperation = z.infer<typeof MultiEditOperationSchema>;
export type MultiEditResult = z.infer<typeof MultiEditResultSchema>;
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
