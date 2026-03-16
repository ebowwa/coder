/**
 * CLI Output Formatting Utilities
 *
 * Provides colorized output, table formatting, and display helpers.
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const;

/**
 * Colorize text with ANSI codes
 */
export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

/**
 * Semantic color helpers
 */
export const output = {
  success: (text: string) => colorize(text, 'green'),
  error: (text: string) => colorize(text, 'red'),
  warning: (text: string) => colorize(text, 'yellow'),
  info: (text: string) => colorize(text, 'cyan'),
  dim: (text: string) => colorize(text, 'dim'),
  bold: (text: string) => colorize(text, 'bold'),
  underline: (text: string) => colorize(text, 'underline'),
};

/**
 * Print a success message with checkmark
 */
export function printSuccess(message: string): void {
  console.log(`${output.success('\u2713')} ${message}`);
}

/**
 * Print an error message with X
 */
export function printError(message: string): void {
  console.error(`${output.error('\u2717')} ${message}`);
}

/**
 * Print a warning message with triangle
 */
export function printWarning(message: string): void {
  console.log(`${output.warning('\u26a0')} ${message}`);
}

/**
 * Print an info message with bullet
 */
export function printInfo(message: string): void {
  console.log(`${output.info('\u2022')} ${message}`);
}

/**
 * Print a header with styling
 */
export function printHeader(title: string): void {
  const line = '\u2500'.repeat(title.length + 4);
  console.log();
  console.log(output.bold(`\u250c${line}\u2510`));
  console.log(output.bold(`\u2502  ${title}  \u2502`));
  console.log(output.bold(`\u2514${line}\u2518`));
  console.log();
}

/**
 * Print a section header
 */
export function printSection(title: string): void {
  console.log();
  console.log(output.bold(output.underline(title)));
  console.log();
}

/**
 * Format a key-value pair for display
 */
export function formatKeyValue(key: string, value: unknown): string {
  const formattedValue =
    value === null || value === undefined
      ? output.dim('(none)')
      : String(value);
  return `${output.dim(key)}: ${formattedValue}`;
}

/**
 * Print key-value pairs
 */
export function printKeyValue(
  pairs: Record<string, unknown>,
  indent = 0
): void {
  const prefix = ' '.repeat(indent);
  for (const [key, value] of Object.entries(pairs)) {
    if (value !== undefined) {
      console.log(`${prefix}${formatKeyValue(key, value)}`);
    }
  }
}

/**
 * Format currency value
 */
export function formatCurrency(
  value: number,
  currency = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '\u2026';
}

/**
 * Pad string to fixed width
 */
export function padRight(str: string, width: number): string {
  return str.padEnd(width, ' ');
}

/**
 * Create a simple table
 */
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: number;
  format?: (value: unknown, row: T) => string;
}

export function formatTable<T>(
  data: T[],
  columns: TableColumn<T>[]
): string {
  if (data.length === 0) {
    return output.dim('No results');
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    const headerWidth = col.header.length;
    const keyStr = String(col.key);
    const dataWidth = Math.max(
      ...data.map((row) => {
        const value = keyStr.includes('.')
          ? getNestedValue(row as Record<string, unknown>, keyStr)
          : (row as Record<string, unknown>)[keyStr];
        const formatted = col.format ? col.format(value, row) : String(value ?? '');
        return formatted.length;
      })
    );
    return Math.max(headerWidth, col.width ?? dataWidth);
  });

  // Build header
  const headerRow = columns
    .map((col, i) => output.bold(padRight(col.header, widths[i] ?? 10)))
    .join('  ');

  // Build separator
  const separator = widths.map((w) => '\u2500'.repeat(w ?? 10)).join('  ');

  // Build data rows
  const dataRows = data.map((row) =>
    columns
      .map((col, i) => {
        const keyStr = String(col.key);
        const value = keyStr.includes('.')
          ? getNestedValue(row as Record<string, unknown>, keyStr)
          : (row as Record<string, unknown>)[keyStr];
        const formatted = col.format ? col.format(value, row) : String(value ?? '');
        return padRight(formatted, widths[i] ?? 10);
      })
      .join('  ')
  );

  return [headerRow, separator, ...dataRows].join('\n');
}

/**
 * Print a table to console
 */
export function printTable<T>(
  data: T[],
  columns: TableColumn<T>[]
): void {
  console.log(formatTable(data, columns));
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Print JSON with syntax highlighting
 */
export function printJSON(data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  // Simple syntax highlighting
  const highlighted = json
    .replace(/"([^"]+)":/g, output.dim('"$1":'))
    .replace(/: "([^"]+)"/g, `: ${output.success('"$1"')}`)
    .replace(/: (\d+)/g, `: ${output.info('$1')}`)
    .replace(/: (true|false)/g, `: ${output.warning('$1')}`)
    .replace(/: (null)/g, `: ${output.dim('$1')}`);
  console.log(highlighted);
}

/**
 * Print a divider line
 */
export function printDivider(char = '\u2500', length = 60): void {
  console.log(output.dim(char.repeat(length)));
}

/**
 * Print a box with content
 */
export function printBox(content: string, title?: string): void {
  const lines = content.split('\n');
  const maxWidth = Math.max(...lines.map((l) => l.length), title?.length ?? 0);

  const top = title
    ? `\u250c\u2500 ${output.bold(title)} ${'\u2500'.repeat(maxWidth - title.length - 1)}\u2510`
    : `\u250c${'\u2500'.repeat(maxWidth + 2)}\u2510`;

  console.log(top);
  for (const line of lines) {
    console.log(`\u2502 ${padRight(line, maxWidth)} \u2502`);
  }
  console.log(`\u2514${'\u2500'.repeat(maxWidth + 2)}\u2518`);
}

/**
 * Status badge formatter
 */
export function formatStatus(status: string): string {
  const statusColors: Record<string, keyof typeof colors> = {
    // Contact status
    lead: 'cyan',
    prospect: 'blue',
    qualified: 'yellow',
    customer: 'green',
    churned: 'red',
    archived: 'dim',

    // Deal stages
    prospecting: 'cyan',
    qualification: 'blue',
    needs_analysis: 'yellow',
    proposal: 'magenta',
    negotiation: 'yellow',
    closed_won: 'green',
    closed_lost: 'red',

    // Activity types
    call: 'cyan',
    email: 'blue',
    meeting: 'magenta',
    task: 'yellow',
    note: 'dim',

    // Priority
    low: 'dim',
    medium: 'yellow',
    high: 'red',
    urgent: 'bgRed',

    // General
    active: 'green',
    inactive: 'dim',
    pending: 'yellow',
    completed: 'green',
    cancelled: 'red',
  };

  const color = statusColors[status.toLowerCase()] || 'white';
  return colorize(`[${status.toUpperCase()}]`, color);
}
