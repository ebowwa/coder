/**
 * Generic Template Manager - Base class for named template registries
 *
 * Shared by:
 * - ecosystem/presets/manager.ts (TeammateTemplateManager)
 * - circuit/persistence.ts (WorkflowTemplateManager)
 */

export interface Named {
  name: string;
}

export class TemplateManager<T extends Named> {
  protected templates = new Map<string, T>();

  register(template: T): void {
    this.templates.set(template.name, template);
  }

  get(name: string): T | undefined {
    return this.templates.get(name);
  }

  has(name: string): boolean {
    return this.templates.has(name);
  }

  list(): T[] {
    return Array.from(this.templates.values());
  }

  listNames(): string[] {
    return Array.from(this.templates.keys()).sort();
  }

  entries(): IterableIterator<[string, T]> {
    return this.templates.entries();
  }

  get size(): number {
    return this.templates.size;
  }
}
