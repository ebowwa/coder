/**
 * CRM Native Module Loader
 *
 * Loads the native Rust module for high-performance CRM operations.
 * Provides fallback implementations if native module is not available.
 */

const { platform, arch } = process;

// Platform-specific binary names
const PLATFORM_BINARIES = {
  'darwin-arm64': 'crm-native.darwin-arm64.node',
  'darwin-x64': 'crm-native.darwin-x64.node',
  'linux-arm64': 'crm-native.linux-arm64.node',
  'linux-x64': 'crm-native.linux-x64.node',
  'win32-x64': 'crm-native.win32-x64.node',
  'win32-ia32': 'crm-native.win32-ia32.node',
};

/**
 * Try to load the native module
 */
function loadNativeModule() {
  const platformKey = `${platform}-${arch}`;
  const binaryName = PLATFORM_BINARIES[platformKey];

  if (!binaryName) {
    console.warn(`[crm-native] Unsupported platform: ${platformKey}`);
    return null;
  }

  try {
    // Try to load the native binary
    const native = require(`./${binaryName}`);
    return native;
  } catch (err) {
    console.warn(`[crm-native] Failed to load native module: ${err.message}`);
    return null;
  }
}

// Load native module or use fallbacks
const native = loadNativeModule();

// ============================================================================
// Search Index
// ============================================================================

/**
 * CRM Search Index for full-text search
 */
export class CrmSearchIndex {
  constructor(indexPath) {
    if (native?.CrmSearchIndex) {
      this._native = new native.CrmSearchIndex(indexPath);
    } else {
      // Fallback implementation
      this._indexPath = indexPath;
      this._contacts = new Map();
      this._deals = new Map();
      this._companies = new Map();
    }
  }

  /**
   * Execute a search query
   */
  search(options) {
    if (this._native) {
      return this._native.search(options);
    }
    return this._searchFallback(options);
  }

  /**
   * Add a document to the index
   */
  addDocument(doc) {
    if (this._native) {
      return this._native.addDocument(doc);
    }
    this._addDocumentFallback(doc);
  }

  /**
   * Remove a document from the index
   */
  removeDocument(id) {
    if (this._native) {
      return this._native.removeDocument(id);
    }
    this._contacts.delete(id);
    this._deals.delete(id);
    this._companies.delete(id);
  }

  /**
   * Commit pending changes
   */
  commit() {
    if (this._native) {
      return this._native.commit();
    }
    // No-op for fallback
  }

  /**
   * Get index statistics
   */
  getStats() {
    if (this._native) {
      return this._native.getStats();
    }
    return {
      contactCount: this._contacts.size,
      dealCount: this._deals.size,
      companyCount: this._companies.size,
    };
  }

