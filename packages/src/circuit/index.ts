/**
 * Agent Workflow System
 *
 * A composable pipeline framework for building agent workflows.
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

// ============================================
// TYPES
// ============================================

export type {
  // Message types
  Message,
  MessagePriority,

  // Step types
  StepType,
  StepResult,
  StepProcessor,
  StepConfig,
  Step,

  // Connection types
  ConnectionType,
  ConnectionTransform,
  ConnectionConfig,
  Connection,

  // Workflow types
  WorkflowContext,
  WorkflowMetrics,
  WorkflowConfig,
  Workflow,
  WorkflowResult,

  // Loop types
  LoopType,
  LoopConfig,
  Loop,

  // Adaptive routing types
  AdaptiveRule,
  AdaptiveRoutingConfig,

  // Registry types
  WorkflowTemplate,
  WorkflowRegistryEntry,
} from "./types.js";

export { MessageSchema } from "./types.js";

// ============================================
// ENGINE
// ============================================

export {
  WorkflowEngine,
  // Message utilities
  generateMessageId,
  createMessage,
  cloneMessage,
  // Step utilities
  generateStepId,
  createStep,
  defaultProcessors,
  // Connection utilities
  createConnection,
  transmitConnection,
} from "./engine.js";

// ============================================
// AGENT STEPS
// ============================================

export type {
  LLMStepConfig,
  LLMTool,
  LLMResponsePayload,
  ToolStepConfig,
  CacheBackend,
  CacheStepConfig,
  TeammateStepConfig,
  TransformFn,
  AggregationStrategy,
  AggregatorStepConfig,
  ConditionFn,
  ConditionalStepConfig,
} from "./agent-nodes.js";

export {
  createLLMStep,
  createToolStep,
  createCacheStep,
  createTeammateStep,
  createTransformStep,
  createAggregatorStep,
  createConditionalStep,
} from "./agent-nodes.js";

// ============================================
// PERSISTENCE
// ============================================

export type {
  SerializedWorkflow,
  PersistenceConfig,
} from "./persistence.js";

export {
  WorkflowRegistry,
  WorkflowTemplateManager,
  builtinTemplates,
} from "./persistence.js";

// ============================================
// QUICK START HELPERS
// ============================================

import { WorkflowEngine, createMessage } from "./engine.js";
import { WorkflowRegistry, WorkflowTemplateManager, builtinTemplates } from "./persistence.js";
import { createLLMStep, createToolStep } from "./agent-nodes.js";
import type { Message, StepProcessor, StepConfig, StepType } from "./types.js";

/**
 * Quick setup for a simple workflow
 */
export function createSimpleWorkflow(
  id: string,
  flow: Array<{ id: string; type: StepType; name: string }>,
  processors: Map<string, StepProcessor>
): { engine: WorkflowEngine; workflowId: string } {
  const engine = new WorkflowEngine();

  // Create connections from sequential flow
  const connections = flow.slice(0, -1).map((step, i) => ({
    from: step.id,
    to: flow[i + 1]!.id,
    type: "direct" as const,
  }));

  engine.createWorkflow({
    id,
    name: id,
    steps: flow as StepConfig[],
    connections,
  }, processors);

  return { engine, workflowId: id };
}

/**
 * Quick setup for an LLM workflow
 */
export function createLLMWorkflow(
  id: string,
  options: {
    model?: string;
    systemPrompt?: string;
    tools?: Array<{ name: string; handler: (args: unknown) => Promise<unknown> }>;
  },
  client: { messages: { create: (params: unknown) => Promise<unknown> } }
): { engine: WorkflowEngine; workflowId: string } {
  const engine = new WorkflowEngine();

  const processors = new Map<string, StepProcessor>();

  // Import LLM step factory
  processors.set("llm", createLLMStep({
    model: options.model || "claude-sonnet-4-6",
    systemPrompt: options.systemPrompt,
    tools: options.tools?.map(t => ({
      name: t.name,
      description: `Tool: ${t.name}`,
      parameters: { type: "object" },
      handler: t.handler,
    })),
  }, client));

  // Add tool processors
  for (const tool of options.tools || []) {
    processors.set(`tool_${tool.name}`, createToolStep({
      name: tool.name,
      handler: tool.handler as (args: Record<string, unknown>) => Promise<unknown>,
    }));
  }

  const steps: StepConfig[] = [
    { id: "input", type: "input" as StepType, name: "Input" },
    { id: "llm", type: "agent" as StepType, name: "LLM" },
    { id: "output", type: "output" as StepType, name: "Output" },
  ];

  // Add tool steps
  for (const tool of options.tools || []) {
    steps.push({ id: `tool_${tool.name}`, type: "processor" as StepType, name: tool.name });
  }

  // Create connections
  const connections = [
    { from: "input", to: "llm", type: "direct" as const },
    { from: "llm", to: "output", type: "direct" as const },
  ];

  // Add tool connections
  for (const tool of options.tools || []) {
    connections.push({ from: "llm", to: `tool_${tool.name}`, type: "direct" as const });
    connections.push({ from: `tool_${tool.name}`, to: "llm", type: "direct" as const });
  }

  engine.createWorkflow({ id, name: id, steps, connections }, processors);

  return { engine, workflowId: id };
}

/**
 * Create a workflow from a built-in template
 */
export function createFromTemplate(
  templateName: string,
  processors: Map<string, StepProcessor>,
  options?: {
    id?: string;
    name?: string;
    storageDir?: string;
  }
): { engine: WorkflowEngine; registry: WorkflowRegistry; workflowId: string } | null {
  const templateManager = new WorkflowTemplateManager();

  // Register built-in templates
  for (const template of builtinTemplates) {
    templateManager.register(template);
  }

  const engine = new WorkflowEngine();
  const workflow = templateManager.createFromTemplate(
    templateName,
    options || {},
    processors,
    engine
  );

  if (!workflow) return null;

  const registry = new WorkflowRegistry(engine, {
    storageDir: options?.storageDir || "~/.claude/workflows",
  });

  return { engine, registry, workflowId: workflow.id };
}

/**
 * Execute a workflow with a simple prompt
 */
export async function executePrompt(
  engine: WorkflowEngine,
  workflowId: string,
  prompt: string,
  options?: {
    maxCycles?: number;
    timeout?: number;
  }
): Promise<{ output: string; messages: Message[] }> {
  const message = createMessage("prompt", { prompt }, "input");
  const result = await engine.execute(workflowId, [message], options);

  // Extract text output
  const output = result.outputs
    .filter(m => m.type === "llm.response" || m.type === "output")
    .map(m => typeof m.payload === "string"
      ? m.payload
      : (m.payload as { content?: string })?.content || JSON.stringify(m.payload))
    .join("\n");

  return { output, messages: result.outputs };
}
