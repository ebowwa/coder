/**
 * Contact Commands
 *
 * CLI commands for managing contacts in the CRM.
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
  formatRelativeTime,
  truncate,
  output,
} from '../utils/output.js';
import {
  prompt,
  promptRequired,
  promptEmail,
  promptTags,
  confirm,
  select,
  multiSelect,
  previewAndConfirm,
  Spinner,
} from '../utils/prompt.js';
import { loadConfig, addRecentContact, getConfig } from '../utils/config.js';
import { CRMStorageClient } from '../../mcp/storage/client.js';
import type { Contact, ContactStatus, ContactSource } from '../../core/types.js';

// Contact status options
const CONTACT_STATUSES: ContactStatus[] = [
  'lead',
  'prospect',
  'qualified',
  'customer',
  'churned',
  'archived',
];

// Contact source options
const CONTACT_SOURCES: ContactSource[] = [
  'organic',
  'referral',
  'advertisement',
  'social_media',
  'email_campaign',
  'website',
  'event',
  'cold_outreach',
  'partner',
  'other',
];

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
 * Get all contacts
 */
async function getContacts(): Promise<Contact[]> {
  const storage = await getStorage();
  return storage.list('contacts');
}

/**
 * Get contact by ID
 */
async function getContact(id: string): Promise<Contact | null> {
  const storage = await getStorage();
  return storage.get('contacts', id);
}

/**
 * Create contact
 */
async function createContact(data: Partial<Contact>): Promise<Contact> {
  const storage = await getStorage();
  return storage.insert('contacts', {
    name: data.name || '',
    firstName: data.firstName,
    lastName: data.lastName,
    emails: data.emails || [],
    phones: data.phones || [],
    addresses: data.addresses || [],
    company: data.company,
    title: data.title,
    department: data.department,
    socialProfiles: data.socialProfiles || [],
    website: data.website,
    tags: data.tags || [],
    customFields: data.customFields || [],
    source: data.source,
    status: data.status || 'lead',
    ownerId: data.ownerId,
    avatar: data.avatar,
    preferredContact: data.preferredContact,
    language: data.language,
    timezone: data.timezone,
    preferences: data.preferences,
    leadScore: data.leadScore,
    doNotContact: data.doNotContact || false,
    lastContactedAt: data.lastContactedAt,
    nextFollowUpAt: data.nextFollowUpAt,
  });
}

/**
 * Update contact
 */
async function updateContact(id: string, data: Partial<Contact>): Promise<Contact | null> {
  const storage = await getStorage();
  const existing = await storage.get('contacts', id);
  if (!existing) return null;
  return storage.update('contacts', id, data);
}

/**
 * Delete contact
 */
async function deleteContact(id: string): Promise<boolean> {
  const storage = await getStorage();
  const existing = await storage.get('contacts', id);
  if (!existing) return false;
  await storage.delete('contacts', id);
  return true;
}

/**
 * Search contacts
 */
