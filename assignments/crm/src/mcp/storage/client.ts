/**
 * CRM Storage Client
 * LMDB-based storage for CRM entities
 */

import { open, Database, RootDatabase } from 'lmdb';
import type { UUID, Timestamp } from '../../core/types.js';
import type { StorageConfig, EntityType, StorageStats } from './types.js';
import { CRMError, NotFoundError, DuplicateError } from './types.js';

/**
 * CRM Storage Client
 * Provides persistent storage for CRM entities using LMDB
 */
export class CRMStorageClient {
  private db: RootDatabase;
  private collections: Map<EntityType, Database> = new Map();
  private indexPaths: Map<string, Database> = new Map();

  constructor(private config: StorageConfig) {
    this.db = open({
      path: config.path,
      mapSize: config.mapSize ?? 1024 * 1024 * 1024, // 1GB default
      maxDbs: config.maxDbs ?? 20,
    });
  }

  /**
   * Initialize the storage client
   */
  async initialize(): Promise<void> {
    // Create collection databases for each entity type
    const entityTypes: EntityType[] = [
      'contacts', 'deals', 'activities', 'media', 'notes', 'tags', 'companies', 'pipelines'
    ];

    for (const type of entityTypes) {
      const collection = this.db.openDB({ name: type });
      this.collections.set(type, collection);
    }

    // Create index databases
    const indexes = [
      'contacts_by_email',
      'contacts_by_company',
      'deals_by_contact',
      'deals_by_stage',
      'activities_by_contact',
      'activities_by_deal',
      'media_by_entity',
      'notes_by_contact',
      'notes_by_deal',
    ];

    for (const indexName of indexes) {
      const index = this.db.openDB({ name: `index_${indexName}`, dupSort: true });
      this.indexPaths.set(indexName, index);
    }
  }

  /**
   * Get collection database
   */
  getCollection(type: EntityType): Database {
    const collection = this.collections.get(type);
    if (!collection) {
      throw new CRMError(`Collection not found: ${type}`, 'COLLECTION_NOT_FOUND');
    }
    return collection;
  }

  /**
   * Generate a new UUID
   */
  generateId(): UUID {
    return crypto.randomUUID();
  }

  /**
   * Get current timestamp
   */
  getTimestamp(): Timestamp {
    return new Date().toISOString();
  }

  /**
   * Insert an entity
   */
  async insert<T extends { id: UUID; createdAt: Timestamp; updatedAt: Timestamp }>(
    type: EntityType,
    entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const collection = this.getCollection(type);
    const id = this.generateId();
    const now = this.getTimestamp();

    const fullEntity = {
      ...entity,
      id,
      createdAt: now,
      updatedAt: now,
    } as T;

    await collection.put(id, fullEntity);

    // Update indexes
    await this.updateIndexes(type, id, fullEntity);

    return fullEntity;
  }

  /**
   * Insert with specific ID
   */
  async insertWithId<T extends { id: UUID; createdAt: Timestamp; updatedAt: Timestamp }>(
    type: EntityType,
    entity: T
  ): Promise<T> {
    const collection = this.getCollection(type);

    // Check for duplicate
    const existing = collection.get(entity.id);
    if (existing) {
      throw new DuplicateError(`Entity with id ${entity.id} already exists`);
    }

    const now = this.getTimestamp();
    const fullEntity = {
      ...entity,
      createdAt: entity.createdAt ?? now,
      updatedAt: now,
    } as T;

    await collection.put(entity.id, fullEntity);
    await this.updateIndexes(type, entity.id, fullEntity);

    return fullEntity;
  }

  /**
   * Get an entity by ID
   */
  get<T>(type: EntityType, id: UUID): T | null {
    const collection = this.getCollection(type);
    return collection.get(id) ?? null;
  }

