/**
 * Code Search Index Types
 * Type definitions for Tantivy-based full-text code search
 */

// ===== Symbol Types =====

/** Symbol information extracted from code */
export interface SymbolInfo {
  /** Symbol name */
  name: string;
  /** Symbol kind (function, class, method, variable, etc.) */
  kind: string;
  /** Line number (1-based) */
  line: number;
  /** Column number (optional) */
  column?: number;
}

/** File to index */
export interface IndexFile {
  /** File path (absolute) */
  path: string;
  /** File content */
  content: string;
  /** Programming language (optional, auto-detected if not provided) */
  language?: string;
  /** Extracted symbols (optional) */
  symbols?: SymbolInfo[];
}

/** Search options */
export interface SearchOptions {
  /** Maximum results to return (default: 50) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
  /** Filter by language */
  language?: string;
  /** Filter by directory */
  directory?: string;
  /** Search in symbols only */
  symbols_only?: boolean;
  /** Search in imports only */
  imports_only?: boolean;
  /** Enable fuzzy matching */
  fuzzy?: boolean;
  /** Fields to search (path, content, symbols, imports) */
  fields?: string[];
}

/** Symbol match in search results */
export interface SymbolMatch {
  /** Symbol name */
  name: string;
  /** Symbol kind */
  kind: string;
  /** Line number */
  line: number;
  /** Context around the symbol */
  context?: string;
}

/** Search result item */
export interface CodeSearchResult {
  /** File path */
  path: string;
  /** Programming language */
  language?: string;
  /** Relevance score */
  score: number;
  /** Matching snippets with highlights */
  snippets: string[];
  /** Matching symbols */
  matched_symbols: SymbolMatch[];
}

/** Search results container */
export interface CodeSearchResults {
  /** Total matching documents */
  total: number;
  /** Original query */
  query: string;
  /** Time taken in milliseconds */
  took_ms: number;
  /** Result items */
  items: CodeSearchResult[];
}

/** Per-language statistics */
export interface LanguageStats {
  /** Language name */
  language: string;
  /** Number of files */
  file_count: number;
  /** Number of symbols */
  symbol_count: number;
}

/** Index statistics */
export interface CodeIndexStats {
  /** Total files indexed */
  total_files: number;
  /** Total symbols indexed */
  total_symbols: number;
  /** Per-language statistics */
  languages: LanguageStats[];
  /** Index size in bytes */
  index_size_bytes: number;
  /** Last update timestamp */
  last_updated?: string;
}

/**
 * Code search index manager (native Tantivy-based full-text search)
 *
 * Provides high-performance full-text search for code:
 * - BM25 ranking for relevance
 * - Fuzzy matching for typo tolerance
 * - Fielded search (symbols, imports, content)
 * - Incremental updates via file watcher
 */
export interface CodeSearchIndexClass {
  /** Get the index path */
  readonly path: string;

  /** Index a single file */
  index_file(path: string, content: string, language?: string, symbols?: SymbolInfo[]): void;

  /** Index multiple files in batch */
  index_batch(files: IndexFile[]): void;

  /** Index a directory of files */
  index_directory(dir_path: string, extensions?: string[]): number;

  /** Search the code index */
  search(query: string, options?: SearchOptions): CodeSearchResults;

  /** Search for symbols (functions, classes, etc.) */
  search_symbols(query: string, symbol_type?: string, limit?: number): CodeSearchResults;

  /** Delete a file from the index */
  delete_file(path: string): void;

  /** Get index statistics */
  stats(): CodeIndexStats;

  /** Clear all documents from the index */
  clear(): void;

  /** Optimize the index for better search performance */
  optimize(): void;

  /** Get number of indexed documents */
  document_count(): number;
}