async function searchContacts(query: string): Promise<Contact[]> {
  const contacts = await getContacts();
  const q = query.toLowerCase();
  return contacts.filter((c) => {
    return (
      c.name.toLowerCase().includes(q) ||
      c.emails.some((e) => e.email.toLowerCase().includes(q)) ||
      c.company?.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}

/**
 * Filter contacts by tag
 */
async function filterByTag(tag: string): Promise<Contact[]> {
  const contacts = await getContacts();
  return contacts.filter((c) =>
    c.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

/**
 * Register contact commands
 */
export function registerContactCommands(program: Command): void {
  const contacts = program.command('contacts').description('Manage contacts');

  // List contacts
  contacts
    .command('list')
    .description('List all contacts')
    .option('-s, --search <query>', 'Search contacts')
    .option('-t, --tag <tag>', 'Filter by tag')
    .option('--status <status>', 'Filter by status')
    .option('--json', 'Output as JSON')
    .option('--limit <number>', 'Limit results', '20')
    .action(async (options) => {
      let contacts: Contact[];

      if (options.search) {
        contacts = await searchContacts(options.search);
      } else if (options.tag) {
        contacts = await filterByTag(options.tag);
      } else {
        contacts = await getContacts();
      }

      if (options.status) {
        contacts = contacts.filter(
          (c) => c.status.toLowerCase() === options.status.toLowerCase()
        );
      }

      const limit = parseInt(options.limit);
      contacts = contacts.slice(0, limit);

      if (options.json) {
        printJSON(contacts);
        return;
      }

      if (contacts.length === 0) {
        printWarning('No contacts found');
        return;
      }

      printHeader(`Contacts (${contacts.length})`);

      printTable(contacts, [
        { key: 'id', header: 'ID', width: 8, format: (v) => truncate(String(v), 8) },
        { key: 'name', header: 'Name', width: 20 },
        {
          key: 'emails',
          header: 'Email',
          width: 25,
          format: (v) => {
            const emails = v as { email: string; primary: boolean }[];
            const primary = emails.find((e) => e.primary) || emails[0];
            return primary?.email || '';
          },
        },
        { key: 'company', header: 'Company', width: 15, format: (v) => truncate(String(v || ''), 15) },
        { key: 'status', header: 'Status', format: (v) => formatStatus(String(v)) },
        {
          key: 'updatedAt',
          header: 'Updated',
          format: (v) => formatRelativeTime(String(v)),
        },
      ]);
    });

  // Get contact details
  contacts
    .command('get <id>')
    .description('Get contact details')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const contact = await getContact(id);

      if (!contact) {
        printError(`Contact not found: ${id}`);
        process.exit(1);
      }

      addRecentContact(id);

      if (options.json) {
        printJSON(contact);
        return;
      }

      printHeader(`Contact: ${contact.name}`);

      console.log(`${output.dim('ID:')} ${contact.id}`);
      console.log(`${output.dim('Status:')} ${formatStatus(contact.status)}`);
      console.log();

      // Contact Info
      console.log(output.bold('Contact Information'));
      printDivider('-');

      if (contact.emails.length > 0) {
        contact.emails.forEach((e) => {
          const primary = e.primary ? ' (primary)' : '';
          console.log(`${output.dim('Email:')} ${e.email}${primary}`);
        });
      }

      if (contact.phones.length > 0) {
        contact.phones.forEach((p) => {
          const primary = p.primary ? ' (primary)' : '';
          console.log(`${output.dim('Phone:')} ${p.number} [${p.type}]${primary}`);
        });
      }

      if (contact.company) {
        console.log(`${output.dim('Company:')} ${contact.company}`);
      }

      if (contact.title) {
        console.log(`${output.dim('Title:')} ${contact.title}`);
      }

      if (contact.website) {
        console.log(`${output.dim('Website:')} ${contact.website}`);
      }

      console.log();

      // Tags
      if (contact.tags.length > 0) {
        console.log(output.bold('Tags'));
        printDivider('-');
        console.log(contact.tags.map((t) => output.info(`#${t}`)).join(' '));
        console.log();
      }

      // Metadata
      console.log(output.bold('Metadata'));
      printDivider('-');
      console.log(`${output.dim('Created:')} ${new Date(contact.createdAt).toLocaleString()}`);
      console.log(`${output.dim('Updated:')} ${new Date(contact.updatedAt).toLocaleString()}`);

      if (contact.source) {
        console.log(`${output.dim('Source:')} ${contact.source}`);
      }

      if (contact.leadScore !== undefined) {
        console.log(`${output.dim('Lead Score:')} ${contact.leadScore}`);
      }

      console.log();
    });

  // Create contact
  contacts
    .command('create')
    .description('Create a new contact')
    .option('--name <name>', 'Contact name')
    .option('--email <email>', 'Email address')
    .option('--phone <phone>', 'Phone number')
    .option('--company <company>', 'Company name')
    .option('--title <title>', 'Job title')
    .option('--status <status>', 'Contact status')
    .option('--tags <tags>', 'Tags (comma-separated)')
    .option('--source <source>', 'Contact source')
    .option('--no-prompt', 'Skip interactive prompts')
    .action(async (options) => {
      printHeader('Create Contact');

      // Gather data
      const name = options.name || (await promptRequired('Name'));
      const email = options.email || (await promptEmail('Email (primary)'));
      const phone = options.phone || (await prompt('Phone'));
      const company = options.company || (await prompt('Company'));
      const title = options.title || (await prompt('Title'));

      let status: ContactStatus = 'lead';
      if (options.status) {
        status = options.status as ContactStatus;
      } else if (!options.noPrompt) {
        status = await select('Status', CONTACT_STATUSES, 'lead');
      }

      let tags: string[] = [];
      if (options.tags) {
        tags = options.tags.split(',').map((t: string) => t.trim());
      } else if (!options.noPrompt) {
        tags = await promptTags('Tags (comma-separated)');
      }

      let source: ContactSource | undefined;
      if (options.source) {
        source = options.source as ContactSource;
      } else if (!options.noPrompt) {
        const hasSource = await confirm('Add contact source?');
        if (hasSource) {
          source = await select('Source', CONTACT_SOURCES);
        }
      }

      // Build contact data
      const contactData: Partial<Contact> = {
        name,
        emails: [{ email, type: 'personal', primary: true }],
        phones: phone ? [{ number: phone, type: 'mobile', primary: true }] : [],
        company,
        title,
        status,
        tags,
        source,
      };

      // Preview
      console.log();
      const confirmed = await previewAndConfirm('Contact Preview', {
        Name: name,
        Email: email,
        Phone: phone || '(none)',
        Company: company || '(none)',
        Title: title || '(none)',
        Status: status,
        Tags: tags.length > 0 ? tags.join(', ') : '(none)',
        Source: source || '(none)',
      });

      if (!confirmed) {
        printWarning('Contact creation cancelled');
        return;
      }

      // Create contact
      const spinner = new Spinner('Creating contact...').start();

      const contact = await createContact(contactData);
      spinner.succeed('Contact created successfully');

      printSuccess(`Contact ID: ${contact.id}`);
      console.log();
    });

  // Update contact
  contacts
    .command('update <id>')
    .description('Update a contact')
    .option('--name <name>', 'Contact name')
    .option('--email <email>', 'Email address')
    .option('--phone <phone>', 'Phone number')
    .option('--company <company>', 'Company name')
    .option('--title <title>', 'Job title')
    .option('--status <status>', 'Contact status')
    .option('--tags <tags>', 'Tags (comma-separated)')
    .action(async (id, options) => {
      const contact = await getContact(id);

      if (!contact) {
        printError(`Contact not found: ${id}`);
        process.exit(1);
      }

      printHeader(`Update Contact: ${contact.name}`);

      const updates: Partial<Contact> = {};

      if (options.name) {
        updates.name = options.name;
      } else {
        const name = await prompt('Name', contact.name);
        if (name !== contact.name) updates.name = name;
      }

      if (options.email) {
        updates.emails = [{ email: options.email, type: 'personal', primary: true }];
      }

      if (options.phone) {
        updates.phones = [{ number: options.phone, type: 'mobile', primary: true }];
      }

      if (options.company) {
        updates.company = options.company;
      }

      if (options.title) {
        updates.title = options.title;
      }

      if (options.status) {
        updates.status = options.status as ContactStatus;
      }

      if (options.tags) {
        updates.tags = options.tags.split(',').map((t: string) => t.trim());
      }

      if (Object.keys(updates).length === 0) {
        printWarning('No changes to update');
        return;
      }

      const confirmed = await confirm('Save changes?');
      if (!confirmed) {
        printWarning('Update cancelled');
        return;
      }

      const spinner = new Spinner('Updating contact...').start();

      const updated = await updateContact(id, updates);
      spinner.succeed('Contact updated successfully');

      if (updated) {
        printSuccess(`Updated ${Object.keys(updates).join(', ')}`);
      }
    });

  // Delete contact
  contacts
    .command('delete <id>')
    .description('Delete a contact')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      const contact = await getContact(id);

      if (!contact) {
        printError(`Contact not found: ${id}`);
        process.exit(1);
      }

      if (!options.force) {
        console.log(`\nContact: ${output.bold(contact.name)}`);
        console.log(`Email: ${contact.emails[0]?.email || 'N/A'}`);
        console.log(`Company: ${contact.company || 'N/A'}\n`);

        const confirmed = await confirm(
          'Are you sure you want to delete this contact?'
        );

        if (!confirmed) {
          printWarning('Deletion cancelled');
          return;
        }
      }

      const spinner = new Spinner('Deleting contact...').start();

      await deleteContact(id);
      spinner.succeed('Contact deleted successfully');
    });

  // Add tags
  contacts
    .command('tag <id> <tags>')
    .description('Add tags to a contact')
    .action(async (id, tagsStr) => {
      const contact = await getContact(id);

      if (!contact) {
        printError(`Contact not found: ${id}`);
        process.exit(1);
      }

      const newTags = tagsStr.split(',').map((t: string) => t.trim());
      const allTags = [...new Set([...contact.tags, ...newTags])];

      await updateContact(id, { tags: allTags });
      printSuccess(`Added tags: ${newTags.join(', ')}`);
    });

  // Remove tags
  contacts
    .command('untag <id> <tags>')
    .description('Remove tags from a contact')
    .action(async (id, tagsStr) => {
      const contact = await getContact(id);

      if (!contact) {
        printError(`Contact not found: ${id}`);
        process.exit(1);
      }

      const removeTags = tagsStr.split(',').map((t: string) => t.trim().toLowerCase());
      const filteredTags = contact.tags.filter(
        (t) => !removeTags.includes(t.toLowerCase())
      );

      await updateContact(id, { tags: filteredTags });
      printSuccess(`Removed tags: ${removeTags.join(', ')}`);
    });
}