  // Fallback implementations
  _searchFallback(options) {
    const results = [];
    const query = (options.query || '').toLowerCase();
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const filterTags = options.tags || [];

    // Search all entity types
    const searchIn = options.entityTypes || ['contact', 'deal', 'company'];

    for (const entityType of searchIn) {
      const entities = this._getEntitiesByType(entityType);

      for (const [id, entity] of entities) {
        // Filter by tags if specified
        if (filterTags.length > 0) {
          const entityTags = entity.tags || [];
          const hasAllTags = filterTags.every(tag =>
            entityTags.some(et => et.toLowerCase() === tag.toLowerCase())
          );
          if (!hasAllTags) continue;
        }

        const score = query ? this._calculateScore(query, entity) : 1;
        if (score > 0) {
          results.push({ id, entityType, score, ...entity });
        }
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Paginate
    return results.slice(offset, offset + limit);
  }

  _getEntitiesByType(type) {
    switch (type) {
      case 'contact': return this._contacts;
      case 'deal': return this._deals;
      case 'company': return this._companies;
      default: return new Map();
    }
  }

  _addDocumentFallback(doc) {
    const entityMap = this._getEntitiesByType(doc.entityType);
    if (entityMap) {
      entityMap.set(doc.id, doc);
    }
  }

  _calculateScore(query, entity) {
    if (!query) return 0;

    let score = 0;
    const queryTerms = query.toLowerCase().split(/\s+/);

    // Search in name/title
    const name = (entity.name || entity.title || '').toLowerCase();
    for (const term of queryTerms) {
      if (name.includes(term)) {
        score += 10;
        if (name.startsWith(term)) {
          score += 5;
        }
      }
    }

    // Search in tags
    const tags = entity.tags || [];
    for (const tag of tags) {
      for (const term of queryTerms) {
        if (tag.toLowerCase().includes(term)) {
          score += 5;
        }
      }
    }

    // Search in notes
    const notes = (entity.notes || '').toLowerCase();
    for (const term of queryTerms) {
      if (notes.includes(term)) {
        score += 2;
      }
    }

    return score;
  }
}

// ============================================================================
// Index Manager
// ============================================================================

/**
 * CRM Index Manager for CRUD operations
 */
export class CrmIndexManager {
  constructor() {
    if (native?.CrmIndexManager) {
      this._native = new native.CrmIndexManager();
    } else {
      // Fallback implementation
      this._contacts = new Map();
      this._deals = new Map();
      this._companies = new Map();
    }
  }

  /**
   * Index a contact
   */
  indexContact(contact) {
    if (this._native) {
      return this._native.indexContact(contact);
    }
    this._contacts.set(contact.id, contact);
  }

  /**
   * Get a contact by ID
   */
  getContact(id) {
    if (this._native) {
      return this._native.getContact(id);
    }
    return this._contacts.get(id) || null;
  }

  /**
   * Remove a contact
   */
  removeContact(id) {
    if (this._native) {
      return this._native.removeContact(id);
    }
    this._contacts.delete(id);
  }

  /**
   * Index a deal
   */
  indexDeal(deal) {
    if (this._native) {
      return this._native.indexDeal(deal);
    }
    this._deals.set(deal.id, deal);
  }

  /**
   * Get a deal by ID
   */
  getDeal(id) {
    if (this._native) {
      return this._native.getDeal(id);
    }
    return this._deals.get(id) || null;
  }

  /**
   * Remove a deal
   */
  removeDeal(id) {
    if (this._native) {
      return this._native.removeDeal(id);
    }
    this._deals.delete(id);
  }

  /**
   * Index a company
   */
  indexCompany(company) {
    if (this._native) {
      return this._native.indexCompany(company);
    }
    this._companies.set(company.id, company);
  }

  /**
   * Get a company by ID
   */
  getCompany(id) {
    if (this._native) {
      return this._native.getCompany(id);
    }
    return this._companies.get(id) || null;
  }

  /**
   * Remove a company
   */
  removeCompany(id) {
    if (this._native) {
      return this._native.removeCompany(id);
    }
    this._companies.delete(id);
  }

  /**
   * Get counts of all indexed entities
   */
  getCounts() {
    if (this._native) {
      return this._native.getCounts();
    }
    return {
      contacts: this._contacts.size,
      deals: this._deals.size,
      companies: this._companies.size,
    };
  }

  /**
   * Clear all indexes
   */
  clear() {
    if (this._native) {
      return this._native.clear();
    }
    this._contacts.clear();
    this._deals.clear();
    this._companies.clear();
  }
}

// ============================================================================
// Media Metadata
// ============================================================================

/**
 * Extract metadata from a media file
 */
export function extractMediaMetadata(filePath) {
  if (native?.extractMediaMetadata) {
    return native.extractMediaMetadata(filePath);
  }
  return _extractMediaMetadataFallback(filePath);
}

/**
 * Batch extract metadata from multiple files
 */
export function extractMediaMetadataBatch(filePaths) {
  if (native?.extractMediaMetadataBatch) {
    return native.extractMediaMetadataBatch(filePaths);
  }
  return filePaths.map(extractMediaMetadata);
}

/**
 * Generate thumbnail for an image
 */
export function generateThumbnail(inputPath, outputPath, maxWidth, maxHeight) {
  if (native?.generateThumbnail) {
    return native.generateThumbnail(inputPath, outputPath, maxWidth, maxHeight);
  }
  throw new Error('Thumbnail generation requires native module');
}

/**
 * Check if a file is a valid media type
 */
export function isValidMediaType(filePath) {
  if (native?.isValidMediaType) {
    return native.isValidMediaType(filePath);
  }
  return _isValidMediaTypeFallback(filePath);
}

// Fallback implementations
function _extractMediaMetadataFallback(filePath) {
  const fs = require('fs');
  const path = require('path');

  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);

    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
    };

    return {
      mimeType: mimeTypes[ext] || 'application/octet-stream',
      size: stats.size,
      width: null,
      height: null,
      duration: null,
      bitrate: null,
      codec: null,
      extra: null,
    };
  } catch (err) {
    throw new Error(`Failed to extract metadata: ${err.message}`);
  }
}

function _isValidMediaTypeFallback(filePath) {
  const path = require('path');
  const ext = path.extname(filePath).toLowerCase().slice(1);

  const mediaExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
    'mp4', 'webm', 'mov', 'avi', 'mkv',
    'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a',
  ];

  return mediaExtensions.includes(ext);
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search contacts by name
 */
export function searchContactsByName(manager, nameQuery, limit) {
  if (native?.searchContactsByName) {
    return native.searchContactsByName(manager, nameQuery, limit);
  }
  // Fallback: basic implementation
  return [];
}

