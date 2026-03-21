/**
 * Workflow Persistence
 *
 * Persistence layer for workflows:
 * - Save/load workflows to/from disk
 * - Session state persistence
 * - Priority persistence for adaptive routing
 * - Workflow templates for reuse
 *
 * ============================================
 * TERMINOLOGY MAPPING (Neuroscience → Workflow)
 * ============================================
 *
 * | Old Term           | New Term              | Description              |
 * |--------------------|-----------------------|--------------------------|
 * | Circuit            | Workflow              | The pipeline             |
 * | CircuitRegistry    | WorkflowRegistry      | Manages workflows        |
 * | CircuitTemplate    | WorkflowTemplate      | Reusable blueprint       |
 * | SerializedCircuit  | SerializedWorkflow    | Saved workflow state     |
 * | Node               | Step                  | Processing unit          |
 * | Synapse            | Connection            | Link between steps       |
 * | Signal             | Message               | Data flowing through     |
 * | Plasticity         | AdaptiveRouting       | Priority adjustment      |
 * | currentWeight      | currentPriority       | Current priority         |
 * | transmissions      | passes                | Connection use count     |
 *
 * ============================================
 */

import { mkdirSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import type {
  Workflow,
  WorkflowConfig,
  WorkflowTemplate,
  WorkflowRegistryEntry,
  Message,
  Step,
  Connection,
  Loop,
  AdaptiveRoutingConfig,
} from "./types.js";
import { WorkflowEngine, createStep, createConnection } from "./engine.js";
import type { StepProcessor } from "./types.js";

// ============================================
// PERSISTENCE TYPES
// ============================================

/**
 * Serialized workflow state
 */
export interface SerializedWorkflow {
  config: WorkflowConfig;
  state: Record<string, unknown>;
  currentCycle: number;
  steps: Array<{
    id: string;
    currentPriority: number;
    activations: number;
    lastActivated?: number;
    state: Record<string, unknown>;
  }>;
  connections: Array<{
    from: string;
    to: string;
    currentPriority: number;
    transmissions: number;
    lastTransmitted?: number;
  }>;
  loops?: Array<{
    id: string;
    iteration: number;
    history: Message[];
    converged: boolean;
  }>;
  lastResult?: {
    outputs: Message[];
    state: Record<string, unknown>;
    success: boolean;
    duration: number;
  };
}

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  /** Storage directory */
  storageDir: string;
  /** Auto-save interval in ms (0 = disabled) */
  autoSaveInterval?: number;
  /** Max history entries per workflow */
  maxHistory?: number;
  /** Enable compression */
  compress?: boolean;
}

// ============================================
// WORKFLOW REGISTRY
// ============================================

/**
 * Workflow Registry - manages workflow lifecycle and persistence
 *
 * Neuroscience: "cortical map" = organized representation in brain
 * Workflow: registry = organized collection of workflows
 */
export class WorkflowRegistry {
  private entries = new Map<string, WorkflowRegistryEntry>();
  private engine: WorkflowEngine;
  private storageDir: string;
  private autoSaveInterval: number;
  private autoSaveTimer?: ReturnType<typeof setInterval>;

  constructor(
    engine: WorkflowEngine,
    config: PersistenceConfig
  ) {
    this.engine = engine;
    this.storageDir = config.storageDir.replace("~", process.env.HOME || "");
    this.autoSaveInterval = config.autoSaveInterval ?? 0;

    // Ensure storage directory exists
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }

    // Load existing workflows
    this.loadAll();

