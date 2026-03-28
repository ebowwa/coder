/**
 * Eval Tasks Index
 * Exports all eval tasks organized by category
 */

// File Operations
export { fileOperationsReadTask } from "./file-operations.js";

// Tool Selection
export {
  toolSelectionReadTask,
  toolSelectionGlobTask,
} from "./tool-selection.js";

// Error Handling
export {
  errorHandlingToolErrorTask,
  errorHandlingPermissionTask,
} from "./error-handling.js";

// Multi-step Workflows
export {
  multiStepReadEditTask,
  multiStepAtomicEditsTask,
} from "./multi-step.js";

export {
  multiStepCreateWebsiteTask,
  multiStepMultipleFixesTask,
} from "./multi-step-workflows.js";

// Code Review
export {
  codeReviewStructureTask,
  codeReviewFunctionTask,
} from "./code-review.js";

// Import Detection
export { importDetectionTask } from "./import-detection.js";

// Context Compaction
export { contextCompactionTask } from "./context-compaction.js";

// Bash Execution
export {
  bashExecutionEchoTask,
  bashExecutionListFilesTask,
  bashExecutionWorkingDirTask,
  bashExecutionErrorHandlingTask,
  bashExecutionChainedTask,
} from "./bash-execution.js";

// File Writing
export {
  fileWritingCreateTask,
  fileWritingEditTask,
  fileWritingAddStylesTask,
} from "./file-writing.js";

