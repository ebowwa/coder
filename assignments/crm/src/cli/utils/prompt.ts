/**
 * Interactive Prompt Utilities
 *
 * Provides user-friendly prompts for CLI interactions.
 */

import * as readline from 'readline';

/**
 * Create a readline interface
 */
function createRL(): readline.ReadLine {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt for text input
 */
export async function prompt(
  message: string,
  defaultValue?: string
): Promise<string> {
  const rl = createRL();

  const promptText = defaultValue
    ? `${message} ${`[${defaultValue}]`}: `
    : `${message}: `;

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Prompt for required text input (keeps asking until provided)
 */
export async function promptRequired(
  message: string,
  validate?: (value: string) => boolean | string
): Promise<string> {
  while (true) {
    const value = await prompt(message);

    if (!value) {
      console.log('\x1b[31m\u2717 This field is required\x1b[0m');
      continue;
    }

    if (validate) {
      const result = validate(value);
      if (result !== true) {
        console.log(`\x1b[31m\u2717 ${result}\x1b[0m`);
        continue;
      }
    }

    return value;
  }
}

/**
 * Prompt for email input with validation
 */
export async function promptEmail(message = 'Email'): Promise<string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return promptRequired(message, (value) => {
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return true;
  });
}

/**
 * Prompt for phone input
 */
export async function promptPhone(message = 'Phone'): Promise<string> {
  return prompt(message);
}

/**
 * Prompt for number input
 */
export async function promptNumber(
  message: string,
  defaultValue?: number,
  min?: number,
  max?: number
): Promise<number> {
  while (true) {
    const input = await prompt(message, defaultValue?.toString());
    const value = parseFloat(input);

    if (isNaN(value)) {
      console.log('\x1b[31m\u2717 Please enter a valid number\x1b[0m');
      continue;
    }

    if (min !== undefined && value < min) {
      console.log(`\x1b[31m\u2717 Value must be at least ${min}\x1b[0m`);
      continue;
    }

    if (max !== undefined && value > max) {
      console.log(`\x1b[31m\u2717 Value must be at most ${max}\x1b[0m`);
      continue;
    }

    return value;
  }
}

/**
 * Prompt for integer input
 */
export async function promptInt(
  message: string,
  defaultValue?: number,
  min?: number,
  max?: number
): Promise<number> {
  while (true) {
    const value = await promptNumber(message, defaultValue, min, max);
    if (Number.isInteger(value)) {
      return value;
    }
    console.log('\x1b[31m\u2717 Please enter a whole number\x1b[0m');
  }
}

/**
 * Prompt for yes/no confirmation
 */
export async function confirm(
  message: string,
  defaultValue = false
): Promise<boolean> {
  const hint = defaultValue ? '[Y/n]' : '[y/N]';
  const answer = await prompt(`${message} ${hint}`);

  if (!answer) {
    return defaultValue;
  }

  return ['y', 'yes', 'true', '1'].includes(answer.toLowerCase());
}

/**
 * Prompt to select from a list of options
 */
export async function select<T extends string>(
  message: string,
  options: T[],
  defaultValue?: T
): Promise<T> {
  console.log(`\n${message}\n`);

  options.forEach((option, index) => {
    const num = `\x1b[36m${index + 1}.\x1b[0m`;
    const marker = option === defaultValue ? ' (default)' : '';
    console.log(`  ${num} ${option}${marker}`);
  });

  console.log();

  while (true) {
    const answer = await prompt('Enter choice');

    if (!answer && defaultValue) {
      return defaultValue;
    }

    // Check if it's a number selection
    const num = parseInt(answer);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      return options[num - 1];
    }

    // Check if it matches an option directly
    const match = options.find(
      (o) => o.toLowerCase() === answer.toLowerCase()
    );
    if (match) {
      return match as T;
    }

    console.log('\x1b[31m\u2717 Invalid choice\x1b[0m');
  }
}

/**
 * Prompt to select multiple options from a list
 */
export async function multiSelect<T extends string>(
  message: string,
  options: T[],
  defaultValues: T[] = []
): Promise<T[]> {
  console.log(`\n${message}`);
  console.log('\x1b[90m(Enter numbers separated by commas, or "all" for all)\x1b[0m\n');

  options.forEach((option, index) => {
    const num = `\x1b[36m${index + 1}.\x1b[0m`;
    const marker = defaultValues.includes(option) ? ' \x1b[32m*\x1b[0m' : '';
    console.log(`  ${num} ${option}${marker}`);
  });

  console.log();

  while (true) {
    const answer = await prompt('Enter choices');

    if (!answer) {
      return defaultValues;
    }

    if (answer.toLowerCase() === 'all') {
      return [...options];
    }

    const indices = answer.split(',').map((s) => parseInt(s.trim()));
    const valid = indices.every((n) => !isNaN(n) && n >= 1 && n <= options.length);

    if (!valid) {
      console.log('\x1b[31m\u2717 Invalid selection\x1b[0m');
      continue;
    }

    return indices.map((n) => options[n - 1]).filter((v): v is T => v !== undefined) as T[];
  }
}

