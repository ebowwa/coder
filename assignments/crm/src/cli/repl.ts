/**
 * Interactive REPL Mode
 *
 * Provides an interactive shell for CRM operations.
 */

import * as readline from 'readline';
import {
  printSuccess,
  printError,
  printHeader,
  printDivider,
  output,
  colorize,
} from './utils/output.js';
import { displayConfig, getConfigLocation } from './utils/config.js';
import type { Command } from 'commander';

/**
 * REPL history
 */
const history: string[] = [];

/**
 * REPL context
 */
interface REPLContext {
  currentContact: string | null;
  currentDeal: string | null;
  lastResults: unknown[];
}

const context: REPLContext = {
  currentContact: null,
  currentDeal: null,
  lastResults: [],
};

/**
 * Available commands in REPL
 */
const REPL_COMMANDS: Record<
  string,
  { description: string; usage: string; example?: string }
> = {
  help: {
    description: 'Show available commands',
    usage: 'help [command]',
  },
  contacts: {
    description: 'Manage contacts',
    usage: 'contacts list|get|create|update|delete [args...]',
    example: 'contacts list --search john',
  },
  deals: {
    description: 'Manage deals',
    usage: 'deals list|get|create|update|delete|move [args...]',
    example: 'deals list --stage proposal',
  },
  activities: {
    description: 'Manage activities',
    usage: 'activities list|log|create|delete [args...]',
    example: 'activities log <contact-id> call "Follow up call"',
  },
  media: {
    description: 'Manage media files',
    usage: 'media list|upload|get|delete [args...]',
    example: 'media upload ./doc.pdf --contact <id>',
  },
  search: {
    description: 'Search across entities',
    usage: 'search <query>',
    example: 'search john smith',
  },
  recent: {
    description: 'Show recent items',
    usage: 'recent [contacts|deals|activities]',
  },
  use: {
    description: 'Set context (current contact/deal)',
    usage: 'use contact|deal <id>',
    example: 'use contact abc-123',
  },
  context: {
    description: 'Show current context',
    usage: 'context',
  },
  clear: {
    description: 'Clear the screen',
    usage: 'clear',
  },
  config: {
    description: 'Show or manage configuration',
    usage: 'config [location]',
  },
  history: {
    description: 'Show command history',
    usage: 'history [n]',
  },
  exit: {
    description: 'Exit REPL',
    usage: 'exit',
  },
  quit: {
    description: 'Exit REPL (alias)',
    usage: 'quit',
  },
};

/**
 * Create readline interface
 */
function createRL(): readline.ReadLine {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    history: history,
    historySize: 100,
    removeHistoryDuplicates: true,
  });
}

/**
 * Get prompt string
 */
function getPrompt(): string {
  const parts: string[] = [];

  if (context.currentContact) {
    parts.push(output.info(`c:${context.currentContact.slice(0, 4)}`));
  }

  if (context.currentDeal) {
    parts.push(output.info(`d:${context.currentDeal.slice(0, 4)}`));
  }

  const contextStr = parts.length > 0 ? `(${parts.join(',')})` : '';
  return `${contextStr}crm> `;
}

/**
 * Show help
 */
function showHelp(command?: string): void {
  if (command && REPL_COMMANDS[command]) {
    const cmd = REPL_COMMANDS[command];
    console.log();
    console.log(output.bold(command));
    console.log(`  ${cmd.description}`);
    console.log();
    console.log(`  Usage: ${cmd.usage}`);
    if (cmd.example) {
      console.log(`  Example: ${cmd.example}`);
    }
    console.log();
    return;
  }

  console.log();
  console.log(output.bold('CRM REPL Commands'));
  printDivider();

  const maxCmd = Math.max(...Object.keys(REPL_COMMANDS).map((c) => c.length));

  for (const [cmd, info] of Object.entries(REPL_COMMANDS)) {
    console.log(`  ${colorize(cmd.padEnd(maxCmd + 2), 'cyan')}${info.description}`);
  }

  console.log();
  console.log(`Type ${output.info('help <command>')} for detailed usage.`);
  console.log();
}

/**
 * Show context
 */
