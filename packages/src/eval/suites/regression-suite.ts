/**
 * eval-suite-regression.ts
 * Regression Evaluation Suite
 *
 * Comprehensive suite for regression testing
 */

import type { EvalSuite, EvalSuiteConfig } from "../types.js";
import {
  regressionFileReadTask,
  regressionFileEditTask,
  regressionSessionPersistenceTask,
} from "../tasks/regression/basic-regression.js";

/**
 * Regression Suite: Core Functionality
 *
 * Verifies that basic functionality hasn't regressed after changes
 */
export const coreFunctionalityRegressionSuite: EvalSuite = {
  id: "regression-core-functionality",
  name: "Core Functionality Regression",
  description:
    "Suite verifying that core file operations, editing, and session persistence haven't regressed",
  type: "regression",
  tasks: [
    regressionFileReadTask,
    regressionFileEditTask,
    regressionSessionPersistenceTask,
  ],
  config: {
    trialsPerTask: 1,
    parallel: true,
    maxConcurrent: 3,
    timeoutMs: 60000,
    captureTraces: true,
    persistResults: true,
    outputDir: "./eval-results/regression",
  },
};
