/**
 * Agent Workflow Types
 *
 * A composable pipeline system for building agent workflows.
 *
 * ============================================
 * NAMING & METAPHORS EXPLAINED
 * ============================================
 *
 * Originally inspired by neuroscience "circuits" - networks of interconnected
 * neurons that process signals along defined pathways. This file uses practical
 * workflow terminology but preserves the conceptual mapping:
 *
 * | Neuroscience    | Workflow Term    | What It Does                    |
 * |-----------------|------------------|--------------------------------|
 * | Circuit         | Workflow         | The entire pipeline             |
 * | Neuron          | Step             | A single processing unit        |
 * | Synapse         | Connection       | Link between steps              |
 * | Signal          | Message          | Data flowing through            |
 * | Weight          | Priority         | How much to prefer this path    |
 * | Plasticity      | Adaptive Routing | Adjust priorities based on use  |
 * | Feedback Loop   | Loop             | Iterate back to earlier step    |
 * | Memory Node     | Cache Step       | Store/recall data               |
 * | Gate Node       | Filter Step      | Conditionally pass messages     |
 *
 * Why these metaphors matter:
 * - "Feedback loop" = iteration/refinement cycles
 * - "Priority" = which path to take when multiple options exist
 * - "Adaptive routing" = prefer paths that work well (NOT ML training)
 *
 * ============================================
 */

import { z } from "zod";

// ============================================
// MESSAGE TYPES
// ============================================

/**
 * Message priority (0.0 to 1.0)
 *
 * Neuroscience: "signal strength" = how strongly a neuron fires
 * Workflow: priority = how important/urgent this message is
 */
export type MessagePriority = number;

/**
 * Message - data that flows through the workflow
 *
 * Neuroscience: "signal" = electrical/chemical message between neurons
 * Workflow: message = structured data passed between processing steps
 */
