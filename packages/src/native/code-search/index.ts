/**
 * Code Search Index Module
 * Tantivy-based code search with JS fallback
 *
 * @module native/code-search
 */

import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Type imports
import type {
  SymbolInfo,
  IndexFile,
  SearchOptions,
  SymbolMatch,
  CodeSearchResult,
  CodeSearchResults,
  LanguageStats,
  CodeIndexStats,
  CodeSearchIndexClass,
} from "../types/index.js";

// ============================================================================
// Native Class Loader
// ============================================================================

// Track the native class constructor
let nativeCodeSearchIndexClass: (new (index_path: string) => CodeSearchIndexClass | null) | null = null;

/**
 * Load the native CodeSearchIndex class if available
 */
function loadCodeSearchIndexClass(): (new (index_path: string) => CodeSearchIndexClass | null) | null {
  if (nativeCodeSearchIndexClass) {
    return nativeCodeSearchIndexClass;
  }

  // Try to get the class from the native module
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const basePaths = [
      join(__dirname, "..", "native"),
      join(__dirname, "..", "..", "native"),
      join(__dirname, "..", "..", "..", "native"),
      join(__dirname, "..", "..", "..", "..", "native"),
      join(__dirname, "..", "..", "..", "..", "..", "native"),
      join(__dirname, "..", "..", "..", "..", "..", "..", "native"),
      join(__dirname, "native"),
    ];

    const nodeFiles = [
      `index.${process.platform}-${process.arch}.node`,
      `index.${process.platform}-${process.arch}-gnu.node`,
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
          const nativeModule = require(nativePath);
          if (nativeModule.CodeSearchIndex) {
            nativeCodeSearchIndexClass = nativeModule.CodeSearchIndex;
            return nativeCodeSearchIndexClass;
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    // Native module not available
  }

  return null;
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Check if native CodeSearchIndex is available
 */
export function isCodeSearchIndexAvailable(): boolean {
  return loadCodeSearchIndexClass() !== null;
}

// ============================================================================
// Fallback Implementation
// ============================================================================

/**
 * Fallback CodeSearchIndex implementation in pure JavaScript
 * Uses a simple in-memory search with basic text matching
 */
class FallbackCodeSearchIndex {
  private indexPath: string;
  private documents: Map<string, { content: string; language?: string; symbols: SymbolInfo[] }>;

  constructor(indexPath: string) {
    this.indexPath = indexPath;
    this.documents = new Map();
  }

  get path(): string {
    return this.indexPath;
  }

  index_file(path: string, content: string, language?: string, symbols?: SymbolInfo[]): void {
    this.documents.set(path, {
      content,
      language: language || this.detectLanguage(path),
      symbols: symbols || [],
    });
  }

  index_batch(files: IndexFile[]): void {
    for (const file of files) {
      this.index_file(file.path, file.content, file.language, file.symbols);
    }
  }

  index_directory(dir_path: string, extensions?: string[]): number {
    // Simplified - would need fs access for full implementation
    console.warn("index_directory not fully implemented in fallback mode");
    return 0;
  }

  search(query: string, options?: SearchOptions): CodeSearchResults {
    const start = Date.now();
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const items: CodeSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const [path, doc] of this.documents) {
      // Apply filters
      if (options?.language && doc.language !== options.language) continue;
      if (options?.directory && !path.startsWith(options.directory)) continue;

      let score = 0;
      const snippets: string[] = [];
      const matched_symbols: SymbolMatch[] = [];

      // Search in content
      if (!options?.symbols_only && !options?.imports_only) {
        const contentLower = doc.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          score = 1.0;
          // Extract snippet around first match
          const idx = contentLower.indexOf(queryLower);
          const snippetStart = Math.max(0, idx - 50);
          const end = Math.min(doc.content.length, idx + query.length + 50);
          snippets.push(doc.content.slice(snippetStart, end));
        }
      }

      // Search in symbols
      if (!options?.imports_only) {
        for (const sym of doc.symbols) {
          if (sym.name.toLowerCase().includes(queryLower)) {
            score = Math.max(score, 0.8);
            matched_symbols.push({
              name: sym.name,
              kind: sym.kind,
              line: sym.line,
              context: undefined,
            });
          }
        }
      }

      if (score > 0) {
        items.push({
          path,
          language: doc.language,
          score,
          snippets,
          matched_symbols,
        });
      }
    }

    // Sort by score descending
    items.sort((a, b) => b.score - a.score);

    const took_ms = Date.now() - start;

    return {
      total: items.length,
      query,
      took_ms,
      items: items.slice(offset, offset + limit),
    };
  }

  search_symbols(query: string, symbol_type?: string, limit?: number): CodeSearchResults {
    const start = Date.now();
    const items: CodeSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const [path, doc] of this.documents) {
      const matched_symbols: SymbolMatch[] = [];

      for (const sym of doc.symbols) {
        if (sym.name.toLowerCase().includes(queryLower)) {
          if (symbol_type && sym.kind.toLowerCase() !== symbol_type.toLowerCase()) continue;
          matched_symbols.push({
            name: sym.name,
            kind: sym.kind,
            line: sym.line,
            context: undefined,
          });
        }
      }

      if (matched_symbols.length > 0) {
        items.push({
          path,
          language: doc.language,
          score: 0.8,
          snippets: [],
          matched_symbols,
        });
      }
    }

    const took_ms = Date.now() - start;

    return {
      total: items.length,
      query,
      took_ms,
      items: items.slice(0, limit || 20),
    };
  }

  delete_file(path: string): void {
    this.documents.delete(path);
  }

  stats(): CodeIndexStats {
    const languageCounts = new Map<string, { files: number; symbols: number }>();
    let totalSymbols = 0;

    for (const [, doc] of this.documents) {
      const lang = doc.language || "unknown";
      const entry = languageCounts.get(lang) || { files: 0, symbols: 0 };
      entry.files++;
      entry.symbols += doc.symbols.length;
      languageCounts.set(lang, entry);
      totalSymbols += doc.symbols.length;
    }

    const languages: LanguageStats[] = [];
    for (const [language, stats] of languageCounts) {
      languages.push({
        language,
        file_count: stats.files,
        symbol_count: stats.symbols,
      });
    }

    return {
      total_files: this.documents.size,
      total_symbols: totalSymbols,
      languages,
      index_size_bytes: 0,
      last_updated: new Date().toISOString(),
    };
  }

  clear(): void {
    this.documents.clear();
  }

  optimize(): void {
    // No-op in fallback mode
  }

  document_count(): number {
    return this.documents.size;
  }

  private detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      mjs: "javascript",
      cjs: "javascript",
      py: "python",
      rs: "rust",
      go: "go",
      java: "java",
      kt: "kotlin",
      rb: "ruby",
      php: "php",
      c: "c",
      cpp: "cpp",
      cc: "cpp",
      h: "c",
      hpp: "cpp",
      cs: "csharp",
      swift: "swift",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      html: "html",
      css: "css",
      scss: "scss",
      sql: "sql",
      sh: "shell",
      toml: "toml",
    };
    return langMap[ext || ""] || ext || "unknown";
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a CodeSearchIndex instance
 *
 * Uses native Tantivy-based search if available, falls back to JS implementation
 *
 * @param indexPath Path to store the search index
 * @returns CodeSearchIndex instance
 */
export function createCodeSearchIndex(indexPath: string): CodeSearchIndexClass {
  const NativeClass = loadCodeSearchIndexClass();
  if (NativeClass) {
    return new NativeClass(indexPath) as CodeSearchIndexClass;
  }

  console.warn("Native CodeSearchIndex not available, using JS fallback");
  return new FallbackCodeSearchIndex(indexPath) as unknown as CodeSearchIndexClass;
}

/**
 * CodeSearchIndex class constructor type
 * Used for type checking when creating instances
 */
export const CodeSearchIndex: new (indexPath: string) => CodeSearchIndexClass =
  new Proxy({} as new (indexPath: string) => CodeSearchIndexClass, {
    construct(_target, args) {
      return createCodeSearchIndex(args[0] as string);
    },
  });
