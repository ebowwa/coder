/**
 * Workflow Engine
 *
 * Core engine for executing agent workflows with:
 * - Message propagation through steps and connections
 * - Feedback loops (positive/negative)
 * - Adaptive routing (priority adjustment based on use)
 * - Metrics collection
 *
 * ============================================
 * TERMINOLOGY MAPPING (Neuroscience → Workflow)
 * ============================================
 *
 * | Old Term      | New Term        | Description                    |
 * |---------------|-----------------|--------------------------------|
 * | Circuit       | Workflow        | The entire pipeline            |
 * | Node          | Step            | Processing unit                |
 * | Synapse       | Connection      | Link between steps             |
 * | Signal        | Message         | Data flowing through           |
 * | Weight        | Priority        | Routing preference             |
 * | Plasticity    | AdaptiveRouting | Adjust priorities with use     |
 * | strength      | priority        | Message importance             |
 * | transmissions | passes          | Connection use count           |
 *
 * ============================================
 */

import type {
  Message,
  MessagePriority,
  Step,
  StepConfig,
  StepProcessor,
  StepResult,
  Connection,
  ConnectionConfig,
  Workflow,
  WorkflowConfig,
  WorkflowContext,
  WorkflowResult,
  WorkflowMetrics,
  Loop,
  LoopConfig,
  AdaptiveRoutingConfig,
} from "./types.js";

// ============================================
// MESSAGE UTILITIES
// ============================================

let messageCounter = 0;

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

/**
 * Create a new message
 *
 * Neuroscience: "action potential" = electrical signal traveling down axon
 * Workflow: message = structured data traveling through pipeline
 */
