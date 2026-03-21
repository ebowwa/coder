/**
 * Native Module Types
 * Re-exports all type definitions for the native module
 *
 * @module native/types
 */

// ===== Highlight Types =====
export type {
  HighlightResult,
  HighlightDiffResult,
  DiffOptions,
} from "./highlight.js";

// ===== Multi-File Edit Types =====
export type {
  MultiEditEntry,
  MultiEditResult,
  MultiEditPreviewEntry,
} from "./multi-edit.js";

// ===== Quant Types =====
export type {
  OHLCV,
  AMMState,
  AMMCostResult,
  AMMPriceImpactResult,
  LMSRPriceResult,
  ArbitrageResult,
  OddsConversion,
  VaRResult,
  DrawdownResult,
  SharpeResult,
} from "./quant.js";

// ===== Code Search Types =====
export type {
  SymbolInfo,
  IndexFile,
  SearchOptions,
  SymbolMatch,
  CodeSearchResult,
  CodeSearchResults,
  LanguageStats,
  CodeIndexStats,
  CodeSearchIndexClass,
} from "./code-search.js";

// ===== Grep Types =====
export type {
  GrepSearchResult,
  GrepOptions,
} from "../../schemas/index.js";

// ===== Terminal Types =====
export type {
  NativeKeyEvent,
  TerminalHandle,
} from "./terminal.js";

// ===== TUI Types =====
export type {
  TuiRgb,
  TuiColor,
  TuiModifiers,
  TuiStyle,
  TuiTextSegment,
  TuiTextLine,
  TuiTextBlock,
  TuiBorderType,
  TuiBorders,
  TuiPadding,
  TuiMessage,
  TuiState,
  InputResult,
  NativeTuiHandle,
} from "./tui.js";

// ===== Native Module Interface =====
export type { NativeModule } from "./native-module.js";
