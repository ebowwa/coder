/**
 * Media Commands
 *
 * CLI commands for managing media files in the CRM.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  printSuccess,
  printError,
  printWarning,
  printTable,
  printJSON,
  printHeader,
  printDivider,
  formatRelativeTime,
  formatFileSize,
  truncate,
  output,
} from '../utils/output.js';
import {
  prompt,
  promptRequired,
  confirm,
  select,
  Spinner,
} from '../utils/prompt.js';
import type { Media, MediaType, MimeType } from '../../core/types.js';

// Media type icons
const MEDIA_ICONS: Record<MediaType, string> = {
  image: '\u{1F4F7}',
  video: '\u{1F3AC}',
  audio: '\u{1F3B5}',
  document: '\u{1F4C4}',
  spreadsheet: '\u{1F4CA}',
  presentation: '\u{1F4BB}',
  pdf: '\u{1F4C4}',
  archive: '\u{1F4E6}',
  other: '\u{1F4CE}',
};

// MIME type to media type mapping
const MIME_TO_MEDIA_TYPE: Record<string, MediaType> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/ogg': 'audio',
  'application/pdf': 'pdf',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.ms-powerpoint': 'presentation',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'presentation',
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
};

/**
 * Mock data store
 */
const mediaStore = new Map<string, Media>();

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
 * Get media type from MIME type
 */
function getMediaType(mimeType: string): MediaType {
  return MIME_TO_MEDIA_TYPE[mimeType] || 'other';
}

/**
 * Get all media
 */
function getMedia(): Media[] {
  return Array.from(mediaStore.values());
}

/**
 * Get media by ID
 */
function getMediaById(id: string): Media | undefined {
  return mediaStore.get(id);
}

/**
 * Create media entry
 */
function createMedia(data: Partial<Media>): Media {
  const now = new Date().toISOString();
  const media: Media = {
    id: generateId(),
    entityType: data.entityType || 'contact',
    entityId: data.entityId || '',
    type: data.type || 'other',
    filename: data.filename || 'unknown',
    mimeType: data.mimeType || 'application/octet-stream',
    size: data.size || 0,
    url: data.url || '',
    thumbnailUrl: data.thumbnailUrl,
    metadata: data.metadata || {},
    altText: data.altText,
    caption: data.caption,
    isPublic: data.isPublic ?? false,
    downloadCount: data.downloadCount || 0,
    uploadedBy: data.uploadedBy,
    expiresAt: data.expiresAt,
    createdAt: now,
    updatedAt: now,
  };

  mediaStore.set(media.id, media);
  return media;
}

/**
 * Delete media
 */
function deleteMedia(id: string): boolean {
  return mediaStore.delete(id);
}

/**
 * Filter media by contact
 */
function filterByContact(contactId: string): Media[] {
  return getMedia().filter(
    (m) => m.entityType === 'contact' && m.entityId === contactId
  );
}

/**
 * Filter media by deal
 */
function filterByDeal(dealId: string): Media[] {
  return getMedia().filter(
    (m) => m.entityType === 'deal' && m.entityId === dealId
  );
}

/**
 * Register media commands
 */
