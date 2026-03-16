/**
 * CRM Native Module - TypeScript Declarations
 *
 * High-performance Rust implementation for CRM operations.
 */

// ============================================================================
// Search Index Types
// ============================================================================

export interface CrmSearchOptions {
  /** Search query string */
  query?: string;
  /** Entity types to search in */
  entityTypes?: Array<'contact' | 'deal' | 'company'>;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by tags */
  tags?: string[];
  /** Minimum value (for deals) */
  valueMin?: number;
  /** Maximum value (for deals) */
  valueMax?: number;
  /** Created after timestamp (Unix ms) */
  createdAfter?: number;
  /** Created before timestamp (Unix ms) */
  createdBefore?: number;
}

export interface CrmSearchResult {
  /** Entity ID */
  id: string;
  /** Entity type */
  entityType: 'contact' | 'deal' | 'company';
  /** Search relevance score */
  score: number;
  /** Entity name or title */
  name?: string;
  /** Email (for contacts) */
  email?: string;
  /** Company name */
  company?: string;
  /** Title/position */
  title?: string;
  /** Tags */
  tags?: string[];
  /** Value (for deals) */
  value?: number;
  /** Stage (for deals) */
  stage?: string;
}

export interface CrmIndexStats {
  contactCount: number;
  dealCount: number;
  companyCount: number;
}

/**
 * CRM Search Index for full-text search
 */
export class CrmSearchIndex {
  constructor(indexPath: string);

  /**
   * Execute a search query
   */
  search(options: CrmSearchOptions): CrmSearchResult[];

  /**
   * Add a document to the index
   */
  addDocument(doc: CrmSearchDocument): void;

  /**
   * Remove a document from the index
   */
  removeDocument(id: string): void;

  /**
   * Commit pending changes
   */
  commit(): void;

  /**
   * Get index statistics
   */
  getStats(): CrmIndexStats;
}

export interface CrmSearchDocument {
  id: string;
  entityType: 'contact' | 'deal' | 'company';
  name?: string;
  title?: string;
  email?: string;
  company?: string;
  tags?: string[];
  notes?: string;
  value?: number;
  stage?: string;
  createdAt?: number;
  updatedAt?: number;
}

// ============================================================================
// Index Manager Types
// ============================================================================

