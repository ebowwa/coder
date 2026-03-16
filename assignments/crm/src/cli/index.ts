#!/usr/bin/env bun
/**
 * CRM CLI Entry Point
 *
 * Terminal-based CLI for CRM operations.
 */

import { Command } from 'commander';
import {
  printError,
  printHeader,
  output,
} from './utils/output.js';
import { loadConfig, applyEnvOverrides, initConfig } from './utils/config.js';
import { registerContactCommands } from './commands/contacts.js';
import { registerDealCommands } from './commands/deals.js';
import { registerActivityCommands } from './commands/activities.js';
import { registerMediaCommands } from './commands/media.js';
import { registerSearchCommands } from './commands/search.js';
import { registerREPLCommand } from './repl.js';

// Package version (would be read from package.json in production)
const VERSION = '1.0.0';

/**
 * Create and configure the CLI program
 */
function createProgram(): Command {
  const program = new Command();

  // Program metadata
  program
    .name('crm')
    .description('Terminal-based CRM CLI')
    .version(VERSION, '-v, --version', 'Show version')
    .helpOption('-h, --help', 'Show help');

  // Global options
  program
    .option('--json', 'Output as JSON')
    .option('--no-color', 'Disable colored output')
    .option('--api <url>', 'API endpoint URL');

  // Register command modules
  registerContactCommands(program);
  registerDealCommands(program);
  registerActivityCommands(program);
  registerMediaCommands(program);
  registerSearchCommands(program);
  registerREPLCommand(program);

  // Config command
  program
    .command('config')
    .description('Manage CLI configuration')
    .argument('[action]', 'Action (show, init, location)')
    .action(async (action = 'show') => {
      const { displayConfig, initConfig, getConfigLocation } = await import(
        './utils/config.js'
      );

      switch (action) {
        case 'init':
          await initConfig();
          break;
        case 'location':
          console.log(`\nConfig file: ${getConfigLocation()}\n`);
          break;
        case 'show':
        default:
          displayConfig();
      }
    });

  // Init command (alias)
  program
    .command('init')
    .description('Initialize CLI configuration')
    .action(async () => {
      const { initConfig } = await import('./utils/config.js');
      await initConfig();
    });

  // Status command
  program
    .command('status')
    .description('Show CRM status overview')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const { printTable, printJSON, formatCurrency } = await import(
        './utils/output.js'
      );

      // Mock data (would come from API)
      const status = {
        contacts: { total: 156, leads: 45, customers: 89 },
        deals: {
          total: 34,
          pipeline: 245000,
          won: 89000,
          weighted: 156000,
        },
        activities: { today: 12, thisWeek: 67 },
      };

      if (options.json) {
        printJSON(status);
        return;
      }

      printHeader('CRM Status');

      console.log(output.bold('\u{1F464} Contacts'));
      console.log(`  Total: ${status.contacts.total}`);
      console.log(`  Leads: ${status.contacts.leads}`);
      console.log(`  Customers: ${status.contacts.customers}`);
      console.log();

      console.log(output.bold('\u{1F4B0} Deals'));
      console.log(`  Total: ${status.deals.total}`);
      console.log(`  Pipeline Value: ${formatCurrency(status.deals.pipeline)}`);
      console.log(`  Won This Month: ${formatCurrency(status.deals.won)}`);
      console.log(`  Weighted Pipeline: ${formatCurrency(status.deals.weighted)}`);
      console.log();

      console.log(output.bold('\u{1F4DD} Activities'));
      console.log(`  Today: ${status.activities.today}`);
      console.log(`  This Week: ${status.activities.thisWeek}`);
      console.log();
    });

  // Quick commands
  program
    .command('ls')
    .description('List contacts (alias for contacts list)')
    .allowUnknownOption(true)
    .action(async () => {
      const args = process.argv.slice(process.argv.indexOf('ls') + 1);
      await program.parseAsync(['contacts', 'list', ...args], { from: 'user' });
    });

  program
    .command('new')
    .description('Create new entity')
    .argument('<type>', 'Entity type (contact, deal, activity)')
    .action(async (type) => {
      switch (type) {
        case 'contact':
          await program.parseAsync(['contacts', 'create'], { from: 'user' });
          break;
        case 'deal':
          await program.parseAsync(['deals', 'create'], { from: 'user' });
          break;
        case 'activity':
          await program.parseAsync(['activities', 'create'], { from: 'user' });
          break;
        default:
          printError(`Unknown entity type: ${type}`);
          console.log('Valid types: contact, deal, activity');
      }
    });

  return program;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Load and apply configuration
  let config = loadConfig();
  config = applyEnvOverrides(config);

  // Create program
  const program = createProgram();

  // Handle unknown commands
  program.on('command:*', (operands) => {
    printError(`Unknown command: ${operands[0]}`);
    console.log(`Run ${output.info('crm --help')} for available commands.`);
    process.exit(1);
  });

  // Parse arguments
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      printError(error.message);
    } else {
      printError('An unexpected error occurred');
    }
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { createProgram };