export interface Message<T = unknown> {
  /** Unique message ID */
  id: string;
  /** Message type for routing (e.g., "query", "response", "tool.result") */
  type: string;
  /** Payload data */
  payload: T;
  /** Priority (0.0 to 1.0) - higher = more important */
  priority: MessagePriority;
  /** Timestamp when message was created */
  timestamp: number;
  /** Source step ID */
  source: string;
  /** Target step ID (for direct routing) */
  target?: string;
  /** Message metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Message schema for validation
 */
export const MessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
  priority: z.number().min(0).max(1),
  timestamp: z.number(),
  source: z.string(),
  target: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// STEP TYPES
// ============================================

/**
 * Step types in the workflow
 *
 * Neuroscience: different types of neurons (sensory, motor, interneurons)
 * Workflow: different processing roles
 */
export type StepType =
  | "input"      // Entry point - receives external messages
  | "processor"  // Transforms/modifies messages
  | "router"     // Routes messages to multiple targets based on rules
  | "output"     // Final step - produces end result
  | "cache"      // Stores and retrieves messages (like memory in brain)
  | "filter"     // Conditionally passes messages (like neural gates)
  | "loop"       // Controls iteration/feedback cycles
  | "agent";     // LLM-powered processing step

/**
 * Step processing result
 */
export interface StepResult<T = unknown> {
  /** Output messages to propagate */
  messages: Message<T>[];
  /** Whether to continue processing */
  continue: boolean;
  /** Step state updates */
  state?: Record<string, unknown>;
  /** Debug information */
  debug?: string;
}

/**
 * Processing function for a step
 */
export type StepProcessor<TInput = unknown, TOutput = unknown> = (
  message: Message<TInput>,
  context: WorkflowContext
) => Promise<StepResult<TOutput>>;

/**
 * Base step configuration
 */
export interface StepConfig {
  /** Unique step ID */
  id: string;
  /** Step type */
  type: StepType;
  /** Human-readable name */
  name: string;
  /** Step description */
  description?: string;
  /** Initial priority (for routing preference) */
  priority?: number;
  /** How fast priority decays (0 = no decay) */
  decayRate?: number;
  /** How fast priority increases with use (0 = no increase) */
  boostRate?: number;
  /** Minimum priority threshold to activate (0 = always active) */
  threshold?: number;
  /** Maximum messages to process per cycle */
  maxMessages?: number;
  /** Custom configuration */
  config?: Record<string, unknown>;
}

/**
 * Workflow step (runtime state + config)
 */
export interface Step extends StepConfig {
  /** Processing function */
  processor: StepProcessor;
  /** Current priority (adapted based on usage) */
  currentPriority: number;
  /** Number of times activated */
  activations: number;
  /** Last activation timestamp */
  lastActivated?: number;
  /** Step state */
  state: Record<string, unknown>;
}

// ============================================
// CONNECTION TYPES
// ============================================

/**
 * Connection type - how messages are transformed between steps
 *
 * Neuroscience: "synapse type" = excitatory/inhibitory/modulatory
 * Workflow: connection type = how we transform/pass the message
 */
export type ConnectionType =
  | "direct"     // Pass through unchanged
  | "filter"     // Filter by message type/priority
  | "transform"  // Transform payload
  | "boost"      // Increase message priority
  | "reduce"     // Decrease message priority
  | "gate"       // Conditionally pass
  | "delay"      // Delay propagation
  | "batch";     // Batch multiple messages

/**
 * Connection transformation function
 */
export type ConnectionTransform<TInput = unknown, TOutput = unknown> = (
  message: Message<TInput>,
  context: WorkflowContext
) => Promise<Message<TOutput> | null>;

/**
 * Connection configuration
 */
export interface ConnectionConfig {
  /** Source step ID */
  from: string;
  /** Target step ID */
  to: string;
  /** Connection type */
  type: ConnectionType;
  /** Priority multiplier (how much to prefer this connection) */
  priority?: number;
  /** Delay in milliseconds */
  delay?: number;
  /** Filter predicate */
  filter?: (message: Message) => boolean;
  /** Custom transformer */
  transformer?: ConnectionTransform;
  /** Minimum message priority to propagate */
  minPriority?: number;
}

/**
 * Active connection (runtime state + config)
 */
export interface Connection extends ConnectionConfig {
  /** Current priority */
  currentPriority: number;
  /** Messages transmitted */
  transmissions: number;
  /** Last transmission timestamp */
  lastTransmitted?: number;
}

// ============================================
// WORKFLOW TYPES
// ============================================

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  /** Workflow ID */
  workflowId: string;
  /** Execution cycle number */
  cycle: number;
  /** Maximum cycles before termination */
  maxCycles: number;
  /** Start time */
  startTime: number;
  /** Global workflow state */
  state: Record<string, unknown>;
  /** Pending messages queue */
  pendingMessages: Message[];
  /** Completed messages */
  completedMessages: Message[];
  /** Metrics */
  metrics: WorkflowMetrics;
  /** Abort signal */
  abortSignal?: AbortSignal;
}

/**
 * Workflow metrics
 */
export interface WorkflowMetrics {
  /** Total messages processed */
  messagesProcessed: number;
  /** Total steps activated */
  stepActivations: number;
  /** Total connection transmissions */
  connectionTransmissions: number;
  /** Average message priority */
  avgPriority: number;
  /** Execution time in ms */
  executionTime: number;
  /** Cycles completed */
  cyclesCompleted: number;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  /** Unique workflow ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Steps in the workflow */
  steps: StepConfig[];
  /** Connections between steps */
  connections: ConnectionConfig[];
  /** Initial state */
  initialState?: Record<string, unknown>;
  /** Maximum execution cycles */
  maxCycles?: number;
  /** Cycle timeout in ms */
  cycleTimeout?: number;
  /** Enable adaptive routing (adjust priorities based on use) */
  adaptiveRouting?: boolean;
  /** How fast priorities boost with use */
  boostRate?: number;
  /** How fast priorities decay over time */
  decayRate?: number;
}

/**
 * Active workflow (runtime state + config)
 */
export interface Workflow extends WorkflowConfig {
  /** Steps map */
  stepsMap: Map<string, Step>;
  /** Outgoing connections by source step */
  outgoingConnections: Map<string, Connection[]>;
  /** Incoming connections by target step */
  incomingConnections: Map<string, Connection[]>;
  /** Current cycle */
  currentCycle: number;
  /** Workflow state */
  state: Record<string, unknown>;
  /** Status */
  status: "idle" | "running" | "paused" | "completed" | "error";
  /** Last execution result */
  lastResult?: WorkflowResult;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  /** Final output messages */
  outputs: Message[];
  /** Final workflow state */
  state: Record<string, unknown>;
  /** Execution metrics */
  metrics: WorkflowMetrics;
  /** Whether workflow completed successfully */
  success: boolean;
  /** Error if failed */
  error?: Error;
  /** Duration in ms */
  duration: number;
}

