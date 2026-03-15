/**
 * Skills Marketplace API Client
 *
 * Fetches skills from Anthropic's Skills Marketplace.
 * Beta header: skills-2025-10-02
 */

import type { ClaudeModel } from "../../schemas/index.js";

// ============================================
// TYPES
// ============================================

export interface MarketplaceSkill {
  id: string;
  name: string;
  description: string;
  author?: string;
  version: string;
  prompt: string;
  tools?: string[];
  model?: ClaudeModel;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillVersion {
  version: string;
  prompt: string;
  tools?: string[];
  model?: ClaudeModel;
  createdAt: string;
  changelog?: string;
}

export interface ListSkillsOptions {
  limit?: number;
  offset?: number;
  search?: string;
  tags?: string[];
}

export interface ListSkillsResponse {
  skills: MarketplaceSkill[];
  total: number;
  hasMore: boolean;
}

// ============================================
// SKILLS CLIENT
// ============================================

const SKILLS_BETA_HEADER = "skills-2025-10-02";
const DEFAULT_BASE_URL = "https://api.anthropic.com";

export class SkillsClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || process.env.ANTHROPIC_BASE_URL || DEFAULT_BASE_URL;
  }

  /**
   * List available skills from marketplace
   */
  async list(options: ListSkillsOptions = {}): Promise<ListSkillsResponse> {
    const { limit = 50, offset = 0, search, tags } = options;

    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    if (search) params.set("search", search);
    if (tags && tags.length > 0) params.set("tags", tags.join(","));

    const response = await fetch(`${this.baseUrl}/v1/skills?${params}`, {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": SKILLS_BETA_HEADER,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Skills API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<ListSkillsResponse>;
  }

  /**
   * Get a specific skill by ID
   */
  async get(skillId: string): Promise<MarketplaceSkill> {
    const response = await fetch(`${this.baseUrl}/v1/skills/${skillId}`, {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": SKILLS_BETA_HEADER,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Skills API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<MarketplaceSkill>;
  }

  /**
   * Get skill by name (convenience method)
   */
  async getByName(name: string): Promise<MarketplaceSkill | null> {
    const { skills } = await this.list({ search: name, limit: 100 });
    return skills.find(s => s.name === name) || null;
  }

  /**
   * List versions of a skill
   */
  async listVersions(skillId: string): Promise<SkillVersion[]> {
    const response = await fetch(`${this.baseUrl}/v1/skills/${skillId}/versions`, {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": SKILLS_BETA_HEADER,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Skills API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<SkillVersion[]>;
  }

  /**
   * Get a specific version of a skill
   */
  async getVersion(skillId: string, version: string): Promise<SkillVersion> {
    const response = await fetch(
      `${this.baseUrl}/v1/skills/${skillId}/versions/${version}`,
      {
        method: "GET",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": SKILLS_BETA_HEADER,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Skills API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<SkillVersion>;
  }
}

// ============================================
// SKILL CACHE
// ============================================

interface CachedSkill {
  skill: MarketplaceSkill;
  cachedAt: number;
  ttl: number;
}

export class SkillsCache {
  private cache = new Map<string, CachedSkill>();
  private defaultTtl = 5 * 60 * 1000; // 5 minutes

  get(skillId: string): MarketplaceSkill | null {
    const cached = this.cache.get(skillId);
    if (!cached) return null;

    if (Date.now() - cached.cachedAt > cached.ttl) {
      this.cache.delete(skillId);
      return null;
    }

    return cached.skill;
  }

  set(skill: MarketplaceSkill, ttl = this.defaultTtl): void {
    this.cache.set(skill.id, {
      skill,
      cachedAt: Date.now(),
      ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================
// SKILL RESOLVER
// ============================================

/**
 * Resolve a skill from multiple sources:
 * 1. Built-in skills
 * 2. Project skills (local files)
 * 3. Marketplace skills (API)
 */
export class SkillResolver {
  private client: SkillsClient | null;
  private cache: SkillsCache;

  constructor(apiKey?: string) {
    this.client = apiKey ? new SkillsClient(apiKey) : null;
    this.cache = new SkillsCache();
  }

  /**
   * Resolve a skill by name
   * Checks cache first, then marketplace
   */
  async resolve(name: string): Promise<MarketplaceSkill | null> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached) return cached;

    // Fetch from marketplace
    if (this.client) {
      try {
        const skill = await this.client.getByName(name);
        if (skill) {
          this.cache.set(skill);
          return skill;
        }
      } catch (error) {
        console.error(`Failed to fetch skill "${name}" from marketplace:`, error);
      }
    }

    return null;
  }

  /**
   * Search marketplace for skills
   */
  async search(query: string): Promise<MarketplaceSkill[]> {
    if (!this.client) return [];

    try {
      const { skills } = await this.client.list({ search: query });
      return skills;
    } catch (error) {
      console.error("Failed to search skills:", error);
      return [];
    }
  }
}
