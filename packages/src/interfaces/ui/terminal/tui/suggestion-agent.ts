/**
 * SuggestionAgent - Cursor-style AI autocomplete for TUI
 *
 * Provides proactive AI-powered autocomplete suggestions based on
 * conversation context, user input, and common patterns.
 */

import type { Message as ApiMessage } from "../../../../schemas/index.js";

// ============================================
// TYPES
// ============================================

export interface SuggestionAgentOptions {
  apiKey: string;
  model: string;
  /** Minimum input length before triggering AI suggestions */
  minInputLength?: number;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Max tokens for AI response */
  maxTokens?: number;
  /** Context window size (number of messages) */
  contextSize?: number;
}

export interface SuggestionContext {
  /** Current user input */
  input: string;
  /** Recent conversation messages */
  messages: ApiMessage[];
  /** Available commands for autocomplete */
  commands?: string[];
  /** Command history */
  history?: string[];
  /** Working directory context */
  workingDirectory?: {
    /** Current directory path */
    path: string;
    /** Git branch if in a git repo */
    gitBranch?: string;
    /** Whether there are uncommitted changes */
    gitDirty?: boolean;
    /** Recently accessed files (last 5-10) */
    recentFiles?: string[];
  };
}

export interface SuggestionResult {
  /** The suggested completion text */
  text: string;
  /** Source of the suggestion (local or ai) */
  source: "local" | "ai";
  /** Confidence level (0-1) */
  confidence: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Default commands for autocomplete */
const DEFAULT_COMMANDS = [
  "/help",
  "/clear",
  "/exit",
  "/quit",
  "/compact",
  "/cost",
  "/status",
  "/model",
  "/checkpoint",
  "/checkpoints",
  "/restore",
  "/undo",
  "/redo",
  "/cps-status",
];

/** Common phrase suggestions for better UX */
const COMMON_PHRASES = [
  "read the file",
  "list all files",
  "show me",
  "what is",
  "how do i",
  "fix the",
  "create a",
  "delete the",
  "update the",
  "check if",
  "run the tests",
  "git status",
  "commit the changes",
  "explain this code",
  "refactor this",
  "add error handling",
  "write a test for",
  "optimize the",
  "debug the",
  "implement a",
];

/** System prompt for AI suggestion of next user message */
const SUGGESTION_SYSTEM_PROMPT = `You are an autocomplete system. Output ONLY the next prompt the user might type.

IMPORTANT: Do NOT think or reason. Output the suggestion IMMEDIATELY without any analysis.

Examples:
- User types "he" → Output: "help me debug this error"
- User types "rea" → Output: "read the main file and explain it"
- User types "fix" → Output: "fix the failing test in auth.test.ts"
- After code is written → Output: "run the tests and show me the results"
- New conversation → Output: "list all the files in this project"

Rules:
- Output the COMPLETE suggestion (user will Tab to accept all of it)
- NO thinking, NO reasoning, NO explanation
- Just the raw text the user would type
- Be specific and actionable
- If unsure, output nothing`;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert API message to display text
 */
function messageToText(msg: ApiMessage): string {
  if (typeof msg.content === "string") return msg.content;
  if (!Array.isArray(msg.content)) return "";
  return msg.content
    .map((b) => {
      if (b.type === "text") return b.text;
      if (b.type === "tool_use") return `[Tool: ${b.name}]`;
      if (b.type === "tool_result") return b.is_error ? "[Error]" : "[Result]";
      return "";
    })
    .join(" ");
}

/**
 * Get local suggestions (commands + history + common phrases)
 */
function getLocalSuggestions(
  input: string,
  commands: string[],
  history: string[]
): string[] {
  if (!input) return [];

  const suggestions: string[] = [];
  const inputLower = input.toLowerCase();

  // Command suggestions (exact prefix match)
  if (input.startsWith("/")) {
    const cmdMatches = commands.filter(
      (cmd) => cmd.startsWith(inputLower) && cmd !== inputLower
    );
    suggestions.push(...cmdMatches);
  } else {
    // Common phrase suggestions (prefix match with casing preservation)
    const phraseMatches = COMMON_PHRASES.filter(
      (phrase) => phrase.startsWith(inputLower) && phrase !== inputLower
    )
      .slice(0, 3)
      .map((phrase) => input + phrase.slice(inputLower.length));
    suggestions.push(...phraseMatches);
  }

  // History suggestions (case-insensitive prefix match, preserve original casing)
  const historyMatches = history
    .filter((h) => h.toLowerCase().startsWith(inputLower) && h.toLowerCase() !== inputLower)
    .slice(0, 5);
  suggestions.push(...historyMatches);

  // Dedupe while preserving order
  return [...new Set(suggestions)] as string[];
}

// ============================================
// SUGGESTION AGENT CLASS
// ============================================

export class SuggestionAgent {
  private apiKey: string;
  private model: string;
  private minInputLength: number;
  private debounceMs: number;
  private maxTokens: number;
  private contextSize: number;
  private commands: string[];

