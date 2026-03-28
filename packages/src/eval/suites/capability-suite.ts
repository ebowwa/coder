import type { EvalSuite } from "../types.js";

import { fileOperationsReadTask } from "../tasks/file-operations.js";
import {
  toolSelectionReadTask,
  toolSelectionGlobTask,
} from "../tasks/tool-selection.js";
import { errorHandlingToolErrorTask } from "../tasks/error-handling.js";
import {
  multiStepReadEditTask,
  multiStepAtomicEditsTask
} from "../tasks/multi-step.js";
import { contextCompactionTask } from "../tasks/context-compaction.js";
import { importDetectionTask } from "../tasks/import-detection.js";

// New: Bash Execution tasks
import {
  bashExecutionEchoTask,
  bashExecutionListFilesTask,
  bashExecutionWorkingDirTask,
  bashExecutionErrorHandlingTask,
  bashExecutionChainedTask,
} from "../tasks/bash-execution.js";

// New: File Writing tasks
import {
  fileWritingCreateTask,
  fileWritingEditTask,
  fileWritingAddStylesTask,
} from "../tasks/file-writing.js";

// New: Code Review tasks
import {
  codeReviewStructureTask,
  codeReviewFunctionTask,
} from "../tasks/code-review.js";

// New: Multi-step Workflow tasks
import {
  multiStepCreateWebsiteTask,
  multiStepMultipleFixesTask,
} from "../tasks/multi-step-workflows.js";

/**
 * * Capability Suite: Core Coding Capabilities
 *
 * Tests fundamental coding capabilities:
 * - File operations
 * - Tool selection
 * - Error handling
 * - Multi-step workflows
 * - Context management
 * - Import detection
 */
export const coreCodingCapabilitySuite: EvalSuite = {
  id: "capability-core-coding",
  name: "Core Coding Capabilities",
  description:
    "Comprehensive suite testing fundamental coding agent capabilities across file operations, tool selection, error handling, multi-step workflows, context management, and import detection",
  type: "capability",
  tasks: [
    fileOperationsReadTask,
    toolSelectionReadTask,
    toolSelectionGlobTask,
    errorHandlingToolErrorTask,
    multiStepReadEditTask,
    multiStepAtomicEditsTask,
    contextCompactionTask,
    importDetectionTask,
  ],
  config: {
    trialsPerTask: 1,
    parallel: false,
    maxConcurrent: 1,
    timeoutMs: 120000,
    captureTraces: true,
    persistResults: true,
    outputDir: "./eval-results/capability",
  },
};

/**
 * * Capability Suite: Tool Mastery
 *
 * Tests advanced tool usage patterns
 */
export const toolMasteryCapabilitySuite: EvalSuite = {
  id: "capability-tool-mastery",
  name: "Tool Mastery",
  description:
    "Suite testing advanced tool usage including glob patterns, bash commands, and code search",
  type: "capability",
  tasks: [
    toolSelectionGlobTask,
    toolSelectionReadTask,
    importDetectionTask,
    // New: Bash execution
    bashExecutionEchoTask,
    bashExecutionListFilesTask,
  ],
  config: {
    trialsPerTask: 1,
    parallel: true,
    maxConcurrent: 3,
    timeoutMs: 60000,
    captureTraces: true,
    persistResults: true,
    outputDir: "./eval-results/capability",
  },
};

/**
 * * Capability Suite: Error Resilience
 *
 * Tests error handling and recovery capabilities
 */
export const errorResilienceCapabilitySuite: EvalSuite = {
  id: "capability-error-resilience",
  name: "Error Resilience",
  description:
    "Suite testing error handling, recovery, and graceful degradation capabilities",
  type: "capability",
  tasks: [errorHandlingToolErrorTask],
  config: {
    trialsPerTask: 1,
    parallel: false,
    maxConcurrent: 1,
    timeoutMs: 120000,
    captureTraces: true,
    persistResults: true,
    outputDir: "./eval-results/capability",
  },
};

/**
 * * Capability Suite: Bash Execution
 *
 * Tests shell command execution capabilities
 */
export const bashExecutionCapabilitySuite: EvalSuite = {
  id: "capability-bash-execution",
  name: "Bash Execution",
  description:
    "Suite testing bash command execution, working directory handling, and error recovery",
  type: "capability",
  tasks: [
    bashExecutionEchoTask,
    bashExecutionListFilesTask,
    bashExecutionWorkingDirTask,
    bashExecutionErrorHandlingTask,
    bashExecutionChainedTask,
  ],
  config: {
    trialsPerTask: 1,
    parallel: false,
    maxConcurrent: 1,
    timeoutMs: 90000,
    captureTraces: true,
    persistResults: true,
    outputDir: "./eval-results/capability",
  },
};

/**
 * * Capability Suite: File Writing
 *
 * Tests file creation and editing capabilities
 */
export const fileWritingCapabilitySuite: EvalSuite = {
  id: "capability-file-writing",
  name: "File Writing",
  description:
    "Suite testing file creation, editing, and CSS styling capabilities",
  type: "capability",
  tasks: [
    fileWritingCreateTask,
    fileWritingEditTask,
    fileWritingAddStylesTask,
  ],
  config: {
    trialsPerTask: 1,
    parallel: false,
    maxConcurrent: 1,
    timeoutMs: 90000,
    captureTraces: true,
    persistResults: true,
    outputDir: "./eval-results/capability",
  },
};

/**
 * * Capability Suite: Code Review
 *
 * Tests code analysis and review capabilities
 */
export const codeReviewCapabilitySuite: EvalSuite = {
  id: "capability-code-review",
  name: "Code Review",
  description:
    "Suite testing code structure analysis and function description capabilities",
  type: "capability",
  tasks: [
    codeReviewStructureTask,
    codeReviewFunctionTask,
  ],
  config: {
    trialsPerTask: 1,
    parallel: false,
    maxConcurrent: 1,
    timeoutMs: 90000,
    captureTraces: true,
    persistResults: true,
    outputDir: "./eval-results/capability",
  },
};

/**
 * * Capability Suite: Multi-step Workflows
 *
 * Tests complex multi-step workflows
 */
export const multiStepWorkflowsCapabilitySuite: EvalSuite = {
  id: "capability-multi-step-workflows",
  name: "Multi-step Workflows",
  description:
    "Suite testing complex workflows requiring multiple coordinated steps",
  type: "capability",
  tasks: [
    multiStepCreateWebsiteTask,
    multiStepMultipleFixesTask,
  ],
  config: {
    trialsPerTask: 1,
    parallel: false,
    maxConcurrent: 1,
    timeoutMs: 180000,
    captureTraces: true,
    persistResults: true,
    outputDir: "./eval-results/capability",
  },
};