/**
 * Search contacts by company name
 */
export function searchContactsByCompany(manager, companyQuery, limit) {
  if (native?.searchContactsByCompany) {
    return native.searchContactsByCompany(manager, companyQuery, limit);
  }
  return [];
}

/**
 * Search contacts by tags
 */
export function searchContactsByTags(manager, tags, matchAll, limit) {
  if (native?.searchContactsByTags) {
    return native.searchContactsByTags(manager, tags, matchAll, limit);
  }
  return [];
}

/**
 * Search deals by title
 */
export function searchDealsByTitle(manager, titleQuery, limit) {
  if (native?.searchDealsByTitle) {
    return native.searchDealsByTitle(manager, titleQuery, limit);
  }
  return [];
}

/**
 * Search deals by stage
 */
export function searchDealsByStage(manager, stages, limit) {
  if (native?.searchDealsByStage) {
    return native.searchDealsByStage(manager, stages, limit);
  }
  return [];
}

/**
 * Search companies by name
 */
export function searchCompaniesByName(manager, nameQuery, limit) {
  if (native?.searchCompaniesByName) {
    return native.searchCompaniesByName(manager, nameQuery, limit);
  }
  return [];
}

/**
 * Search companies by industry
 */
export function searchCompaniesByIndustry(manager, industries, limit) {
  if (native?.searchCompaniesByIndustry) {
    return native.searchCompaniesByIndustry(manager, industries, limit);
  }
  return [];
}

// ============================================================================
// Image Functions
// ============================================================================

/**
 * Extract image metadata
 */
export function extractImageMetadata(filePath) {
  if (native?.extractImageMetadata) {
    return native.extractImageMetadata(filePath);
  }
  const generic = extractMediaMetadata(filePath);
  return {
    width: 0,
    height: 0,
    bitsPerChannel: null,
    colorSpace: null,
    hasAlpha: false,
    orientation: null,
    dpiX: null,
    dpiY: null,
    cameraMake: null,
    cameraModel: null,
    dateTaken: null,
    gpsLatitude: null,
    gpsLongitude: null,
  };
}

/**
 * Get image dimensions
 */
export function getImageDimensions(filePath) {
  if (native?.getImageDimensions) {
    return native.getImageDimensions(filePath);
  }
  return { width: 0, height: 0 };
}

/**
 * Convert image format
 */
export function convertImageFormat(inputPath, outputPath, format) {
  if (native?.convertImageFormat) {
    return native.convertImageFormat(inputPath, outputPath, format);
  }
  throw new Error('Image conversion requires native module');
}

// ============================================================================
// Audio Functions
// ============================================================================

/**
 * Extract full audio metadata
 */
export function extractFullAudioMetadata(filePath) {
  if (native?.extractFullAudioMetadata) {
    return native.extractFullAudioMetadata(filePath);
  }
  return {
    duration: null,
    sampleRate: null,
    channels: null,
    bitsPerSample: null,
    bitrate: null,
    codec: null,
    title: null,
    artist: null,
    album: null,
    trackNumber: null,
    year: null,
    genre: null,
  };
}

/**
 * Get audio duration
 */
export function getAudioDuration(filePath) {
  if (native?.getAudioDuration) {
    return native.getAudioDuration(filePath);
  }
  return null;
}

// ============================================================================
// Video Functions
// ============================================================================

/**
 * Extract full video metadata
 */
export function extractFullVideoMetadata(filePath) {
  if (native?.extractFullVideoMetadata) {
    return native.extractFullVideoMetadata(filePath);
  }
  return {
    width: null,
    height: null,
    duration: null,
    frameRate: null,
    videoCodec: null,
    audioCodec: null,
    videoBitrate: null,
    audioBitrate: null,
    hasAudio: false,
    container: null,
    totalBitrate: null,
  };
}

/**
 * Get video dimensions
 */
export function getVideoDimensions(filePath) {
  if (native?.getVideoDimensions) {
    return native.getVideoDimensions(filePath);
  }
  return { width: 0, height: 0 };
}

/**
 * Get video duration
 */
export function getVideoDuration(filePath) {
  if (native?.getVideoDuration) {
    return native.getVideoDuration(filePath);
  }
  return null;
}

/**
 * Check if video has audio
 */
export function videoHasAudio(filePath) {
  if (native?.videoHasAudio) {
    return native.videoHasAudio(filePath);
  }
  return false;
}

/**
 * Get video codec
 */
export function getVideoCodec(filePath) {
  if (native?.getVideoCodec) {
    return native.getVideoCodec(filePath);
  }
  return null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if native module is available
 */
export function isNativeAvailable() {
  return native !== null;
}

/**
 * Get native module version
 */
export function getNativeVersion() {
  return native?.version || 'fallback';
}