/**
 * Prompt for tags (comma-separated)
 */
export async function promptTags(
  message = 'Tags (comma-separated)'
): Promise<string[]> {
  const input = await prompt(message);
  if (!input) return [];

  return input
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Prompt for multiline text
 */
export async function promptMultiline(
  message: string,
  defaultValue?: string
): Promise<string> {
  console.log(`\n${message}`);
  console.log('\x1b[90m(Enter empty line to finish)\x1b[0m\n');

  if (defaultValue) {
    console.log(`\x1b[90mCurrent:\x1b[0m ${defaultValue.split('\n')[0]}...\n`);
  }

  const lines: string[] = [];
  const rl = createRL();

  return new Promise((resolve) => {
    const askLine = () => {
      rl.question('', (line) => {
        if (line.trim() === '') {
          rl.close();
          resolve(lines.join('\n') || defaultValue || '');
        } else {
          lines.push(line);
          askLine();
        }
      });
    };
    askLine();
  });
}

/**
 * Prompt with auto-complete suggestions
 */
export async function promptWithSuggestions(
  message: string,
  suggestions: string[],
  defaultValue?: string
): Promise<string> {
  // Show suggestions
  console.log(`\n${message}`);
  if (suggestions.length > 0) {
    console.log(`\x1b[90mSuggestions: ${suggestions.slice(0, 5).join(', ')}\x1b[0m`);
  }
  console.log();

  return prompt('', defaultValue);
}

/**
 * Display a preview and ask for confirmation
 */
export async function previewAndConfirm(
  title: string,
  data: Record<string, unknown>
): Promise<boolean> {
  console.log(`\n${title}`);
  console.log('\x1b[90m' + '\u2500'.repeat(40) + '\x1b[0m');

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== '') {
      const displayValue = Array.isArray(value)
        ? value.join(', ')
        : String(value);
      console.log(`  \x1b[36m${key}:\x1b[0m ${displayValue}`);
    }
  }

  console.log();
  return confirm('Is this correct?', true);
}

/**
 * Progress indicator for async operations
 */
export async function withProgress<T>(
  message: string,
  fn: () => Promise<T>
): Promise<T> {
  const frames = ['\u28d7', '\u28d3', '\u28d2', '\u28d6', '\u28d4', '\u28d5'];
  let i = 0;
  let interval: Timer;

  process.stdout.write(`${message} `);

  interval = setInterval(() => {
    process.stdout.write(`\r${message} ${frames[i]} `);
    i = (i + 1) % frames.length;
  }, 80);

  try {
    const result = await fn();
    clearInterval(interval);
    process.stdout.write(`\r${message} \x1b[32m\u2713\x1b[0m\n`);
    return result;
  } catch (error) {
    clearInterval(interval);
    process.stdout.write(`\r${message} \x1b[31m\u2717\x1b[0m\n`);
    throw error;
  }
}

/**
 * Display a spinner
 */
export class Spinner {
  private frames = ['\u28d7', '\u28d3', '\u28d2', '\u28d6', '\u28d4', '\u28d5'];
  private i = 0;
  private interval?: Timer;

  constructor(private message: string) {}

  start(): this {
    process.stdout.write(`${this.message} `);
    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.message} ${this.frames[this.i]} `);
      this.i = (this.i + 1) % this.frames.length;
    }, 80);
    return this;
  }

  succeed(message?: string): void {
    this.stop();
    process.stdout.write(`\r${message || this.message} \x1b[32m\u2713\x1b[0m\n`);
  }

  fail(message?: string): void {
    this.stop();
    process.stdout.write(`\r${message || this.message} \x1b[31m\u2717\x1b[0m\n`);
  }

  update(message: string): void {
    this.message = message;
  }

  private stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}

/**
 * Password input (hidden)
 */
export async function promptPassword(message = 'Password'): Promise<string> {
  const rl = createRL();

  return new Promise((resolve) => {
    process.stdout.write(`${message}: `);

    // Hide input
    process.stdin.setRawMode(true);
    const password: string[] = [];

    const onData = (char: Buffer) => {
      const c = char.toString('utf8');

      switch (c) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.setRawMode(false);
          process.stdin.off('data', onData);
          rl.close();
          console.log();
          resolve(password.join(''));
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007F': // Backspace
          if (password.length > 0) {
            password.pop();
            process.stdout.write('\b \b');
          }
          break;
        default:
          password.push(c);
          process.stdout.write('*');
          break;
      }
    };

    process.stdin.on('data', onData);
  });
}
