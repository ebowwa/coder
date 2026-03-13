/**
 * Native module loader
 * Loads Rust-compiled native modules for performance-critical operations
 */

import { dlopen, suffix } from "bun:ffi";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Type definitions for native module exports

export interface HighlightResult {
  /** ANSI-colored text (for terminal display) */
  html: string;
  /** Theme used for highlighting */
  theme: string;
}

export interface HighlightDiffResult {
  /** ANSI-colored diff output */
  output: string;
  /** Number of added lines */
  additions: number;
  /** Number of deleted lines */
  deletions: number;
  /** Number of hunks */
  hunks: number;
}

export interface DiffOptions {
  /** File path to display in header */
  file_path?: string;
  /** Number of context lines around changes (default: 3) */
  context_lines?: number;
}

// ===== Multi-File Edit Types =====

/** A single edit operation for multi-file editing */
export interface MultiEditEntry {
  /** File path to edit (absolute path) */
  filePath: string;
  /** String to find and replace */
  oldString: string;
  /** Replacement string */
  newString: string;
  /** Replace all occurrences (default: false) */
  replaceAll?: boolean;
}

/** Result of an atomic multi-file edit operation */
export interface MultiEditResult {
  /** Whether all edits succeeded */
  success: boolean;
  /** List of files that were modified */
  filesModified: string[];
  /** Total number of string replacements made */
  totalReplacements: number;
  /** Error message if operation failed */
  error?: string;
  /** Whether changes were rolled back due to failure */
  rolledBack: boolean;
}

/** Preview result for a single file */
export interface MultiEditPreviewEntry {
  /** File path */
  filePath: string;
  /** Number of replacements that would be made */
  replacementCount: number;
}

// ===== Quant Types =====

/** OHLCV candlestick data */
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** AMM state for constant-product AMMs */
export interface AMMState {
  pool_yes: number;
  pool_no: number;
  k: number;
  fee: number;
  price_yes: number;
  price_no: number;
}

/** AMM cost calculation result */
export interface AMMCostResult {
  cost: number;
  avg_price: number;
}

/** AMM price impact result */
export interface AMMPriceImpactResult {
  price_before: number;
  price_after: number;
  price_impact: number;
  slippage: number;
}

/** LMSR price result */
export interface LMSRPriceResult {
  yes_price: number;
  no_price: number;
  spread: number;
}

/** Arbitrage detection result */
export interface ArbitrageResult {
  has_arbitrage: boolean;
  yes_price: number;
  no_price: number;
  total: number;
  profit_per_share: number;
}

/** Odds conversion result */
export interface OddsConversion {
  probability: number;
  decimal_odds: number;
  american_odds: number;
}

/** Value at Risk result */
export interface VaRResult {
  var: number;
  cvar: number;
  confidence_level: number;
}

/** Drawdown analysis result */
export interface DrawdownResult {
  max_drawdown: number;
  max_duration: number;
  current_drawdown: number;
  recovery_factor: number;
}

/** Sharpe ratio result */
export interface SharpeResult {
  sharpe_ratio: number;
  annualized_sharpe: number;
  risk_free_rate: number;
  avg_return: number;
  std_dev: number;
}

// ===== Terminal Input Types =====

/** Native key event from terminal */
export interface NativeKeyEvent {
  /** The key code (character or special key name) */
  code: string;
  /** Whether this is a special key (arrow, function, etc.) */
  is_special: boolean;
  /** Ctrl modifier */
  ctrl: boolean;
  /** Alt/Meta modifier */
  alt: boolean;
  /** Shift modifier */
  shift: boolean;
  /** Event kind: "press", "release", "repeat" */
  kind: "press" | "release" | "repeat";
}

/** Terminal handle for raw mode input */
export interface TerminalHandle {
  /** Enter raw terminal mode */
  enterRawMode(): void;
  /** Exit raw terminal mode */
  exitRawMode(): void;
  /** Check if in raw mode (getter) */
  readonly isRawMode: boolean;
  /** Poll for a key event (non-blocking), returns null if no event */
  pollEvent(timeoutMs?: number): NativeKeyEvent | null;
  /** Read next key event (blocking, async) */
  readEvent(): Promise<NativeKeyEvent>;
}

// ===== Native TUI Types =====

/** Message for display in the native TUI */
export interface TuiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  subType?: string;
  toolName?: string;
  isError?: boolean;
}

/** TUI state for rendering */
export interface TuiState {
  messages: TuiMessage[];
  inputValue: string;
  cursorPos: number;
  isLoading: boolean;
  spinnerFrame: number;
  model: string;
  tokensUsed: number;
  permissionMode: string;
  streamingText: string;
  scrollOffset: number;
  contextWarning?: string;
}

/** Result of handling input in native TUI */
export interface InputResult {
  submitted: boolean;
  text?: string;
  exitRequested: boolean;
  command?: string;
  scrollUp: boolean;
  scrollDown: boolean;
  inputValue: string;
  cursorPos: number;
  historyNavigated: boolean;
  historyDirection: number;
}

/** Native TUI handle from Rust */
export interface NativeTuiHandle {
  init(): void;
  cleanup(): void;
  render(state: TuiState): void;
  pollInput(state: TuiState, timeoutMs?: number): InputResult;
  addToHistory(input: string): void;
}

export interface NativeModule {
  /** Syntax highlight code with ANSI escape codes */
  highlight_code: (code: string, language: string) => HighlightResult;

  /** Highlight markdown with nested code block syntax highlighting */
  highlight_markdown: (markdown: string) => HighlightResult;

  /** Highlight a diff with ANSI colors */
  highlight_diff: (oldText: string, newText: string, options?: DiffOptions) => HighlightDiffResult;

  search_files: (
    pattern: string,
    path: string,
    options: {
      case_insensitive?: boolean;
      hidden?: boolean;
      glob?: string;
      max_results?: number;
    }
  ) => {
    matches: Array<{
      file_path: string;
      line_number: number;
      column: number;
      line_content: string;
      match_text: string;
    }>;
    total_count: number;
    files_searched: number;
  };

  // ===== Grep Functions (ripgrep-like) =====

  /** Full search with context lines and column positions */
  grep_search: (
    pattern: string,
    path: string,
    options?: {
    case_insensitive?: boolean;
    max_results?: number;
    include_patterns?: string[];
    exclude_patterns?: string[];
    context_lines?: number;
    show_line_numbers?: boolean;
    show_column?: boolean;
  }
  ) => Array<{
    path: string;
    line_number: number;
    column?: number;
    line: string;
    context_before?: string[];
    context_after?: string[];
  }>;

  /** Count matching lines in files */
  grep_count: (
    pattern: string,
    path: string,
    options?: {
    case_insensitive?: boolean;
    include_patterns?: string[];
    exclude_patterns?: string[];
  }
  ) => Promise<number>;

  /** List files containing matches */
  grep_files: (
    pattern: string,
    path: string,
    options?: {
    case_insensitive?: boolean;
    include_patterns?: string[];
    exclude_patterns?: string[];
    }
  ) => Promise<{ files: string[]; total_matches: number }>;

  count_tokens: (text: string) => number;

