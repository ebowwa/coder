/**
 * Activity Commands
 *
 * CLI commands for managing activities in the CRM.
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
  formatDateTime,
  truncate,
  output,
} from '../utils/output.js';
import {
  prompt,
  promptRequired,
  promptMultiline,
  confirm,
  select,
  previewAndConfirm,
  Spinner,
} from '../utils/prompt.js';
import type { Activity, ActivityType, CallOutcome, MeetingOutcome, CallMetadata, MeetingMetadata, EmailMetadata, TaskMetadata } from '../../core/types.js';

// Activity types
const ACTIVITY_TYPES: ActivityType[] = [
  'call',
  'email',
  'meeting',
  'task',
  'note',
  'sms',
  'video_call',
  'demo',
  'proposal_sent',
  'contract_sent',
  'follow_up',
  'social_media',
  'event',
  'other',
];

// Call outcomes
const CALL_OUTCOMES: CallOutcome[] = [
  'connected',
  'voicemail',
  'no_answer',
  'busy',
  'wrong_number',
  'disconnected',
];

// Meeting outcomes
const MEETING_OUTCOMES: MeetingOutcome[] = [
  'completed',
  'rescheduled',
  'cancelled',
  'no_show',
];

// Activity type icons
const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call: '\u260E',
  email: '\u2709',
  meeting: '\u{1F3D7}',
  task: '\u2713',
  note: '\u{1F4DD}',
  sms: '\u{1F4AC}',
  video_call: '\u{1F4F7}',
  demo: '\u{1F4BB}',
  proposal_sent: '\u{1F4C4}',
  contract_sent: '\u{1F4DD}',
  follow_up: '\u23F0',
  social_media: '\u{1F310}',
  event: '\u{1F3AD}',
  other: '\u2022',
};

/**
 * Mock data store
 */
const activitiesStore = new Map<string, Activity>();

/**
 * Generate UUID
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get all activities
 */
function getActivities(): Activity[] {
  return Array.from(activitiesStore.values());
}

/**
 * Get activity by ID
 */
function getActivity(id: string): Activity | undefined {
  return activitiesStore.get(id);
}

/**
 * Create activity
 */
function createActivity(data: Partial<Activity>): Activity {
  const now = new Date().toISOString();
  const activity: Activity = {
    id: generateId(),
    contactId: data.contactId,
    dealId: data.dealId,
    type: data.type || 'note',
    title: data.title || '',
    description: data.description || '',
    timestamp: data.timestamp || now,
    duration: data.duration,
    metadata: data.metadata || {},
    createdBy: data.createdBy,
    tags: data.tags || [],
    customFields: data.customFields || [],
    createdAt: now,
    updatedAt: now,
  };

  activitiesStore.set(activity.id, activity);
  return activity;
}

/**
 * Delete activity
 */
function deleteActivity(id: string): boolean {
  return activitiesStore.delete(id);
}

/**
 * Filter activities by contact
 */
function filterByContact(contactId: string): Activity[] {
  return getActivities().filter((a) => a.contactId === contactId);
}

/**
 * Filter activities by deal
 */
function filterByDeal(dealId: string): Activity[] {
  return getActivities().filter((a) => a.dealId === dealId);
}

/**
 * Register activity commands
 */
