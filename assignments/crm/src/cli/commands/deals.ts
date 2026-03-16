/**
 * Deal Commands
 *
 * CLI commands for managing deals in the CRM.
 */

import { Command } from 'commander';
import {
  printSuccess,
  printError,
  printWarning,
  printTable,
  printJSON,
  printHeader,
  printDivider,
  formatStatus,
  formatCurrency,
  formatRelativeTime,
  formatDate,
  truncate,
  output,
} from '../utils/output.js';
import {
  prompt,
  promptRequired,
  promptNumber,
  promptTags,
  confirm,
  select,
  previewAndConfirm,
  Spinner,
} from '../utils/prompt.js';
import { loadConfig, addRecentDeal, getConfig } from '../utils/config.js';
import { CRMStorageClient } from '../../mcp/storage/client.js';
import type { Deal, DealStage, DealPriority, Currency } from '../../core/types.js';

// Deal stage options
const DEAL_STAGES: DealStage[] = [
  'prospecting',
  'qualification',
  'needs_analysis',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
];

// Deal priority options
const DEAL_PRIORITIES: DealPriority[] = ['low', 'medium', 'high', 'urgent'];

// Currency options
const CURRENCIES: Currency[] = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'JPY',
  'CNY',
  'INR',
  'BRL',
  'MXN',
];