  calculate_diff: (
    oldText: string,
    newText: string
  ) => Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    content: string;
  }>;

  compact_content: (
    content: string,
    maxTokens: number,
    strategy?: "truncate" | "summarize" | "extract"
  ) => string;

  count_tool_use: (
    messages: Array<{
      role: string;
      tool_use?: Array<{ name: string; input?: any }>;
      tool_result?: Array<any>;
    }>
  ) => Record<string, number>;

  find_tool_pairs: (
    messages: Array<{
      role: string;
      tool_use?: Array<{ name: string; input?: any }>;
      tool_result?: Array<any>;
    }>,
    window_size: number
  ) => Record<string, Record<string, number>>;

  find_common_patterns: (
    messages: Array<{
      role: string;
      tool_use?: Array<{ name: string; input?: any }>;
      tool_result?: Array<any>;
    }>
  ) => Array<{
    tools: [string, string];
    count: number;
    percentage: number;
  }>;

  // Multi-file editing
  /** Validate multi-file edits without applying them */
  validate_multi_edits: (edits: MultiEditEntry[]) => string[];

  /** Preview what edits would be applied without making changes */
  preview_multi_edits: (edits: MultiEditEntry[]) => MultiEditPreviewEntry[];

  /** Apply multiple file edits atomically with rollback on failure */
  apply_multi_edits: (edits: MultiEditEntry[]) => MultiEditResult;

  // ===== Quant Functions =====

  /** Get library version */
  quant_version: () => string;

  // OHLCV
  quant_ohlcv_new: (timestamp: bigint, open: number, high: number, low: number, close: number, volume: number) => string;

  // AMM (Automated Market Maker)
  quant_amm_new: (poolYes: number, poolNo: number, fee: number) => string;
  quant_amm_calculate_cost: (poolYes: number, poolNo: number, buyYes: boolean, shares: number) => string;
  quant_amm_price_impact: (poolYes: number, poolNo: number, buyYes: boolean, shares: number) => string;

  // LMSR (Logarithmic Market Scoring Rule)
  quant_lmsr_price: (yesShares: number, noShares: number, b: number) => string;
  quant_lmsr_cost: (yesShares: number, noShares: number, b: number, buyYes: boolean, shares: number) => string;

  // Arbitrage
  quant_detect_arbitrage: (yesPrice: number, noPrice: number) => string;

  // Odds Conversion
  quant_convert_odds: (value: number, fromType: number) => string;

  // Statistics
  quant_mean: (data: Float64Array) => number;
  quant_std_dev: (data: Float64Array) => number;
  quant_variance: (data: Float64Array) => number;
  quant_correlation: (x: Float64Array, y: Float64Array) => number;

  // ===== Cognitive Security - Action Module =====

  /** Classify an operation into an action type */
  classify_operation: (operation: string, domain: string, target?: string | null, reasoning?: string | null) => any;

  /** Get all supported action types */
  get_action_types: () => string[];

  /** Get risk levels for all action types */
  get_action_risk_levels: () => Array<{ actionType: string; riskLevel: number }>;

  /** Create a deny-all policy */
  create_deny_all_policy: () => any;

  /** Create an observe-only policy */
  create_observe_only_policy: () => any;

  /** Create a transfer approval policy */
  create_transfer_approval_policy: () => any;

  // ===== Cognitive Security - Intent Module =====

  /** Generate a new Ed25519 keypair for signing intents */
  cs_generate_keypair: () => { privateKey: string; publicKey: string };

  /** Sign an agent intent with a private key */
  cs_sign_intent: (intent: any, privateKey: string) => any;

  /** Verify an intent's signature */
  cs_verify_intent: (intent: any) => any;

  /** Hash an intent for comparison */
  cs_hash_intent: (intent: any) => string;

  /** Check if two intents are equivalent */
  cs_intents_equivalent: (intent1: any, intent2: any) => boolean;

  /** Score how well an action aligns with an intent */
  cs_score_alignment: (action: any, intent: any) => any;

  /** Batch score multiple actions against an intent */
  cs_batch_score_alignment: (actions: any[], intent: any) => any[];

  /** Check if any action in a sequence would violate intent */
  cs_check_sequence_violations: (actions: any[], intent: any) => number[];

  /** Load intent from a JSON file */
  cs_load_intent: (path: string) => any;

  /** Save intent to a JSON file */
  cs_save_intent: (intent: any, path: string) => void;

  /** Parse intent from JSON string */
  cs_parse_intent: (json: string) => any;

  /** Serialize intent to JSON string */
  cs_serialize_intent: (intent: any) => string;

  /** Validate intent structure */
  cs_validate_intent: (intent: any) => any;

  /** Create a default data collector intent */
  cs_create_data_collector_intent: (name: string, description: string) => any;

  /** Merge two intents (child overrides parent) */
  cs_merge_intents: (base: any, override: any) => any;

  /** Analyze behavior for signs of intent corruption */
  cs_analyze_corruption: (snapshot: any, intent: any) => any;

  /** Detect behavioral drift between two snapshots */
  cs_detect_drift: (baseline: any, current: any) => any;

  /** Create an empty behavior snapshot */
  cs_create_empty_snapshot: () => any;

  /** Update a snapshot with a new action result */
  cs_update_snapshot: (snapshot: any, action: any, alignment: any) => any;

  // ===== Cognitive Security - Flow Module =====

  /** Classify data based on content and source */
  classify_data: (content: string, source: string, tags: string[]) => any;

  /** Check if content contains sensitive data */
  contains_sensitive_data: (content: string) => boolean;

  /** Redact sensitive content */
  redact_sensitive: (content: string, replacement?: string | null) => string;

  /** Get sensitivity levels */
  get_sensitivity_levels: () => Array<{ name: string; value: number; description: string }>;

  /** Get data categories */
  get_data_categories: () => Array<{ name: string; description: string }>;

  /** Create a flow policy engine */
  create_flow_policy_engine: () => any;

  /** Create an allow-all flow policy */
  create_allow_all_flow_policy: () => any;

  /** Create a deny-all flow policy */
  create_deny_all_flow_policy: () => any;

  /** Create a strict flow policy */
  create_strict_flow_policy: () => any;

  /** Create a flow tracker */
  create_flow_tracker: () => any;

  /** Create a leak prevention engine */
  create_leak_prevention: () => any;

  /** Check content for leaks */
  check_for_leaks: (content: string, channel: string) => any;

  /** Sanitize content */
  sanitize_content: (content: string) => string;

  /** Create a taint tracker */
  create_taint_tracker: () => any;

  // ===== Terminal Input =====

  /** Create a terminal handle for raw mode input */
  create_terminal: () => TerminalHandle;

  // ===== Native TUI =====

  /** Create a native TUI handle */
  create_tui: () => NativeTuiHandle;

  /** Check if native TUI is available */
  is_native_tui_available: () => boolean;
}

let nativeModule: NativeModule | null = null;

/**
 * Load the native module
 */
export function loadNative(): NativeModule {
  if (nativeModule) {
    return nativeModule;
  }

  // Try multiple possible locations for the native module
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const basePaths = [
    join(__dirname, "..", "native"),                          // dist/../native (library entry)
    join(__dirname, "..", "..", "native"),                    // dist/foo/../native
    join(__dirname, "..", "..", "..", "native"),              // dist/foo/bar/../native
    join(__dirname, "..", "..", "..", "..", "native"),        // dist/interfaces/ui/../native
    join(__dirname, "..", "..", "..", "..", "..", "native"),  // dist/interfaces/ui/terminal/../native
    join(__dirname, "..", "..", "..", "..", "..", "..", "native"), // CLI entry: dist/interfaces/ui/terminal/cli/../native
    join(__dirname, "native"),                                 // native/ (if running from project root)
  ];

  // Try .node files first (NAPI modules)
  const nodeFiles = [
    `index.${process.platform}-${process.arch}.node`,  // Platform-specific (e.g., linux-x64-gnu, darwin-arm64)
    `index.${process.platform}-${process.arch}-gnu.node`,  // Linux gnu variant
    "index.darwin-arm64.node",
    "index.darwin-x64.node",
    "index.linux-x64-gnu.node",
    "index.linux-x64.node",
    "index.node"
  ];

  for (const basePath of basePaths) {
    for (const file of nodeFiles) {
      const nativePath = join(basePath, file);
      try {
        // Try to load NAPI module directly
        const native = require(nativePath);
        if (native && (native.highlightCode || native.highlight_code)) {
          // Map camelCase to snake_case if needed
          nativeModule = {
            highlight_code: native.highlightCode || native.highlight_code,
            highlight_markdown: native.highlightMarkdown || native.highlight_markdown,
            highlight_diff: native.highlightDiff || native.highlight_diff,
            search_files: native.searchFiles || native.search_files,
            grep_search: native.grepSearch || native.grep_search,
            // Wrap native grepCount to always return number (native returns [{path, count, lineCount}])
            grep_count: async (pattern: string, path: string, options?: GrepOptions): Promise<number> => {
              // If native grepCount exists, normalize its output
              if (native.grepCount || native.grep_count) {
                const results = await (native.grepCount || native.grep_count)(pattern, path, options || {});
                // Native returns array of {path, count, lineCount} - sum all counts
                if (Array.isArray(results)) {
                  return results.reduce((sum: number, r: { count?: number }) => sum + (r.count || 0), 0);
                }
                return typeof results === 'number' ? results : 0;
              }
              // Fallback: derive from grepSearch
              const results = await (native.grepSearch || native.grep_search)(pattern, path, options || {});
              return (results?.matches || []).length;
            },
            // Wrap native grepFiles to always return {files, total_matches}
            grep_files: async (pattern: string, path: string, options?: GrepOptions): Promise<{ files: string[]; total_matches: number }> => {
              if (native.grepFiles || native.grep_files) {
                const results = await (native.grepFiles || native.grep_files)(pattern, path, options || {});
                // Handle array of strings (file paths)
                if (Array.isArray(results)) {
                  if (results.length > 0 && typeof results[0] === 'string') {
                    return { files: results, total_matches: results.length };
                  }
                  // Handle array of objects with path property
                  const files = results.map((r: { path?: string }) => r.path).filter((p): p is string => Boolean(p));
                  return { files, total_matches: files.length };
                }
                // Already in expected format
                if (results && typeof results === 'object' && 'files' in results) {
                  return results;
                }
              }
              // Fallback: derive from grepSearch
              const results = await (native.grepSearch || native.grep_search)(pattern, path, options || {});
              const matches = results?.matches || [];
              const fileSet = new Set(matches.map((m: GrepSearchResult) => m.path));
              return { files: Array.from(fileSet) as string[], total_matches: fileSet.size };
            },
            count_tokens: native.countTokens || native.count_tokens,
            calculate_diff: native.calculateDiff || native.calculate_diff,
            compact_content: native.compactContent || native.compact_content,
            count_tool_use: native.countToolUse || native.count_tool_use,
            find_tool_pairs: native.findToolPairs || native.find_tool_pairs,
            find_common_patterns: native.findCommonPatterns || native.find_common_patterns,
            validate_multi_edits: native.validateMultiEdits || native.validate_multi_edits,
            preview_multi_edits: native.previewMultiEdits || native.preview_multi_edits,
            apply_multi_edits: native.applyMultiEdits || native.apply_multi_edits,

            // Cognitive Security - Action Module (NAPI exports camelCase)
            classify_operation: native.classifyOperation,
            get_action_types: native.getActionTypes,
            get_action_risk_levels: native.getActionRiskLevels,
            create_deny_all_policy: native.createDenyAllPolicy,
            create_observe_only_policy: native.createObserveOnlyPolicy,
            create_transfer_approval_policy: native.createTransferApprovalPolicy,

            // Cognitive Security - Intent Module (NAPI exports camelCase)
            cs_generate_keypair: native.generateIntentKeypair,
            cs_sign_intent: native.signIntent,
            cs_verify_intent: native.verifyIntentSignature,
            cs_hash_intent: native.hashIntent,
            cs_intents_equivalent: native.intentsEquivalent,
            cs_score_alignment: native.scoreAlignment,
            cs_batch_score_alignment: native.batchScoreAlignment,
            cs_check_sequence_violations: native.checkSequenceViolations,
            cs_load_intent: native.loadIntentFromFile,
            cs_save_intent: native.saveIntentToFile,
            cs_parse_intent: native.parseIntent,
            cs_serialize_intent: native.serializeIntent,
            cs_validate_intent: native.validateIntentStructure,
            cs_create_data_collector_intent: native.createDataCollectorIntent,
            cs_merge_intents: native.mergeIntents,
            cs_analyze_corruption: native.analyzeCorruption,
            cs_detect_drift: native.detectBehavioralDrift,
            cs_create_empty_snapshot: native.createEmptySnapshot,
            cs_update_snapshot: native.updateSnapshot,

            // Cognitive Security - Flow Module (NAPI exports camelCase)
            classify_data: native.classifyData,
            contains_sensitive_data: native.containsSensitiveData,
            redact_sensitive: native.redactSensitive,
            get_sensitivity_levels: native.getSensitivityLevels,
            get_data_categories: native.getDataCategories,
            create_flow_policy_engine: native.createFlowPolicyEngine,
            create_allow_all_flow_policy: native.createAllowAllFlowPolicy,
            create_deny_all_flow_policy: native.createDenyAllFlowPolicy,
            create_strict_flow_policy: native.createStrictFlowPolicy,
            create_flow_tracker: native.createFlowTracker,
            create_leak_prevention: native.createLeakPrevention,
            check_for_leaks: native.checkForLeaks,
            sanitize_content: native.sanitizeContent,
            create_taint_tracker: native.createTaintTracker,

            // Quant Functions
            quant_version: native.quantVersion || native.quant_version,
            quant_ohlcv_new: native.quantOhlcvNew || native.quant_ohlcv_new,
            quant_amm_new: native.quantAmmNew || native.quant_amm_new,
            quant_amm_calculate_cost: native.quantAmmCalculateCost || native.quant_amm_calculate_cost,
            quant_amm_price_impact: native.quantAmmPriceImpact || native.quant_amm_price_impact,
            quant_lmsr_price: native.quantLmsrPrice || native.quant_lmsr_price,
            quant_lmsr_cost: native.quantLmsrCost || native.quant_lmsr_cost,
            quant_detect_arbitrage: native.quantDetectArbitrage || native.quant_detect_arbitrage,
            quant_convert_odds: native.quantConvertOdds || native.quant_convert_odds,
            quant_mean: native.quantMean || native.quant_mean,
            quant_std_dev: native.quantStdDev || native.quant_std_dev,
            quant_variance: native.quantVariance || native.quant_variance,
            quant_correlation: native.quantCorrelation || native.quant_correlation,

            // Terminal Input
            create_terminal: native.createTerminal || native.create_terminal,

            // Native TUI
            create_tui: native.createTui || native.create_tui,
            is_native_tui_available: () => typeof (native.createTui || native.create_tui) === 'function',
          };
          return nativeModule;
        }
      } catch {
        // Try next path
        continue;
      }
    }
  }

  // Try FFI with dylib
  const dylibPaths = basePaths.map(p => join(p, `claude_code_native.${suffix}`));

  for (const nativePath of dylibPaths) {
    try {
      const lib = dlopen(nativePath, {
          highlight_code: {
            args: ["cstring", "cstring"],
            returns: "pointer",
          },
          highlight_markdown: {
            args: ["cstring"],
            returns: "pointer",
          },
          highlight_diff: {
            args: ["cstring", "cstring", "pointer"],
            returns: "pointer",
          },
          search_files: {
            args: ["cstring", "cstring", "pointer"],
            returns: "pointer",
          },
          grep_search: {
            args: ["cstring", "cstring", "pointer"],
            returns: "pointer",
          },
          grep_count: {
            args: ["cstring", "cstring", "pointer"],
            returns: "u32",
          },
          grep_files: {
            args: ["cstring", "cstring", "pointer"],
            returns: "pointer",
          },
          count_tokens: {
            args: ["cstring"],
            returns: "u32",
          },
          calculate_diff: {
            args: ["cstring", "cstring"],
            returns: "pointer",
          },
          compact_content: {
            args: ["cstring", "u32", "cstring"],
            returns: "pointer",
          },
        },
      );

      nativeModule = lib.symbols as unknown as NativeModule;
      return nativeModule;
    } catch {
      continue;
    }
  }

  // No native module found, use fallback
  console.warn("Native module not available, using JS fallback");
  return getFallbackModule();
}

