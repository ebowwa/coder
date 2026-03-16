/**
 * Logger module for CRM system
 *
 * Provides structured logging with multiple log levels and formatters.
 * Supports JSON output for production and pretty printing for development.
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  traceId?: string;
  spanId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  version: string;
  env: 'development' | 'production' | 'test';
  prettyPrint?: boolean;
  includeStackTrace?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

/**
 * Structured logger with context support
 */
export class Logger {
  private readonly level: number;
  private readonly config: LoggerConfig;
  private readonly defaultContext: LogContext;

  constructor(config: Partial<LoggerConfig> & { service: string }) {
    this.config = {
      level: config.level ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      version: config.version ?? '0.1.0',
      env: (config.env as LoggerConfig['env']) ?? (process.env.NODE_ENV as LoggerConfig['env']) ?? 'development',
      prettyPrint: config.prettyPrint ?? process.env.LOG_PRETTY === 'true',
      includeStackTrace: config.includeStackTrace ?? true,
      ...config,
    };
    this.level = LOG_LEVELS[this.config.level];
    this.defaultContext = {
      service: this.config.service,
      version: this.config.version,
      env: this.config.env,
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, { ...this.defaultContext, ...context });
  }

  /**
   * Log at trace level (most verbose)
   */
  trace(message: string, context?: LogContext): void {
    this.log('trace', message, context);
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const entry: LogEntry = this.createEntry('error', message, context);

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
    const entry: LogEntry = this.createEntry('fatal', message, context);

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
    const entry = this.createEntry('info', message, context);
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
   * Add trace context to logs
   */
  withTrace(traceId: string, spanId?: string): Logger {
    const logger = new Logger(this.config);
    (logger as unknown as { defaultContext: LogContext }).defaultContext = {
      ...this.defaultContext,
      traceId,
      spanId,
    };
    return logger;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVELS[level] < this.level) {
      return;
    }

    const entry = this.createEntry(level, message, context);
    this.output(entry);
  }

  private createEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
    };

    return entry;
  }

  private output(entry: LogEntry): void {
    if (this.config.prettyPrint && this.config.env !== 'production') {
      this.prettyOutput(entry);
    } else {
      this.jsonOutput(entry);
    }
  }

  private jsonOutput(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    if (entry.level === 'fatal' || entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  private prettyOutput(entry: LogEntry): void {
    const levelColors: Record<LogLevel, string> = {
      trace: '\x1b[90m', // gray
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    const timestamp = entry.timestamp.split('T')[1]?.split('.')[0] ?? entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);

    let output = `${color}[${timestamp}] ${level}${reset} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` ${reset}\x1b[90m${JSON.stringify(entry.context)}\x1b[0m`;
    }

    if (entry.duration !== undefined) {
      output += ` ${reset}\x1b[90m(${entry.duration.toFixed(2)}ms)\x1b[0m`;
    }

    if (entry.error) {
      output += `\n  \x1b[31m${entry.error.name}: ${entry.error.message}\x1b[0m`;
      if (entry.error.stack && this.config.includeStackTrace) {
        const stackLines = entry.error.stack.split('\n').slice(1, 5);
        output += `\n  \x1b[90m${stackLines.join('\n  ')}\x1b[0m`;
      }
    }

    if (entry.level === 'fatal' || entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}

/**
 * Child logger with bound context
 */
class ChildLogger {
  constructor(
    private readonly parent: Logger,
    private readonly context: LogContext
  ) {}

  trace(message: string, additionalContext?: LogContext): void {
    this.parent.trace(message, { ...this.context, ...additionalContext });
  }

  debug(message: string, additionalContext?: LogContext): void {
    this.parent.debug(message, { ...this.context, ...additionalContext });
  }

  info(message: string, additionalContext?: LogContext): void {
    this.parent.info(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: LogContext): void {
    this.parent.warn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, error?: Error | unknown, additionalContext?: LogContext): void {
    this.parent.error(message, error, { ...this.context, ...additionalContext });
  }

  fatal(message: string, error?: Error | unknown, additionalContext?: LogContext): void {
    this.parent.fatal(message, error, { ...this.context, ...additionalContext });
  }

  time(message: string, durationMs: number, additionalContext?: LogContext): void {
    const stop = this.parent.startTimer(message, { ...this.context, ...additionalContext });
    // Already logged by startTimer
  }

  startTimer(message: string, additionalContext?: LogContext): () => number {
    return this.parent.startTimer(message, { ...this.context, ...additionalContext });
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger({
  service: 'crm',
  version: '0.1.0',
});

/**
 * Create a new logger instance
 */
export function createLogger(config: Partial<LoggerConfig> & { service: string }): Logger {
  return new Logger(config);
}
