/**
 * Signal Extraction - Analyze failures and extract structured signals
 *
 * This module provides sophisticated signal extraction that goes
 * beyond simple error classification. It identifies patterns,
 * extracts actionable insights, and prepares signals for patch
 * generation.
 */

import type { FailureSignal, ErrorType, BoundaryContext } from "./types.js";

/**
 * Pattern matcher for error messages
 */
export interface ErrorPattern {
  /** Regex pattern to match */
  pattern: RegExp;
  /** Error type if matched */
  type: ErrorType;
  /** Extractor for additional context */
  extractor?: (match: RegExpMatchArray) => Record<string, unknown>;
}

/**
 * Known error patterns
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // Parse/JSON errors
  {
    pattern: /unexpected token.*position (\d+)/i,
    type: "parse",
    extractor: (m) => ({ position: parseInt(m[1]!, 10) }),
  },
  {
    pattern: /json.*parse.*failed/i,
    type: "parse",
  },
  {
    pattern: /invalid json/i,
    type: "parse",
  },

  // Permission errors
  {
    pattern: /eacces.*'([^']+)'/i,
    type: "permission",
    extractor: (m) => ({ path: m[1]! }),
  },
  {
    pattern: /permission denied.*'([^']+)'/i,
    type: "permission",
    extractor: (m) => ({ path: m[1]! }),
  },
  {
    pattern: /access denied/i,
    type: "permission",
  },

  // Timeout errors
  {
    pattern: /timeout.*after (\d+)ms/i,
    type: "timeout",
    extractor: (m) => ({ timeoutMs: parseInt(m[1]!, 10) }),
  },
  {
    pattern: /etimedout/i,
    type: "timeout",
  },

  // Validation errors
  {
    pattern: /validation failed.*field[:\s]+(\w+)/i,
    type: "validation",
    extractor: (m) => ({ field: m[1]! }),
  },
  {
    pattern: /invalid.*parameter[:\s]+(\w+)/i,
    type: "validation",
    extractor: (m) => ({ parameter: m[1]! }),
  },
  {
    pattern: /required.*field[:\s]+(\w+)/i,
    type: "validation",
    extractor: (m) => ({ requiredField: m[1]! }),
  },

  // File system errors
  {
    pattern: /enoent.*'([^']+)'/i,
    type: "runtime",
    extractor: (m) => ({ missingPath: m[1]!, error: "file_not_found" }),
  },
  {
    pattern: /eisdir.*'([^']+)'/i,
    type: "runtime",
    extractor: (m) => ({ path: m[1]!, error: "expected_file_got_directory" }),
  },
  {
    pattern: /enotdir.*'([^']+)'/i,
    type: "runtime",
    extractor: (m) => ({ path: m[1]!, error: "expected_directory_got_file" }),
  },
];

/**
 * Signal analyzer - extracts structured data from errors
 */
export class SignalAnalyzer {
  private patterns: ErrorPattern[];

  constructor(customPatterns?: ErrorPattern[]) {
    this.patterns = customPatterns || ERROR_PATTERNS;
  }

  /**
   * Analyze an error and extract detailed signal information
   */
  analyze(
    tool_name: string,
    tool_input: Record<string, unknown>,
    error: unknown,
    context?: Partial<BoundaryContext>
  ): Omit<FailureSignal, "id"> {
    const errorStr = error instanceof Error ? error.message : String(error);
    const stackTrace = error instanceof Error ? error.stack : undefined;

    // Find matching pattern
    let matchedType: ErrorType = "runtime";
    let extractedContext: Record<string, unknown> = {};

    for (const { pattern, type, extractor } of this.patterns) {
      const match = errorStr.match(pattern);
      if (match) {
        matchedType = type;
        if (extractor) {
          extractedContext = extractor(match);
        }
        break;
      }
    }

    // Add tool-specific context
    const toolContext = this.extractToolContext(tool_name, tool_input);

    return {
      timestamp: Date.now(),
      tool_name,
      tool_input,
      error: errorStr,
      errorType: matchedType,
      debugInfo: stackTrace,
      workingDirectory: context?.workingDirectory,
      sessionId: context?.sessionId,
      context: {
        ...extractedContext,
        ...toolContext,
      },
      processed: false,
    };
  }

  /**
   * Extract tool-specific context for analysis
   */
  private extractToolContext(
    tool_name: string,
    tool_input: Record<string, unknown>
  ): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    // Extract file paths for file operations
    if (
      tool_name === "Read" ||
      tool_name === "Write" ||
      tool_name === "Edit" ||
      tool_name === "Glob" ||
      tool_name === "Grep"
    ) {
      if (tool_input.file_path) {
        context.filePath = tool_input.file_path;
      }
      if (tool_input.path) {
        context.path = tool_input.path;
      }
      if (tool_input.pattern) {
        context.pattern = tool_input.pattern;
      }
    }

