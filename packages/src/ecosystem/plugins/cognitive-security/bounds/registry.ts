/**
 * Boundary Registry - Manages boundaries, signals, and patches
 *
 * The registry is the central store for:
 * - Boundary definitions (built-in and learned)
 * - Failure signals (for analysis)
 * - Boundary patches (improvements from signals)
 */

import type {
  Boundary,
  BoundaryContext,
  BoundaryCheckResult,
  BoundaryPatch,
  BoundaryStats,
  BoundaryRegistryConfig,
  FailureSignal,
} from "./types.js";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<BoundaryRegistryConfig> = {
  persistencePath: join(homedir(), ".claude", "bounds"),
  autoSave: true,
  maxSignals: 1000,
  enableSignalProcessing: true,
};

/**
 * Registry for managing boundaries and patches
 */
export class BoundaryRegistry {
  private boundaries: Map<string, Boundary> = new Map();
  private patches: BoundaryPatch[] = [];
  private signals: FailureSignal[] = [];
  private dirty = false;
  private config: Required<BoundaryRegistryConfig>;

  constructor(config?: BoundaryRegistryConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // BOUNDARY MANAGEMENT
  // ============================================

  /**
   * Register a boundary
   */
  register(boundary: Boundary): void {
    this.boundaries.set(boundary.id, boundary);
    this.dirty = true;
    if (this.config.autoSave) {
      this.save().catch((err) => console.error("[Bounds] Auto-save failed:", err));
    }
  }

  /**
   * Register multiple boundaries at once
   */
  registerAll(boundaries: Boundary[]): void {
    for (const boundary of boundaries) {
      this.boundaries.set(boundary.id, boundary);
    }
    this.dirty = true;
  }

  /**
   * Get a boundary by ID
   */
  get(id: string): Boundary | undefined {
    return this.boundaries.get(id);
  }

  /**
   * Get all boundaries
   */
  getAll(): Boundary[] {
    return Array.from(this.boundaries.values());
  }

  /**
   * Get enabled boundaries
   */
  getEnabled(): Boundary[] {
    return this.getAll().filter((b) => b.enabled !== false);
  }

  /**
   * Remove a boundary
   */
  remove(id: string): boolean {
    const result = this.boundaries.delete(id);
    if (result) {
      this.dirty = true;
      if (this.config.autoSave) {
        this.save().catch((err) => console.error("[Bounds] Auto-save failed:", err));
      }
    }
    return result;
  }

  /**
   * Enable or disable a boundary
   */
  setEnabled(id: string, enabled: boolean): boolean {
    const boundary = this.boundaries.get(id);
    if (boundary) {
      boundary.enabled = enabled;
      this.dirty = true;
      return true;
    }
    return false;
  }

  // ============================================
  // BOUNDARY CHECKING
  // ============================================

  /**
   * Check all enabled boundaries for a context
   */
  async checkAll(context: BoundaryContext): Promise<BoundaryCheckResult> {
    const violations: BoundaryViolation[] = [];
    const warnings: BoundaryViolation[] = [];
    let blocked = false;
    let fatal = false;

    for (const boundary of this.getEnabled()) {
      try {
        const violation = await boundary.check(context);
        if (violation) {
          violation.boundaryId = boundary.id;
          violations.push(violation);

          if (boundary.severity === "warn") {
            warnings.push(violation);
          } else if (boundary.severity === "block") {
            blocked = true;
          } else if (boundary.severity === "fatal") {
            fatal = true;
            break; // Stop on fatal
          }
        }
      } catch (err) {
        console.error(`[Bounds] Error checking boundary ${boundary.id}:`, err);
      }
    }

    return {
      violations,
      blocked,
      fatal,
      warnings,
    };
  }

  /**
   * Check a single boundary
   */
  async check(id: string, context: BoundaryContext): Promise<BoundaryViolation | null> {
    const boundary = this.boundaries.get(id);
    if (!boundary || boundary.enabled === false) {
      return null;
    }
    return boundary.check(context);
  }

  // ============================================
  // SIGNAL & PATCH MANAGEMENT
  // ============================================

  /**
   * Record a failure signal
   */
  recordSignal(signal: FailureSignal): void {
    this.signals.push(signal);

    // Trim old signals if over limit
    if (this.signals.length > this.config.maxSignals) {
      this.signals = this.signals.slice(-this.config.maxSignals);
    }

    this.dirty = true;
  }

  /**
   * Get all signals
   */
  getSignals(): FailureSignal[] {
    return [...this.signals];
  }

  /**
   * Get unprocessed signals
   */
  getUnprocessedSignals(): FailureSignal[] {
    return this.signals.filter((s) => !s.processed);
  }

  /**
   * Mark a signal as processed
   */
  markSignalProcessed(signalId: string): void {
    const signal = this.signals.find((s) => s.id === signalId);
    if (signal) {
      signal.processed = true;
      this.dirty = true;
    }
  }

  /**
   * Apply a patch to the registry
   */
  applyPatch(patch: BoundaryPatch): void {
    // Check if patch creates a new boundary
    const patchData = patch.patch as Record<string, unknown>;
    if (patchData.type === "new" && patchData.boundary) {
      const newBoundary = patchData.boundary as Boundary;
      newBoundary.learned = true;
      this.register(newBoundary);
    } else {
      // Merge partial patch into existing boundary
      const existing = this.boundaries.get(patch.boundaryId);
      if (existing) {
        const partialPatch = patch.patch as Partial<Boundary>;
        Object.assign(existing, partialPatch);
        this.boundaries.set(patch.boundaryId, existing);
      }
    }

    patch.applied = true;
    this.patches.push(patch);
    this.dirty = true;

    if (this.config.autoSave) {
      this.save().catch((err) => console.error("[Bounds] Auto-save failed:", err));
    }
  }

  /**
   * Get all patches
   */
  getPatches(): BoundaryPatch[] {
    return [...this.patches];
  }

  /**
   * Get pending (unapplied) patches
   */
  getPendingPatches(): BoundaryPatch[] {
    return this.patches.filter((p) => !p.applied);
  }

  // ============================================
  // PERSISTENCE
  // ============================================

  /**
   * Save registry to disk
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    try {
      const dir = this.config.persistencePath;
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Save learned boundaries
      const learnedBoundaries = this.getAll().filter((b) => b.learned);
      const boundariesPath = join(dir, "learned-boundaries.json");

      // Convert boundaries to serializable format (remove function references)
      const serializable = learnedBoundaries.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        severity: b.severity,
        learned: b.learned,
        tags: b.tags,
        enabled: b.enabled,
        // Note: check function is not serialized - must be rebuilt
        checkSource: (b as unknown as Record<string, string>).checkSource,
      }));

      await writeFile(
        boundariesPath,
        JSON.stringify(serializable, null, 2),
        "utf-8"
      );

      // Save patches
      const patchesPath = join(dir, "patches.json");
      await writeFile(patchesPath, JSON.stringify(this.patches, null, 2), "utf-8");

      // Save signals
      const signalsPath = join(dir, "signals.json");
      await writeFile(signalsPath, JSON.stringify(this.signals, null, 2), "utf-8");

      this.dirty = false;
    } catch (err) {
      console.error("[Bounds] Failed to save registry:", err);
      throw err;
    }
  }

  /**
   * Load registry from disk
   */
  async load(): Promise<void> {
    try {
      const dir = this.config.persistencePath;

      // Load patches
      const patchesPath = join(dir, "patches.json");
      if (existsSync(patchesPath)) {
        const content = await readFile(patchesPath, "utf-8");
        this.patches = JSON.parse(content) as BoundaryPatch[];
      }

      // Load signals
      const signalsPath = join(dir, "signals.json");
      if (existsSync(signalsPath)) {
        const content = await readFile(signalsPath, "utf-8");
        this.signals = JSON.parse(content) as FailureSignal[];
      }

      // Note: Learned boundaries are loaded as metadata only
      // The check functions must be rebuilt from source or registered separately
      this.dirty = false;
    } catch (err) {
      console.error("[Bounds] Failed to load registry:", err);
      // Don't throw - allow starting fresh
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Get registry statistics
   */
  getStats(): BoundaryStats {
    return {
      total: this.boundaries.size,
      enabled: this.getEnabled().length,
      learned: this.getAll().filter((b) => b.learned).length,
      pendingPatches: this.getPendingPatches().length,
      processedSignals: this.signals.filter((s) => s.processed).length,
    };
  }

  /**
   * Clear all learned data (keep built-ins)
   */
  clear(): void {
    // Remove learned boundaries
    for (const [id, boundary] of this.boundaries) {
      if (boundary.learned) {
        this.boundaries.delete(id);
      }
    }
    this.patches = [];
    this.signals = [];
    this.dirty = true;
  }

  /**
   * Export registry state for debugging
   */
  export(): {
    boundaries: Boundary[];
    patches: BoundaryPatch[];
    signals: FailureSignal[];
  } {
    return {
      boundaries: this.getAll(),
      patches: this.patches,
      signals: this.signals,
    };
  }
}

// Singleton instance
let defaultRegistry: BoundaryRegistry | null = null;

/**
 * Get the default registry instance
 */
export function getRegistry(config?: BoundaryRegistryConfig): BoundaryRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new BoundaryRegistry(config);
  }
  return defaultRegistry;
}

/**
 * Reset the default registry (for testing)
 */
export function resetRegistry(): void {
  defaultRegistry = null;
}

// Import for violation type
import type { BoundaryViolation } from "./types.js";
