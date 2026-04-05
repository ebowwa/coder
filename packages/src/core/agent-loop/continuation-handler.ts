/**
 * Continuation Handler - Unified continuation logic for turn-executor
 *
 * Deduplicates the two continuation check blocks that previously existed
 * in turn-executor.ts (lines 519-577 and 694-746).
 *
 * Handles:
 * - Pseudo-tool forcing (non-Anthropic models describing actions in text)
 * - Continuation injection (autonomous loops / Ralph-style)
 * - Building the continuation context from state + message
 */

import type { ToolUseBlock, ContentBlock, GitStatus } from "../../schemas/index.js";
import { getModel } from "../models.js";
import {
  hasPseudoToolBehavior,
  parsePseudoToolCalls,
  convertToToolUseBlocks,
} from "./pseudo-tool-parser.js";
import {
  checkContinuation,
  buildContinuationMessage,
  extractTextFromBlocks,
  type ContinuationConfig,
  type ContinuationContext,
} from "./continuation.js";
import type { LoopState } from "./types.js";
import type { TextBlock } from "../../schemas/index.js";

/**
 * Extended loop state with runtime properties used by continuation logic.
 * LoopState from types.ts is the base; this adds mutable control fields.
 */
interface ILoopState extends LoopState {
  consecutiveContinuations: number;
  recentToolNames?: string[];
  wasCompacted?: boolean;
  lastStuckPattern?: string;
  addUserMessage(content: TextBlock[]): void;
  totalCost: number;
}

/** Input for the continuation check */
export interface ContinuationCheckInput {
  state: ILoopState;
  messageContent: ContentBlock[];
  stopReason: string | null;
  model: string;
  continuationConfig: ContinuationConfig | undefined;
  workingDirectory: string;
  gitStatus: GitStatus | null;
}

/** Result of the continuation check */
export interface ContinuationCheckOutput {
  consecutiveContinuations: number;
  /** Synthetic tool_use blocks extracted from text, ready for execution */
  extractedToolBlocks?: ToolUseBlock[];
}

// Intra-turn extraction tracking -- resets each agent loop turn
const MAX_EXTRACTIONS_PER_TURN = 8;
let extractionCount = 0;
let extractedSignatures = new Map<string, number>();

/** Call at the start of each agent loop turn to reset extraction counters */
export function resetExtractionCounters(): void {
  extractionCount = 0;
  extractedSignatures.clear();
}

function toolCallSignature(block: ToolUseBlock): string {
  const input = block.input as Record<string, unknown>;
  if (block.name === "Bash") return `Bash:${input.command ?? ""}`;
  if (block.name === "Read") return `Read:${input.file_path ?? ""}`;
  return `${block.name}:${input.file_path ?? input.path ?? ""}`;
}

/**
 * Handle pseudo-tool forcing for non-Anthropic models.
 *
 * Phase 1: Try to extract and execute raw JSON / natural language tool calls
 *          from the model's text output. If successful, return them as synthetic
 *          tool_use blocks so the turn executor can run them through PATH 3.
 *
 * Phase 2 (fallback): If extraction fails but pseudo-tool behavior is detected,
 *          inject a continuation prompt forcing the model to use real tools.
 *
 * Guards against intra-turn loops:
 *   - Caps total extractions per turn at MAX_EXTRACTIONS_PER_TURN
 *   - Deduplicates identical tool calls (same command run 3x = skip)
 *   - Increments consecutiveContinuations so maxContinuations cap applies
 */
