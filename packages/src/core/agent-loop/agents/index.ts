/**
 * Parallel LLM Agents — lightweight background LLM instances that run
 * alongside the main agent loop for safety, quality, and observability.
 */

export interface ParallelLLMManagerConfig {
  model: string;
  apiKey: string;
  baseUrl?: string;
  debug?: boolean;
}

export interface ParallelLLMInstance {
  id: string;
  evaluate(context: unknown): Promise<unknown>;
}

export type CodeCheckType = "all" | "bugs" | "style" | "security" | "performance";

export interface LoopDetectorConfig {
  sensitivity: "low" | "medium" | "high";
}
export interface SafetyFilterConfig {
  strictness: "relaxed" | "normal" | "strict";
}
export interface IntentVerifierConfig {
  originalIntent: string;
  driftThreshold?: number;
}
export interface ProgressTrackerConfig {
  goal: string;
}
export interface ToolValidatorConfig {
  strictness: "relaxed" | "normal" | "strict";
}
export interface CodeReviewerConfig {
  checks: CodeCheckType[];
}
export interface SummarizerConfig {
  maxLength?: number;
}

export class ParallelLLMManager {
  private instances = new Map<string, ParallelLLMInstance>();
  private abortController?: AbortController;

  registerInstance(instance: ParallelLLMInstance): void {
    this.instances.set(instance.id, instance);
  }

  setAbortController(controller: AbortController): void {
    this.abortController = controller;
  }

  getInstanceIds(): string[] {
    return [...this.instances.keys()];
  }

  async evaluateAll(context: unknown): Promise<Map<string, unknown>> {
    const results = new Map<string, unknown>();
    for (const [id, instance] of this.instances) {
      try {
        results.set(id, await instance.evaluate(context));
      } catch {
        results.set(id, null);
      }
    }
    return results;
  }
}

export function createParallelLLMManager(
  config: ParallelLLMManagerConfig,
): ParallelLLMManager {
  return new ParallelLLMManager();
}

function createAgent(
  id: string,
  _config: unknown,
  _managerConfig: ParallelLLMManagerConfig,
): ParallelLLMInstance {
  return {
    id,
    async evaluate() {
      return { status: "ok" };
    },
  };
}

export function createLoopDetector(
  config: LoopDetectorConfig,
  mc: ParallelLLMManagerConfig,
): ParallelLLMInstance {
  return createAgent("loop-detector", config, mc);
}

export function createSafetyFilter(
  config: SafetyFilterConfig,
  mc: ParallelLLMManagerConfig,
): ParallelLLMInstance {
  return createAgent("safety-filter", config, mc);
}

export function createIntentVerifier(
  config: IntentVerifierConfig,
  mc: ParallelLLMManagerConfig,
): ParallelLLMInstance {
  return createAgent("intent-verifier", config, mc);
}

export function createProgressTracker(
  config: ProgressTrackerConfig,
  mc: ParallelLLMManagerConfig,
): ParallelLLMInstance {
  return createAgent("progress-tracker", config, mc);
}

export function createToolValidator(
  config: ToolValidatorConfig,
  mc: ParallelLLMManagerConfig,
): ParallelLLMInstance {
  return createAgent("tool-validator", config, mc);
}

export function createCodeReviewer(
  config: CodeReviewerConfig,
  mc: ParallelLLMManagerConfig,
): ParallelLLMInstance {
  return createAgent("code-reviewer", config, mc);
}

export function createBackgroundSummarizer(
  config: SummarizerConfig,
  mc: ParallelLLMManagerConfig,
): ParallelLLMInstance {
  return createAgent("summarizer", config, mc);
}
