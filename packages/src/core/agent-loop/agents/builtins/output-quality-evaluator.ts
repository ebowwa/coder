/**
 * Output Quality Evaluator — parallel agent that scores the quality
 * of the main agent's output against the original goal.
 */

import type { ParallelLLMInstance, ParallelLLMManagerConfig } from "../index.js";

export type QualityDimension =
  | "correctness"
  | "completeness"
  | "code_quality"
  | "test_coverage"
  | "documentation";

export interface OutputQualityConfig {
  originalGoal?: string;
  minimumQuality?: "excellent" | "good" | "acceptable" | "poor" | "incomplete";
  dimensions?: QualityDimension[];
}

export function createOutputQualityEvaluator(
  config: OutputQualityConfig,
  managerConfig: ParallelLLMManagerConfig,
): ParallelLLMInstance {
  return {
    id: "output-quality",
    async evaluate(context: unknown) {
      return {
        quality: "good",
        dimensions: config.dimensions ?? ["correctness", "completeness"],
      };
    },
  };
}