function showContext(): void {
  console.log();
  console.log(output.bold('Current Context'));
  printDivider('-');

  if (context.currentContact) {
    console.log(`  Contact: ${context.currentContact}`);
  }

  if (context.currentDeal) {
    console.log(`  Deal: ${context.currentDeal}`);
  }

  if (!context.currentContact && !context.currentDeal) {
    console.log('  (no context set)');
  }

  console.log();
}

/**
 * Set context
 */
function setContext(type: string, id: string): void {
  if (type === 'contact') {
    context.currentContact = id;
    printSuccess(`Context set to contact: ${id}`);
  } else if (type === 'deal') {
    context.currentDeal = id;
    printSuccess(`Context set to deal: ${id}`);
  } else {
    printError(`Unknown context type: ${type}`);
  }
}

/**
 * Show history
 */
function showHistory(n = 10): void {
  console.log();
  const count = Math.min(n, history.length);
  const start = Math.max(0, history.length - count);

  for (let i = start; i < history.length; i++) {
    const num = String(i + 1).padStart(3);
    console.log(`  ${output.dim(num)}  ${history[i]}`);
  }

  console.log();
}

/**
 * Parse and execute command
 */
async function executeCommand(
  input: string,
  program: Command
): Promise<boolean> {
  const trimmed = input.trim();

  if (!trimmed) return true;

  // Add to history
  history.push(trimmed);

  // Parse command
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case 'help':
    case '?':
      showHelp(args[0]);
      break;

    case 'exit':
    case 'quit':
    case 'q':
      console.log('\nGoodbye!');
      return false;

    case 'clear':
      console.clear();
      break;

    case 'context':
      showContext();
      break;

    case 'use':
      if (args.length < 2) {
        printError('Usage: use contact|deal <id>');
      } else {
        setContext(args[0], args[1]);
      }
      break;

    case 'recent':
      // Delegate to search recent
      try {
        await program.parseAsync(['recent', ...args], { from: 'user' });
      } catch (e) {
        printError(String(e));
      }
      break;

    case 'history':
      showHistory(args[0] ? parseInt(args[0]) : 10);
      break;

    case 'config':
      if (args[0] === 'location') {
        console.log(`\nConfig file: ${getConfigLocation()}\n`);
      } else {
        displayConfig();
      }
      break;

    case 'contacts':
    case 'deals':
    case 'activities':
    case 'media':
    case 'search':
      // Delegate to main program
      try {
        // Add context if not specified
        const fullArgs = [...args];
        if (cmd === 'activities' && !args.includes('-c') && !args.includes('--contact') && context.currentContact) {
          if (args[0] === 'list') {
            fullArgs.push('-c', context.currentContact);
          }
        }
        if (cmd === 'media' && !args.includes('-c') && !args.includes('--contact') && context.currentContact) {
          if (args[0] === 'list') {
            fullArgs.push('-c', context.currentContact);
          }
        }

        await program.parseAsync([cmd, ...fullArgs], { from: 'user' });
      } catch (e) {
        printError(String(e));
      }
      break;

    default:
      printError(`Unknown command: ${cmd}`);
      console.log(`Type ${output.info('help')} for available commands.`);
  }

  return true;
}

/**
 * Start REPL
 */
export async function startREPL(program: Command): Promise<void> {
  printHeader('CRM Interactive Mode');
  console.log(`Type ${output.info('help')} for commands, ${output.info('exit')} to quit.`);
  console.log();

  const rl = createRL();

  const promptForInput = () => {
    rl.question(getPrompt(), async (input) => {
      const shouldContinue = await executeCommand(input, program);

      if (shouldContinue) {
        promptForInput();
      } else {
        rl.close();
        process.exit(0);
      }
    });
  };

  // Handle Ctrl+C
  rl.on('SIGINT', () => {
    console.log('\n\nGoodbye!');
    rl.close();
    process.exit(0);
  });

  // Handle Ctrl+D
  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });

  promptForInput();
}

/**
 * Register REPL command
 */
export function registerREPLCommand(program: Command): void {
  program
    .command('repl')
    .description('Start interactive REPL mode')
    .action(async () => {
      await startREPL(program);
    });
}