// Stage display names
const STAGE_LABELS: Record<DealStage, string> = {
  prospecting: 'Prospecting',
  qualification: 'Qualification',
  needs_analysis: 'Needs Analysis',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

// Storage client singleton
let _storage: CRMStorageClient | null = null;

/**
 * Get storage client (lazy initialization)
 */
async function getStorage(): Promise<CRMStorageClient> {
  if (!_storage) {
    _storage = new CRMStorageClient({
      path: process.env.CRM_DB_PATH || './data/crm-cli',
      mapSize: 256 * 1024 * 1024, // 256MB
      maxDbs: 20,
    });
    await _storage.initialize();
  }
  return _storage;
}

/**
 * Get all deals
 */
async function getDeals(): Promise<Deal[]> {
  const storage = await getStorage();
  return storage.list('deals');
}

/**
 * Get deal by ID
 */
async function getDeal(id: string): Promise<Deal | null> {
  const storage = await getStorage();
  return storage.get('deals', id);
}

/**
 * Create deal
 */
async function createDeal(data: Partial<Deal>): Promise<Deal> {
  const storage = await getStorage();
  return storage.insert('deals', {
    title: data.title || '',
    contactId: data.contactId || '',
    companyId: data.companyId,
    value: data.value || 0,
    currency: data.currency || 'USD',
    stage: data.stage || 'prospecting',
    probability: data.probability || 0,
    expectedClose: data.expectedClose || new Date().toISOString(),
    actualClose: data.actualClose,
    priority: data.priority || 'medium',
    lineItems: data.lineItems || [],
    discount: data.discount,
    discountType: data.discountType,
    totalValue: data.totalValue || data.value || 0,
    notes: data.notes || '',
    tags: data.tags || [],
    competitors: data.competitors || [],
    lossReason: data.lossReason,
    nextSteps: data.nextSteps,
    ownerId: data.ownerId,
    source: data.source,
    customFields: data.customFields || [],
    lastActivityAt: data.lastActivityAt,
  });
}

/**
 * Update deal
 */
async function updateDeal(id: string, data: Partial<Deal>): Promise<Deal | null> {
  const storage = await getStorage();
  const existing = await storage.get('deals', id);
  if (!existing) return null;
  return storage.update('deals', id, data);
}

/**
 * Delete deal
 */
async function deleteDeal(id: string): Promise<boolean> {
  const storage = await getStorage();
  const existing = await storage.get('deals', id);
  if (!existing) return false;
  await storage.delete('deals', id);
  return true;
}

/**
 * Filter deals by stage
 */
async function filterByStage(stage: DealStage): Promise<Deal[]> {
  const deals = await getDeals();
  return deals.filter((d) => d.stage === stage);
}

/**
 * Get probability for stage
 */
function getStageProbability(stage: DealStage): number {
  const probabilities: Record<DealStage, number> = {
    prospecting: 10,
    qualification: 20,
    needs_analysis: 40,
    proposal: 60,
    negotiation: 80,
    closed_won: 100,
    closed_lost: 0,
  };
  return probabilities[stage];
}

/**
 * Register deal commands
 */
export function registerDealCommands(program: Command): void {
  const deals = program.command('deals').description('Manage deals');

  // List deals
  deals
    .command('list')
    .description('List all deals')
    .option('-s, --stage <stage>', 'Filter by stage')
    .option('--priority <priority>', 'Filter by priority')
    .option('--json', 'Output as JSON')
    .option('--limit <number>', 'Limit results', '20')
    .action(async (options) => {
      let dealsList = await getDeals();

      if (options.stage) {
        dealsList = dealsList.filter(
          (d) => d.stage.toLowerCase() === options.stage.toLowerCase()
        );
      }

      if (options.priority) {
        dealsList = dealsList.filter(
          (d) => d.priority.toLowerCase() === options.priority.toLowerCase()
        );
      }

      const limit = parseInt(options.limit);
      dealsList = dealsList.slice(0, limit);

      if (options.json) {
        printJSON(dealsList);
        return;
      }

      if (dealsList.length === 0) {
        printWarning('No deals found');
        return;
      }

      // Calculate pipeline value
      const totalValue = dealsList.reduce((sum, d) => sum + d.totalValue, 0);
      const weightedValue = dealsList.reduce(
        (sum, d) => sum + d.totalValue * (d.probability / 100),
        0
      );

      printHeader(`Deals (${dealsList.length})`);
      console.log(
        `${output.dim('Pipeline:')} ${formatCurrency(totalValue)} | ` +
        `${output.dim('Weighted:')} ${formatCurrency(weightedValue)}`
      );
      console.log();

      printTable(dealsList, [
        { key: 'id', header: 'ID', width: 8, format: (v) => truncate(String(v), 8) },
        { key: 'title', header: 'Title', width: 25, format: (v) => truncate(String(v), 25) },
        {
          key: 'value',
          header: 'Value',
          width: 12,
          format: (v, row) => formatCurrency(Number(v), (row as Deal).currency),
        },
        { key: 'stage', header: 'Stage', format: (v) => formatStatus(String(v)) },
        { key: 'probability', header: 'Prob', width: 5, format: (v) => `${v}%` },
        {
          key: 'expectedClose',
          header: 'Close Date',
          format: (v) => formatDate(String(v)),
        },
      ]);
    });

  // Get deal details
  deals
    .command('get <id>')
    .description('Get deal details')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const deal = await getDeal(id);

      if (!deal) {
        printError(`Deal not found: ${id}`);
        process.exit(1);
      }

      addRecentDeal(id);

      if (options.json) {
        printJSON(deal);
        return;
      }

      printHeader(`Deal: ${deal.title}`);

      console.log(`${output.dim('ID:')} ${deal.id}`);
      console.log(`${output.dim('Stage:')} ${formatStatus(deal.stage)}`);
      console.log(`${output.dim('Priority:')} ${formatStatus(deal.priority)}`);
      console.log();

      // Deal Info
      console.log(output.bold('Deal Information'));
      printDivider('-');
      console.log(
        `${output.dim('Value:')} ${formatCurrency(deal.value, deal.currency)}`
      );
      console.log(
        `${output.dim('Total Value:')} ${formatCurrency(deal.totalValue, deal.currency)}`
      );
      console.log(`${output.dim('Probability:')} ${deal.probability}%`);
      console.log(
        `${output.dim('Expected Close:')} ${formatDate(deal.expectedClose)}`
      );

      if (deal.actualClose) {
        console.log(`${output.dim('Actual Close:')} ${formatDate(deal.actualClose)}`);
      }

      if (deal.discount) {
        const discountStr =
          deal.discountType === 'percentage'
            ? `${deal.discount}%`
            : formatCurrency(deal.discount, deal.currency);
        console.log(`${output.dim('Discount:')} ${discountStr}`);
      }

      console.log();

      // Contact Info
      console.log(output.bold('Associated Contact'));
      printDivider('-');
      console.log(`${output.dim('Contact ID:')} ${deal.contactId}`);

      if (deal.companyId) {
        console.log(`${output.dim('Company ID:')} ${deal.companyId}`);
      }

      console.log();

      // Tags
      if (deal.tags.length > 0) {
        console.log(output.bold('Tags'));
        printDivider('-');
        console.log(deal.tags.map((t) => output.info(`#${t}`)).join(' '));
        console.log();
      }

      // Notes
      if (deal.notes) {
        console.log(output.bold('Notes'));
        printDivider('-');
        console.log(deal.notes);
        console.log();
      }

      // Metadata
      console.log(output.bold('Metadata'));
      printDivider('-');
      console.log(
        `${output.dim('Created:')} ${new Date(deal.createdAt).toLocaleString()}`
      );
      console.log(
        `${output.dim('Updated:')} ${new Date(deal.updatedAt).toLocaleString()}`
      );

      if (deal.lastActivityAt) {
        console.log(
          `${output.dim('Last Activity:')} ${formatRelativeTime(deal.lastActivityAt)}`
        );
      }

      console.log();
    });

  // Create deal
  deals
    .command('create')
    .description('Create a new deal')
    .option('--title <title>', 'Deal title')
    .option('--contact <id>', 'Contact ID')
    .option('--value <amount>', 'Deal value')
    .option('--currency <currency>', 'Currency')
    .option('--stage <stage>', 'Deal stage')
    .option('--priority <priority>', 'Deal priority')
    .option('--tags <tags>', 'Tags (comma-separated)')
    .option('--notes <notes>', 'Deal notes')
    .action(async (options) => {
      printHeader('Create Deal');

      // Gather data
      const title = options.title || (await promptRequired('Deal Title'));
      const contactId = options.contact || (await promptRequired('Contact ID'));

      const value =
        options.value !== undefined
          ? parseFloat(options.value)
          : await promptNumber('Deal Value', 0, 0);

      const config = loadConfig();
      const currency = options.currency || config.currency;

      let stage: DealStage = 'prospecting';
      if (options.stage) {
        stage = options.stage as DealStage;
      } else {
        stage = await select('Stage', DEAL_STAGES, 'prospecting');
      }

      const probability = getStageProbability(stage);

      let priority: DealPriority = 'medium';
      if (options.priority) {
        priority = options.priority as DealPriority;
      } else {
        priority = await select('Priority', DEAL_PRIORITIES, 'medium');
      }

      const tags = options.tags
        ? options.tags.split(',').map((t: string) => t.trim())
        : await promptTags('Tags (comma-separated)');

      const notes = options.notes || (await prompt('Notes'));

      // Expected close date
      const defaultCloseDate = new Date();
      defaultCloseDate.setMonth(defaultCloseDate.getMonth() + 1);
      const expectedCloseStr = await prompt(
        'Expected Close Date (YYYY-MM-DD)',
        defaultCloseDate.toISOString().split('T')[0]
      );
      const expectedClose = new Date(expectedCloseStr).toISOString();

      // Preview
      const confirmed = await previewAndConfirm('Deal Preview', {
        Title: title,
        'Contact ID': contactId,
        Value: formatCurrency(value, currency),
        Stage: stage,
        Probability: `${probability}%`,
        Priority: priority,
        'Expected Close': formatDate(expectedClose),
        Tags: tags.length > 0 ? tags.join(', ') : '(none)',
        Notes: notes || '(none)',
      });

      if (!confirmed) {
        printWarning('Deal creation cancelled');
        return;
      }

      // Create deal
      const spinner = new Spinner('Creating deal...').start();

      const deal = await createDeal({
        title,
        contactId,
        value,
        currency,
        stage,
        probability,
        priority,
        tags,
        notes,
        expectedClose,
        totalValue: value,
      });

      spinner.succeed('Deal created successfully');
      printSuccess(`Deal ID: ${deal.id}`);
      console.log();
    });

  // Update deal
  deals
    .command('update <id>')
    .description('Update a deal')
    .option('--title <title>', 'Deal title')
    .option('--value <amount>', 'Deal value')
    .option('--stage <stage>', 'Deal stage')
    .option('--priority <priority>', 'Deal priority')
    .option('--probability <percent>', 'Win probability')
    .option('--notes <notes>', 'Deal notes')
    .action(async (id, options) => {
      const deal = await getDeal(id);

      if (!deal) {
        printError(`Deal not found: ${id}`);
        process.exit(1);
      }

      printHeader(`Update Deal: ${deal.title}`);

      const updates: Partial<Deal> = {};

      if (options.title) updates.title = options.title;
      if (options.value !== undefined) {
        updates.value = parseFloat(options.value);
        updates.totalValue = updates.value;
      }
      if (options.stage) updates.stage = options.stage as DealStage;
      if (options.priority) updates.priority = options.priority as DealPriority;
      if (options.probability !== undefined) {
        updates.probability = parseInt(options.probability);
      }
      if (options.notes) updates.notes = options.notes;

      if (Object.keys(updates).length === 0) {
        printWarning('No changes to update');
        return;
      }

      const confirmed = await confirm('Save changes?');
      if (!confirmed) {
        printWarning('Update cancelled');
        return;
      }

      const spinner = new Spinner('Updating deal...').start();

      await updateDeal(id, updates);
      spinner.succeed('Deal updated successfully');
    });

  // Move deal to stage
  deals
    .command('move <id> <stage>')
    .description('Move a deal to a different stage')
    .action(async (id, stageStr) => {
      const deal = await getDeal(id);

      if (!deal) {
        printError(`Deal not found: ${id}`);
        process.exit(1);
      }

      const stage = stageStr.toLowerCase() as DealStage;
      if (!DEAL_STAGES.includes(stage)) {
        printError(`Invalid stage: ${stageStr}`);
        console.log(`Valid stages: ${DEAL_STAGES.join(', ')}`);
        process.exit(1);
      }

      const probability = getStageProbability(stage);

      console.log(
        `\nMoving "${deal.title}" from ${formatStatus(deal.stage)} to ${formatStatus(stage)}`
      );
      console.log(`Probability: ${deal.probability}% -> ${probability}%\n`);

      const confirmed = await confirm('Proceed?');
      if (!confirmed) {
        printWarning('Move cancelled');
        return;
      }

      const spinner = new Spinner('Moving deal...').start();

      await updateDeal(id, { stage, probability });

      if (stage === 'closed_won' || stage === 'closed_lost') {
        await updateDeal(id, { actualClose: new Date().toISOString() });
      }

      spinner.succeed(`Deal moved to ${STAGE_LABELS[stage]}`);
    });

  // Delete deal
  deals
    .command('delete <id>')
    .description('Delete a deal')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      const deal = await getDeal(id);

      if (!deal) {
        printError(`Deal not found: ${id}`);
        process.exit(1);
      }

      if (!options.force) {
        console.log(`\nDeal: ${output.bold(deal.title)}`);
        console.log(`Value: ${formatCurrency(deal.value, deal.currency)}`);
        console.log(`Stage: ${deal.stage}\n`);

        const confirmed = await confirm(
          'Are you sure you want to delete this deal?'
        );

        if (!confirmed) {
          printWarning('Deletion cancelled');
          return;
        }
      }

      const spinner = new Spinner('Deleting deal...').start();

      await deleteDeal(id);
      spinner.succeed('Deal deleted successfully');
    });

  // Pipeline summary
  deals
    .command('pipeline')
    .description('Show pipeline summary')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      const dealsList = await getDeals();

      if (options.json) {
        const summary = await Promise.all(DEAL_STAGES.map(async (stage) => {
          const stageDeals = await filterByStage(stage);
          return {
            stage,
            count: stageDeals.length,
            value: stageDeals.reduce((sum, d) => sum + d.totalValue, 0),
          };
        }));
        printJSON(summary);
        return;
      }

      printHeader('Pipeline Summary');

      let totalValue = 0;
      let totalWeighted = 0;

      for (const stage of DEAL_STAGES) {
        const stageDeals = await filterByStage(stage);
        const value = stageDeals.reduce((sum, d) => sum + d.totalValue, 0);
        const weighted = value * (getStageProbability(stage) / 100);

        totalValue += value;
        totalWeighted += weighted;

        const bar = '\u2588'.repeat(Math.min(20, Math.floor(stageDeals.length / 2)));
        console.log(
          `${formatStatus(stage).padEnd(20)} ` +
          `${output.dim(stageDeals.length.toString().padStart(3))} ` +
          `${output.info(bar)}` +
          ` ${formatCurrency(value)}`
        );
      }

      console.log();
      console.log(`${output.bold('Total Pipeline:')} ${formatCurrency(totalValue)}`);
      console.log(`${output.bold('Weighted Pipeline:')} ${formatCurrency(totalWeighted)}`);
      console.log();
    });
}
