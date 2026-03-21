/**
 * Native Module Interface
 * Type definitions for the Rust-compiled native module
 *
 * @module native/types/native-module
 */

// Import all required types from other modules
import type {
  HighlightResult,
  HighlightDiffResult,
  DiffOptions,
  MultiEditEntry,
  MultiEditResult,
  MultiEditPreviewEntry,
  GrepSearchResult,
  GrepOptions,
  NativeKeyEvent,
  TerminalHandle,
  TuiStyle,
  TuiTextSegment,
  TuiTextLine,
  TuiTextBlock,
  TuiBorders,
  TuiPadding,
  NativeTuiHandle,
  TuiColor,
} from "./index.js";

/**
 * Native module interface
 * Contains all functions exported by the Rust native module
 */
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

  // ===== TUI Style Functions =====

  /** Create default style */
  tui_style_default: () => TuiStyle;

  /** Create style with foreground color */
  tui_style_fg: (color: TuiColor) => TuiStyle;

  /** Create style with background color */
  tui_style_bg: (color: TuiColor) => TuiStyle;

  /** Create style with RGB foreground */
  tui_style_rgb_fg: (r: number, g: number, b: number) => TuiStyle;

  /** Create style with RGB background */
  tui_style_rgb_bg: (r: number, g: number, b: number) => TuiStyle;

  /** Create bold style */
  tui_style_bold: () => TuiStyle;

  /** Create dim style */
  tui_style_dim: () => TuiStyle;

  /** Create user message style (cyan + bold) */
  tui_style_user: () => TuiStyle;

  /** Create assistant message style (magenta + bold) */
  tui_style_assistant: () => TuiStyle;

  /** Create system message style (yellow + bold) */
  tui_style_system: () => TuiStyle;

  /** Create error style (red) */
  tui_style_error: () => TuiStyle;

  /** Create success style (green) */
  tui_style_success: () => TuiStyle;

  /** Create tool style (yellow) */
  tui_style_tool: () => TuiStyle;

  /** Create highlight style (bright cyan + bold) */
  tui_style_highlight: () => TuiStyle;

  /** Create muted style (bright black) */
  tui_style_muted: () => TuiStyle;

  // ===== TUI Text Functions =====

  /** Create a text segment */
  tui_text_segment: (content: string, style?: TuiStyle) => TuiTextSegment;

  /** Create a plain text line */
  tui_text_line_plain: (content: string) => TuiTextLine;

  /** Create a styled text line */
  tui_text_line_styled: (content: string, style: TuiStyle) => TuiTextLine;

  /** Create a text line from segments */
  tui_text_line: (segments: TuiTextSegment[]) => TuiTextLine;

  /** Create a text block from lines */
  tui_text_block: (lines: TuiTextLine[]) => TuiTextBlock;

  /** Create a plain text block */
  tui_text_block_plain: (content: string) => TuiTextBlock;

  // ===== TUI Box Functions =====

  /** Create borders on all sides */
  tui_borders_all: () => TuiBorders;

  /** Create no borders */
  tui_borders_none: () => TuiBorders;

  /** Create horizontal borders */
  tui_borders_horizontal: () => TuiBorders;

  /** Create vertical borders */
  tui_borders_vertical: () => TuiBorders;

  /** Create top border only */
  tui_borders_top: () => TuiBorders;

  /** Create bottom border only */
  tui_borders_bottom: () => TuiBorders;

  /** Create uniform padding */
  tui_padding_uniform: (value: number) => TuiPadding;

  /** Create horizontal padding */
  tui_padding_horizontal: (value: number) => TuiPadding;

  /** Create vertical padding */
  tui_padding_vertical: (value: number) => TuiPadding;

  /** Draw a horizontal line */
  tui_draw_horizontal_line: (width: number, style?: TuiStyle) => string;

  /** Draw a vertical line */
  tui_draw_vertical_line: (height: number, style?: TuiStyle) => string;

  /** Draw a box border */
  tui_draw_box_border: (width: number, height: number, title?: string, style?: TuiStyle) => string;

  /** Draw a box with content */
  tui_draw_box: (width: number, height: number, title: string | null, content: string, style?: TuiStyle) => string;

  /** Draw a separator line */
  tui_draw_separator: (width: number, style?: TuiStyle) => string;

  /** Draw a double separator line */
  tui_draw_double_separator: (width: number, style?: TuiStyle) => string;

  // ===== TUI Buffer Functions =====

  /** Render a text line to ANSI */
  tui_render_line: (line: TuiTextLine, width?: number) => string;

  /** Render a text block to ANSI */
  tui_render_block: (block: TuiTextBlock, width?: number) => string;

  /** Render a message with prefix */
  tui_render_message: (prefix: string, content: string, prefixStyle?: TuiStyle, width?: number) => string;

  /** Render a status bar */
  tui_render_status_bar: (left: string, right: string, style?: TuiStyle, width?: number) => string;

  /** Clear screen ANSI sequence */
  tui_clear_screen: () => string;

  /** Hide cursor ANSI sequence */
  tui_hide_cursor: () => string;

  /** Show cursor ANSI sequence */
  tui_show_cursor: () => string;

  /** Move cursor ANSI sequence */
  tui_move_cursor: (row: number, col: number) => string;

  /** Enter alternate screen ANSI sequence */
  tui_enter_alt_screen: () => string;

  /** Exit alternate screen ANSI sequence */
  tui_exit_alt_screen: () => string;

  /** Reset style ANSI sequence */
  tui_reset_style: () => string;

  /** Apply style to text */
  tui_styled_text: (content: string, style: TuiStyle) => string;
}
