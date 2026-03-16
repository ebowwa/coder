/**
 * Search Commands
 *
 * CLI commands for searching across CRM entities.
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
  truncate,
  output,
} from '../utils/output.js';
import { Spinner } from '../utils/prompt.js';
import type { Contact, Deal, Activity } from '../../core/types.js';

/**
 * Search result type
 */
interface SearchResult {
  type: 'contact' | 'deal' | 'activity';
  id: string;
  title: string;
  subtitle: string;
  matchField?: string;
  matchValue?: string;
}

/**
 * Mock data stores (imported from other command modules)
 * In real implementation, would use shared data layer
 */
const contactsStore = new Map<string, Contact>();
const dealsStore = new Map<string, Deal>();
const activitiesStore = new Map<string, Activity>();

/**
 * Register search commands
 */
export function registerSearchCommands(program: Command): void {
  const search = program.command('search').description('Search across all entities');

  // Global search
  search
    .command('<query>')
    .description('Search contacts, deals, and activities')
    .option('-t, --type <type>', 'Filter by entity type (contact, deal, activity)')
    .option('--json', 'Output as JSON')
    .option('--limit <number>', 'Limit results per type', '10')
    .action(async (query, options) => {
      if (!query || query.length < 2) {
        printError('Search query must be at least 2 characters');
        process.exit(1);
      }

      const spinner = new Spinner(`Searching for "${query}"...`).start();
      await new Promise((r) => setTimeout(r, 300));

      const results: SearchResult[] = [];
      const q = query.toLowerCase();
      const limit = parseInt(options.limit);

      // Search contacts
      if (!options.type || options.type === 'contact') {
        const contacts = Array.from(contactsStore.values());
        for (const contact of contacts) {
          const matches: { field: string; value: string }[] = [];

          // Check name
          if (contact.name.toLowerCase().includes(q)) {
            matches.push({ field: 'name', value: contact.name });
          }

          // Check emails
          for (const email of contact.emails) {
            if (email.email.toLowerCase().includes(q)) {
              matches.push({ field: 'email', value: email.email });
            }
          }

          // Check company
          if (contact.company?.toLowerCase().includes(q)) {
            matches.push({ field: 'company', value: contact.company });
          }

          // Check tags
          for (const tag of contact.tags) {
            if (tag.toLowerCase().includes(q)) {
              matches.push({ field: 'tag', value: tag });
            }
          }

          if (matches.length > 0) {
            results.push({
              type: 'contact',
              id: contact.id,
              title: contact.name,
              subtitle: contact.company || contact.emails[0]?.email || 'No details',
              matchField: matches[0].field,
              matchValue: matches[0].value,
            });
          }

          if (results.filter((r) => r.type === 'contact').length >= limit) break;
        }
      }

      // Search deals
      if (!options.type || options.type === 'deal') {
        const deals = Array.from(dealsStore.values());
        for (const deal of deals) {
          const matches: { field: string; value: string }[] = [];

          // Check title
          if (deal.title.toLowerCase().includes(q)) {
            matches.push({ field: 'title', value: deal.title });
          }

          // Check notes
          if (deal.notes?.toLowerCase().includes(q)) {
            matches.push({ field: 'notes', value: truncate(deal.notes, 50) });
          }

          // Check tags
          for (const tag of deal.tags) {
            if (tag.toLowerCase().includes(q)) {
              matches.push({ field: 'tag', value: tag });
            }
          }

          if (matches.length > 0) {
            results.push({
              type: 'deal',
              id: deal.id,
              title: deal.title,
              subtitle: `${formatCurrency(deal.value, deal.currency)} - ${deal.stage}`,
              matchField: matches[0].field,
              matchValue: matches[0].value,
            });
          }

          if (results.filter((r) => r.type === 'deal').length >= limit) break;
        }
      }

      // Search activities
      if (!options.type || options.type === 'activity') {
        const activities = Array.from(activitiesStore.values());
        for (const activity of activities) {
          const matches: { field: string; value: string }[] = [];

          // Check title
          if (activity.title.toLowerCase().includes(q)) {
            matches.push({ field: 'title', value: activity.title });
          }

          // Check description
          if (activity.description?.toLowerCase().includes(q)) {
            matches.push({ field: 'description', value: truncate(activity.description, 50) });
          }

          if (matches.length > 0) {
            results.push({
              type: 'activity',
              id: activity.id,
              title: activity.title,
              subtitle: `${activity.type} - ${formatRelativeTime(activity.timestamp)}`,
              matchField: matches[0].field,
              matchValue: matches[0].value,
            });
          }

          if (results.filter((r) => r.type === 'activity').length >= limit) break;
        }
      }

      spinner.succeed(`Found ${results.length} results`);

      if (options.json) {
        printJSON(results);
        return;
      }

      if (results.length === 0) {
        printWarning(`No results found for "${query}"`);
        return;
      }

      // Group by type
      const byType = results.reduce(
        (acc, r) => {
          if (!acc[r.type]) acc[r.type] = [];
          acc[r.type].push(r);
          return acc;
        },
        {} as Record<string, SearchResult[]>
      );

      // Display contacts
      if (byType.contact?.length) {
        console.log();
        console.log(output.bold(`\u{1F464} Contacts (${byType.contact.length})`));
        printDivider('-');

        printTable(byType.contact, [
          { key: 'id', header: 'ID', width: 8, format: (v) => truncate(String(v), 8) },
          { key: 'title', header: 'Name', width: 25 },
          { key: 'subtitle', header: 'Details', width: 30, format: (v) => truncate(String(v), 30) },
          {
            key: 'matchField',
            header: 'Match',
            format: (v, row) => `${v}: ${(row as SearchResult).matchValue}`,
          },
        ]);
      }

      // Display deals
      if (byType.deal?.length) {
        console.log();
        console.log(output.bold(`\u{1F4B0} Deals (${byType.deal.length})`));
        printDivider('-');

        printTable(byType.deal, [
          { key: 'id', header: 'ID', width: 8, format: (v) => truncate(String(v), 8) },
          { key: 'title', header: 'Title', width: 25, format: (v) => truncate(String(v), 25) },
          { key: 'subtitle', header: 'Value/Stage', width: 30, format: (v) => truncate(String(v), 30) },
          {
            key: 'matchField',
            header: 'Match',
            format: (v, row) => `${v}: ${(row as SearchResult).matchValue}`,
          },
        ]);
      }

      // Display activities
      if (byType.activity?.length) {
        console.log();
        console.log(output.bold(`\u{1F4DD} Activities (${byType.activity.length})`));
        printDivider('-');

        printTable(byType.activity, [
          { key: 'id', header: 'ID', width: 8, format: (v) => truncate(String(v), 8) },
          { key: 'title', header: 'Title', width: 30, format: (v) => truncate(String(v), 30) },
          { key: 'subtitle', header: 'When', width: 20 },
          {
            key: 'matchField',
            header: 'Match',
            format: (v, row) => `${v}: ${(row as SearchResult).matchValue}`,
          },
        ]);
      }

      console.log();
    });

  // Quick search (alias)
  search
    .command('quick <query>')
    .description('Quick search with minimal output')
    .action(async (query) => {
      const results: SearchResult[] = [];
      const q = query.toLowerCase();

      // Quick contact search
      for (const contact of contactsStore.values()) {
        if (contact.name.toLowerCase().includes(q)) {
          results.push({
            type: 'contact',
            id: contact.id,
            title: contact.name,
            subtitle: contact.emails[0]?.email || '',
          });
          if (results.length >= 5) break;
        }
      }

      // Quick deal search
      for (const deal of dealsStore.values()) {
        if (deal.title.toLowerCase().includes(q)) {
          results.push({
            type: 'deal',
            id: deal.id,
            title: deal.title,
            subtitle: formatCurrency(deal.value, deal.currency),
          });
          if (results.length >= 10) break;
        }
      }

      if (results.length === 0) {
        printWarning('No quick results');
        return;
      }

      for (const r of results) {
        const icon = r.type === 'contact' ? '\u{1F464}' : '\u{1F4B0}';
        console.log(`${icon} ${output.bold(r.id.slice(0, 8))} ${r.title} ${output.dim(r.subtitle)}`);
      }
    });

  // Recent items
  search
    .command('recent')
    .description('Show recent items')
    .option('-t, --type <type>', 'Filter by type (contact, deal, activity)')
    .option('--limit <number>', 'Limit results', '10')
    .action(async (options) => {
      const limit = parseInt(options.limit);
      const results: SearchResult[] = [];

      // Get recent contacts
      if (!options.type || options.type === 'contact') {
        const contacts = Array.from(contactsStore.values())
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, limit);

        for (const c of contacts) {
          results.push({
            type: 'contact',
            id: c.id,
            title: c.name,
            subtitle: `Updated ${formatRelativeTime(c.updatedAt)}`,
          });
        }
      }

      // Get recent deals
      if (!options.type || options.type === 'deal') {
        const deals = Array.from(dealsStore.values())
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, limit);

        for (const d of deals) {
          results.push({
            type: 'deal',
            id: d.id,
            title: d.title,
            subtitle: `${formatStatus(d.stage)} - Updated ${formatRelativeTime(d.updatedAt)}`,
          });
        }
      }

      // Get recent activities
      if (!options.type || options.type === 'activity') {
        const activities = Array.from(activitiesStore.values())
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);

        for (const a of activities) {
          results.push({
            type: 'activity',
            id: a.id,
            title: a.title,
            subtitle: `${a.type} - ${formatRelativeTime(a.timestamp)}`,
          });
        }
      }

      if (results.length === 0) {
        printWarning('No recent items');
        return;
      }

      printHeader('Recent Items');

      for (const r of results) {
        const icons: Record<string, string> = {
          contact: '\u{1F464}',
          deal: '\u{1F4B0}',
          activity: '\u{1F4DD}',
        };
        const icon = icons[r.type];
        console.log(
          `${icon} ${output.dim(r.type.padEnd(8))} ${output.bold(truncate(r.id, 8))} ${r.title}`
        );
        console.log(`  ${output.dim(r.subtitle)}`);
      }

      console.log();
    });
}

/**
 * Set data stores (for integration with other command modules)
 */
export function setSearchDataStores(
  contacts: Map<string, Contact>,
  deals: Map<string, Deal>,
  activities: Map<string, Activity>
): void {
  // In real implementation, would use shared data layer
  // For now, copy references
  contacts.forEach((v, k) => contactsStore.set(k, v));
  deals.forEach((v, k) => dealsStore.set(k, v));
  activities.forEach((v, k) => activitiesStore.set(k, v));
}