export function registerMediaCommands(program: Command): void {
  const media = program.command('media').description('Manage media files');

  // List media
  media
    .command('list')
    .description('List media files')
    .option('-c, --contact <id>', 'Filter by contact ID')
    .option('-d, --deal <id>', 'Filter by deal ID')
    .option('-t, --type <type>', 'Filter by media type')
    .option('--json', 'Output as JSON')
    .option('--limit <number>', 'Limit results', '20')
    .action(async (options) => {
      let mediaFiles = getMedia();

      if (options.contact) {
        mediaFiles = filterByContact(options.contact);
      }

      if (options.deal) {
        mediaFiles = filterByDeal(options.deal);
      }

      if (options.type) {
        mediaFiles = mediaFiles.filter(
          (m) => m.type.toLowerCase() === options.type.toLowerCase()
        );
      }

      // Sort by date descending
      mediaFiles.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const limit = parseInt(options.limit);
      mediaFiles = mediaFiles.slice(0, limit);

      if (options.json) {
        printJSON(mediaFiles);
        return;
      }

      if (mediaFiles.length === 0) {
        printWarning('No media files found');
        return;
      }

      printHeader(`Media Files (${mediaFiles.length})`);

      printTable(mediaFiles, [
        {
          key: 'type',
          header: '',
          width: 2,
          format: (v) => MEDIA_ICONS[v as MediaType] || '\u{1F4CE}',
        },
        { key: 'filename', header: 'Filename', width: 30, format: (v) => truncate(String(v), 30) },
        {
          key: 'size',
          header: 'Size',
          width: 10,
          format: (v) => formatFileSize(Number(v)),
        },
        { key: 'type', header: 'Type', width: 10 },
        {
          key: 'createdAt',
          header: 'Uploaded',
          format: (v) => formatRelativeTime(String(v)),
        },
      ]);
    });

  // Upload media
  media
    .command('upload <file>')
    .description('Upload a media file')
    .option('-c, --contact <id>', 'Associate with contact')
    .option('-d, --deal <id>', 'Associate with deal')
    .option('--caption <text>', 'Caption for the media')
    .option('--public', 'Make media public')
    .action(async (filePath, options) => {
      // Check file exists
      if (!fs.existsSync(filePath)) {
        printError(`File not found: ${filePath}`);
        process.exit(1);
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const filename = path.basename(filePath);

      // Determine entity
      let entityType: 'contact' | 'deal' = 'contact';
      let entityId: string;

      if (options.contact) {
        entityType = 'contact';
        entityId = options.contact;
      } else if (options.deal) {
        entityType = 'deal';
        entityId = options.deal;
      } else {
        entityId = await promptRequired('Contact or Deal ID');
        entityType = (await select('Entity Type', ['contact', 'deal'])) as
          | 'contact'
          | 'deal';
      }

      // Detect MIME type (simplified)
      const ext = path.extname(filePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.zip': 'application/zip',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
      };

      const mimeType: MimeType = mimeMap[ext] || 'application/octet-stream';
      const mediaType = getMediaType(mimeType);

      // Caption
      const caption = options.caption || (await prompt('Caption (optional)'));

      // Preview
      console.log();
      console.log(`${MEDIA_ICONS[mediaType]} ${output.bold(filename)}`);
      console.log(`${output.dim('Size:')} ${formatFileSize(stats.size)}`);
      console.log(`${output.dim('Type:')} ${mediaType}`);
      console.log(`${output.dim('MIME:')} ${mimeType}`);
      console.log();

      const confirmed = await confirm('Upload this file?');
      if (!confirmed) {
        printWarning('Upload cancelled');
        return;
      }

      // Simulate upload
      const spinner = new Spinner('Uploading...').start();
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

      const mediaEntry = createMedia({
        entityType,
        entityId,
        type: mediaType,
        filename,
        mimeType,
        size: stats.size,
        url: `/uploads/${generateId()}/${filename}`,
        caption,
        isPublic: options.public || false,
      });

      spinner.succeed('Upload complete');
      printSuccess(`Media ID: ${mediaEntry.id}`);
      console.log();
    });

  // Get media details
  media
    .command('get <id>')
    .description('Get media details')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
      const mediaFile = getMediaById(id);

      if (!mediaFile) {
        printError(`Media not found: ${id}`);
        process.exit(1);
      }

      if (options.json) {
        printJSON(mediaFile);
        return;
      }

      const icon = MEDIA_ICONS[mediaFile.type];
      printHeader(`${icon} ${mediaFile.filename}`);

      console.log(`${output.dim('ID:')} ${mediaFile.id}`);
      console.log(`${output.dim('Type:')} ${mediaFile.type}`);
      console.log();

      // File Info
      console.log(output.bold('File Information'));
      printDivider('-');
      console.log(`${output.dim('Filename:')} ${mediaFile.filename}`);
      console.log(`${output.dim('MIME Type:')} ${mediaFile.mimeType}`);
      console.log(`${output.dim('Size:')} ${formatFileSize(mediaFile.size)}`);
      console.log(`${output.dim('URL:')} ${mediaFile.url}`);

      if (mediaFile.thumbnailUrl) {
        console.log(`${output.dim('Thumbnail:')} ${mediaFile.thumbnailUrl}`);
      }

      console.log();

      // Association
      console.log(output.bold('Association'));
      printDivider('-');
      console.log(`${output.dim('Entity Type:')} ${mediaFile.entityType}`);
      console.log(`${output.dim('Entity ID:')} ${mediaFile.entityId}`);

      console.log();

      // Additional Info
      console.log(output.bold('Additional Info'));
      printDivider('-');
      console.log(`${output.dim('Public:')} ${mediaFile.isPublic ? 'Yes' : 'No'}`);
      console.log(`${output.dim('Downloads:')} ${mediaFile.downloadCount}`);

      if (mediaFile.caption) {
        console.log(`${output.dim('Caption:')} ${mediaFile.caption}`);
      }

      if (mediaFile.altText) {
        console.log(`${output.dim('Alt Text:')} ${mediaFile.altText}`);
      }

      console.log();

      // Timestamps
      console.log(output.bold('Timestamps'));
      printDivider('-');
      console.log(
        `${output.dim('Uploaded:')} ${new Date(mediaFile.createdAt).toLocaleString()}`
      );

      if (mediaFile.expiresAt) {
        console.log(
          `${output.dim('Expires:')} ${new Date(mediaFile.expiresAt).toLocaleString()}`
        );
      }

      console.log();
    });

  // Delete media
  media
    .command('delete <id>')
    .description('Delete a media file')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      const mediaFile = getMediaById(id);

      if (!mediaFile) {
        printError(`Media not found: ${id}`);
        process.exit(1);
      }

      if (!options.force) {
        const icon = MEDIA_ICONS[mediaFile.type];
        console.log(`\n${icon} ${output.bold(mediaFile.filename)}`);
        console.log(`Size: ${formatFileSize(mediaFile.size)}`);
        console.log(`Type: ${mediaFile.type}\n`);

        const confirmed = await confirm(
          'Are you sure you want to delete this media file?'
        );

        if (!confirmed) {
          printWarning('Deletion cancelled');
          return;
        }
      }

      const spinner = new Spinner('Deleting media...').start();
      await new Promise((r) => setTimeout(r, 300));

      deleteMedia(id);
      spinner.succeed('Media deleted successfully');
    });

  // Download media
  media
    .command('download <id>')
    .description('Download a media file')
    .option('-o, --output <path>', 'Output path')
    .action(async (id, options) => {
      const mediaFile = getMediaById(id);

      if (!mediaFile) {
        printError(`Media not found: ${id}`);
        process.exit(1);
      }

      const outputPath =
        options.output || path.join(process.cwd(), mediaFile.filename);

      console.log(`\n${MEDIA_ICONS[mediaFile.type]} ${mediaFile.filename}`);
      console.log(`${output.dim('Source:')} ${mediaFile.url}`);
      console.log(`${output.dim('Target:')} ${outputPath}\n`);

      const spinner = new Spinner('Downloading...').start();

      // Simulate download
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));

      // In real implementation, would actually download the file
      // For now, just create a placeholder
      fs.writeFileSync(outputPath, `[Placeholder for ${mediaFile.filename}]`);

      spinner.succeed('Download complete');
      printSuccess(`Saved to: ${outputPath}`);
    });
}