function handlePseudoToolForce(
  state: ILoopState,
  messageContent: ContentBlock[],
  model: string,
): ContinuationCheckOutput | null {
  const modelDef = getModel(model);
  const isNonAnthropic = modelDef?.provider !== "anthropic";

  if (!isNonAnthropic || !hasPseudoToolBehavior(messageContent, modelDef?.provider)) {
    return null;
  }

  // Check intra-turn extraction cap
  if (extractionCount >= MAX_EXTRACTIONS_PER_TURN) {
    console.log(
      `\x1b[33m[ToolForcer] Extraction cap reached (${extractionCount}/${MAX_EXTRACTIONS_PER_TURN}). Letting turn end.\x1b[0m`,
    );
    return null;
  }

  // Extract text from the response
  const textContent = messageContent
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map(b => b.text)
    .join("\n");

  // Try to parse concrete tool calls from the text
  const parseResult = parsePseudoToolCalls(textContent);

  if (parseResult.detected && parseResult.calls.length > 0) {
    const syntheticBlocks = convertToToolUseBlocks(parseResult.calls, 0.5);

    if (syntheticBlocks.length > 0) {
      // Filter out duplicate tool calls (same command/file seen 3+ times this turn)
      const dedupedBlocks = syntheticBlocks.filter((block: ToolUseBlock) => {
        const sig = toolCallSignature(block);
        const count = (extractedSignatures.get(sig) || 0) + 1;
        extractedSignatures.set(sig, count);
        if (count > 2) {
          console.log(
            `\x1b[33m[ToolForcer] Skipping duplicate: ${sig.slice(0, 80)} (seen ${count}x)\x1b[0m`,
          );
          return false;
        }
        return true;
      });

      if (dedupedBlocks.length > 0) {
        extractionCount++;
        state.consecutiveContinuations = (state.consecutiveContinuations ?? 0) + 1;

        const toolNames = dedupedBlocks.map((b: ToolUseBlock) => b.name).join(", ");
        console.log(
          `\x1b[32m[ToolForcer] Extracted ${dedupedBlocks.length} tool call(s) from text: ${toolNames} [${extractionCount}/${MAX_EXTRACTIONS_PER_TURN}]\x1b[0m`,
        );

        return {
          consecutiveContinuations: state.consecutiveContinuations,
          extractedToolBlocks: dedupedBlocks,
        };
      }

      // All blocks were duplicates -- let turn end
      console.log(
        `\x1b[33m[ToolForcer] All extracted calls are duplicates. Letting turn end.\x1b[0m`,
      );
      return null;
    }
  }

  // Fallback: detected pseudo-tool behavior but couldn't extract concrete calls
  extractionCount++;
  console.log(
    `\x1b[33m[ToolForcer] Non-Anthropic model described actions without tool calls. Injecting continuation. [${extractionCount}/${MAX_EXTRACTIONS_PER_TURN}]\x1b[0m`,
  );

  const toolForcerMessage =
    "You described changes in text but did NOT execute them. You MUST use tool calls " +
    "(Read, Edit, Write, Bash, etc.) to actually perform file operations. Re-read any " +
    "files you need, then make your edits using the Edit or Write tools. Do NOT describe " +
    "changes - execute them with tools.";

  state.addUserMessage([{ type: "text", text: toolForcerMessage }]);
  state.consecutiveContinuations = (state.consecutiveContinuations ?? 0) + 1;

  return {
    consecutiveContinuations: state.consecutiveContinuations,
  };
}

/**
 * Build a ContinuationContext from the current state and message.
 */
function buildContext(
  state: ILoopState,
  messageContent: ContentBlock[],
  toolsUsedCount: number,
  toolsUsedNames: string[],
  workingDirectory: string,
  gitStatus: GitStatus | null,
  continuationConfig: ContinuationConfig | undefined,
): ContinuationContext {
  return {
    lastOutput: extractTextFromBlocks(messageContent),
    lastBlocks: messageContent,
    toolsUsedCount,
    toolsUsedNames,
    recentToolNames: state.recentToolNames ?? [],
    turnNumber: state.turnNumber,
    consecutiveContinuations: state.consecutiveContinuations ?? 0,
    totalCost: state.totalCost,
    workingDirectory,
    gitStatus: gitStatus ? {
      hasUncommittedChanges: !gitStatus.clean,
      currentBranch: gitStatus.branch,
    } : null,
    wasCompacted: state.wasCompacted ?? false,
    persistentGoal: continuationConfig?.persistentGoal,
    stuckPattern: state.lastStuckPattern,
  };
}

/**
 * Check and handle continuation for autonomous loops.
 *
 * Returns null if no continuation was triggered.
 */
export function handleContinuation(input: ContinuationCheckInput): ContinuationCheckOutput | null {
  const { state, messageContent, model, continuationConfig, workingDirectory, gitStatus } = input;

  // Phase 1: Pseudo-tool forcing (non-Anthropic models)
  const pseudoToolResult = handlePseudoToolForce(state, messageContent, model);
  if (pseudoToolResult) {
    return pseudoToolResult;
  }

  // Phase 2: Regular continuation check
  if (!continuationConfig?.enabled) {
    return null;
  }

  const context = buildContext(
    state,
    messageContent,
    0, // No tools used in this path
    [], // No tool names
    workingDirectory,
    gitStatus,
    continuationConfig,
  );

  const continuationResult = checkContinuation(context, continuationConfig);

  if (!continuationResult.shouldContinue || !continuationResult.prompt) {
    return null;
  }

  // Inject continuation prompt
  console.log(
    `[Continuation] Injecting prompt: ${continuationResult.reason}` +
      (continuationResult.isStuck ? " (STUCK DETECTED)" : ""),
  );

  const lastOutput = extractTextFromBlocks(messageContent);
  const continuationMessage = buildContinuationMessage(
    continuationResult.prompt,
    {
      ...continuationResult,
      turnNumber: state.turnNumber,
      consecutiveContinuations: (state.consecutiveContinuations ?? 0) + 1,
      lastOutput,
      lastBlocks: messageContent,
      toolsUsedCount: 0,
      totalCost: state.totalCost,
      workingDirectory,
    },
  );

  state.addUserMessage(
    continuationMessage.content as import("../../schemas/index.js").TextBlock[],
  );
  state.consecutiveContinuations = (state.consecutiveContinuations ?? 0) + 1;

  return {
    consecutiveContinuations: state.consecutiveContinuations,
  };
}