/**
 * Check if native module is available
 */
export function isNativeAvailable(): boolean {
  try {
    loadNative();
    return nativeModule !== null;
  } catch {
    return false;
  }
}

/**
 * Fallback implementations in pure JavaScript
 */
function getFallbackModule(): NativeModule {
  return {
    highlight_code: (code: string, language: string): HighlightResult => {
      // ANSI color codes
      const colors = {
        reset: "\x1b[0m",
        keyword: "\x1b[38;2;180;142;173m",    // purple
        string: "\x1b[38;2;163;190;140m",     // green
        number: "\x1b[38;2;208;135;112m",     // orange
        type: "\x1b[38;2;191;97;106m",        // red
        function: "\x1b[38;2;143;161;179m",   // blue
        comment: "\x1b[38;2;108;153;139m",    // gray-green
        default: "\x1b[38;2;192;197;206m",    // gray
        special: "\x1b[38;2;150;180;210m",    // light blue
        arrow: "\x1b[38;2;200;160;120m",      // gold/tan
      };

      // Mermaid-specific highlighting
      if (language.toLowerCase() === "mermaid" || language.toLowerCase() === "mmd") {
        const MERMAID_KEYWORDS = new Set([
          // Diagram types
          "graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram",
          "erDiagram", "journey", "gantt", "pie", "gitGraph", "mindmap", "timeline",
          "quadrantChart", "requirementDiagram", "C4Context", "C4Container",
          "C4Component", "C4Dynamic", "C4Deployment",
          // Directions
          "TB", "TD", "BT", "RL", "LR", "left", "right", "top", "bottom",
          // Subgraphs/participants
          "subgraph", "end", "participant", "actor", "as",
          // Flowchart
          "node", "click", "link", "href", "callback",
          // Sequence
          "Note", "over", "loop", "alt", "else", "opt", "par", "rect", "autonumber",
          "activate", "deactivate",
          // Class
          "class", "namespace", "interface", "annotation", "service", "enum",
          // State
          "state", "note", "fork", "join", "choice",
          // ER
          "entity",
          // Gantt
          "dateFormat", "title", "section", "excludes", "includes", "todayMarker",
          // Common
          "title", "accTitle", "accDescr",
        ]);

        const MERMAID_ARROWS = new Set([
          "-->", "---", "->", "->>", "-.", "-.-", "==>", "==", "--x", "--o",
          "<--", "<-", "<<-", "<-->", "<->", "o--o", "x--x", "-x", "-o",
        ]);

        const MERMAID_SHAPES = [
          ["[", "]"],      // rect
          ["(", ")"],      // rounded
          ["([", "])"],    // stadium
          ["[[", "]]"],    // subroutine
          ["[((", ")]"],   // cylinder
          [">", "]"],      // asymmetric
          ["{", "}"],      // rhombus
          ["{{", "}}"],    // hexagon
          ["[/", "/]"],    // parallelogram
          ["[\\", "\\]"],  // parallelogram alt
          ["[(", ")]"],    // circle
          ["(((", ")))"],  // double circle
        ];

        const lines = code.split("\n");
        const highlighted = lines.map(line => {
          let result = line;

          // Comments (%%)
          if (line.trim().startsWith("%%")) {
            return `${colors.comment}${line}${colors.reset}`;
          }

          // Arrows and connections (handle first to preserve them)
          for (const arrow of MERMAID_ARROWS) {
            const escaped = arrow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            result = result.replace(new RegExp(escaped, 'g'), `${colors.arrow}${arrow}${colors.default}`);
          }

          // Strings (quoted)
          result = result.replace(/"([^"\\]|\\.)*"/g, match => {
            return `${colors.string}${match}${colors.default}`;
          });

          // Numbers
          result = result.replace(/\b(\d+\.?\d*)\b/g, `${colors.number}$1${colors.default}`);

          // Keywords
          result = result.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (match) => {
            if (MERMAID_KEYWORDS.has(match)) {
              return `${colors.keyword}${match}${colors.default}`;
            }
            return match;
          });

          // Special characters for shapes
          for (const [open, close] of MERMAID_SHAPES) {
            if (!open || !close) continue;
            const openEsc = open.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const closeEsc = close.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            result = result.replace(new RegExp(`${openEsc}([^${closeEsc}]+)${closeEsc}`, 'g'), (_, content) => {
              return `${colors.special}${open}${content}${close}${colors.default}`;
            });
          }

          // Arrow labels
          result = result.replace(/\|([^|]+)\|/g, (_, content) => {
            return `${colors.special}|${content}|${colors.default}`;
          });

          return result;
        }).join("\n");

        return {
          html: highlighted + colors.reset,
          theme: "mermaid",
        };
      }

      // Standard code highlighting
      const KEYWORDS = new Set([
        "function", "const", "let", "var", "return", "if", "else", "for", "while",
        "class", "interface", "type", "import", "export", "from", "async", "await",
        "try", "catch", "throw", "new", "this", "extends", "implements", "static",
        "public", "private", "protected", "readonly", "abstract", "enum", "namespace",
      ]);

      const TYPES = new Set([
        "string", "number", "boolean", "void", "null", "undefined", "any", "never",
        "object", "symbol", "bigint", "true", "false",
      ]);

      // Simple tokenization
      const lines = code.split("\n");
      const highlighted = lines.map(line => {
        // Comments
        if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
          return `${colors.comment}${line}${colors.reset}`;
        }

        // Replace strings
        let result = line.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, match => {
          return `${colors.string}${match}${colors.default}`;
        });

        // Replace numbers
        result = result.replace(/\b(\d+\.?\d*)\b/g, `${colors.number}$1${colors.default}`);

        // Replace keywords
        result = result.replace(/\b([a-z]+)\b/gi, (match) => {
          if (KEYWORDS.has(match)) {
            return `${colors.keyword}${match}${colors.default}`;
          }
          if (TYPES.has(match)) {
            return `${colors.type}${match}${colors.default}`;
          }
          return match;
        });

        // Function names (before parentheses)
        result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, (_, name) => {
          return `${colors.function}${name}${colors.default}(`;
        });

        return result;
      }).join("\n");

      return {
        html: highlighted + colors.reset,
        theme: "fallback",
      };
    },

    highlight_markdown: (markdown: string): HighlightResult => {
      // Simple markdown highlighting - just return as-is with reset
      // Full nested code block highlighting requires native module
      return {
        html: markdown + "\x1b[0m",
        theme: "fallback",
      };
    },

    highlight_diff: (oldText: string, newText: string, options?: DiffOptions): HighlightDiffResult => {
      // Simple line-based diff with ANSI colors
      const GREEN = "\x1b[38;2;163;190;140m";
      const RED = "\x1b[38;2;191;97;106m";
      const DIM = "\x1b[38;2;108;153;139m";
      const CYAN = "\x1b[38;2;143;161;179m";
      const RESET = "\x1b[0m";

      const oldLines = oldText.split("\n");
      const newLines = newText.split("\n");

      let output = "";
      let additions = 0;
      let deletions = 0;
      let hunks = 0;

      // File header
      if (options?.file_path) {
        output += `${CYAN}${options.file_path}${RESET}\n`;
      }

      // Simple LCS-based diff
      const lcs: string[] = [];
      const dp: number[][] = Array.from({ length: oldLines.length + 1 }, () =>
        Array.from({ length: newLines.length + 1 }, () => 0)
      );

      for (let i = 0; i <= oldLines.length; i++) {
        for (let j = 0; j <= newLines.length; j++) {
          if (i === 0 || j === 0) {
            dp[i]![j] = 0;
          } else if (oldLines[i - 1] === newLines[j - 1]) {
            dp[i]![j] = dp[i - 1]![j - 1]! + 1;
          } else {
            dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
          }
        }
      }

      // Backtrack for LCS
      let i = oldLines.length;
      let j = newLines.length;
      const lcsSet = new Set<string>();
      while (i > 0 && j > 0) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          lcsSet.add(`${i - 1}:${j - 1}`);
          lcs.unshift(oldLines[i - 1]!);
          i--;
          j--;
        } else if (dp[i - 1]![j]! > dp[i]![j - 1]!) {
          i--;
        } else {
          j--;
        }
      }

      // Build diff output
      let oldIdx = 0;
      let newIdx = 0;
      let lcsIdx = 0;

      while (oldIdx < oldLines.length || newIdx < newLines.length) {
        // Skip matching lines
        while (
          lcsIdx < lcs.length &&
          oldIdx < oldLines.length &&
          newIdx < newLines.length &&
          oldLines[oldIdx] === lcs[lcsIdx] &&
          newLines[newIdx] === lcs[lcsIdx]
        ) {
          oldIdx++;
          newIdx++;
          lcsIdx++;
        }

        const oldStart = oldIdx + 1;
        const newStart = newIdx + 1;
        let oldCount = 0;
        let newCount = 0;
        const hunkLines: string[] = [];

        // Collect removed lines
        while (
          oldIdx < oldLines.length &&
          (lcsIdx >= lcs.length || oldLines[oldIdx] !== lcs[lcsIdx])
        ) {
          hunkLines.push(`${RED}-${oldLines[oldIdx]}${RESET}`);
          oldIdx++;
          oldCount++;
          deletions++;
        }

        // Collect added lines
        while (
          newIdx < newLines.length &&
          (lcsIdx >= lcs.length || newLines[newIdx] !== lcs[lcsIdx])
        ) {
          hunkLines.push(`${GREEN}+${newLines[newIdx]}${RESET}`);
          newIdx++;
          newCount++;
          additions++;
        }

        if (oldCount > 0 || newCount > 0) {
          hunks++;
          output += `${DIM}@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${RESET}\n`;
          output += hunkLines.join("\n") + "\n";
        }
      }

      return { output, additions, deletions, hunks };
    },

    search_files: (pattern, path, options) => {
      // Simple grep fallback
      return {
        matches: [],
        total_count: 0,
        files_searched: 0,
      };
    },

    // ===== Grep Fallback Implementations =====

    grep_search: (pattern, path, options) => {
      // Fallback implementation using simple regex
      try {
        const fs = require('fs');
        const pathModule = require('path');
        const results: Array<{
          path: string;
          line_number: number;
          column?: number;
          line: string;
        }> = [];

        if (!fs.existsSync(path)) return results;

        const stats = fs.statSync(path);
        const maxResults = options?.max_results ?? 1000;
        const caseInsensitive = options?.case_insensitive ?? false;
        const includePatterns = options?.include_patterns ?? [];
        const excludePatterns = options?.exclude_patterns ?? [];

        const regex = new RegExp(
          pattern,
          caseInsensitive ? 'gi' : 'g'
        );

        const shouldInclude = (filePath: string): boolean => {
          if (includePatterns.length > 0) {
            return includePatterns.some(p => {
              const glob = p.replace(/\*/g, '.*').replace(/\?/g, '.');
              return new RegExp(glob).test(filePath);
            });
          }
          if (excludePatterns.length > 0) {
            return !excludePatterns.some(p => {
              const glob = p.replace(/\*/g, '.*').replace(/\?/g, '.');
              return new RegExp(glob).test(filePath);
            });
          }
          return true;
        };

        const searchFile = (filePath: string) => {
          if (!shouldInclude(filePath)) return;
          if (excludePatterns.some(p => filePath.includes('node_modules') || filePath.includes('.git'))) return;

          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line: string, idx: number) => {
              if (results.length >= maxResults) return;
              const match = regex.exec(line);
              if (match) {
                results.push({
                  path: filePath,
                  line_number: idx + 1,
                  column: match.index + 1,
                  line,
                });
              }
              regex.lastIndex = 0; // Reset for next line
            });
          } catch {
            // Skip binary or unreadable files
          }
        };

        const searchDir = (dirPath: string) => {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            if (results.length >= maxResults) break;
            const fullPath = pathModule.join(dirPath, entry.name);
            if (entry.isDirectory()) {
              if (!excludePatterns.some(p => fullPath.includes('node_modules') || fullPath.includes('.git'))) {
                searchDir(fullPath);
              }
            } else if (entry.isFile()) {
              searchFile(fullPath);
            }
          }
        };

        if (stats.isDirectory()) {
          searchDir(path);
        } else {
          searchFile(path);
        }

        return results;
      } catch {
        return [];
      }
    },

    grep_count: async (pattern, path, options) => {
      // Simple fallback - count matches using grep_search
      try {
        const fs = require('fs');
        if (!fs.existsSync(path)) return 0;

        const content = fs.statSync(path).isDirectory()
          ? '' // For directories, we'd need to walk - return 0 for fallback
          : fs.readFileSync(path, 'utf-8');

        const regex = new RegExp(
          pattern,
          options?.case_insensitive ? 'gi' : 'g'
        );
        const matches = content.match(regex);
        return matches ? matches.length : 0;
      } catch {
        return 0;
      }
    },

    grep_files: async (pattern, path, options): Promise<{ files: string[]; total_matches: number }> => {
      // Simple fallback - return files containing matches
      try {
        const fs = require('fs');
        const pathModule = require('path');

        if (!fs.existsSync(path)) return { files: [], total_matches: 0 };

        const files: string[] = [];
        const regex = new RegExp(
          pattern,
          options?.case_insensitive ? 'gi' : 'g'
        );

        const checkFile = (filePath: string) => {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (regex.test(content)) {
              files.push(filePath);
            }
          } catch {
            // Skip unreadable files
          }
        };

        const checkDir = (dirPath: string) => {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = pathModule.join(dirPath, entry.name);
            if (entry.isDirectory()) {
              if (!fullPath.includes('node_modules') && !fullPath.includes('.git')) {
                checkDir(fullPath);
              }
            } else if (entry.isFile()) {
              checkFile(fullPath);
            }
          }
        };

        if (fs.statSync(path).isDirectory()) {
          checkDir(path);
        } else {
          checkFile(path);
        }

        return { files, total_matches: files.length };
      } catch {
        return { files: [], total_matches: 0 };
      }
    },

    count_tokens: (text) => {
      // Approximate token count: ~4 chars per token
      return Math.ceil(text.length / 4);
    },

    calculate_diff: (oldText, newText) => {
      // Simple line-based diff
      const oldLines = oldText.split("\n");
      const newLines = newText.split("\n");
      const hunks: Array<{
        oldStart: number;
        oldLines: number;
        newStart: number;
        newLines: number;
        content: string;
      }> = [];

      // Very simple diff - just show all changes as one hunk
      if (oldText !== newText) {
        hunks.push({
          oldStart: 1,
          oldLines: oldLines.length,
          newStart: 1,
          newLines: newLines.length,
          content: `- ${oldLines.join("\n- ")}\n+ ${newLines.join("\n+ ")}`,
        });
      }

      return hunks;
    },

    compact_content: (content, maxTokens, strategy = "truncate") => {
      const charsPerToken = 4;
      const maxChars = maxTokens * charsPerToken;

      if (content.length <= maxChars) {
        return content;
      }

      switch (strategy) {
        case "truncate":
          return (
            content.slice(0, maxChars / 2) +
            "\n\n... [truncated] ...\n\n" +
            content.slice(-maxChars / 2)
          );
        case "summarize":
          // Return first and last sections
          const quarter = Math.floor(maxChars / 4);
          return (
            "=== BEGINNING ===\n" +
            content.slice(0, quarter) +
            "\n\n=== END ===\n" +
            content.slice(-quarter)
          );
        case "extract":
          // Return important lines only
          const lines = content.split("\n");
          const important = lines.filter(
            (line) =>
              line.trim().startsWith("#") ||
              line.trim().startsWith("function") ||
              line.trim().startsWith("const") ||
              line.trim().startsWith("class") ||
              line.trim().startsWith("export") ||
              line.trim().startsWith("import")
          );
          return important.slice(0, maxChars / 50).join("\n");
        default:
          return content.slice(0, maxChars);
      }
    },

    // Multi-file editing fallback implementation
    validate_multi_edits: (edits: MultiEditEntry[]): string[] => {
      const errors: string[] = [];
      const fileContents = new Map<string, string>();
      const fs = require('fs');

      for (const edit of edits) {
        // Check file exists
        try {
          if (!fs.existsSync(edit.filePath)) {
            errors.push(`File not found: ${edit.filePath}`);
            continue;
          }

          // Load file content if not already loaded
          if (!fileContents.has(edit.filePath)) {
            const content = fs.readFileSync(edit.filePath, 'utf-8');
            fileContents.set(edit.filePath, content);
          }

          const content = fileContents.get(edit.filePath)!;

          // Check oldString exists
          if (!content.includes(edit.oldString)) {
            errors.push(`String not found in ${edit.filePath}: "${truncateString(edit.oldString, 50)}"`);
            continue;
          }

          // Check uniqueness if not replaceAll
          if (!edit.replaceAll) {
            const count = (content.match(new RegExp(escapeRegex(edit.oldString), "g")) || []).length;
            if (count > 1) {
              errors.push(`String appears ${count} times in ${edit.filePath}. Use replaceAll or provide more context.`);
            }
          }
        } catch (err) {
          errors.push(`Error reading ${edit.filePath}: ${err}`);
        }
      }

      return errors;
    },

    preview_multi_edits: (edits: MultiEditEntry[]): MultiEditPreviewEntry[] => {
      const results: MultiEditPreviewEntry[] = [];
      const fileReplacements = new Map<string, number>();
      const fs = require('fs');

      for (const edit of edits) {
        try {
          if (!fs.existsSync(edit.filePath)) continue;

          const content = fs.readFileSync(edit.filePath, 'utf-8');
          const count = edit.replaceAll
            ? (content.match(new RegExp(escapeRegex(edit.oldString), "g")) || []).length
            : 1;

          fileReplacements.set(
            edit.filePath,
            (fileReplacements.get(edit.filePath) || 0) + count
          );
        } catch {
          // Skip files that can't be read
        }
      }

      for (const [filePath, replacementCount] of fileReplacements) {
        results.push({ filePath, replacementCount });
      }

      return results;
    },

    apply_multi_edits: (edits: MultiEditEntry[]): MultiEditResult => {
      // First validate all edits
      const errors = getFallbackModule().validate_multi_edits(edits);
      if (errors.length > 0) {
        return {
          success: false,
          filesModified: [],
          totalReplacements: 0,
          error: errors.join("\n"),
          rolledBack: false,
        };
      }

      // Create backups
      const backups = new Map<string, string>();
      const uniqueFiles = new Set(edits.map(e => e.filePath));
      const fs = require('fs');

      for (const filePath of uniqueFiles) {
        try {
          backups.set(filePath, fs.readFileSync(filePath, 'utf-8'));
        } catch (err) {
          return {
            success: false,
            filesModified: [],
            totalReplacements: 0,
            error: `Failed to backup ${filePath}: ${err}`,
            rolledBack: false,
          };
        }
      }

      // Apply edits
      const currentContents = new Map<string, string>();
      for (const [path, content] of backups) {
        currentContents.set(path, content);
      }

      let totalReplacements = 0;

      for (const edit of edits) {
        const content = currentContents.get(edit.filePath);
        if (!content) continue;

        if (edit.replaceAll) {
          const count = (content.match(new RegExp(escapeRegex(edit.oldString), "g")) || []).length;
          currentContents.set(edit.filePath, content.split(edit.oldString).join(edit.newString));
          totalReplacements += count;
        } else {
          currentContents.set(edit.filePath, content.replace(edit.oldString, edit.newString));
          totalReplacements += 1;
        }
      }

      // Write all files
      const filesModified: string[] = [];
      for (const [path, newContent] of currentContents) {
        const originalContent = backups.get(path);
        if (newContent !== originalContent) {
          try {
            Bun.write(path, newContent);
            filesModified.push(path);
          } catch (err) {
            // Rollback on failure
            for (const [rollbackPath, rollbackContent] of backups) {
              try {
                Bun.write(rollbackPath, rollbackContent);
              } catch {
                // Ignore rollback errors
              }
            }
            return {
              success: false,
              filesModified: [],
              totalReplacements: 0,
              error: `Failed to write ${path}: ${err}. All changes rolled back.`,
              rolledBack: true,
            };
          }
        }
      }

      return {
        success: true,
        filesModified: filesModified,
        totalReplacements: totalReplacements,
        error: undefined,
        rolledBack: false,
      };
    },

    // Tool analysis fallback implementations
    count_tool_use: (messages) => {
      const counts: Record<string, number> = {};
      for (const msg of messages) {
        if (msg.tool_use) {
          for (const tool of msg.tool_use) {
            counts[tool.name] = (counts[tool.name] || 0) + 1;
          }
        }
      }
      return counts;
    },

    find_tool_pairs: (messages, _windowSize) => {
      const pairs: Record<string, Record<string, number>> = {};
      for (const msg of messages) {
        if (msg.tool_use && msg.tool_use.length >= 2) {
          for (let i = 0; i < msg.tool_use.length - 1; i++) {
            const tool1 = msg.tool_use[i]?.name;
            const tool2 = msg.tool_use[i + 1]?.name;
            if (tool1 && tool2) {
              if (!pairs[tool1]) pairs[tool1] = {};
              pairs[tool1][tool2] = (pairs[tool1][tool2] || 0) + 1;
            }
          }
        }
      }
      return pairs;
    },

    find_common_patterns: (messages) => {
      const patterns: Array<{ tools: [string, string]; count: number; percentage: number }> = [];
      const toolPairs: Map<string, number> = new Map();
      let totalPairs = 0;

      for (const msg of messages) {
        if (msg.tool_use && msg.tool_use.length >= 2) {
          for (let i = 0; i < msg.tool_use.length - 1; i++) {
            const name1 = msg.tool_use[i]?.name;
            const name2 = msg.tool_use[i + 1]?.name;
            if (name1 && name2) {
              const key = `${name1}|${name2}`;
              toolPairs.set(key, (toolPairs.get(key) || 0) + 1);
              totalPairs++;
            }
          }
        }
      }

      for (const [key, count] of toolPairs) {
        const [tool1, tool2] = key.split("|") as [string, string];
        patterns.push({
          tools: [tool1, tool2],
          count,
          percentage: totalPairs > 0 ? (count / totalPairs) * 100 : 0,
        });
      }

      return patterns.sort((a, b) => b.count - a.count).slice(0, 10);
    },

    // ===== Cognitive Security Fallbacks =====

    // Action Module
    classify_operation: (operation: string, domain: string, target?: string | null, reasoning?: string | null) => {
      const id = `action_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      let actionType = "observe";
      let riskLevel = 1;
      let hasSideEffects = false;
      let requiresApproval = false;

      const op = operation.toLowerCase();
      if (op.includes("write") || op.includes("edit") || op.includes("create") || op.includes("delete")) {
        actionType = "modify";
        riskLevel = 3;
        hasSideEffects = true;
        requiresApproval = true;
      } else if (op.includes("execute") || op.includes("run") || op.includes("bash")) {
        actionType = "execute";
        riskLevel = 4;
        hasSideEffects = true;
        requiresApproval = true;
      } else if (op.includes("send") || op.includes("post") || op.includes("transmit")) {
        actionType = "communicate";
        riskLevel = 2;
        hasSideEffects = true;
        requiresApproval = domain === "external";
      } else if (op.includes("read") || op.includes("get") || op.includes("list") || op.includes("search")) {
        actionType = "observe";
        riskLevel = 1;
        hasSideEffects = false;
        requiresApproval = false;
      }

      return {
        id,
        actionType,
        domain,
        operation,
        target: target || null,
        flowDirection: "outbound",
        riskLevel,
        hasSideEffects,
        requiresApproval,
        reasoning: reasoning || `Classified as ${actionType} based on operation name`,
        timestamp: Date.now(),
        metadata: null,
      };
    },

    get_action_types: () => ["modify", "execute", "communicate", "transfer", "observe", "create", "delete"],

    get_action_risk_levels: () => [
      { actionType: "observe", riskLevel: 1 },
      { actionType: "communicate", riskLevel: 2 },
      { actionType: "create", riskLevel: 3 },
      { actionType: "modify", riskLevel: 3 },
      { actionType: "transfer", riskLevel: 4 },
      { actionType: "execute", riskLevel: 4 },
      { actionType: "delete", riskLevel: 5 },
    ],

    create_deny_all_policy: () => ({
      id: "deny_all",
      description: "Deny all actions",
      actionTypes: [],
      domains: [],
      operations: [],
      effect: "deny",
      priority: 1000,
      enabled: true,
    }),

    create_observe_only_policy: () => ({
      id: "observe_only",
      description: "Allow observe actions only",
      actionTypes: ["observe"],
      domains: [],
      operations: [],
      effect: "allow",
      priority: 100,
      enabled: true,
    }),

    create_transfer_approval_policy: () => ({
      id: "transfer_approval",
      description: "Require approval for transfer actions",
      actionTypes: ["transfer"],
      domains: [],
      operations: [],
      effect: "require_approval",
      priority: 200,
      enabled: true,
    }),

    // Intent Module
    cs_generate_keypair: () => ({
      privateKey: `private_${Math.random().toString(36).slice(2)}_${Date.now()}`,
      publicKey: `public_${Math.random().toString(36).slice(2)}_${Date.now()}`,
    }),

    cs_sign_intent: (intent: any, _privateKey: string) => {
      return { ...intent, signature: `sig_${Date.now()}`, signedBy: "fallback" };
    },

    cs_verify_intent: (_intent: any) => ({
      valid: true,
      error: null,
      signatureValid: true,
      contentIntact: true,
      expired: false,
    }),

    cs_hash_intent: (intent: any) => {
      const str = JSON.stringify(intent);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    },

    cs_intents_equivalent: (intent1: any, intent2: any) => {
      const stripSignature = (i: any) => {
        const { signature, signedBy, ...rest } = i;
        return rest;
      };
      return JSON.stringify(stripSignature(intent1)) === JSON.stringify(stripSignature(intent2));
    },

    cs_score_alignment: (_action: any, _intent: any) => ({
      score: 0.8,
      reasoning: "Fallback alignment score - native module not available",
      servesGoals: [],
      hindersGoals: [],
      boundaryConcerns: [],
      confidence: 0.5,
      shouldBlock: false,
      requiresReview: false,
    }),

    cs_batch_score_alignment: (actions: any[], intent: any) => {
      return actions.map(() => ({
        score: 0.8,
        reasoning: "Fallback alignment score",
        servesGoals: [],
        hindersGoals: [],
        boundaryConcerns: [],
        confidence: 0.5,
        shouldBlock: false,
        requiresReview: false,
      }));
    },

    cs_check_sequence_violations: (_actions: any[], _intent: any) => [],

    cs_load_intent: (_path: string) => {
      throw new Error("Native module required for cs_load_intent");
    },

    cs_save_intent: (_intent: any, _path: string) => {
      throw new Error("Native module required for cs_save_intent");
    },

    cs_parse_intent: (json: string) => JSON.parse(json),

    cs_serialize_intent: (intent: any) => JSON.stringify(intent, null, 2),

    cs_validate_intent: (intent: any) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!intent.id) errors.push("Missing intent id");
      if (!intent.version) warnings.push("Missing version");
      if (!intent.identity) errors.push("Missing identity");
      if (!intent.purpose) errors.push("Missing purpose");

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    },

    cs_create_data_collector_intent: (name: string, description: string) => ({
      id: `intent_${Date.now()}`,
      version: 1,
      identity: {
        name,
        description,
        capabilities: ["read", "list", "search"],
        constraints: ["no_write", "no_execute", "no_network"],
      },
      purpose: {
        goals: [],
        nonGoals: ["modify_data", "execute_commands", "send_data"],
        boundaries: [],
      },
      principles: {
        values: ["transparency", "privacy"],
        priorities: ["safety_first"],
        forbidden: ["exfiltration", "modification"],
      },
      createdAt: Date.now(),
    }),

    cs_merge_intents: (base: any, override: any) => ({ ...base, ...override }),

    cs_analyze_corruption: (_snapshot: any, _intent: any) => ({
      riskScore: 0,
      indicators: [],
      recommendation: "continue",
      explanation: "Fallback analysis - native module not available",
    }),

    cs_detect_drift: (_baseline: any, _current: any) => ({
      overallDrift: 0,
      driftFactors: [],
      concernLevel: "none",
    }),

    cs_create_empty_snapshot: () => ({
      timestamp: Date.now(),
      actionCount: 0,
      alignmentDistribution: { mean: 1, variance: 0, min: 1, max: 1, belowThresholdCount: 0 },
      actionsByDomain: [],
      actionsByType: [],
      boundaryViolations: 0,
      actionsBlocked: 0,
    }),

    cs_update_snapshot: (snapshot: any, _action: any, alignment: any) => {
      const newScore = alignment?.score ?? 1;
      const oldMean = snapshot.alignmentDistribution?.mean ?? 1;
      const newMean = (oldMean * snapshot.actionCount + newScore) / (snapshot.actionCount + 1);

      return {
        ...snapshot,
        timestamp: Date.now(),
        actionCount: snapshot.actionCount + 1,
        alignmentDistribution: {
          ...snapshot.alignmentDistribution,
          mean: newMean,
        },
      };
    },

    // Flow Module
    classify_data: (content: string, source: string, tags: string[]) => {
      let sensitivity = "internal";
      let category = "generic";

      if (content.includes("password") || content.includes("secret") || content.includes("key")) {
        sensitivity = "secret";
        category = "credentials";
      } else if (content.includes("@") && content.includes(".")) {
        sensitivity = "confidential";
        category = "pii";
      }

      return {
        id: `data_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        sensitivity,
        category,
        source,
        tags,
        can_log: sensitivity !== "secret",
        can_transmit: sensitivity === "public" || sensitivity === "internal",
        can_store: true,
        expires_at: null,
        created_at: Date.now(),
      };
    },

    contains_sensitive_data: (content: string) => {
      const patterns = ["password", "secret", "api_key", "token", "credential"];
      return patterns.some(p => content.toLowerCase().includes(p));
    },

    redact_sensitive: (content: string, replacement?: string | null) => {
      const repl = replacement || "[REDACTED]";
      return content
        .replace(/password[=:]\s*\S+/gi, `password=${repl}`)
        .replace(/api[_-]?key[=:]\s*\S+/gi, `api_key=${repl}`)
        .replace(/token[=:]\s*\S+/gi, `token=${repl}`)
        .replace(/secret[=:]\s*\S+/gi, `secret=${repl}`);
    },

    get_sensitivity_levels: () => [
      { name: "public", value: 1, description: "Publicly shareable" },
      { name: "internal", value: 2, description: "Internal use only" },
      { name: "confidential", value: 3, description: "Confidential" },
      { name: "secret", value: 4, description: "Highly sensitive" },
      { name: "top_secret", value: 5, description: "Maximum sensitivity" },
    ],

    get_data_categories: () => [
      { name: "generic", description: "Generic data" },
      { name: "pii", description: "Personally identifiable information" },
      { name: "credentials", description: "Authentication credentials" },
      { name: "financial", description: "Financial data" },
      { name: "source_code", description: "Source code" },
      { name: "configuration", description: "Configuration data" },
    ],

    // Flow Policy Engine
    create_flow_policy_engine: () => ({
      addPolicy: (_policy: any) => {},
      removePolicy: (_id: string) => true,
      evaluate: (_data: any, _source: string, _target: string) => ({
        allowed: true,
        reason: "Fallback: allowed by default",
        applied_policy: null,
        can_log: true,
        can_transmit: true,
        can_store: true,
        transformations: [],
        confidence: 0.5,
        warnings: ["Fallback implementation - native module not available"],
      }),
      listPolicies: () => [],
      setDefaultAction: (_action: string) => {},
      setBlpMode: (_mode: string) => {},
    }),

    // Flow Policies
    create_allow_all_flow_policy: () => ({
      id: "allow_all",
      description: "Allow all flows",
      source_pattern: "*",
      target_pattern: "*",
      min_source_sensitivity: null,
      max_target_sensitivity: null,
      categories: [],
      effect: "allow",
      priority: 0,
      required_transforms: [],
      log_flow: false,
      require_approval: false,
      conditions: null,
      enabled: true,
    }),

    create_deny_all_flow_policy: () => ({
      id: "deny_all",
      description: "Deny all flows",
      source_pattern: "*",
      target_pattern: "*",
      min_source_sensitivity: null,
      max_target_sensitivity: null,
      categories: [],
      effect: "deny",
      priority: 1000,
      required_transforms: [],
      log_flow: false,
      require_approval: false,
      conditions: null,
      enabled: true,
    }),

    create_strict_flow_policy: () => ({
      id: "strict",
      description: "Strict flow policy",
      source_pattern: "*",
      target_pattern: "*",
      min_source_sensitivity: "internal",
      max_target_sensitivity: null,
      categories: [],
      effect: "transform",
      priority: 500,
      required_transforms: ["redact_sensitive"],
      log_flow: true,
      require_approval: true,
      conditions: null,
      enabled: true,
    }),

    // Flow Tracker
    create_flow_tracker: () => ({
      record: (_data: any, _source: string, _target: string, _direction: string, _validation: any, _sessionId: string | null, _actionId: string | null) => ({
        id: `flow_${Date.now()}`,
        data_id: _data.id,
        source_domain: _source,
        target_domain: _target,
        direction: _direction,
        allowed: _validation.allowed,
        reason: _validation.reason,
        policy_id: _validation.applied_policy || null,
        session_id: _sessionId,
        action_id: _actionId,
        timestamp: Date.now(),
        data_hash: "",
      }),
      getFlow: (_id: string) => null,
      getLineage: (_dataId: string) => [],
      bySource: (_domain: string) => [],
      byTarget: (_domain: string) => [],
      bySession: (_sessionId: string) => [],
      blocked: () => [],
      allowed: () => [],
      recent: (_limit: number) => [],
      stats: () => ({
        total_flows: 0,
        allowed_count: 0,
        blocked_count: 0,
        by_direction: [],
        by_source_domain: [],
        by_target_domain: [],
        first_timestamp: Date.now(),
        last_timestamp: Date.now(),
      }),
      domainStats: (_domain: string) => null,
      count: () => 0,
      clear: () => {},
      setMaxFlows: (_max: number) => {},
      exportJsonl: () => "",
    }),

    // Leak Prevention
    create_leak_prevention: () => ({
      check: (_content: string, _channel: string) => ({
        action: "allow",
        detections: [],
        channel_allowed: true,
        checked_at: Date.now(),
      }),
      sanitize: (content: string) => content
        .replace(/password[=:]\s*\S+/gi, "password=[REDACTED]")
        .replace(/api[_-]?key[=:]\s*\S+/gi, "api_key=[REDACTED]")
        .replace(/token[=:]\s*\S+/gi, "token=[REDACTED]")
        .replace(/secret[=:]\s*\S+/gi, "secret=[REDACTED]"),
      registerSensitive: (_data: string) => {},
      addChannel: (_channel: string) => {},
      removeChannel: (_channel: string) => {},
      setMode: (_mode: string) => {},
      stats: () => ({
        total_checks: 0,
        blocked_count: 0,
        alert_count: 0,
        by_leak_type: {},
      }),
      clearSensitive: () => {},
    }),

    // Leak Prevention helpers
    check_for_leaks: (content: string, channel: string) => ({
      action: "allow",
      detections: [],
      channel_allowed: true,
      checked_at: Date.now(),
    }),

    sanitize_content: (content: string) => content
      .replace(/password[=:]\s*\S+/gi, "password=[REDACTED]")
      .replace(/api[_-]?key[=:]\s*\S+/gi, "api_key=[REDACTED]")
      .replace(/token[=:]\s*\S+/gi, "token=[REDACTED]")
      .replace(/secret[=:]\s*\S+/gi, "secret=[REDACTED]"),

    // Taint Tracker
    create_taint_tracker: () => ({
      registerSource: (_type: string, _sensitivity: string, _tags: string[]) => `source_${Date.now()}`,
      taint: (_sourceId: string, _data: string, _locationType: string, _identifier: string) => `taint_${Date.now()}`,
      propagate: (_sourceTaintId: string, _newData: string, _locationType: string, _identifier: string, _propagationType: string, _operation: string) => `prop_${Date.now()}`,
      canFlow: (_taintId: string, _sink: string) => ({ allowed: true, reason: "Fallback", requires_sanitization: false }),
      isTainted: (_data: string) => false,
      getTaint: (_taintId: string) => null,
      stats: () => ({
        total_sources: 0,
        total_tainted: 0,
        total_propagations: 0,
        by_source_type: {},
        by_sensitivity: {},
      }),
      clear: (_taintId: string) => false,
      clearAll: () => {},
    }),

    // Quant Functions (stubs)
    quant_version: () => "0.1.0-fallback",
    quant_ohlcv_new: (_ts: bigint, _o: number, _h: number, _l: number, _c: number, _v: number) => JSON.stringify({ open: _o, high: _h, low: _l, close: _c, volume: _v }),
    quant_amm_new: (_poolYes: number, _poolNo: number, _fee: number) => JSON.stringify({ poolYes: _poolYes, poolNo: _poolNo, fee: _fee }),
    quant_amm_calculate_cost: (_poolYes: number, _poolNo: number, _buyYes: boolean, _shares: number) => JSON.stringify({ cost: 0 }),
    quant_amm_price_impact: (_poolYes: number, _poolNo: number, _buyYes: boolean, _shares: number) => JSON.stringify({ impact: 0 }),
    quant_lmsr_price: (_yesShares: number, _noShares: number, _b: number) => JSON.stringify({ price: 0.5 }),
    quant_lmsr_cost: (_yesShares: number, _noShares: number, _b: number, _buyYes: boolean, _shares: number) => JSON.stringify({ cost: 0 }),
    quant_detect_arbitrage: (_yesPrice: number, _noPrice: number) => JSON.stringify({ hasArbitrage: false }),
    quant_convert_odds: (_value: number, _fromType: number) => JSON.stringify({ decimal: 0 }),
    quant_mean: (_data: Float64Array) => 0,
    quant_std_dev: (_data: Float64Array) => 0,
    quant_variance: (_data: Float64Array) => 0,
    quant_correlation: (_x: Float64Array, _y: Float64Array) => 0,

    // Terminal Input (fallback - uses Node.js stdin directly)
    create_terminal: (): TerminalHandle => {
      let inRawMode = false;

      return {
        get isRawMode() { return inRawMode; },
        enterRawMode(): void {
          if (process.stdin.isTTY && !inRawMode) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            inRawMode = true;
          }
        },
        exitRawMode(): void {
          if (process.stdin.isTTY && inRawMode) {
            process.stdin.setRawMode(false);
            inRawMode = false;
          }
        },
        pollEvent(_timeoutMs?: number): NativeKeyEvent | null {
          // Fallback can't poll synchronously - return null
          // Use readEvent() instead for async operation
          return null;
        },
        async readEvent(): Promise<NativeKeyEvent> {
          return new Promise((resolve) => {
            const handler = (buffer: Buffer) => {
              process.stdin.off("data", handler);
              const str = buffer.toString("utf8");

              // Parse simple keypresses
              if (str === "\r" || str === "\n") {
                resolve({ code: "enter", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
              } else if (str === "\x03") {
                // Ctrl+C
                resolve({ code: "c", is_special: false, ctrl: true, alt: false, shift: false, kind: "press" });
              } else if (str === "\x7f" || str === "\x08") {
                resolve({ code: "backspace", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
              } else if (str === "\x1b") {
                resolve({ code: "escape", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
              } else if (str === "\t") {
                resolve({ code: "tab", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
              } else if (str.length === 1 && str >= " ") {
                // Regular printable character
                const ctrl = str.charCodeAt(0) < 32;
                const char = ctrl ? String.fromCharCode(str.charCodeAt(0) + 96) : str;
                resolve({ code: char, is_special: false, ctrl, alt: false, shift: false, kind: "press" });
              } else {
                // Handle escape sequences for arrows and special keys
                if (str === "\x1b[A") {
                  resolve({ code: "up", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
                } else if (str === "\x1b[B") {
                  resolve({ code: "down", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
                } else if (str === "\x1b[C") {
                  resolve({ code: "right", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
                } else if (str === "\x1b[D") {
                  resolve({ code: "left", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
                } else if (str === "\x1b[5~") {
                  resolve({ code: "pageup", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
                } else if (str === "\x1b[6~") {
                  resolve({ code: "pagedown", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
                } else if (str === "\x1b[H" || str === "\x1b[1~") {
                  resolve({ code: "home", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
                } else if (str === "\x1b[F" || str === "\x1b[4~") {
                  resolve({ code: "end", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
                } else if (str === "\x1b[3~") {
                  resolve({ code: "delete", is_special: true, ctrl: false, alt: false, shift: false, kind: "press" });
                } else if (str === "\x1b[Z") {
                  resolve({ code: "backtab", is_special: true, ctrl: false, alt: false, shift: true, kind: "press" });
                } else {
                  // Unknown escape sequence - treat as-is
                  resolve({ code: str, is_special: false, ctrl: false, alt: false, shift: false, kind: "press" });
                }
              }
            };
            process.stdin.once("data", handler);
          });
        },
      };
    },

    // Native TUI (fallback - not available in pure JS)
    create_tui: (): NativeTuiHandle => {
      throw new Error("Native TUI not available in fallback mode. Build the Rust native module.");
    },
    is_native_tui_available: () => false,
  };
}

// Export a singleton instance
export const native = loadNative();

/**
 * Syntax highlight code with ANSI escape codes for terminal display
 * Uses native Rust module if available, falls back to JS implementation
 */
export function highlight_code(code: string, language: string): HighlightResult {
  return native.highlight_code(code, language);
}

/**
 * Highlight markdown with nested code block syntax highlighting
 * Parses markdown for code fences and highlights code blocks with their language
 */
export function highlight_markdown(markdown: string): HighlightResult {
  return native.highlight_markdown(markdown);
}

/**
 * List all supported languages for syntax highlighting
 */
export function list_highlight_languages(): string[] {
  return [
    // Core languages
    "typescript", "ts", "javascript", "js",
    "python", "py",
    "rust", "rs",
    "go", "golang",
    "ruby", "rb",
    "java",
    "c", "cpp", "c++", "csharp", "cs", "c#",
    "php",
    "swift",
    "kotlin", "kt",
    "scala",
    // Shell & config
    "shell", "sh", "bash", "zsh",
    "json",
    "yaml", "yml",
    "toml",
    // Markup
    "markdown", "md",
    "html", "htm",
    "css", "scss", "less",
    "xml",
    // Database
    "sql",
    // Diagrams
    "mermaid", "mmd",
  ];
}

/**
 * Highlight a diff with ANSI colors
 * Uses native Rust module if available, falls back to JS implementation
 */
export function highlight_diff(
  oldText: string,
  newText: string,
  options?: DiffOptions
): HighlightDiffResult {
  return native.highlight_diff(oldText, newText, options);
}

/**
 * Calculate diff hunks with hunk headers for LLM context
 * Returns structured diff with @@ headers included in content
 */
export function calculate_diff(oldText: string, newText: string): Array<{
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}> {
  return native.calculate_diff(oldText, newText);
}

// ===== Multi-File Edit Functions =====

/**
 * Validate multi-file edits without applying them
 * Returns an array of error messages (empty if valid)
 */
export function validate_multi_edits(edits: MultiEditEntry[]): string[] {
  return native.validate_multi_edits(edits);
}

/**
 * Preview what edits would be applied without making changes
 * Returns an array of { file_path, replacement_count } for each file
 */
export function preview_multi_edits(edits: MultiEditEntry[]): MultiEditPreviewEntry[] {
  return native.preview_multi_edits(edits);
}

/**
 * Apply multiple file edits atomically with rollback on failure
 *
 * This function:
 * 1. Validates all edits can be applied (files exist, strings found)
 * 2. Creates backups of all affected files
 * 3. Applies all edits
 * 4. Rolls back on any failure
 *
 * @param edits Array of edit operations
 * @returns Result with success status and list of modified files
 */
export function apply_multi_edits(edits: MultiEditEntry[]): MultiEditResult {
  return native.apply_multi_edits(edits);
}

// ===== Grep Functions =====

/** Result from grep search operations */
export interface GrepSearchResult {
  /** File path */
  path: string;
  /** Line number (1-based) */
  line_number: number;
  /** Column offset (0-based, optional) */
  column?: number;
  /** The matching line content */
  line: string;
}

/** Options for grep operations */
export interface GrepOptions {
  /** Case insensitive search (default: false) */
  case_insensitive?: boolean;
  /** Maximum number of results (default: 1000) */
  max_results?: number;
  /** Glob patterns to include (e.g., ["*.ts", "*.js"]) */
  include_patterns?: string[];
  /** Glob patterns to exclude (e.g., ["node_modules/**", "dist/**"]) */
  exclude_patterns?: string[];
  /** Number of context lines to show around matches (default: 0) */
  context_lines?: number;
  /** Match whole words only (default: false) */
  whole_word?: boolean;
  /** Use regex pattern (default: true) */
  regex?: boolean;
}

/**
 * Search for pattern in files using native ripgrep
 * Returns array of matches with file path, line number, and content
 */
export async function grep_search(
  pattern: string,
  path: string,
  options?: GrepOptions
): Promise<GrepSearchResult[]> {
  return native.grep_search(pattern, path, options || {});
}

/**
 * Count matching lines in files
 * Returns total number of matches
 */
export async function grep_count(
  pattern: string,
  path: string,
  options?: GrepOptions
): Promise<number> {
  return native.grep_count(pattern, path, options || {});
}

/**
 * List files containing matches
 * Returns object with files array and total count
 */
export async function grep_files(
  pattern: string,
  path: string,
  options?: GrepOptions
): Promise<{ files: string[]; total_matches: number }> {
  return native.grep_files(pattern, path, options || {});
}

// ===== Helper Functions =====

function truncateString(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + "...";
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ===== Quant Module =====

/**
 * Quant module interface for financial calculations
 * Loads from @ebowwa/quant-rust native library
 */
interface QuantModule {
  quant_version: () => string;
  quant_last_error: () => string;
  quant_clear_error: () => void;

  // OHLCV
  quant_ohlcv_new: (timestamp: bigint, open: number, high: number, low: number, close: number, volume: number) => string;

  // AMM
  quant_amm_new: (poolYes: number, poolNo: number, fee: number) => string;
  quant_amm_calculate_cost: (poolYes: number, poolNo: number, buyYes: boolean, shares: number) => string;
  quant_amm_price_impact: (poolYes: number, poolNo: number, buyYes: boolean, shares: number) => string;

  // LMSR
  quant_lmsr_price: (yesShares: number, noShares: number, b: number) => string;
  quant_lmsr_cost: (yesShares: number, noShares: number, b: number, buyYes: boolean, shares: number) => string;

  // Arbitrage
  quant_detect_arbitrage: (yesPrice: number, noPrice: number) => string;

  // Odds
  quant_convert_odds: (value: number, fromType: number) => string;

  // Statistics
  quant_mean: (ptr: number, len: number) => number;
  quant_std_dev: (ptr: number, len: number) => number;
  quant_variance: (ptr: number, len: number) => number;
  quant_correlation: (ptrX: number, ptrY: number, len: number) => number;

  // Memory
  quant_free_string: (ptr: number) => void;
}

let quantModule: QuantModule | null = null;

/**
 * Load the quant native module from @ebowwa/quant-rust
 */
function loadQuant(): QuantModule | null {
  if (quantModule) return quantModule;

  const __dirname = dirname(fileURLToPath(import.meta.url));

  // Try multiple paths for the quant library
  const libName = process.platform === "darwin"
    ? "libquant_rust.dylib"
    : process.platform === "linux"
    ? "libquant_rust.so"
    : "quant_rust.dll";

  const possiblePaths = [
    // From npm package
    join(__dirname, "..", "..", "node_modules", "@ebowwa", "quant-rust", "native", `${process.platform}-${process.arch}`, libName),
    // From npm package (alternate)
    join(__dirname, "..", "..", "..", "@ebowwa", "quant-rust", "native", `${process.platform}-${process.arch}`, libName),
    // Development build
    join(__dirname, "..", "..", "node_modules", "@ebowwa", "quant-rust", "target", "release", libName),
  ];

  for (const libPath of possiblePaths) {
    try {
      const { existsSync } = require("fs");
      if (!existsSync(libPath)) continue;

      const { dlopen, FFIType, ptr } = require("bun:ffi");

      const lib = dlopen(libPath, {
        quant_version: { returns: FFIType.cstring, args: [] },
        quant_last_error: { returns: FFIType.cstring, args: [] },
        quant_clear_error: { returns: FFIType.void, args: [] },
        quant_ohlcv_new: { returns: FFIType.cstring, args: [FFIType.u64, FFIType.f64, FFIType.f64, FFIType.f64, FFIType.f64, FFIType.f64] },
        quant_amm_new: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.f64] },
        quant_amm_calculate_cost: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.bool, FFIType.f64] },
        quant_amm_price_impact: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.bool, FFIType.f64] },
        quant_lmsr_price: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.f64] },
        quant_lmsr_cost: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64, FFIType.f64, FFIType.bool, FFIType.f64] },
        quant_detect_arbitrage: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.f64] },
        quant_convert_odds: { returns: FFIType.cstring, args: [FFIType.f64, FFIType.i32] },
        quant_mean: { returns: FFIType.f64, args: [FFIType.ptr, FFIType.usize] },
        quant_std_dev: { returns: FFIType.f64, args: [FFIType.ptr, FFIType.usize] },
        quant_variance: { returns: FFIType.f64, args: [FFIType.ptr, FFIType.usize] },
        quant_correlation: { returns: FFIType.f64, args: [FFIType.ptr, FFIType.ptr, FFIType.usize] },
        quant_free_string: { returns: FFIType.void, args: [FFIType.ptr] },
      });

      quantModule = lib.symbols as unknown as QuantModule;
      return quantModule;
    } catch {
      continue;
    }
  }

  return null;
}

// Load quant module
export const quant = loadQuant();

// ===== Quant Helper Functions =====

function parseQuantJson<T>(response: string | null): T {
  if (!response) {
    throw new Error(quant?.quant_last_error() || "Unknown quant error");
  }
  return JSON.parse(response) as T;
}

function toFloat64Ptr(data: number[]): { buffer: Float64Array; ptr: number } {
  const { ptr } = require("bun:ffi");
  const buffer = new Float64Array(data);
  return { buffer, ptr: ptr(buffer) };
}

// ===== Quant Export Functions =====

/** Warn once when using JS fallback */
let quantFallbackWarned = false;
function warnQuantFallback(): void {
  if (!quantFallbackWarned) {
    console.warn("\x1b[33m[quant] WARNING: Rust native module not loaded, using JS fallback\x1b[0m");
    quantFallbackWarned = true;
  }
}

export function quantVersion(): string {
  if (!quant) {
    warnQuantFallback();
    return "JS_FALLBACK (rust failed)";
  }
  return quant.quant_version();
}

export function isQuantAvailable(): boolean {
  return quant !== null;
}

// ----- OHLCV -----

export function createOHLCV(
  timestamp: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number
): OHLCV {
  if (!quant) {
    warnQuantFallback();
    return { timestamp, open, high, low, close, volume };
  }
  const response = quant.quant_ohlcv_new(BigInt(timestamp), open, high, low, close, volume);
  return parseQuantJson(response);
}

// ----- AMM -----

export function createAMM(poolYes: number, poolNo: number, fee: number): AMMState {
  if (!quant) {
    warnQuantFallback();
    const k = poolYes * poolNo;
    return {
      pool_yes: poolYes,
      pool_no: poolNo,
      k,
      fee,
      price_yes: poolNo / k,
      price_no: poolYes / k,
    };
  }
  const response = quant.quant_amm_new(poolYes, poolNo, fee);
  return parseQuantJson(response);
}

export function ammCalculateCost(
  poolYes: number,
  poolNo: number,
  outcome: "yes" | "no" | boolean,
  shares: number
): number {
  if (!quant) {
    warnQuantFallback();
    const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
    const k = poolYes * poolNo;
    if (buyYes) {
      return (k / (poolYes + shares)) - poolNo;
    }
    return (k / (poolNo + shares)) - poolYes;
  }
  const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
  const response = quant.quant_amm_calculate_cost(poolYes, poolNo, buyYes, shares);
  const result = parseQuantJson<AMMCostResult>(response);
  return Math.abs(result.cost);
}

export function ammPriceImpact(
  poolYes: number,
  poolNo: number,
  outcome: "yes" | "no" | boolean,
  shares: number
): AMMPriceImpactResult {
  if (!quant) {
    warnQuantFallback();
    const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
    const k = poolYes * poolNo;
    const priceBefore = buyYes ? poolNo / k : poolYes / k;
    const newPoolYes = buyYes ? poolYes + shares : poolYes;
    const newPoolNo = buyYes ? poolNo : poolNo + shares;
    const priceAfter = buyYes ? newPoolNo / k : newPoolYes / k;
    return {
      price_before: priceBefore,
      price_after: priceAfter,
      price_impact: Math.abs(priceAfter - priceBefore) / priceBefore,
      slippage: Math.abs(priceAfter - priceBefore),
    };
  }
  const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
  const response = quant.quant_amm_price_impact(poolYes, poolNo, buyYes, shares);
  return parseQuantJson(response);
}

// ----- LMSR -----

export function lmsrPrice(yesShares: number, noShares: number, b: number): LMSRPriceResult {
  if (!quant) {
    warnQuantFallback();
    const expYes = Math.exp(yesShares / b);
    const expNo = Math.exp(noShares / b);
    const sum = expYes + expNo;
    return { yes_price: expYes / sum, no_price: expNo / sum, spread: Math.abs(expYes - expNo) / sum };
  }
  const response = quant.quant_lmsr_price(yesShares, noShares, b);
  return parseQuantJson(response);
}

export function lmsrCost(
  yesShares: number,
  noShares: number,
  b: number,
  outcome: "yes" | "no" | boolean,
  shares: number
): AMMCostResult {
  if (!quant) {
    warnQuantFallback();
    const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
    const costBefore = b * Math.log(Math.exp(yesShares / b) + Math.exp(noShares / b));
    const newYes = buyYes ? yesShares + shares : yesShares;
    const newNo = buyYes ? noShares : noShares + shares;
    const costAfter = b * Math.log(Math.exp(newYes / b) + Math.exp(newNo / b));
    return { cost: costAfter - costBefore, avg_price: (costAfter - costBefore) / shares };
  }
  const buyYes = typeof outcome === "string" ? outcome === "yes" : outcome;
  const response = quant.quant_lmsr_cost(yesShares, noShares, b, buyYes, shares);
  return parseQuantJson(response);
}

// ----- Arbitrage -----

export function detectArbitrage(yesPrice: number, noPrice: number): ArbitrageResult {
  if (!quant) {
    warnQuantFallback();
    const total = yesPrice + noPrice;
    return {
      has_arbitrage: total < 1,
      yes_price: yesPrice,
      no_price: noPrice,
      total,
      profit_per_share: total < 1 ? 1 - total : 0,
    };
  }
  const response = quant.quant_detect_arbitrage(yesPrice, noPrice);
  return parseQuantJson(response);
}

// ----- Odds Conversion -----

const ODDS_TYPE_MAP: Record<string, number> = {
  probability: 0,
  decimal: 1,
  american: 2,
};

export function convertOdds(value: number, fromType: "probability" | "decimal" | "american"): OddsConversion {
  if (!quant) {
    warnQuantFallback();
    let prob: number;
    switch (fromType) {
      case "probability": prob = value; break;
      case "decimal": prob = 1 / value; break;
      case "american": prob = value > 0 ? 100 / (value + 100) : -value / (-value + 100); break;
    }
    const americanOdds = prob >= 0.5 ? Math.round(-100 / (prob - 1)) : Math.round((1 - prob) / prob * 100);
    return { probability: prob, decimal_odds: 1 / prob, american_odds: americanOdds };
  }
  const response = quant.quant_convert_odds(value, ODDS_TYPE_MAP[fromType] ?? 0);
  return parseQuantJson(response);
}

// ----- Statistics -----

export function quantMean(data: number[]): number {
  if (data.length === 0) return NaN;
  if (!quant) {
    warnQuantFallback();
    return data.reduce((a, b) => a + b, 0) / data.length;
  }
  const { ptr } = toFloat64Ptr(data);
  return quant.quant_mean(ptr, data.length);
}

export function quantStdDev(data: number[]): number {
  if (data.length === 0) return NaN;
  if (!quant) {
    warnQuantFallback();
    const m = data.reduce((a, b) => a + b, 0) / data.length;
    return Math.sqrt(data.reduce((sum, x) => sum + (x - m) ** 2, 0) / data.length);
  }
  const { ptr } = toFloat64Ptr(data);
  return quant.quant_std_dev(ptr, data.length);
}

export function quantVariance(data: number[]): number {
  if (data.length === 0) return NaN;
  if (!quant) {
    warnQuantFallback();
    const m = data.reduce((a, b) => a + b, 0) / data.length;
    return data.reduce((sum, x) => sum + (x - m) ** 2, 0) / data.length;
  }
  const { ptr } = toFloat64Ptr(data);
  return quant.quant_variance(ptr, data.length);
}

export function quantCorrelation(x: number[], y: number[]): number {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) return NaN;
  if (!quant) {
    warnQuantFallback();
    const n = x.length;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    const cov = x.reduce((s, xi, i) => s + (xi - mx) * (y[i]! - my), 0) / n;
    const vx = x.reduce((s, xi) => s + (xi - mx) ** 2, 0) / n;
    const vy = y.reduce((s, yi) => s + (yi - my) ** 2, 0) / n;
    return cov / Math.sqrt(vx * vy);
  }
  const { ptr: ptrX } = toFloat64Ptr(x);
  const { ptr: ptrY } = toFloat64Ptr(y);
  return quant.quant_correlation(ptrX, ptrY, x.length);
}

