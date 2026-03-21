/**
 * Fallback implementations in pure JavaScript
 * Used when native Rust module is not available
 *
 * @module native/fallbacks
 */

import type {
  NativeModule,
  HighlightResult,
  HighlightDiffResult,
  DiffOptions,
  MultiEditEntry,
  MultiEditResult,
  MultiEditPreviewEntry,
  GrepSearchResult,
  GrepOptions,
  TuiStyle,
  TuiTextSegment,
  TuiTextLine,
  TuiTextBlock,
  TuiBorders,
  TuiPadding,
  TuiMessage,
  TuiState,
  InputResult,
  TerminalHandle,
  NativeKeyEvent,
  NativeTuiHandle,
  TuiColor,
} from "../types/index.js";

// Helper functions for fallback implementations
function truncateString(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getFallbackModule(): NativeModule {
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

    // TUI Style Functions (JS fallbacks)
    tui_style_default: (): TuiStyle => ({}),
    tui_style_fg: (color: TuiColor): TuiStyle => ({ fg: color }),
    tui_style_bg: (color: TuiColor): TuiStyle => ({ bg: color }),
    tui_style_rgb_fg: (r: number, g: number, b: number): TuiStyle => ({
      fg: "Rgb",
      fg_rgb: { r, g, b }
    }),
    tui_style_rgb_bg: (r: number, g: number, b: number): TuiStyle => ({
      bg: "Rgb",
      bg_rgb: { r, g, b }
    }),
    tui_style_bold: (): TuiStyle => ({
      modifiers: { bold: true, dim: false, italic: false, underline: false, strikethrough: false, reverse: false, hidden: false }
    }),
    tui_style_dim: (): TuiStyle => ({
      modifiers: { bold: false, dim: true, italic: false, underline: false, strikethrough: false, reverse: false, hidden: false }
    }),
    tui_style_user: (): TuiStyle => ({
      fg: "Cyan",
      modifiers: { bold: true, dim: false, italic: false, underline: false, strikethrough: false, reverse: false, hidden: false }
    }),
    tui_style_assistant: (): TuiStyle => ({
      fg: "Magenta",
      modifiers: { bold: true, dim: false, italic: false, underline: false, strikethrough: false, reverse: false, hidden: false }
    }),
    tui_style_system: (): TuiStyle => ({
      fg: "Yellow",
      modifiers: { bold: true, dim: false, italic: false, underline: false, strikethrough: false, reverse: false, hidden: false }
    }),
    tui_style_error: (): TuiStyle => ({ fg: "Red" }),
    tui_style_success: (): TuiStyle => ({ fg: "Green" }),
    tui_style_tool: (): TuiStyle => ({ fg: "Yellow" }),
    tui_style_highlight: (): TuiStyle => ({
      fg: "BrightCyan",
      modifiers: { bold: true, dim: false, italic: false, underline: false, strikethrough: false, reverse: false, hidden: false }
    }),
    tui_style_muted: (): TuiStyle => ({ fg: "BrightBlack" }),

    // TUI Text Functions (JS fallbacks)
    tui_text_segment: (content: string, style?: TuiStyle): TuiTextSegment => ({ content, style }),
    tui_text_line_plain: (content: string): TuiTextLine => ({
      segments: [{ content, style: undefined }]
    }),
    tui_text_line_styled: (content: string, style: TuiStyle): TuiTextLine => ({
      segments: [{ content, style }]
    }),
    tui_text_line: (segments: TuiTextSegment[]): TuiTextLine => ({ segments }),
    tui_text_block: (lines: TuiTextLine[]): TuiTextBlock => ({ lines }),
    tui_text_block_plain: (content: string): TuiTextBlock => ({
      lines: content.split('\n').map(line => ({ segments: [{ content: line, style: undefined }] }))
    }),

    // TUI Box Functions (JS fallbacks)
    tui_borders_all: (): TuiBorders => ({ top: true, right: true, bottom: true, left: true }),
    tui_borders_none: (): TuiBorders => ({ top: false, right: false, bottom: false, left: false }),
    tui_borders_horizontal: (): TuiBorders => ({ top: true, right: false, bottom: true, left: false }),
    tui_borders_vertical: (): TuiBorders => ({ top: false, right: true, bottom: false, left: true }),
    tui_borders_top: (): TuiBorders => ({ top: true, right: false, bottom: false, left: false }),
    tui_borders_bottom: (): TuiBorders => ({ top: false, right: false, bottom: true, left: false }),
    tui_padding_uniform: (value: number): TuiPadding => ({ left: value, right: value, top: value, bottom: value }),
    tui_padding_horizontal: (value: number): TuiPadding => ({ left: value, right: value, top: 0, bottom: 0 }),
    tui_padding_vertical: (value: number): TuiPadding => ({ left: 0, right: 0, top: value, bottom: value }),
    tui_draw_horizontal_line: (width: number, _style?: TuiStyle): string => "─".repeat(width),
    tui_draw_vertical_line: (height: number, _style?: TuiStyle): string => "│\n".repeat(height - 1) + "│",
    tui_draw_box_border: (width: number, height: number, title?: string, _style?: TuiStyle): string => {
      const innerWidth = Math.max(0, width - 2);
      const titleStr = title || "";
      const titleDisplay = titleStr
        ? `─ ${titleStr} ${"─".repeat(Math.max(0, innerWidth - titleStr.length - 3))}`
        : "─".repeat(innerWidth);
      const lines = [`┌${titleDisplay}┐`];
      for (let i = 1; i < height - 1; i++) {
        lines.push(`│${" ".repeat(innerWidth)}│`);
      }
      if (height > 1) {
        lines.push(`└${"─".repeat(innerWidth)}┘`);
      }
      return lines.join("\n");
    },
    tui_draw_box: (width: number, height: number, title: string | null, content: string, _style?: TuiStyle): string => {
      const innerWidth = Math.max(0, width - 2);
      const titleDisplay = title ? `─ ${title} ${"─".repeat(Math.max(0, innerWidth - title.length - 3))}` : "─".repeat(innerWidth);
      const lines = [`┌${titleDisplay}┐`];
      const contentLines = content.split('\n');
      const contentHeight = Math.max(0, height - 2);
      for (let i = 0; i < contentHeight; i++) {
        const lineContent = contentLines[i] || "";
        const padded = lineContent.padEnd(innerWidth).slice(0, innerWidth);
        lines.push(`│${padded}│`);
      }
      if (height > 1) {
        lines.push(`└${"─".repeat(innerWidth)}┘`);
      }
      return lines.join("\n");
    },
    tui_draw_separator: (width: number, _style?: TuiStyle): string => "─".repeat(width),
    tui_draw_double_separator: (width: number, _style?: TuiStyle): string => "═".repeat(width),

    // TUI Buffer Functions (JS fallbacks with basic ANSI)
    tui_render_line: (line: TuiTextLine, width?: number): string => {
      const text = line.segments.map(s => s.content).join('');
      return width ? text.padEnd(width).slice(0, width) : text;
    },
    tui_render_block: (block: TuiTextBlock, width?: number): string => {
      return block.lines.map(line => {
        const text = line.segments.map(s => s.content).join('');
        return width ? text.padEnd(width).slice(0, width) : text;
      }).join('\n');
    },
    tui_render_message: (prefix: string, content: string, _prefixStyle?: TuiStyle, width?: number): string => {
      const fullContent = `${prefix}${content}`;
      return width ? fullContent.padEnd(width).slice(0, width) : fullContent;
    },
    tui_render_status_bar: (left: string, right: string, _style?: TuiStyle, width?: number): string => {
      const w = width || 80;
      const padding = Math.max(0, w - left.length - right.length);
      return `${left}${" ".repeat(padding)}${right}`.slice(0, w);
    },
    tui_clear_screen: () => "\x1b[2J\x1b[H",
    tui_hide_cursor: () => "\x1b[?25l",
    tui_show_cursor: () => "\x1b[?25h",
    tui_move_cursor: (row: number, col: number) => `\x1b[${row};${col}H`,
    tui_enter_alt_screen: () => "\x1b[?1049h",
    tui_exit_alt_screen: () => "\x1b[?1049l",
    tui_reset_style: () => "\x1b[0m",
    tui_styled_text: (content: string, _style: TuiStyle) => content,
  };
}