    // Start auto-save if enabled
    if (this.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        this.saveAll();
      }, this.autoSaveInterval);
    }
  }

  /**
   * Register a workflow
   */
  register(
    workflow: Workflow,
    processors: Map<string, StepProcessor>
  ): void {
    // Create in engine
    this.engine.createWorkflow(
      {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        steps: Array.from(workflow.stepsMap.values()).map(s => ({
          id: s.id,
          type: s.type,
          name: s.name,
          description: s.description,
          priority: s.priority,
          decayRate: s.decayRate,
          boostRate: s.boostRate,
          threshold: s.threshold,
          maxMessages: s.maxMessages,
          config: s.config,
        })),
        connections: [],
        initialState: workflow.state,
        maxCycles: workflow.maxCycles,
        adaptiveRouting: workflow.adaptiveRouting,
        boostRate: workflow.boostRate,
        decayRate: workflow.decayRate,
      },
      processors
    );

    // Add entry
    this.entries.set(workflow.id, {
      workflow,
      createdAt: Date.now(),
      executions: 0,
      avgExecutionTime: 0,
    });
  }

  /**
   * Get a workflow by ID
   */
  get(id: string): Workflow | undefined {
    return this.engine.getWorkflow(id);
  }

  /**
   * Get registry entry
   */
  getEntry(id: string): WorkflowRegistryEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * List all workflows
   */
  list(): Workflow[] {
    return this.engine.listWorkflows();
  }

  /**
   * Delete a workflow
   */
  delete(id: string): void {
    this.engine.deleteWorkflow(id);
    this.entries.delete(id);

    // Delete from disk
    const filePath = join(this.storageDir, `${id}.json`);
    if (existsSync(filePath)) {
      rmSync(filePath);
    }
  }

  /**
   * Save a workflow to disk
   */
  save(id: string): void {
    const workflow = this.engine.getWorkflow(id);
    if (!workflow) return;

    const entry = this.entries.get(id);

    const serialized: SerializedWorkflow = {
      config: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        steps: Array.from(workflow.stepsMap.values()).map(s => ({
          id: s.id,
          type: s.type,
          name: s.name,
          description: s.description,
          priority: s.priority,
          decayRate: s.decayRate,
          boostRate: s.boostRate,
          threshold: s.threshold,
          maxMessages: s.maxMessages,
          config: s.config,
        })),
        connections: [],
        initialState: workflow.initialState,
        maxCycles: workflow.maxCycles,
        adaptiveRouting: workflow.adaptiveRouting,
        boostRate: workflow.boostRate,
        decayRate: workflow.decayRate,
      },
      state: workflow.state,
      currentCycle: workflow.currentCycle,
      steps: Array.from(workflow.stepsMap.values()).map(s => ({
        id: s.id,
        currentPriority: s.currentPriority,
        activations: s.activations,
        lastActivated: s.lastActivated,
        state: s.state,
      })),
      connections: Array.from(workflow.outgoingConnections.values())
        .flat()
        .map(c => ({
          from: c.from,
          to: c.to,
          currentPriority: c.currentPriority,
          transmissions: c.transmissions,
          lastTransmitted: c.lastTransmitted,
        })),
      lastResult: workflow.lastResult ? {
        outputs: workflow.lastResult.outputs,
        state: workflow.lastResult.state,
        success: workflow.lastResult.success,
        duration: workflow.lastResult.duration,
      } : undefined,
    };

    const filePath = join(this.storageDir, `${id}.json`);
    writeFileSync(filePath, JSON.stringify(serialized, null, 2));
  }

  /**
   * Load a workflow from disk
   */
  load(id: string, processors: Map<string, StepProcessor>): Workflow | null {
    const filePath = join(this.storageDir, `${id}.json`);
    if (!existsSync(filePath)) return null;

    try {
      const content = readFileSync(filePath, "utf-8");
      const serialized: SerializedWorkflow = JSON.parse(content);

      // Create workflow in engine
      const workflow = this.engine.createWorkflow(serialized.config, processors);

      // Restore state
      workflow.state = serialized.state;
      workflow.currentCycle = serialized.currentCycle;

      // Restore step states
      for (const stepState of serialized.steps) {
        const step = workflow.stepsMap.get(stepState.id);
        if (step) {
          step.currentPriority = stepState.currentPriority;
          step.activations = stepState.activations;
          step.lastActivated = stepState.lastActivated;
          step.state = stepState.state;
        }
      }

      // Restore connection states
      for (const connectionState of serialized.connections) {
        const connections = workflow.outgoingConnections.get(connectionState.from) || [];
        const connection = connections.find(c => c.to === connectionState.to);
        if (connection) {
          connection.currentPriority = connectionState.currentPriority;
          connection.transmissions = connectionState.transmissions;
          connection.lastTransmitted = connectionState.lastTransmitted;
        }
      }

      // Create entry
      this.entries.set(id, {
        workflow,
        createdAt: Date.now(),
        executions: 0,
        avgExecutionTime: 0,
      });

      return workflow;

    } catch (error) {
      console.error(`Failed to load workflow ${id}:`, error);
      return null;
    }
  }

  /**
   * Save all workflows
   */
  saveAll(): void {
    for (const id of this.engine.listWorkflows().map(w => w.id)) {
      this.save(id);
    }
  }

  /**
   * Load all workflows from disk
   */
  loadAll(): void {
    if (!existsSync(this.storageDir)) return;

    const files = readdirSync(this.storageDir).filter(f => f.endsWith(".json"));

    for (const file of files) {
      const id = file.replace(".json", "");
      // Note: processors must be provided by caller
      // This just populates the entries map
      const filePath = join(this.storageDir, file);
      try {
        const content = readFileSync(filePath, "utf-8");
        const serialized: SerializedWorkflow = JSON.parse(content);

        this.entries.set(id, {
          workflow: null as unknown as Workflow, // Will be populated when loaded with processors
          createdAt: Date.now(),
          executions: 0,
          avgExecutionTime: 0,
        });
      } catch {
        // Skip malformed files
      }
    }
  }

  /**
   * Update execution stats
   */
  recordExecution(id: string, duration: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    entry.executions++;
    entry.lastExecuted = Date.now();
    entry.avgExecutionTime =
      (entry.avgExecutionTime * (entry.executions - 1) + duration) / entry.executions;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.saveAll();
  }
}