export interface CrmContact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  title?: string;
  tags: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CrmDeal {
  id: string;
  title: string;
  contactId: string;
  value: number;
  stage: string;
  tags: string[];
  notes?: string;
  expectedClose?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CrmCompany {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  tags: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CrmCounts {
  contacts: number;
  deals: number;
  companies: number;
}

/**
 * CRM Index Manager for CRUD operations
 */
export class CrmIndexManager {
  constructor();

  /**
   * Index a contact
   */
  indexContact(contact: CrmContact): void;

  /**
   * Get a contact by ID
   */
  getContact(id: string): CrmContact | null;

  /**
   * Remove a contact
   */
  removeContact(id: string): void;

  /**
   * Index a deal
   */
  indexDeal(deal: CrmDeal): void;

  /**
   * Get a deal by ID
   */
  getDeal(id: string): CrmDeal | null;

  /**
   * Remove a deal
   */
  removeDeal(id: string): void;

  /**
   * Index a company
   */
  indexCompany(company: CrmCompany): void;

  /**
   * Get a company by ID
   */
  getCompany(id: string): CrmCompany | null;

  /**
   * Remove a company
   */
  removeCompany(id: string): void;

  /**
   * Get counts of all indexed entities
   */
  getCounts(): CrmCounts;

  /**
   * Clear all indexes
   */
  clear(): void;
}

// ============================================================================
// Media Metadata Types
// ============================================================================

export interface MediaMetadata {
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Width (for images/videos) */
  width: number | null;
  /** Height (for images/videos) */
  height: number | null;
  /** Duration in seconds (for audio/video) */
  duration: number | null;
  /** Bitrate in kbps */
  bitrate: number | null;
  /** Codec information */
  codec: string | null;
  /** Additional metadata as JSON string */
  extra: string | null;
}

export interface ImageMetadata {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Bits per channel */
  bitsPerChannel: number | null;
  /** Color space (RGB, RGBA, CMYK, etc.) */
  colorSpace: string | null;
  /** Has alpha channel */
  hasAlpha: boolean;
  /** Orientation (1-8 based on EXIF) */
  orientation: number | null;
  /** DPI for X axis */
  dpiX: number | null;
  /** DPI for Y axis */
  dpiY: number | null;
  /** Camera make (from EXIF) */
  cameraMake: string | null;
  /** Camera model (from EXIF) */
  cameraModel: string | null;
  /** Date taken (from EXIF) */
  dateTaken: string | null;
  /** GPS latitude */
  gpsLatitude: number | null;
  /** GPS longitude */
  gpsLongitude: number | null;
}

export interface AudioMetadata {
  /** Duration in seconds */
  duration: number | null;
  /** Sample rate in Hz */
  sampleRate: number | null;
  /** Number of channels */
  channels: number | null;
  /** Bits per sample */
  bitsPerSample: number | null;
  /** Bitrate in kbps */
  bitrate: number | null;
  /** Codec/format */
  codec: string | null;
  /** Title (from ID3/Vorbis comments) */
  title: string | null;
  /** Artist (from ID3/Vorbis comments) */
  artist: string | null;
  /** Album (from ID3/Vorbis comments) */
  album: string | null;
  /** Track number */
  trackNumber: number | null;
  /** Year */
  year: number | null;
  /** Genre */
  genre: string | null;
}

export interface VideoMetadata {
  /** Video width in pixels */
  width: number | null;
  /** Video height in pixels */
  height: number | null;
  /** Duration in seconds */
  duration: number | null;
  /** Frame rate */
  frameRate: number | null;
  /** Video codec */
  videoCodec: string | null;
  /** Audio codec */
  audioCodec: string | null;
  /** Video bitrate in kbps */
  videoBitrate: number | null;
  /** Audio bitrate in kbps */
  audioBitrate: number | null;
  /** Has audio track */
  hasAudio: boolean;
  /** Container format */
  container: string | null;
  /** Total bitrate */
  totalBitrate: number | null;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface VideoDimensions {
  width: number;
  height: number;
}

// ============================================================================
// Media Functions
// ============================================================================

/**
 * Extract metadata from a media file
 */
export function extractMediaMetadata(filePath: string): MediaMetadata;

/**
 * Batch extract metadata from multiple files
 */
export function extractMediaMetadataBatch(filePaths: string[]): MediaMetadata[];

/**
 * Generate thumbnail for an image
 */
export function generateThumbnail(
  inputPath: string,
  outputPath: string,
  maxWidth: number,
  maxHeight: number
): void;

/**
 * Check if a file is a valid media type
 */
export function isValidMediaType(filePath: string): boolean;

// ============================================================================
// Image Functions
// ============================================================================

/**
 * Extract image metadata
 */
export function extractImageMetadata(filePath: string): ImageMetadata;

/**
 * Get image dimensions without loading full image
 */
export function getImageDimensions(filePath: string): ImageDimensions;

/**
 * Convert image format
 */
export function convertImageFormat(
  inputPath: string,
  outputPath: string,
  format: 'jpeg' | 'png' | 'gif' | 'webp' | 'bmp'
): void;

// ============================================================================
// Audio Functions
// ============================================================================

/**
 * Extract full audio metadata as structured object
 */
export function extractFullAudioMetadata(filePath: string): AudioMetadata;

/**
 * Get audio duration from file
 */
export function getAudioDuration(filePath: string): number | null;

// ============================================================================
// Video Functions
// ============================================================================

/**
 * Extract full video metadata as structured object
 */
export function extractFullVideoMetadata(filePath: string): VideoMetadata;

/**
 * Get video dimensions from file
 */
export function getVideoDimensions(filePath: string): VideoDimensions;

/**
 * Get video duration from file
 */
export function getVideoDuration(filePath: string): number | null;

/**
 * Check if video has audio track
 */
export function videoHasAudio(filePath: string): boolean;

/**
 * Get video codec information
 */
export function getVideoCodec(filePath: string): string | null;

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search contacts by name (fuzzy match)
 */
export function searchContactsByName(
  manager: CrmIndexManager,
  nameQuery: string,
  limit?: number
): string[];

/**
 * Search contacts by company name
 */
export function searchContactsByCompany(
  manager: CrmIndexManager,
  companyQuery: string,
  limit?: number
): string[];

/**
 * Search contacts by tags
 */
export function searchContactsByTags(
  manager: CrmIndexManager,
  tags: string[],
  matchAll: boolean,
  limit?: number
): string[];

/**
 * Search contacts by email domain
 */
export function searchContactsByEmailDomain(
  manager: CrmIndexManager,
  domain: string,
  limit?: number
): string[];

/**
 * Search deals by title (fuzzy match)
 */
export function searchDealsByTitle(
  manager: CrmIndexManager,
  titleQuery: string,
  limit?: number
): string[];

/**
 * Search deals by stage
 */
export function searchDealsByStage(
  manager: CrmIndexManager,
  stages: string[],
  limit?: number
): string[];

/**
 * Search deals by value range
 */
export function searchDealsByValueRange(
  manager: CrmIndexManager,
  minValue?: number,
  maxValue?: number,
  limit?: number
): string[];

/**
 * Search deals by contact ID
 */
export function searchDealsByContact(
  manager: CrmIndexManager,
  contactId: string,
  limit?: number
): string[];

/**
 * Search deals expected to close within date range
 */
export function searchDealsClosingSoon(
  manager: CrmIndexManager,
  daysAhead: number,
  limit?: number
): string[];

/**
 * Get total deal value by stage
 */
export function getDealValuesByStage(manager: CrmIndexManager): Record<string, number>;

/**
 * Search companies by name (fuzzy match)
 */
export function searchCompaniesByName(
  manager: CrmIndexManager,
  nameQuery: string,
  limit?: number
): string[];

/**
 * Search companies by industry
 */
export function searchCompaniesByIndustry(
  manager: CrmIndexManager,
  industries: string[],
  limit?: number
): string[];

/**
 * Search companies by tags
 */
export function searchCompaniesByTags(
  manager: CrmIndexManager,
  tags: string[],
  matchAll: boolean,
  limit?: number
): string[];

/**
 * Search companies by website domain
 */
export function searchCompaniesByWebsiteDomain(
  manager: CrmIndexManager,
  domain: string,
  limit?: number
): string[];

/**
 * Get company statistics by industry
 */
export function getCompanyStatsByIndustry(manager: CrmIndexManager): Record<string, number>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if native module is available
 */
export function isNativeAvailable(): boolean;

/**
 * Get native module version
 */
export function getNativeVersion(): string;