  private abortController: AbortController | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingResolve: ((result: SuggestionResult | null) => void) | null = null;

  constructor(options: SuggestionAgentOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.minInputLength = options.minInputLength ?? 3;
    this.debounceMs = options.debounceMs ?? 300;
    this.maxTokens = options.maxTokens ?? 50;
    this.contextSize = options.contextSize ?? 4;
    this.commands = DEFAULT_COMMANDS;
  }

  /**
   * Update configuration
   */
  updateConfig(options: Partial<SuggestionAgentOptions>): void {
    if (options.apiKey) this.apiKey = options.apiKey;
    if (options.model) this.model = options.model;
    if (options.minInputLength !== undefined) this.minInputLength = options.minInputLength;
    if (options.debounceMs !== undefined) this.debounceMs = options.debounceMs;
    if (options.maxTokens !== undefined) this.maxTokens = options.maxTokens;
    if (options.contextSize !== undefined) this.contextSize = options.contextSize;
  }

  /**
   * Set available commands
   */
  setCommands(commands: string[]): void {
    this.commands = [...DEFAULT_COMMANDS, ...commands];
  }

  /**
   * Cancel any pending request
   */
  cancel(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.pendingResolve) {
      this.pendingResolve(null);
      this.pendingResolve = null;
    }
  }

  /**
   * Get local suggestions immediately (no debounce, no API call)
   */
  getLocalSuggestions(context: SuggestionContext): SuggestionResult[] {
    const suggestions = getLocalSuggestions(
      context.input,
      context.commands ?? this.commands,
      context.history ?? []
    );

    return suggestions.map((text, index) => ({
      text,
      source: "local" as const,
      confidence: 1 - index * 0.1, // Decrease confidence for later suggestions
    }));
  }

