/**
 * Structured Logger with levels and context
 * @module telemetry/logger
 */

import type { LogEntry, LogLevel, LogContext, TelemetryConfig } from "./types.js";
import { getConfig } from "./config.js";
import { getActiveSpan } from "./tracer.js";

/**
 * Log level priority
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

/**
 * Level colors for pretty printing
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "\x1b[90m", // gray
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  fatal: "\x1b[35m", // magenta
};

const RESET = "\x1b[0m";

/**
 * Logger - Structured logging with levels
 */
export class Logger {
  private readonly level: number;
  private readonly config: TelemetryConfig;
  private readonly defaultContext: LogContext;
  private readonly service: string;

  constructor(service: string, config?: TelemetryConfig, context?: LogContext) {
    this.config = config ?? getConfig();
    this.level = LOG_LEVELS[this.config.logLevel];
    this.service = service;
    this.defaultContext = {
      service,
      ...context,
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.service, this.config, { ...this.defaultContext, ...context });
  }

  /**
   * Log at trace level (most verbose)
   */
  trace(message: string, context?: LogContext): void {
    this.log("trace", message, context);
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const entry = this.createEntry("error", message, context);

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.config.includeStackTrace ? error.stack : undefined,
      };
    } else if (error !== undefined) {
      entry.context = { ...entry.context, error: String(error) };
    }

    this.output(entry);
  }

  /**
   * Log at fatal level (application should exit after this)
   */
  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    const entry = this.createEntry("fatal", message, context);

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.config.includeStackTrace ? error.stack : undefined,
      };
    } else if (error !== undefined) {
      entry.context = { ...entry.context, error: String(error) };
    }

    this.output(entry);
  }

  /**
   * Log with timing information
   */
  time(message: string, durationMs: number, context?: LogContext): void {
    const entry = this.createEntry("info", message, context);
    entry.duration = durationMs;
    this.output(entry);
  }

  /**
   * Create a timer that logs duration when stopped
   */
  startTimer(message: string, context?: LogContext): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.time(message, duration, context);
      return duration;
    };
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVELS[level] < this.level) {
      return;
    }

    const entry = this.createEntry(level, message, context);
    this.output(entry);
  }

  /**
   * Create a log entry
   */
  private createEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
    };

    // Add trace context if available
    const span = getActiveSpan();
    if (span) {
      entry.traceId = span.traceId;
      entry.spanId = span.spanId;
    }

    return entry;
  }

  /**
   * Output the log entry
   */
  private output(entry: LogEntry): void {
    if (this.config.prettyPrint) {
      this.prettyOutput(entry);
    } else {
      this.jsonOutput(entry);
    }
  }

  /**
   * JSON output (for production)
   */
  private jsonOutput(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    if (entry.level === "fatal" || entry.level === "error") {
      console.error(output);
    } else if (entry.level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  /**
   * Pretty output (for development)
   */
  private prettyOutput(entry: LogEntry): void {
    const color = LEVEL_COLORS[entry.level];
    const timestamp = entry.timestamp.split("T")[1]?.split(".")[0] ?? entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);

    let output = `${color}[${timestamp}] ${level}${RESET} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${RESET}\x1b[90m${JSON.stringify(entry.context)}\x1b[0m`;
    }

    if (entry.duration !== undefined) {
      output += ` ${RESET}\x1b[90m(${entry.duration.toFixed(2)}ms)\x1b[0m`;
    }

    if (entry.traceId) {
      output += ` ${RESET}\x1b[90m[trace:${entry.traceId.slice(0, 8)}]\x1b[0m`;
    }

    if (entry.error) {
      output += `\n  \x1b[31m${entry.error.name}: ${entry.error.message}\x1b[0m`;
      if (entry.error.stack && this.config.includeStackTrace) {
        const stackLines = entry.error.stack.split("\n").slice(1, 5);
        output += `\n  \x1b[90m${stackLines.join("\n  ")}\x1b[0m`;
      }
    }

    if (entry.level === "fatal" || entry.level === "error") {
      console.error(output);
    } else if (entry.level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}

/**
 * Logger registry
 */
const loggers = new Map<string, Logger>();

/**
 * Get or create a logger for a service
 */
export function getLogger(service: string, context?: LogContext): Logger {
  let logger = loggers.get(service);
  if (!logger) {
    logger = new Logger(service, undefined, context);
    loggers.set(service, logger);
  } else if (context) {
    logger = logger.child(context);
  }
  return logger;
}

/**
 * Create a new logger instance
 */
export function createLogger(service: string, config?: TelemetryConfig, context?: LogContext): Logger {
  return new Logger(service, config, context);
}

/**
 * Default coder logger
 */
export const logger = getLogger("coder");