  /**
   * Update an entity
   */
  async update<T extends { id: UUID; updatedAt: Timestamp }>(
    type: EntityType,
    id: UUID,
    updates: Partial<T>
  ): Promise<T> {
    const collection = this.getCollection(type);
    const existing = collection.get(id);

    if (!existing) {
      throw new NotFoundError(`Entity with id ${id} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      id, // Ensure ID is not changed
      updatedAt: this.getTimestamp(),
    } as T;

    await collection.put(id, updated);

    // Update indexes
    await this.updateIndexes(type, id, updated);

    return updated;
  }

  /**
   * Delete an entity
   */
  async delete(type: EntityType, id: UUID): Promise<boolean> {
    const collection = this.getCollection(type);
    const existing = collection.get(id);

    if (!existing) {
      return false;
    }

    // Remove from indexes
    await this.removeFromIndexes(type, id, existing);

    return collection.del(id);
  }

  /**
   * Check if entity exists
   */
  exists(type: EntityType, id: UUID): boolean {
    const collection = this.getCollection(type);
    return collection.doesExist(id);
  }

  /**
   * List entities with pagination
   */
  list<T>(type: EntityType, options?: { limit?: number; offset?: number }): T[] {
    const collection = this.getCollection(type);
    const results: T[] = [];
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    let count = 0;
    for (const entry of collection.getRange()) {
      if (count >= offset && count < offset + limit) {
        results.push(entry.value as T);
      }
      count++;
      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Count entities in collection
   */
  count(type: EntityType): number {
    const collection = this.getCollection(type);
    return collection.getCount();
  }

  /**
   * Find entities by index
   */
  findByIndex<T>(indexName: string, key: string): T[] {
    const index = this.indexPaths.get(indexName);
    if (!index) {
      throw new CRMError(`Index not found: ${indexName}`, 'INDEX_NOT_FOUND');
    }

    const entityIds = index.getValues(key);
    const results: T[] = [];

    // Determine collection type from index name
    const collectionType = this.getCollectionTypeFromIndex(indexName);
    const collection = this.getCollection(collectionType);

    for (const id of entityIds) {
      const entity = collection.get(id as string);
      if (entity) {
        results.push(entity as T);
      }
    }

    return results;
  }

  /**
   * Search entities by field value
   */
  search<T>(type: EntityType, field: string, value: unknown): T[] {
    const collection = this.getCollection(type);
    const results: T[] = [];

    for (const entry of collection.getRange()) {
      const entity = entry.value as Record<string, unknown>;
      if (entity[field] === value) {
        results.push(entity as T);
      }
    }

    return results;
  }

  /**
   * Get storage statistics
   */
  getStats(): StorageStats {
    return {
      contacts: this.count('contacts'),
      deals: this.count('deals'),
      activities: this.count('activities'),
      media: this.count('media'),
      notes: this.count('notes'),
      tags: this.count('tags'),
      companies: this.count('companies'),
      pipelines: this.count('pipelines'),
    };
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }

  /**
   * Update indexes for an entity
   */
  private async updateIndexes(type: EntityType, id: UUID, entity: unknown): Promise<void> {
    const record = entity as Record<string, unknown>;

    switch (type) {
      case 'contacts': {
        // Index by emails
        const emails = record.emails as Array<{ email: string }> | undefined;
        if (emails) {
          const index = this.indexPaths.get('contacts_by_email');
          if (index) {
            for (const emailObj of emails) {
              await index.put(emailObj.email.toLowerCase(), id);
            }
          }
        }
        // Index by company
        if (record.companyId) {
          const index = this.indexPaths.get('contacts_by_company');
          if (index) {
            await index.put(record.companyId as string, id);
          }
        }
        break;
      }
      case 'deals': {
        // Index by contact
        if (record.contactId) {
          const index = this.indexPaths.get('deals_by_contact');
          if (index) {
            await index.put(record.contactId as string, id);
          }
        }
        // Index by stage
        if (record.stage) {
          const index = this.indexPaths.get('deals_by_stage');
          if (index) {
            await index.put(record.stage as string, id);
          }
        }
        break;
      }
      case 'activities': {
        // Index by contact
        if (record.contactId) {
          const index = this.indexPaths.get('activities_by_contact');
          if (index) {
            await index.put(record.contactId as string, id);
          }
        }
        // Index by deal
        if (record.dealId) {
          const index = this.indexPaths.get('activities_by_deal');
          if (index) {
            await index.put(record.dealId as string, id);
          }
        }
        break;
      }
      case 'media': {
        // Index by entity
        if (record.entityId) {
          const index = this.indexPaths.get('media_by_entity');
          if (index) {
            await index.put(record.entityId as string, id);
          }
        }
        break;
      }
      case 'notes': {
        // Index by contact
        if (record.contactId) {
          const index = this.indexPaths.get('notes_by_contact');
          if (index) {
            await index.put(record.contactId as string, id);
          }
        }
        // Index by deal
        if (record.dealId) {
          const index = this.indexPaths.get('notes_by_deal');
          if (index) {
            await index.put(record.dealId as string, id);
          }
        }
        break;
      }
    }
  }

  /**
   * Remove entity from indexes
   */
  private async removeFromIndexes(type: EntityType, id: UUID, entity: unknown): Promise<void> {
    // For now, indexes remain - a production system would clean these up
    // This is a simplification for the initial implementation
  }

  /**
   * Get collection type from index name
   */
  private getCollectionTypeFromIndex(indexName: string): EntityType {
    if (indexName.startsWith('contacts_')) return 'contacts';
    if (indexName.startsWith('deals_')) return 'deals';
    if (indexName.startsWith('activities_')) return 'activities';
    if (indexName.startsWith('media_')) return 'media';
    if (indexName.startsWith('notes_')) return 'notes';
    throw new CRMError(`Unknown index: ${indexName}`, 'UNKNOWN_INDEX');
  }
}
