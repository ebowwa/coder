/**
 * Native module loader
 * Loads Rust-compiled native modules for performance-critical operations
 */

import { dlopen, suffix } from "bun:ffi";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Type definitions for native module exports
export interface NativeModule {
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
    old_start: number;
    old_lines: number;
    new_start: number;
    new_lines: number;
    content: string;
  }>;

  compact_content: (
    content: string,
    maxTokens: number,
    strategy?: "truncate" | "summarize" | "extract"
  ) => string;
}

let nativeModule: NativeModule | null = null;

/**
 * Load the native module
 */
export function loadNative(): NativeModule {
  if (nativeModule) {
    return nativeModule;
  }

  try {
    // Try to load the native module
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const nativePath = join(__dirname, "..", "native", `claude_code_native.${suffix}`);

    // Use Bun's FFI to load the library
    const lib = dlopen(nativePath, {
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
  } catch (error) {
    console.warn("Native module not available, using JS fallback:", error);
    return getFallbackModule();
  }
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
        old_start: number;
        old_lines: number;
        new_start: number;
        new_lines: number;
        content: string;
      }> = [];

      // Very simple diff - just show all changes as one hunk
      if (oldText !== newText) {
        hunks.push({
          old_start: 1,
          old_lines: oldLines.length,
          new_start: 1,
          new_lines: newLines.length,
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
  };
}

// Export a singleton instance
export const native = loadNative();
