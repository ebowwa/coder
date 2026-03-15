/**
 * Teammate Template Manager - Load and manage agent configuration templates
 *
 * Templates are used when spawning autonomous teammates in Ralph loops.
 * Each template defines MCP servers, CLAUDE.md, permissions, and skills.
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { TeammateTemplateSchema, type TeammateTemplate, TEAMMATE_TEMPLATES } from "./types.js";

// ============================================
// TEMPLATE MANAGER
// ============================================

export class TeammateTemplateManager {
  private templates = new Map<string, TeammateTemplate>();
  private templateDirs: string[];

  constructor() {
    // Template directories in priority order (later overrides earlier)
    this.templateDirs = [
      // Built-in templates (lowest priority)
      "builtin",
      // User templates
      join(homedir(), ".claude", "templates"),
      // Project templates (highest priority)
      join(process.cwd(), ".claude", "templates"),
    ];

    // Load built-in templates
    for (const [name, template] of Object.entries(TEAMMATE_TEMPLATES)) {
      this.templates.set(name, template);
    }
  }

  /**
   * List all available templates
   */
  list(): string[] {
    // Load from directories
    for (const dir of this.templateDirs) {
      if (dir === "builtin") continue;
      this.loadFromDirectory(dir);
    }
    return Array.from(this.templates.keys()).sort();
  }

  /**
   * Get a template by name
   */
  get(name: string): TeammateTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Check if template exists
   */
  has(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * Load templates from a directory
   */
  private loadFromDirectory(dir: string): number {
    if (!existsSync(dir)) {
      return 0;
    }

    let count = 0;
    const files = readdirSync(dir);

    for (const file of files) {
      if (file.endsWith(".yaml") || file.endsWith(".yml")) {
        try {
          const content = readFileSync(join(dir, file), "utf-8");
          const template = this.parseYamlTemplate(content);
          if (template && template.name) {
            this.templates.set(template.name, template);
            count++;
          }
        } catch (error) {
          console.error(`Failed to load template ${file}:`, error);
        }
      } else if (file.endsWith(".json")) {
        try {
          const content = readFileSync(join(dir, file), "utf-8");
          const template = TeammateTemplateSchema.parse(JSON.parse(content));
          this.templates.set(template.name, template);
          count++;
        } catch (error) {
          console.error(`Failed to load template ${file}:`, error);
        }
      }
    }

    return count;
  }

  /**
   * Parse YAML template file
   */
  private parseYamlTemplate(content: string): TeammateTemplate | null {
    // Simple YAML parser for templates
    const lines = content.split("\n");
    const result: Record<string, unknown> = {};
    let currentKey = "";
    let currentSection: Record<string, unknown> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith("#") || trimmed === "") continue;

      // Top-level key
      if (!line.startsWith(" ") && !line.startsWith("\t")) {
        const match = trimmed.match(/^(\w+):\s*(.*)$/);
        if (match) {
          currentKey = match[1] ?? "";
          const value = match[2] ?? "";

          if (value === "") {
            currentSection = {};
            result[currentKey] = currentSection;
          } else if (value.startsWith("[")) {
            // Array on same line
            try {
              result[currentKey] = JSON.parse(value);
            } catch {
              result[currentKey] = value;
            }
          } else if (value === "true" || value === "false") {
            result[currentKey] = value === "true";
          } else if (/^\d+$/.test(value)) {
            result[currentKey] = parseInt(value, 10);
          } else {
            // Handle quoted strings
            result[currentKey] = value.replace(/^["']|["']$/g, "");
          }
        }
      }
      // Nested key
      else if (currentSection && currentKey) {
        const match = trimmed.match(/^(\w+):\s*(.*)$/);
        if (match) {
          const key = match[1] ?? "";
          const value = match[2] ?? "";

          if (value === "") {
            currentSection[key] = {};
          } else {
            currentSection[key] = this.parseValue(value);
          }
        }
        // Array item
        else if (trimmed.startsWith("- ")) {
          const value = trimmed.slice(2);
          if (!Array.isArray(result[currentKey])) {
            result[currentKey] = [];
          }
          (result[currentKey] as unknown[]).push(this.parseValue(value));
        }
      }
    }

    try {
      return TeammateTemplateSchema.parse(result);
    } catch {
      return null;
    }
  }

  /**
   * Parse a YAML value
   */
  private parseValue(value: string): unknown {
    if (value === "true") return true;
    if (value === "false") return false;
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    if (value.startsWith("[")) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    // Remove quotes
    return value.replace(/^["']|["']$/g, "");
  }

  /**
   * Merge templates together
   */
  merge(...names: string[]): TeammateTemplate {
    const merged: TeammateTemplate = {
      name: "merged",
      description: "Merged template",
      version: "1.0.0",
    };

    for (const name of names) {
      const template = this.get(name);
      if (!template) continue;

      // Merge MCP servers
      if (template.mcpServers) {
        merged.mcpServers = {
          ...merged.mcpServers,
          ...template.mcpServers,
        };
      }

      // Merge CLAUDE.md
      if (template.claudeMd) {
        merged.claudeMd = (merged.claudeMd ?? "") + "\n\n" + template.claudeMd;
      }

      // Merge permissions
      if (template.permissions) {
        merged.permissions = {
          ...merged.permissions,
          ...template.permissions,
          allowedTools: [
            ...(merged.permissions?.allowedTools ?? []),
            ...(template.permissions.allowedTools ?? []),
          ],
        };
      }

      // Merge skills
      if (template.skills) {
        merged.skills = [
          ...(merged.skills ?? []),
          ...template.skills,
        ];
      }

      // Merge env
      if (template.env) {
        merged.env = {
          ...merged.env,
          ...template.env,
        };
      }

      // Merge tags
      if (template.tags) {
        merged.tags = [
          ...(merged.tags ?? []),
          ...template.tags,
        ];
      }
    }

    return merged;
  }

  /**
   * Create a new template
   */
  create(name: string, template: TeammateTemplate): void {
    const userDir = join(homedir(), ".claude", "templates");
    if (!existsSync(userDir)) {
      mkdirSync(userDir, { recursive: true });
    }

    // Save as JSON
    const path = join(userDir, `${name}.json`);
    const content = JSON.stringify(template, null, 2);

    writeFileSync(path, content);
    this.templates.set(name, template);
  }

  /**
   * Get template info
   */
  getInfo(name: string): {
    name: string;
    description: string;
    mcpServerCount: number;
    hasClaudeMd: boolean;
    tags: string[];
  } | null {
    const template = this.get(name);
    if (!template) return null;

    return {
      name: template.name,
      description: template.description,
      mcpServerCount: Object.keys(template.mcpServers ?? {}).length,
      hasClaudeMd: !!template.claudeMd,
      tags: template.tags ?? [],
    };
  }
}

// Singleton instance
export const templateManager = new TeammateTemplateManager();

// Backwards compatibility alias
export const presetManager = templateManager;
export const PresetManager = TeammateTemplateManager;