// ============================================
// LOOP TYPES (FEEDBACK)
// ============================================

/**
 * Loop type
 *
 * Neuroscience:
 *   - "positive feedback" = amplifies (runaway excitation)
 *   - "negative feedback" = stabilizes (homeostatic control)
 * Workflow:
 *   - positive = reinforcing (continue while making progress)
 *   - negative = stabilizing (stop when converged)
 */
export type LoopType =
  | "positive"   // Reinforcing (continue while improving)
  | "negative";  // Stabilizing (stop when converged)

/**
 * Loop configuration
 */
export interface LoopConfig {
  /** Loop ID */
  id: string;
  /** Loop type */
  type: LoopType;
  /** Entry step (where loop starts) */
  entry: string;
  /** Exit step (where loop checks for completion) */
  exit: string;
  /** Feedback target step (where to send looped message) */
  feedbackTarget: string;
  /** Maximum iterations */
  maxIterations?: number;
  /** Convergence threshold (when to stop looping) */
  convergenceThreshold?: number;
  /** Loop gain (how much to amplify/reduce priority) */
  gain?: number;
}

/**
 * Active loop (runtime state + config)
 */
export interface Loop extends LoopConfig {
  /** Current iteration */
  iteration: number;
  /** History of messages through the loop */
  history: Message[];
  /** Whether converged */
  converged: boolean;
}

// ============================================
// ADAPTIVE ROUTING
// ============================================

/**
 * Adaptive routing rule
 *
 * Neuroscience: "plasticity rule" = how synapses strengthen/weaken
 * Workflow: how we adjust connection priorities based on usage
 *
 * IMPORTANT: This is NOT machine learning!
 * These are simple heuristics:
 *   - hebbian: "Use it more = prefer it more" (simple usage counting)
 *   - reward: "Good outcome = prefer it more" (success-based)
 *   - homeostatic: "Keep activity balanced" (prevent overuse)
 */
export type AdaptiveRule =
  | "hebbian"      // Use more = prefer more (usage counting)
  | "reward"       // Success = prefer more (outcome-based)
  | "homeostatic"; // Balance usage across paths

/**
 * Adaptive routing configuration
 *
 * IMPORTANT: These are NOT ML hyperparameters!
 * They control simple priority adjustments:
 *   - boostRate: How much to increase priority when a path is used
 *   - decayRate: How much to decrease priority over time
 *   - minPriority/maxPriority: Bounds for priorities
 */
export interface AdaptiveRoutingConfig {
  /** Rule type */
  rule: AdaptiveRule;
  /** How fast to boost priority with use (0-1) */
  boostRate: number;
  /** How fast priority decays over time (0-1) */
  decayRate: number;
  /** Minimum priority */
  minPriority: number;
  /** Maximum priority */
  maxPriority: number;
  /** Message type that indicates success (for reward-based) */
  successMessageType?: string;
}

// ============================================
// REGISTRY TYPES
// ============================================

/**
 * Workflow template for reuse
 */
export interface WorkflowTemplate {
  /** Template name */
  name: string;
  /** Description */
  description?: string;
  /** Step configurations (names, resolved to IDs on instantiation) */
  steps: Omit<StepConfig, "id">[];
  /** Connection configurations (step names, resolved to IDs on instantiation) */
  connections: (Omit<ConnectionConfig, "from" | "to"> & { fromName: string; toName: string })[];
  /** Default configuration */
  defaults?: Partial<WorkflowConfig>;
}

/**
 * Workflow registry entry
 */
export interface WorkflowRegistryEntry {
  /** Workflow instance */
  workflow: Workflow;
  /** Created timestamp */
  createdAt: number;
  /** Last executed timestamp */
  lastExecuted?: number;
  /** Execution count */
  executions: number;
  /** Average execution time in ms */
  avgExecutionTime: number;
}
