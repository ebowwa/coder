// TypeScript declarations for claude-code-native

export interface SearchResult {
  path: string;
  line: number;
  column: number;
  content: string;
}

export interface DiffResult {
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface CompactResult {
  original: number;
  compacted: number;
  content: string;
}

// Search functions
export function searchFiles(pattern: string, path: string, options?: SearchOptions): SearchResult[];
export function searchContent(query: string, path: string, options?: SearchOptions): SearchResult[];

// Token functions
export function countTokens(text: string): number;
export function countMessagesTokens(messages: any[]): number;

// Diff functions
export function computeDiff(oldText: string, newText: string): DiffResult;
export function applyDiff(text: string, diff: DiffResult): string;

// Compact functions
export function compactContent(content: string, maxTokens: number): CompactResult;

export interface SearchOptions {
  ignoreCase?: boolean;
  includeHidden?: boolean;
  maxResults?: number;
  filePattern?: string;
}
