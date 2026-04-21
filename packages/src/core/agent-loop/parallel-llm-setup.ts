/**
 * Parallel LLM Setup - Extract parallel agent registration from turn-executor
 *
 * Handles registering loop detector, safety filter, intent verifier,
 * progress tracker, tool validator, code reviewer, summarizer,
 * and output quality evaluator into a ParallelLLMManager.
 */

import {
  ParallelLLMManager,
  createParallelLLMManager,
  createLoopDetector,
  createSafetyFilter,
  createIntentVerifier,
  createProgressTracker,
  createToolValidator,
  createCodeReviewer,
  createBackgroundSummarizer,
  type ParallelLLMManagerConfig,
  type LoopDetectorConfig,
  type SafetyFilterConfig,
  type IntentVerifierConfig,
  type ProgressTrackerConfig,
  type ToolValidatorConfig,
  type CodeReviewerConfig,
  type SummarizerConfig,
} from "./agents/index.js";

 /** Parallel LLM configuration passed from TurnExecutorOptions */
export interface ParallelLLMSetupOptions {
  enabled: boolean;
  config?: Partial<ParallelLLMManagerConfig>;
  loopDetector?: LoopDetectorConfig;
  safetyFilter?: SafetyFilterConfig | boolean;
  intentVerifier?: {
    enabled: boolean;
    originalIntent: string;
    driftThreshold?: number;
  };
  progressTracker?: {
    enabled: boolean;
    goal: string;
  };
  toolValidator?: ToolValidatorConfig | boolean;
  codeReviewer?: CodeReviewerConfig | boolean;
  summarizer?: SummarizerConfig | boolean;
  outputQuality?: {
    enabled: boolean;
    originalGoal?: string;
    minimumQuality?: "excellent" | "good" | "acceptable" | "poor" | "incomplete";
    dimensions?: import("./agents/builtins/output-quality-evaluator.js").QualityDimension[];
  };
}

export interface ParallelLLMSetupResult {
  manager: ParallelLLMManager;
  abortController: AbortController;
}

/**
 * Set up parallel LLM manager with all configured agents.
 */
export async function setupParallelLLM(
  options: ParallelLLMSetupOptions,
  defaultApiKey: string,
  defaultModel: string,
): Promise<ParallelLLMSetupResult | null> {
  const apiKey = options.config?.apiKey || defaultApiKey;
  if (!apiKey) return null;

  const managerConfig: ParallelLLMManagerConfig = {
    model: options.config?.model || defaultModel,
    apiKey,
    baseUrl: options.config?.baseUrl,
    debug: process.env.DEBUG_PARALLEL_LLM === "1",
  };

  const manager = createParallelLLMManager(managerConfig);

  // Loop detector (always on by default)
  manager.registerInstance(
    createLoopDetector(options.loopDetector || { sensitivity: "medium" }, managerConfig),
  );

  // Safety filter
  if (options.safetyFilter) {
    const config = typeof options.safetyFilter === "boolean"
      ? { strictness: "normal" as const }
      : options.safetyFilter;
    manager.registerInstance(createSafetyFilter(config, managerConfig));
  }

  // Intent verifier
  if (options.intentVerifier?.enabled && options.intentVerifier.originalIntent) {
    manager.registerInstance(
      createIntentVerifier(
        {
          originalIntent: options.intentVerifier.originalIntent,
          driftThreshold: options.intentVerifier.driftThreshold,
        },
        managerConfig,
      ),
    );
  }

  // Progress tracker
  if (options.progressTracker?.enabled && options.progressTracker.goal) {
    manager.registerInstance(
      createProgressTracker({ goal: options.progressTracker.goal }, managerConfig),
    );
  }

  // Tool validator
  if (options.toolValidator) {
    const config = typeof options.toolValidator === "boolean"
      ? { strictness: "normal" as const }
      : options.toolValidator;
    manager.registerInstance(createToolValidator(config, managerConfig));
  }

  // Code reviewer
  if (options.codeReviewer) {
    const config = typeof options.codeReviewer === "boolean"
      ? { checks: ["all"] as import("./agents/index.js").CodeCheckType[] }
      : options.codeReviewer;
    manager.registerInstance(createCodeReviewer(config, managerConfig));
  }

  // Background summarizer
  if (options.summarizer) {
    const config = typeof options.summarizer === "boolean" ? {} : options.summarizer;
    manager.registerInstance(createBackgroundSummarizer(config, managerConfig));
  }

  // Output quality evaluator
  if (options.outputQuality?.enabled) {
    const { createOutputQualityEvaluator } = await import("./agents/builtins/output-quality-evaluator.js");
    manager.registerInstance(
      createOutputQualityEvaluator(
        {
          originalGoal: options.outputQuality.originalGoal,
          minimumQuality: options.outputQuality.minimumQuality,
          dimensions: options.outputQuality.dimensions,
        },
        managerConfig,
      ),
    );
  }

  const abortController = new AbortController();
  manager.setAbortController(abortController);

  const instanceIds = manager.getInstanceIds();
  console.log(
    `\x1b[90m[ParallelLLM] Enabled with: ${instanceIds.join(", ")} (model: ${managerConfig.model})\x1b[0m`,
  );

  return { manager, abortController };
}
