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
    join(__dirname, "..", "..", "native"),  // dist/../native
    join(__dirname, "..", "native"),        // src/../native
  ];

  // Try .node files first (NAPI modules)
  const nodeFiles = ["index.darwin-arm64.node", "index.darwin-x64.node", "index.node"];

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
            count_tokens: native.countTokens || native.count_tokens,
            calculate_diff: native.calculateDiff || native.calculate_diff,
            compact_content: native.compactContent || native.compact_content,
            count_tool_use: native.countToolUse || native.count_tool_use,
            find_tool_pairs: native.findToolPairs || native.find_tool_pairs,
            find_common_patterns: native.findCommonPatterns || native.find_common_patterns,
            validate_multi_edits: native.validateMultiEdits || native.validate_multi_edits,
            preview_multi_edits: native.previewMultiEdits || native.preview_multi_edits,
            apply_multi_edits: native.applyMultiEdits || native.apply_multi_edits,
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
      // Simple syntax highlighting fallback using ANSI colors
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
      };

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
      total_price: total,
      profit_per_share: total < 1 ? 1 - total : 0,
      profit_bps: total < 1 ? (1 - total) * 10000 : 0,
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