  /**
   * Fetch AI-powered suggestion with debouncing
   * Returns a promise that resolves with the suggestion or null if cancelled
   */
  async fetchAISuggestion(
    context: SuggestionContext,
    skipDebounce = false
  ): Promise<SuggestionResult | null> {
    const { input, messages } = context;

    // Skip if input is too short or is a command
    if (input.length < this.minInputLength || input.startsWith("/")) {
      return null;
    }

    // Cancel any pending request
    this.cancel();

    return new Promise((resolve) => {
      this.pendingResolve = resolve;

      const doFetch = async () => {
        try {
          // Debug: Write to file
          const fs = await import("fs/promises");
          await fs.appendFile("/tmp/suggestion-debug.log", `[${new Date().toISOString()}] Starting fetch - apiKey: ${this.apiKey ? "set" : "MISSING"}, model: ${this.model}\n`);

          // Create new abort controller
          this.abortController = new AbortController();
          const signal = this.abortController.signal;

          // Build context from recent messages
          const recentMessages = messages.slice(-this.contextSize);
          const contextText = recentMessages
            .map((m) => {
              const role =
                m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System";
              return `${role}: ${messageToText(m).slice(0, 150)}`;
            })
            .join("\n");

          // Build rich context string
          const wd = context.workingDirectory;
          const richContext = wd ? [
            `Directory: ${wd.path}`,
            wd.gitBranch ? `Git: ${wd.gitBranch}${wd.gitDirty ? " (dirty)" : " (clean)"}` : null,
            wd.recentFiles?.length ? `Files: ${wd.recentFiles.slice(0, 5).join(", ")}` : null,
          ].filter(Boolean).join(" | ") : "";

          // Build a simple, direct prompt for Cursor-style suggestions
          const prompt = `Suggest what this user should type next.

${richContext ? `Location: ${richContext}` : ""}
${contextText ? `Context: ${contextText.slice(0, 300)}` : "New conversation."}

User typed: "${input}"

Output ONLY the full prompt they should send (like Cursor IDE autocomplete). No thinking.`;

          // Debug: Log the prompt
          await fs.appendFile("/tmp/suggestion-debug.log", `[${new Date().toISOString()}] Prompt:\n${prompt}\n\n---\n`);

          // Make direct API call to have fine-grained control over what we collect
          // We only want `content` tokens, NOT `reasoning_content` (thinking)
          const baseUrl = "https://api.z.ai/api/coding/paas/v4";
          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: this.model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: this.maxTokens,
              stream: true,
            }),
            signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            await fs.appendFile("/tmp/suggestion-debug.log", `[${new Date().toISOString()}] API Error: ${response.status} - ${errorText}\n`);
            resolve(null);
            return;
          }

          // Parse SSE stream - collect content tokens, skip reasoning_content (thinking)
          const reader = response.body?.getReader();
          if (!reader) {
            resolve(null);
            return;
          }

          const decoder = new TextDecoder();
          let completion = "";
          let reasoning = ""; // Collect reasoning to extract suggestions from if needed
          let tokenCount = 0;
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta;

                // Collect BOTH reasoning and content tokens
                // GLM-5 outputs thinking in reasoning_content, then actual answer in content
                // We prefer content (the actual answer) but fall back to extracting from reasoning
                if (delta?.content) {
                  tokenCount++;
                  completion += delta.content;
                  fs.appendFile("/tmp/suggestion-debug.log", `[${new Date().toISOString()}] Content token #${tokenCount}: "${delta.content}"\n`).catch(() => {});
                }
                if (delta?.reasoning_content) {
                  // Also accumulate reasoning in case we need to extract from it
                  reasoning += delta.reasoning_content;
                  fs.appendFile("/tmp/suggestion-debug.log", `[${new Date().toISOString()}] Reasoning: "${delta.reasoning_content}"\n`).catch(() => {});
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }

          completion = completion.trim();

          // Debug: Write result to file
          await fs.appendFile("/tmp/suggestion-debug.log", `[${new Date().toISOString()}] Completion: "${completion}", Reasoning: "${reasoning.slice(0, 200)}..."\n`);

          // If we have content, use it directly
          let suggestion = completion.trim();

          // If no content, extract from reasoning (GLM-5 thinking mode)
          if (!suggestion && reasoning.trim()) {
            await fs.appendFile("/tmp/suggestion-debug.log", `[${new Date().toISOString()}] Extracting from reasoning...\n`);

            // Strategy 1: Look for quoted suggestions like "hello" or "help me debug"
            const quotedMatch = reasoning.match(/"([a-zA-Z][^"]{3,60})"/);
            const quotedText = quotedMatch?.[1];
            if (quotedText && !quotedText.includes("user") && !quotedText.includes("typed")) {
              suggestion = quotedText;
            }

            // Strategy 2: Look for "suggest" followed by text
            if (!suggestion) {
              const suggestMatch = reasoning.match(/suggest(?:ing|ion)?:?\s*["']?([a-zA-Z][^"',.].{5,50})/i);
              const suggestText = suggestMatch?.[1];
              if (suggestText) {
                suggestion = suggestText.trim();
              }
            }

            // Strategy 3: Extract common action phrases
            if (!suggestion) {
              const actions = ["help me", "read the", "list all", "show me", "fix the", "check the", "run the", "write a", "create a", "explain"];
              const lowerReasoning = reasoning.toLowerCase();
              for (const action of actions) {
                const idx = lowerReasoning.indexOf(action);
                if (idx !== -1) {
                  // Extract from that point until punctuation
                  const slice = reasoning.slice(idx, idx + 60);
                  const match = slice.match(/^([^.!?\n]{5,50})/);
                  const matched = match?.[1];
                  if (matched) {
                    suggestion = matched.trim();
                    break;
                  }
                }
              }
            }

            // Strategy 4: Look for greetings
            if (!suggestion) {
              const greetings = ["hello", "hi there", "hey", "good morning", "good afternoon"];
              const lowerReasoning = reasoning.toLowerCase();
              for (const greeting of greetings) {
                if (lowerReasoning.includes(greeting)) {
                  suggestion = greeting;
                  break;
                }
              }
            }

            // Strategy 5: Look for "should" or "could" suggestions (GLM-5 pattern)
            // E.g., "The user should ask about..." -> extract "ask about..."
            if (!suggestion) {
              const shouldMatch = reasoning.match(/(?:should|could|might|want to)\s+([a-zA-Z][^.!?\n]{5,50})/i);
              const shouldText = shouldMatch?.[1];
              if (shouldText && !shouldText.toLowerCase().includes("user")) {
                suggestion = shouldText.trim();
              }
            }

            // Strategy 6: Extract last meaningful phrase from reasoning
            // GLM-5 often ends with what the user might want
            if (!suggestion) {
              const sentences = reasoning.split(/[.!?\n]/).filter(s => s.trim().length > 10);
              const lastSentence = sentences[sentences.length - 1];
              if (lastSentence) {
                // Look for a phrase that could be a prompt
                const phraseMatch = lastSentence.match(/([a-zA-Z][a-zA-Z\s]{5,40})/);
                const phraseText = phraseMatch?.[1];
                if (phraseText && !phraseText.toLowerCase().includes("user") && !phraseText.toLowerCase().includes("directory")) {
                  suggestion = phraseText.trim();
                }
              }
            }

            // Strategy 6.5: Look for "might want to" or "should" patterns
            if (!suggestion) {
              const wantMatch = reasoning.match(/(?:might want to|should|could|may)\s+(?:type|say|ask|write)\s*["']?([a-zA-Z][^"',.!?]{5,50})/i);
              const wantText = wantMatch?.[1];
              if (wantText && !wantText.toLowerCase().includes("user")) {
                suggestion = wantText.trim();
              }
            }

            // Strategy 6.6: Extract the actual suggestion if model describes it
            if (!suggestion) {
              // Look for "suggesting:" or "suggestion:" patterns
              const suggestPattern = reasoning.match(/(?:suggesting|suggestion|recommend):\s*["']?([a-zA-Z][^"',.!?\n]{5,60})/i);
              const suggestText = suggestPattern?.[1];
              if (suggestText && !suggestText.toLowerCase().includes("user")) {
                suggestion = suggestText.trim();
              }
            }

            // Strategy 7: Context-based fallback suggestions
            if (!suggestion) {
              // Based on input context, suggest common next actions
              const lowerInput = input.toLowerCase().trim();
              const trimmedInput = input.trim();

              if (lowerInput.startsWith("hey") || lowerInput.startsWith("hi") || lowerInput.startsWith("hello")) {
                suggestion = trimmedInput + " can you help me with this project?";
              } else if (lowerInput.includes("where")) {
                suggestion = trimmedInput + " is the main file?";
              } else if (lowerInput.includes("what")) {
                suggestion = trimmedInput + " does this code do?";
              } else if (lowerInput.includes("how")) {
                suggestion = trimmedInput + " do I run this?";
              } else if (lowerInput === "wym" || lowerInput.startsWith("wym ")) {
                // "what do you mean" shorthand
                suggestion = trimmedInput + " do you mean by that?";
              } else if (lowerInput.includes("mean")) {
                suggestion = trimmedInput + " by that?";
              } else if (lowerInput === "ok" || lowerInput === "k") {
                suggestion = trimmedInput + " thanks for the help!";
              } else if (lowerInput === "thx" || lowerInput === "ty") {
                suggestion = trimmedInput + " that worked!";
              } else if (lowerInput.includes("fix")) {
                suggestion = trimmedInput + " the error in this file";
              } else if (lowerInput.includes("add")) {
                suggestion = trimmedInput + " a new feature to handle this";
              } else if (lowerInput.includes("list")) {
                suggestion = trimmedInput + " all files in this directory";
              } else if (lowerInput.includes("show")) {
                suggestion = trimmedInput + " me the contents of the main file";
              } else if (lowerInput.includes("read")) {
                suggestion = trimmedInput + " the file and explain it";
              } else if (lowerInput.includes("run")) {
                suggestion = trimmedInput + " the tests";
              } else if (lowerInput.includes("explain")) {
                suggestion = trimmedInput + " what this code does";
              } else if (lowerInput.length < 5) {
                // Very short input - suggest common actions
                suggestion = trimmedInput + " help me with this project";
              }
            }
          }

          // Clean up
          suggestion = suggestion.trim();
          // Remove surrounding quotes if present
          if (suggestion.startsWith('"') && suggestion.endsWith('"')) {
            suggestion = suggestion.slice(1, -1);
          }

          // Validate
          if (!suggestion || suggestion.length < 2 || suggestion.length > 100 || signal.aborted) {
            await fs.appendFile("/tmp/suggestion-debug.log", `[${new Date().toISOString()}] Rejected: "${suggestion}"\n`);
            resolve(null);
            return;
          }

          console.log("[SuggestionAgent] AI suggestion:", suggestion);
          resolve({
            text: suggestion,
            source: "ai",
            confidence: 0.9,
          });
        } catch (err) {
          if ((err as Error).name === "AbortError") {
            resolve(null);
            return;
          }
          resolve(null);
        } finally {
          this.abortController = null;
          this.pendingResolve = null;
        }
      };

      if (skipDebounce) {
        doFetch();
      } else {
        this.debounceTimer = setTimeout(doFetch, this.debounceMs);
      }
    });
  }

  /**
   * Get combined suggestions (local + AI)
   * Local suggestions are returned immediately, AI suggestion is fetched async
   */
  async getSuggestions(
    context: SuggestionContext
  ): Promise<{
    local: SuggestionResult[];
    ai: Promise<SuggestionResult | null>;
  }> {
    // Get local suggestions immediately
    const local = this.getLocalSuggestions(context);

    // Start AI fetch (debounced)
    const ai = this.fetchAISuggestion(context);

    return { local, ai };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cancel();
  }
}

// ============================================
// SINGLETON INSTANCE (optional)
// ============================================

let defaultAgent: SuggestionAgent | null = null;

/**
 * Get or create the default suggestion agent
 */
export function getSuggestionAgent(options: SuggestionAgentOptions): SuggestionAgent {
  if (!defaultAgent) {
    defaultAgent = new SuggestionAgent(options);
  } else {
    defaultAgent.updateConfig(options);
  }
  return defaultAgent;
}

/**
 * Destroy the default suggestion agent
 */
export function destroySuggestionAgent(): void {
  if (defaultAgent) {
    defaultAgent.destroy();
    defaultAgent = null;
  }
}