    // Extract command for Bash
    if (tool_name === "Bash" && tool_input.command) {
      context.command = tool_input.command;
      // Try to extract the main command
      const cmdStr = String(tool_input.command);
      const firstWord = cmdStr.split(/\s+/)[0];
      if (firstWord) {
        context.commandName = firstWord;
      }
    }

    // Extract URL for web operations
    if (tool_name === "WebFetch" || tool_name === "WebSearch") {
      if (tool_input.url) {
        context.url = tool_input.url;
      }
      if (tool_input.query) {
        context.query = tool_input.query;
      }
    }

    return context;
  }

  /**
   * Add a custom pattern
   */
  addPattern(pattern: ErrorPattern): void {
    this.patterns.unshift(pattern); // Add at start for priority
  }
}

/**
 * Signal aggregator - groups and analyzes signal patterns
 */
export class SignalAggregator {
  private signals: FailureSignal[] = [];

  /**
   * Add a signal for aggregation
   */
  add(signal: FailureSignal): void {
    this.signals.push(signal);
  }

  /**
   * Get signals grouped by tool
   */
  byTool(): Map<string, FailureSignal[]> {
    const grouped = new Map<string, FailureSignal[]>();
    for (const signal of this.signals) {
      const existing = grouped.get(signal.tool_name) || [];
      existing.push(signal);
      grouped.set(signal.tool_name, existing);
    }
    return grouped;
  }

  /**
   * Get signals grouped by error type
   */
  byErrorType(): Map<ErrorType, FailureSignal[]> {
    const grouped = new Map<ErrorType, FailureSignal[]>();
    for (const signal of this.signals) {
      const existing = grouped.get(signal.errorType) || [];
      existing.push(signal);
      grouped.set(signal.errorType, existing);
    }
    return grouped;
  }

  /**
   * Find repeated patterns (same error occurring multiple times)
   */
  findRepeats(minOccurrences: number = 2): Map<string, FailureSignal[]> {
    const byKey = new Map<string, FailureSignal[]>();

    for (const signal of this.signals) {
      // Create a key based on tool and error (normalized)
      const key = `${signal.tool_name}:${signal.error
        .toLowerCase()
        .replace(/\d+/g, "N")
        .replace(/'[^']+'/g, "'PATH'")}`;

      const existing = byKey.get(key) || [];
      existing.push(signal);
      byKey.set(key, existing);
    }

    // Filter to only those with enough occurrences
    const repeats = new Map<string, FailureSignal[]>();
    for (const [key, signals] of byKey) {
      if (signals.length >= minOccurrences) {
        repeats.set(key, signals);
      }
    }

    return repeats;
  }

  /**
   * Get all signals
   */
  getAll(): FailureSignal[] {
    return [...this.signals];
  }

  /**
   * Clear all signals
   */
  clear(): void {
    this.signals = [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byTool: Record<string, number>;
    byErrorType: Record<ErrorType, number>;
    repeats: number;
  } {
    const byTool: Record<string, number> = {};
    const byErrorType: Record<ErrorType, number> = {
      parse: 0,
      runtime: 0,
      validation: 0,
      timeout: 0,
      permission: 0,
      unknown: 0,
    };

    for (const signal of this.signals) {
      byTool[signal.tool_name] = (byTool[signal.tool_name] || 0) + 1;
      byErrorType[signal.errorType]++;
    }

    const repeats = this.findRepeats(2);

    return {
      total: this.signals.length,
      byTool,
      byErrorType,
      repeats: repeats.size,
    };
  }
}

// Singleton instances
let defaultAnalyzer: SignalAnalyzer | null = null;
let defaultAggregator: SignalAggregator | null = null;

/**
 * Get the default signal analyzer
 */
export function getAnalyzer(): SignalAnalyzer {
  if (!defaultAnalyzer) {
    defaultAnalyzer = new SignalAnalyzer();
  }
  return defaultAnalyzer;
}

/**
 * Get the default signal aggregator
 */
export function getAggregator(): SignalAggregator {
  if (!defaultAggregator) {
    defaultAggregator = new SignalAggregator();
  }
  return defaultAggregator;
}

/**
 * Reset singletons (for testing)
 */
export function resetAnalyzers(): void {
  defaultAnalyzer = null;
  defaultAggregator = null;
}
