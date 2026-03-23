/**
 * Centralized logging utility for Coder
 * Replaces console.log with structured, level-based logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colorize?: boolean;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;
  private colorize: boolean;

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
  };

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info';
    this.prefix = options.prefix ?? '[Coder]';
    this.timestamp = options.timestamp ?? false;
    this.colorize = options.colorize ?? true;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const parts: string[] = [];

    if (this.timestamp) {
      parts.push(new Date().toISOString());
    }

    parts.push(this.prefix);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);

    return parts.join(' ');
  }

  private getColorCode(level: LogLevel): string {
    if (!this.colorize) return '';
    
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[90m',  // Gray
      info: '\x1b[36m',   // Cyan
      warn: '\x1b[33m',   // Yellow
      error: '\x1b[31m',  // Red
      silent: '',
    };

    return colors[level];
  }

  private getResetCode(): string {
    return this.colorize ? '\x1b[0m' : '';
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    const color = this.getColorCode('debug');
    const reset = this.getResetCode();
    console.log(`${color}${this.formatMessage('debug', message)}${reset}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    const color = this.getColorCode('info');
    const reset = this.getResetCode();
    console.log(`${color}${this.formatMessage('info', message)}${reset}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    const color = this.getColorCode('warn');
    const reset = this.getResetCode();
    console.warn(`${color}${this.formatMessage('warn', message)}${reset}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    const color = this.getColorCode('error');
    const reset = this.getResetCode();
    console.error(`${color}${this.formatMessage('error', message)}${reset}`, ...args);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  child(options: LoggerOptions = {}): Logger {
    return new Logger({
      level: options.level ?? this.level,
      prefix: options.prefix ?? this.prefix,
      timestamp: options.timestamp ?? this.timestamp,
      colorize: options.colorize ?? this.colorize,
    });
  }
}

// Default logger instance
export const logger = new Logger();

// Convenience function to create loggers for specific modules
export function createLogger(prefix: string, options?: LoggerOptions): Logger {
  return new Logger({ prefix, ...options });
}
