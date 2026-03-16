/**
 * CRM Storage Types
 * Error types and configuration for the CRM storage layer
 */

/** Base CRM error class */
export class CRMError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'CRMError';
  }
}

/** Validation error */
export class ValidationError extends CRMError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/** Not found error */
export class NotFoundError extends CRMError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/** Duplicate error */
export class DuplicateError extends CRMError {
  constructor(message: string) {
    super(message, 'DUPLICATE');
    this.name = 'DuplicateError';
  }
}

/** Storage configuration */
export interface StorageConfig {
  /** Path to the database file */
  path: string;
  /** Map size in bytes (default: 1GB) */
  mapSize?: number;
  /** Maximum number of databases (default: 20) */
  maxDbs?: number;
}

/** Entity type for storage operations */
export type EntityType =
  | 'contacts'
  | 'deals'
  | 'activities'
  | 'media'
  | 'notes'
  | 'tags'
  | 'companies'
  | 'pipelines';

/** Storage statistics */
export interface StorageStats {
  contacts: number;
  deals: number;
  activities: number;
  media: number;
  notes: number;
  tags: number;
  companies: number;
  pipelines: number;
}