// ============================================
// WORKFLOW TEMPLATES
// ============================================

/**
 * Template Manager - creates workflows from templates
 *
 * Neuroscience: "neural scaffold" = pre-organized structure
 * Workflow: template = pre-configured workflow blueprint
 */
export class WorkflowTemplateManager {
  private templates = new Map<string, WorkflowTemplate>();

  /**
   * Register a template
   */
  register(template: WorkflowTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get a template by name
   */
  get(name: string): WorkflowTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * List all templates
   */
  list(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Create a workflow from a template
   */
  createFromTemplate(
    templateName: string,
    options: {
      id?: string;
      name?: string;
      overrides?: Partial<WorkflowConfig>;
    },
    processors: Map<string, StepProcessor>,
    engine: WorkflowEngine
  ): Workflow | null {
    const template = this.templates.get(templateName);
    if (!template) return null;

    // Generate IDs for steps
    const stepIdMap = new Map<string, string>();
    const steps = template.steps.map((stepConfig, index) => {
      const id = `step_${index}_${Date.now()}`;
      stepIdMap.set(stepConfig.name || `step_${index}`, id);
      return { ...stepConfig, id };
    });

    // Resolve connection references
    const connections = template.connections.map(connection => ({
      from: stepIdMap.get(connection.fromName) || connection.fromName,
      to: stepIdMap.get(connection.toName) || connection.toName,
      type: connection.type,
      priority: connection.priority,
      delay: connection.delay,
      minPriority: connection.minPriority,
    }));

    // Build config
    const config: WorkflowConfig = {
      id: options.id || `workflow_${Date.now()}`,
      name: options.name || template.name,
      description: template.description,
      steps,
      connections,
      ...template.defaults,
      ...options.overrides,
    };

    return engine.createWorkflow(config, processors);
  }
}

// ============================================
// BUILT-IN TEMPLATES
// ============================================

/**
 * Common workflow templates
 *
 * Each template represents a common pattern:
 * - passthrough: Simple input → output
 * - llm-pipeline: LLM processing chain
 * - cache-loop: Iteration with persistence
 * - team-coordination: Multi-agent workflow
 */
export const builtinTemplates: WorkflowTemplate[] = [
  {
    name: "passthrough",
    description: "Simple input → output workflow",
    steps: [
      { type: "input", name: "input" },
      { type: "output", name: "output" },
    ],
    connections: [
      { fromName: "input", toName: "output", type: "direct" },
    ],
    defaults: {
      maxCycles: 10,
    },
  },

  {
    name: "llm-pipeline",
    description: "Input → LLM → Transform → Output",
    steps: [
      { type: "input", name: "input" },
      { type: "agent", name: "llm", config: { model: "claude-sonnet-4-6" } },
      { type: "processor", name: "transform" },
      { type: "output", name: "output" },
    ],
    connections: [
      { fromName: "input", toName: "llm", type: "direct" },
      { fromName: "llm", toName: "transform", type: "direct" },
      { fromName: "transform", toName: "output", type: "direct" },
    ],
    defaults: {
      maxCycles: 50,
      adaptiveRouting: true,
    },
  },

  {
    name: "cache-loop",
    description: "Input → Cache → Loop → Output with feedback",
    steps: [
      { type: "input", name: "input" },
      { type: "cache", name: "cache" },
      { type: "processor", name: "process" },
      { type: "filter", name: "filter", threshold: 0.7 },
      { type: "output", name: "output" },
    ],
    connections: [
      { fromName: "input", toName: "cache", type: "direct" },
      { fromName: "cache", toName: "process", type: "direct" },
      { fromName: "process", toName: "filter", type: "direct" },
      { fromName: "filter", toName: "output", type: "direct" },
      { fromName: "filter", toName: "cache", type: "reduce", priority: 0.5 },
    ],
    defaults: {
      maxCycles: 100,
      adaptiveRouting: true,
    },
  },

  {
    name: "team-coordination",
    description: "Multi-agent coordination workflow",
    steps: [
      { type: "input", name: "task-input" },
      { type: "router", name: "dispatcher" },
      { type: "agent", name: "agent-1", config: { role: "planner" } },
      { type: "agent", name: "agent-2", config: { role: "executor" } },
      { type: "processor", name: "collector", config: { count: 2, strategy: "merge" } },
      { type: "output", name: "result" },
    ],
    connections: [
      { fromName: "task-input", toName: "dispatcher", type: "direct" },
      { fromName: "dispatcher", toName: "agent-1", type: "direct" },
      { fromName: "dispatcher", toName: "agent-2", type: "direct" },
      { fromName: "agent-1", toName: "collector", type: "direct" },
      { fromName: "agent-2", toName: "collector", type: "direct" },
      { fromName: "collector", toName: "result", type: "direct" },
    ],
    defaults: {
      maxCycles: 200,
      adaptiveRouting: true,
    },
  },
];

// Classes and const are already exported inline
// No additional export block needed
