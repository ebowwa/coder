/**
 * Prompt Evaluator - LLM-based hook evaluation
 *
 * Evaluates hook prompts by calling the Claude API to make decisions
 * about tool execution based on natural language rules.
 */

import type { HookInput, HookOutput } from "../../schemas/index.js";
import type { PromptEvaluator } from "./index.js";

/**
 * Options for creating a prompt evaluator
 */
export interface PromptEvaluatorOptions {
  /** Anthropic API key */
  apiKey: string;
  /** Model to use for evaluation (default: claude-haiku-4-5 for speed) */
  model?: string;
  /** Max tokens for response (default: 256) */
  maxTokens?: number;
  /** System prompt for the evaluator */
  systemPrompt?: string;
  /** Base URL for API (default: from ANTHROPIC_BASE_URL env or https://api.anthropic.com) */
  baseUrl?: string;
}

/**
 * Default system prompt for hook evaluation
 */
const DEFAULT_SYSTEM_PROMPT = `You are a hook evaluator for Coder. Your job is to evaluate tool usage against security and best-practice rules.

You MUST respond with ONLY a valid JSON object in this exact format:
{
  "decision": "allow" | "deny" | "block",
  "reason": "Optional explanation for the decision",
  "modified_input": { ... } // Optional: modified tool input if you want to change it
}

Rules:
- "allow": Let the tool execute normally
- "deny": Prevent execution and show the user the reason
- "block": Prevent execution silently (no message shown)
- Only modify input if absolutely necessary and you're certain of the correct format

Be concise and make quick decisions. Do not explain your reasoning in prose - only use the JSON format.`;

/**
 * Interpolate variables in a prompt template
 */
function interpolatePrompt(template: string, input: HookInput): string {
  let result = template;

  // Replace $ARGUMENTS with tool input as JSON
  if (input.tool_input) {
    result = result.replace(/\$ARGUMENTS/g, JSON.stringify(input.tool_input, null, 2));
  }

  // Replace $TOOL_NAME with tool name
  if (input.tool_name) {
    result = result.replace(/\$TOOL_NAME/g, input.tool_name);
  }

  // Replace $EVENT with event name
  result = result.replace(/\$EVENT/g, input.event);

  // Replace $SESSION_ID with session ID
  if (input.session_id) {
    result = result.replace(/\$SESSION_ID/g, input.session_id);
  }

  // Replace $TIMESTAMP with timestamp
  result = result.replace(/\$TIMESTAMP/g, String(input.timestamp));

  // Replace $ERROR with error message if present
  if (input.error) {
    result = result.replace(/\$ERROR/g, input.error);
  }

  // Replace $TOOL_RESULT with tool result if present
  if (input.tool_result) {
    const toolResult = input.tool_result as { content?: unknown };
    const resultStr = typeof toolResult.content === "string"
      ? toolResult.content
      : JSON.stringify(toolResult.content);
    result = result.replace(/\$TOOL_RESULT/g, resultStr);
  }

  return result;
}

/**
 * Parse the LLM response into a HookOutput
 * Supports multiple JSON formats:
 * 1. Standard: { "decision": "allow" | "deny" | "block", "reason": "..." }
 * 2. Standard format: { "continue": true/false, "hookSpecificOutput": {...} }
 */
function parseHookOutput(responseText: string): HookOutput {
  // Try to extract JSON from the response
  // The model might wrap it in markdown code blocks or add extra text

  let parsed: Record<string, unknown> | null = null;

  // First, try direct parse
  try {
    parsed = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    // Not valid JSON directly
  }

  // Try to extract JSON from markdown code block
  if (!parsed) {
    const jsonBlockMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch?.[1]) {
      try {
        parsed = JSON.parse(jsonBlockMatch[1].trim()) as Record<string, unknown>;
      } catch {
        // Invalid JSON in code block
      }
    }
  }

  // Try to find JSON object anywhere in the response
  if (!parsed) {
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      } catch {
        // Invalid JSON
      }
    }
  }

  if (!parsed) {
    // If we can't parse JSON, default to allow with a warning
    return {
      decision: "allow",
      reason: "Hook response could not be parsed as JSON, allowing by default",
    };
  }

  // Format 1: Standard { decision: "allow" | "deny" | "block" }
  if ("decision" in parsed) {
    return {
      decision: (parsed.decision as "allow" | "deny" | "block") || "allow",
      reason: parsed.reason as string | undefined,
      modified_input: parsed.modified_input as Record<string, unknown> | undefined,
    };
  }

  // Format 2: Standard { continue: true/false, hookSpecificOutput: {...} }
  if ("continue" in parsed) {
    const shouldContinue = Boolean(parsed.continue);
    if (shouldContinue) {
      return { decision: "allow" };
    }

    // Extract reason from hookSpecificOutput if present
    const hookOutput = parsed.hookSpecificOutput as Record<string, unknown> | undefined;
    const reason = hookOutput?.permissionDecisionReason as string | undefined;

    return {
      decision: "deny",
      reason: reason || "Hook denied execution",
    };
  }

  // Unknown format, default to allow
  return {
    decision: "allow",
    reason: "Unknown hook response format, allowing by default",
  };
}

/**
 * Make a non-streaming API call to Claude
 */
async function callClaudeAPI(
  apiKey: string,
  model: string,
  maxTokens: number,
  systemPrompt: string,
  userPrompt: string,
  baseUrl: string = "https://api.anthropic.com"
): Promise<string> {
  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  // Extract text from response
  const textContent = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text || "")
    .join("");

  return textContent;
}

/**
 * Create a prompt evaluator that uses the Claude API
 */
export function createPromptEvaluator(options: PromptEvaluatorOptions): PromptEvaluator {
  const {
    apiKey,
    model = "claude-haiku-4-5", // Use Haiku for fast evaluation
    maxTokens = 256,
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    baseUrl = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
  } = options;

  return async (promptTemplate: string, context: HookInput): Promise<HookOutput> => {
    // Interpolate variables in the prompt
    const userPrompt = interpolatePrompt(promptTemplate, context);

    try {
      // Call the API
      const responseText = await callClaudeAPI(
        apiKey,
        model,
        maxTokens,
        systemPrompt,
        userPrompt,
        baseUrl
      );

      if (!responseText) {
        return { decision: "allow" };
      }

      // Parse the response
      return parseHookOutput(responseText);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // On error, allow by default but log the issue
      console.error(`[PromptEvaluator] Error evaluating hook: ${errorMessage}`);
      return {
        decision: "allow",
        reason: `Hook evaluation failed: ${errorMessage}`,
      };
    }
  };
}

/**
 * Create a mock prompt evaluator for testing
 * Returns canned responses based on patterns in the prompt
 */
export function createMockPromptEvaluator(): PromptEvaluator {
  return async (promptTemplate: string, context: HookInput): Promise<HookOutput> => {
    // Simple mock logic for testing
    const prompt = promptTemplate.toLowerCase();
    const toolInput = context.tool_input;

    // If checking for MCP alternatives and we have a Bash command
    if (prompt.includes("mcp") && toolInput && "command" in toolInput) {
      const command = String(toolInput.command);

      // Check for common patterns that have MCP alternatives
      if (command.includes("git status")) {
        return {
          decision: "deny",
          reason: "Consider using the Git MCP tool instead of running git commands directly",
        };
      }
      if (command.includes("gh ")) {
        return {
          decision: "deny",
          reason: "Consider using the GitHub MCP tool instead of gh CLI",
        };
      }
    }

    // Default allow
    return { decision: "allow" };
  };
}