export function registerActivityCommands(program: Command): void {
  const activities = program.command('activities').alias('activity').description('Manage activities');

  // List activities
  activities
    .command('list')
    .description('List activities')
    .option('-c, --contact <id>', 'Filter by contact ID')
    .option('-d, --deal <id>', 'Filter by deal ID')
    .option('-t, --type <type>', 'Filter by type')
    .option('--json', 'Output as JSON')
    .option('--limit <number>', 'Limit results', '20')
    .action(async (options) => {
      let activities = getActivities();

      if (options.contact) {
        activities = filterByContact(options.contact);
      }

      if (options.deal) {
        activities = filterByDeal(options.deal);
      }

      if (options.type) {
        activities = activities.filter(
          (a) => a.type.toLowerCase() === options.type.toLowerCase()
        );
      }

      // Sort by timestamp descending
      activities.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const limit = parseInt(options.limit);
      activities = activities.slice(0, limit);

      if (options.json) {
        printJSON(activities);
        return;
      }

      if (activities.length === 0) {
        printWarning('No activities found');
        return;
      }

      printHeader(`Activities (${activities.length})`);

      printTable(activities, [
        {
          key: 'type',
          header: 'Type',
          width: 6,
          format: (v) => ACTIVITY_ICONS[v as ActivityType] || '\u2022',
        },
        { key: 'title', header: 'Title', width: 30, format: (v) => truncate(String(v), 30) },
        {
          key: 'type',
          header: 'Activity',
          width: 12,
          format: (v) => String(v).replace('_', ' '),
        },
        {
          key: 'timestamp',
          header: 'When',
          format: (v) => formatRelativeTime(String(v)),
        },
        {
          key: 'contactId',
          header: 'Contact',
          width: 8,
          format: (v) => (v ? truncate(String(v), 8) : '-'),
        },
      ]);
    });

  // Log activity (quick create)
  activities
    .command('log <contactId> <type> <description>')
    .description('Log a new activity')
    .option('-d, --deal <id>', 'Associated deal ID')
    .option('--duration <minutes>', 'Duration in minutes')
    .action(async (contactId, typeStr, description, options) => {
      const type = typeStr.toLowerCase() as ActivityType;

      if (!ACTIVITY_TYPES.includes(type)) {
        printError(`Invalid activity type: ${typeStr}`);
        console.log(`Valid types: ${ACTIVITY_TYPES.join(', ')}`);
        process.exit(1);
      }

      const spinner = new Spinner('Logging activity...').start();
      await new Promise((r) => setTimeout(r, 300));

      const activity = createActivity({
        contactId,
        dealId: options.deal,
        type,
        title: description.slice(0, 50),
        description,
        duration: options.duration ? parseInt(options.duration) * 60 : undefined,
      });

      spinner.succeed('Activity logged');
      printSuccess(`${ACTIVITY_ICONS[type]} ${type}: ${truncate(description, 50)}`);
      console.log(`ID: ${activity.id}`);
    });

  // Create activity (interactive)
  activities
    .command('create')
    .description('Create a new activity interactively')
    .option('-c, --contact <id>', 'Contact ID')
    .option('-d, --deal <id>', 'Deal ID')
    .action(async (options) => {
      printHeader('Create Activity');

      // Contact ID
      const contactId =
        options.contact || (await promptRequired('Contact ID'));

      // Activity type
      const type = await select('Activity Type', ACTIVITY_TYPES, 'note');

      // Title
      const title = await promptRequired('Title');

      // Description
      const description = await promptMultiline('Description');

      // Deal ID
      let dealId = options.deal;
      if (!dealId) {
        const hasDeal = await confirm('Associate with a deal?');
        if (hasDeal) {
          dealId = await promptRequired('Deal ID');
        }
      }

      // Duration (for calls/meetings)
      let duration: number | undefined;
      if (['call', 'meeting', 'video_call', 'demo'].includes(type)) {
        const durationStr = await prompt('Duration (minutes)');
        if (durationStr) {
          duration = parseInt(durationStr) * 60;
        }
      }

      // Type-specific metadata
      let metadata: Record<string, unknown> = {};

      if (type === 'call') {
        const outcome = await select('Call Outcome', CALL_OUTCOMES, 'connected');
        metadata = {
          outcome,
          direction: 'outbound',
        };
      } else if (type === 'meeting') {
        const outcome = await select('Meeting Outcome', MEETING_OUTCOMES, 'completed');
        metadata = {
          outcome,
        };
      }

      // Preview
      const confirmed = await previewAndConfirm('Activity Preview', {
        Type: type,
        Title: title,
        Description: truncate(description, 50),
        Contact: contactId,
        Deal: dealId || '(none)',
        Duration: duration ? `${Math.floor(duration / 60)} min` : '(none)',
      });

      if (!confirmed) {
        printWarning('Activity creation cancelled');
        return;
      }

      const spinner = new Spinner('Creating activity...').start();
      await new Promise((r) => setTimeout(r, 500));

      const activity = createActivity({
        contactId,
        dealId,
        type,
        title,
        description,
        duration,
        metadata: metadata as unknown as CallMetadata | MeetingMetadata | EmailMetadata | TaskMetadata | undefined,
      });

      spinner.succeed('Activity created successfully');
      printSuccess(`Activity ID: ${activity.id}`);
    });

  // Get activity details
  activities
    .command('get <id>')
    .description('Get activity details')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const activity = getActivity(id);

      if (!activity) {
        printError(`Activity not found: ${id}`);
        process.exit(1);
      }

      if (options.json) {
        printJSON(activity);
        return;
      }

      printHeader(`${ACTIVITY_ICONS[activity.type]} ${activity.title}`);

      console.log(`${output.dim('ID:')} ${activity.id}`);
      console.log(`${output.dim('Type:')} ${formatStatus(activity.type)}`);
      console.log();

      // Details
      console.log(output.bold('Details'));
      printDivider('-');
      console.log(`${output.dim('Contact ID:')} ${activity.contactId || '(none)'}`);
      console.log(`${output.dim('Deal ID:')} ${activity.dealId || '(none)'}`);
      console.log(
        `${output.dim('Timestamp:')} ${formatDateTime(activity.timestamp)}`
      );

      if (activity.duration) {
        console.log(
          `${output.dim('Duration:')} ${Math.floor(activity.duration / 60)} min`
        );
      }

      console.log();

      // Description
      if (activity.description) {
        console.log(output.bold('Description'));
        printDivider('-');
        console.log(activity.description);
        console.log();
      }

      // Metadata
      if (Object.keys(activity.metadata).length > 0) {
        console.log(output.bold('Metadata'));
        printDivider('-');
        for (const [key, value] of Object.entries(activity.metadata)) {
          console.log(`${output.dim(key)}: ${value}`);
        }
        console.log();
      }

      // Timestamps
      console.log(output.bold('Timestamps'));
      printDivider('-');
      console.log(
        `${output.dim('Created:')} ${new Date(activity.createdAt).toLocaleString()}`
      );
      console.log(
        `${output.dim('Updated:')} ${new Date(activity.updatedAt).toLocaleString()}`
      );
      console.log();
    });

  // Delete activity
  activities
    .command('delete <id>')
    .description('Delete an activity')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      const activity = getActivity(id);

      if (!activity) {
        printError(`Activity not found: ${id}`);
        process.exit(1);
      }

      if (!options.force) {
        console.log(`\nActivity: ${output.bold(activity.title)}`);
        console.log(`Type: ${activity.type}`);
        console.log(`Date: ${formatDateTime(activity.timestamp)}\n`);

        const confirmed = await confirm(
          'Are you sure you want to delete this activity?'
        );

        if (!confirmed) {
          printWarning('Deletion cancelled');
          return;
        }
      }

      const spinner = new Spinner('Deleting activity...').start();
      await new Promise((r) => setTimeout(r, 300));

      deleteActivity(id);
      spinner.succeed('Activity deleted successfully');
    });

  // Timeline (show activities in timeline view)
  activities
    .command('timeline')
    .description('Show activity timeline')
    .option('-c, --contact <id>', 'Filter by contact ID')
    .option('-d, --deal <id>', 'Filter by deal ID')
    .option('--days <number>', 'Days to show', '7')
    .action(async (options) => {
      let activities = getActivities();

      if (options.contact) {
        activities = filterByContact(options.contact);
      }

      if (options.deal) {
        activities = filterByDeal(options.deal);
      }

      // Filter by date range
      const days = parseInt(options.days);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      activities = activities.filter(
        (a) => new Date(a.timestamp) >= cutoff
      );

      // Sort by timestamp descending
      activities.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      if (activities.length === 0) {
        printWarning('No activities in the specified time range');
        return;
      }

      printHeader(`Activity Timeline (Last ${days} Days)`);

      let currentDate = '';

      for (const activity of activities) {
        const date = new Date(activity.timestamp).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });

        if (date !== currentDate) {
          console.log();
          console.log(output.bold(date));
          printDivider('\u2500');
          currentDate = date;
        }

        const time = new Date(activity.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const icon = ACTIVITY_ICONS[activity.type];
        console.log(
          `  ${output.dim(time)} ${icon} ${activity.title} ${output.dim(`(${activity.type})`)}`
        );
      }

      console.log();
    });
}