export function createMessage<T>(
  type: string,
  payload: T,
  source: string,
  options: {
    priority?: MessagePriority;
    target?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Message<T> {
  return {
    id: generateMessageId(),
    type,
    payload,
    priority: options.priority ?? 1.0,
    timestamp: Date.now(),
    source,
    target: options.target,
    metadata: options.metadata,
  };
}

/**
 * Clone a message with updated properties
 */
export function cloneMessage<T>(
  message: Message,
  updates: Partial<Message<T>>
): Message<T> {
  return {
    ...message,
    ...updates,
    id: generateMessageId(),
    timestamp: Date.now(),
  } as Message<T>;
}

// ============================================
// STEP UTILITIES
// ============================================

let stepCounter = 0;

/**
 * Generate a unique step ID
 */
export function generateStepId(): string {
  return `step_${Date.now()}_${++stepCounter}`;
}

/**
 * Create a step from configuration
 *
 * Neuroscience: "neuron" = cell that processes and transmits signals
 * Workflow: step = processing unit that transforms messages
 */
export function createStep(
  config: StepConfig,
  processor: StepProcessor
): Step {
  return {
    ...config,
    processor,
    currentPriority: config.priority ?? 1.0,
    activations: 0,
    state: {},
  };
}

/**
 * Default step processors for common types
 */
export const defaultProcessors: Record<string, StepProcessor> = {
  /**
   * Input step - passes messages through
   *
   * Neuroscience: "sensory neuron" = receives external stimuli
   * Workflow: input = entry point for external data
   */
  input: async (message, _context): Promise<StepResult> => ({
    messages: [message],
    continue: true,
  }),

  /**
   * Output step - collects final messages
   *
   * Neuroscience: "motor neuron" = produces output/action
   * Workflow: output = collects pipeline results
   */
  output: async (message, context): Promise<StepResult> => {
    context.completedMessages.push(message);
    return {
      messages: [],
      continue: true,
    };
  },

  /**
   * Router step - broadcasts to all outputs
   *
   * Neuroscience: "interneuron" = connects neurons, enables routing
   * Workflow: router = distributes messages to multiple targets
   */
  router: async (message, _context): Promise<StepResult> => ({
    messages: [message], // Will be multiplied by connections
    continue: true,
  }),

  /**
   * Filter step - only passes messages above threshold
   *
   * Neuroscience: "neural gate" = controls signal flow
   * Workflow: filter = conditionally passes messages
   */
  filter: async (message: Message, _context: WorkflowContext): Promise<StepResult> => {
    const threshold = 0.5; // Default threshold
    if (message.priority >= threshold) {
      return {
        messages: [message],
        continue: true,
      };
    }
    return {
      messages: [],
      continue: true,
      debug: `Message priority ${message.priority} below threshold ${threshold}`,
    };
  },

  /**
   * Cache step - stores and recalls messages
   *
   * Neuroscience: "memory circuit" = hippocampus stores/recalls patterns
   * Workflow: cache = stores and retrieves messages by key
   */
  cache: async (message: Message, context: WorkflowContext): Promise<StepResult> => {
    const stepId = "cache"; // Default step ID
    const cacheKey = `cache_${stepId}`;
    const cache = (context.state[cacheKey] as Message[]) || [];

    if (message.type === "recall") {
      // Return matching cached messages
      const query = message.metadata?.query as string;
      const matches = cache.filter((m) =>
        query ? m.type.includes(query) : true
      );
      return {
        messages: matches.map((m) => cloneMessage(m, { source: stepId })),
        continue: true,
      };
    }

    // Store message
    cache.push(message);
    context.state[cacheKey] = cache;

    return {
      messages: [message],
      continue: true,
      state: { [cacheKey]: cache },
    };
  },
};

// ============================================
// CONNECTION UTILITIES
// ============================================

/**
 * Create a connection from configuration
 *
 * Neuroscience: "synapse" = junction between neurons
 * Workflow: connection = link between processing steps
 */
export function createConnection(config: ConnectionConfig): Connection {
  return {
    ...config,
    currentPriority: config.priority ?? 1.0,
    transmissions: 0,
  };
}

/**
 * Process a message through a connection
 *
 * Neuroscience: "synaptic transmission" = signal crosses synapse
 * Workflow: connection passes/transforms message to next step
 */
export async function transmitConnection(
  connection: Connection,
  message: Message,
  context: WorkflowContext
): Promise<Message | null> {
  // Check minimum priority
  if (connection.minPriority !== undefined && message.priority < connection.minPriority) {
    return null;
  }

  // Apply filter
  if (connection.filter && !connection.filter(message)) {
    return null;
  }

  // Apply custom transformer
  if (connection.transformer) {
    const transformed = await connection.transformer(message, context);
    if (!transformed) return null;

    // Apply priority multiplier
    transformed.priority = Math.min(1.0, transformed.priority * connection.currentPriority);
    return transformed;
  }

  // Apply type-based transformation
  let outputMessage = cloneMessage(message, {
    source: connection.from,
    target: connection.to,
  });

  switch (connection.type) {
    case "direct":
      // Pass through unchanged
      break;

    case "boost":
      // Neuroscience: "excitatory synapse" = amplifies signal
      outputMessage.priority = Math.min(1.0, message.priority * 1.5 * connection.currentPriority);
      break;

    case "reduce":
      // Neuroscience: "inhibitory synapse" = reduces signal
      outputMessage.priority = message.priority * 0.5 * connection.currentPriority;
      break;

    case "gate":
      // Gate already handled by filter
      break;

    default:
      // Apply priority multiplier
      outputMessage.priority = message.priority * connection.currentPriority;
  }

  // Update connection stats
  connection.transmissions++;
  connection.lastTransmitted = Date.now();

  // Update metrics
  context.metrics.connectionTransmissions++;

  return outputMessage;
}

// ============================================
// WORKFLOW ENGINE
// ============================================

/**
 * Workflow Engine - executes workflows
 *
 * Neuroscience: "neural circuit" = network of interconnected neurons
 * Workflow: workflow = network of interconnected processing steps
 */
export class WorkflowEngine {
  private workflows = new Map<string, Workflow>();
  private loops = new Map<string, Loop>();
  private adaptiveConfig?: AdaptiveRoutingConfig;

  constructor(adaptiveConfig?: AdaptiveRoutingConfig) {
    this.adaptiveConfig = adaptiveConfig;
  }

  /**
   * Create a workflow from configuration
   */
  createWorkflow(config: WorkflowConfig, processors: Map<string, StepProcessor>): Workflow {
    const stepsMap = new Map<string, Step>();
    const outgoingConnections = new Map<string, Connection[]>();
    const incomingConnections = new Map<string, Connection[]>();

    // Create steps
    for (const stepConfig of config.steps) {
      const processor = processors.get(stepConfig.id) ||
        defaultProcessors[stepConfig.type] ||
        defaultProcessors.input;

      // Ensure processor is defined
      if (!processor) {
        throw new Error(`No processor found for step ${stepConfig.id} of type ${stepConfig.type}`);
      }

      const step = createStep(stepConfig, processor);
      stepsMap.set(stepConfig.id, step);
    }

    // Create connections
    for (const connectionConfig of config.connections) {
      const connection = createConnection(connectionConfig);

      // Outgoing
      const outgoing = outgoingConnections.get(connectionConfig.from) || [];
      outgoing.push(connection);
      outgoingConnections.set(connectionConfig.from, outgoing);

      // Incoming
      const incoming = incomingConnections.get(connectionConfig.to) || [];
      incoming.push(connection);
      incomingConnections.set(connectionConfig.to, incoming);
    }

    const workflow: Workflow = {
      ...config,
      stepsMap,
      outgoingConnections,
      incomingConnections,
      currentCycle: 0,
      state: config.initialState || {},
      status: "idle",
    };

    this.workflows.set(config.id, workflow);
    return workflow;
  }

  /**
   * Add a feedback loop to a workflow
   *
   * Neuroscience: "feedback loop" = output feeds back to input
   *   - positive feedback = amplifies (runaway excitation)
   *   - negative feedback = stabilizes (homeostatic control)
   * Workflow: loop = iteration cycle for refinement
   */
  addLoop(workflowId: string, config: LoopConfig): Loop {
    const loop: Loop = {
      ...config,
      iteration: 0,
      history: [],
      converged: false,
    };

    this.loops.set(`${workflowId}:${config.id}`, loop);
    return loop;
  }

  /**
   * Execute a workflow with input messages
   */
  async execute(
    workflowId: string,
    inputMessages: Message[],
    options: {
      maxCycles?: number;
      timeout?: number;
      abortSignal?: AbortSignal;
    } = {}
  ): Promise<WorkflowResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const maxCycles = options.maxCycles ?? workflow.maxCycles ?? 100;
    const startTime = Date.now();
    const timeout = options.timeout ?? 30000;

    // Initialize context
    const context: WorkflowContext = {
      workflowId,
      cycle: 0,
      maxCycles,
      startTime,
      state: { ...workflow.state },
      pendingMessages: [...inputMessages],
      completedMessages: [],
      metrics: {
        messagesProcessed: 0,
        stepActivations: 0,
        connectionTransmissions: 0,
        avgPriority: 0,
        executionTime: 0,
        cyclesCompleted: 0,
      },
      abortSignal: options.abortSignal,
    };

    workflow.status = "running";
    let totalPriority = 0;
    let priorityCount = 0;

    try {
      // Main execution loop
      while (context.pendingMessages.length > 0 && context.cycle < maxCycles) {
        // Check timeout
        if (Date.now() - startTime > timeout) {
          throw new Error(`Workflow timeout after ${timeout}ms`);
        }

        // Check abort
        if (options.abortSignal?.aborted) {
          throw new Error("Workflow aborted");
        }

        context.cycle++;
        workflow.currentCycle = context.cycle;

        // Process all pending messages
        const messagesToProcess = [...context.pendingMessages];
        context.pendingMessages = [];

        for (const message of messagesToProcess) {
          // Find target step
          const targetId = message.target || this.findTargetStep(workflow, message);
          if (!targetId) {
            context.completedMessages.push(message);
            continue;
          }

          const step = workflow.stepsMap.get(targetId);
          if (!step) {
            context.completedMessages.push(message);
            continue;
          }

          // Check activation threshold
          if (step.threshold !== undefined && message.priority < step.threshold) {
            continue;
          }

          // Process message through step
          const result = await step.processor(message, context);

          // Update step stats
          step.activations++;
          step.lastActivated = Date.now();
          context.metrics.stepActivations++;
          context.metrics.messagesProcessed++;

          // Track priority
          totalPriority += message.priority;
          priorityCount++;

          // Apply adaptive routing
          if (workflow.adaptiveRouting !== false) {
            this.applyAdaptiveRouting(step, message.priority);
          }

          // Update step state
          if (result.state) {
            step.state = { ...step.state, ...result.state };
          }

          // Propagate output messages
          for (const outputMessage of result.messages) {
            const outgoing = workflow.outgoingConnections.get(targetId) || [];

            for (const connection of outgoing) {
              const transmitted = await transmitConnection(connection, outputMessage, context);
              if (transmitted) {
                context.pendingMessages.push(transmitted);

                // Apply connection adaptive routing
                if (workflow.adaptiveRouting !== false) {
                  this.applyConnectionAdaptiveRouting(connection);
                }
              }
            }
          }

          // Check if we should stop
          if (!result.continue) {
            break;
          }
        }

        // Process feedback loops
        await this.processLoops(workflowId, context);

        context.metrics.cyclesCompleted = context.cycle;
      }

      // Calculate average priority
      context.metrics.avgPriority = priorityCount > 0
        ? totalPriority / priorityCount
        : 0;

      workflow.status = "completed";
      workflow.state = context.state;

      const result: WorkflowResult = {
        outputs: context.completedMessages,
        state: context.state,
        metrics: {
          ...context.metrics,
          executionTime: Date.now() - startTime,
        },
        success: true,
        duration: Date.now() - startTime,
      };

      workflow.lastResult = result;
      return result;

    } catch (error) {
      workflow.status = "error";

      return {
        outputs: context.completedMessages,
        state: context.state,
        metrics: {
          ...context.metrics,
          executionTime: Date.now() - startTime,
        },
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Find target step for a message based on type routing
   */
  private findTargetStep(workflow: Workflow, message: Message): string | undefined {
    // If message has explicit target, use it
    if (message.target) return message.target;

    // Find input steps that accept this message type
    for (const [id, step] of workflow.stepsMap) {
      if (step.type === "input" || step.type === "router") {
        // Check if there's a connection from this step for this message type
        const outgoing = workflow.outgoingConnections.get(id) || [];
        for (const connection of outgoing) {
          if (!connection.filter || connection.filter(message)) {
            return id;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Process feedback loops
   *
   * Neuroscience:
   *   - Positive feedback: amplifies, can lead to runaway (seizures, ecstasy)
   *   - Negative feedback: stabilizes, maintains homeostasis (body temp)
   * Workflow:
   *   - Positive: continue while improving (boost priority)
   *   - Negative: stop when converged (reduce priority)
   */
  private async processLoops(workflowId: string, context: WorkflowContext): Promise<void> {
    for (const [key, loop] of this.loops) {
      if (!key.startsWith(`${workflowId}:`)) continue;

      loop.iteration++;

      // Check max iterations
      if (loop.maxIterations && loop.iteration >= loop.maxIterations) {
        loop.converged = true;
        continue;
      }

      // Get messages from exit step
      const exitMessages = context.completedMessages.filter(
        (m) => m.source === loop.exit
      );

      if (exitMessages.length === 0) continue;

      // Calculate loop gain
      const avgPriority = exitMessages.reduce((sum, m) => sum + m.priority, 0) / exitMessages.length;
      const gain = loop.gain ?? 1.0;

      // Check convergence
      if (loop.convergenceThreshold !== undefined) {
        const lastPriority = loop.history[loop.history.length - 1]?.priority ?? 0;
        if (Math.abs(avgPriority - lastPriority) < loop.convergenceThreshold) {
          loop.converged = true;
          continue;
        }
      }

      // Create feedback message
      const feedbackMessage = createMessage(
        "feedback",
        { type: loop.type, iteration: loop.iteration },
        loop.exit,
        {
          // Positive feedback: boost priority
          // Negative feedback: reduce priority
          priority: loop.type === "positive"
            ? Math.min(1.0, avgPriority * gain)
            : Math.max(0.0, avgPriority * (1 - gain)),
          target: loop.feedbackTarget,
          metadata: { loopId: loop.id, iteration: loop.iteration },
        }
      );

      loop.history.push(feedbackMessage);
      context.pendingMessages.push(feedbackMessage);
    }
  }

  /**
   * Apply adaptive routing to a step
   *
   * Neuroscience: "Hebbian learning" = "neurons that fire together wire together"
   * Workflow: "use it more = prefer it more" = simple usage-based priority boost
   *
   * IMPORTANT: This is NOT machine learning!
   * It's just: step gets used → increase its priority slightly
   */
  private applyAdaptiveRouting(step: Step, messagePriority: number): void {
    if (!this.adaptiveConfig) return;

    const { boostRate, decayRate, minPriority, maxPriority } = this.adaptiveConfig;

    // Simple usage-based adjustment
    const delta = boostRate * messagePriority - decayRate;
    step.currentPriority = Math.max(
      minPriority,
      Math.min(maxPriority, step.currentPriority + delta)
    );
  }

  /**
   * Apply adaptive routing to a connection
   *
   * Neuroscience: "synaptic plasticity" = synapses strengthen with use
   * Workflow: connections used more often get higher priority
   *
   * IMPORTANT: This is NOT machine learning!
   * It's just: connection gets used → increase its priority slightly
   */
  private applyConnectionAdaptiveRouting(connection: Connection): void {
    if (!this.adaptiveConfig) return;

    const { boostRate, decayRate, minPriority, maxPriority } = this.adaptiveConfig;

    // Simple usage-based adjustment (slower than steps)
    const delta = boostRate * 0.1 - decayRate * 0.01;
    connection.currentPriority = Math.max(
      minPriority,
      Math.min(maxPriority, connection.currentPriority + delta)
    );
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  /**
   * List all workflows
   */
  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Delete a workflow
   */
  deleteWorkflow(id: string): boolean {
    // Remove associated loops
    for (const key of this.loops.keys()) {
      if (key.startsWith(`${id}:`)) {
        this.loops.delete(key);
      }
    }

    return this.workflows.delete(id);
  }

  /**
   * Reset workflow state
   */
  resetWorkflow(id: string): void {
    const workflow = this.workflows.get(id);
    if (!workflow) return;

    workflow.currentCycle = 0;
    workflow.state = workflow.initialState || {};
    workflow.status = "idle";
    workflow.lastResult = undefined;

    // Reset steps
    for (const step of workflow.stepsMap.values()) {
      step.state = {};
      step.activations = 0;
      step.lastActivated = undefined;
      step.currentPriority = step.priority ?? 1.0;
    }

    // Reset connections
    for (const connections of workflow.outgoingConnections.values()) {
      for (const connection of connections) {
        connection.transmissions = 0;
        connection.lastTransmitted = undefined;
        connection.currentPriority = connection.priority ?? 1.0;
      }
    }
  }
}

// Functions are already exported inline with 'export function'
// No additional export block needed
