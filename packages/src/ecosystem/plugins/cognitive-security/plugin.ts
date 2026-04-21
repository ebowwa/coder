/**
 * Cognitive Security Plugin
 *
 * Self-registers all security hooks (SessionStart, PreToolUse, PostToolUse,
 * UserPromptSubmit, SessionEnd) through the HookManager.
 *
 * Also registers bounds enforcement (code quality rules) when enableBounds
 * is not explicitly false. Bounds provide mechanical enforcement of
 * types-first, layer-rules, schema-gates, and context-walls patterns,
 * with self-healing signal extraction from failures.
 *
 * Usage:
 *   plugins.push(createCognitiveSecurityPlugin({ enabled: true }));
 */

import type { EcosystemPlugin, PluginContext } from "../types.js";
import type { HookEvent } from "../../../schemas/index.js";
import {
  CognitiveSecurityHooks,
  type SecurityHookConfig,
} from "./hooks.js";
import { BoundaryRegistry } from "./bounds/registry.js";
import { getAllBoundaries } from "./bounds/builtins/index.js";
import type { ErrorType, FailureSignal } from "./bounds/types.js";

const HOOK_EVENTS: HookEvent[] = [
  "SessionStart",
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "SessionEnd",
];

const EVENT_TO_METHOD: Record<string, keyof CognitiveSecurityHooks> = {
  SessionStart: "onSessionStart",
  PreToolUse: "onPreToolUse",
  PostToolUse: "onPostToolUse",
  UserPromptSubmit: "onUserPromptSubmit",
  SessionEnd: "onSessionEnd",
};

function classifyError(message: string): ErrorType {
  const lower = message.toLowerCase();
  if (lower.includes("parse") || lower.includes("json") || lower.includes("unexpected token")) return "parse";
  if (lower.includes("permission") || lower.includes("eacces") || lower.includes("forbidden")) return "permission";
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
  if (lower.includes("validation") || lower.includes("invalid") || lower.includes("required")) return "validation";
  return "runtime";
}

export function createCognitiveSecurityPlugin(
  config?: Partial<SecurityHookConfig>,
): EcosystemPlugin {
  return {
    name: "cognitive-security",
    description:
      "Intent preservation, alignment scoring, leak prevention, taint tracking, and code quality bounds enforcement",
    version: "1.0.0",
    defaultEnabled: true,
    register({ hookManager }) {
      const hooks = new CognitiveSecurityHooks(config);

      for (const event of HOOK_EVENTS) {
        const method = EVENT_TO_METHOD[event];
        if (method) {
          hookManager.registerHandler(
            event,
            (input) => (hooks[method] as Function).call(hooks, input),
            { enabled: config?.enabled ?? true },
          );
        }
      }

      if (config?.enableBounds !== false) {
        const registry = new BoundaryRegistry();
        registry.registerAll(getAllBoundaries(config?.strictBounds));

        hookManager.registerHandler(
          "PreToolUse",
          async (input) => {
            const result = await registry.checkAll({
              tool_name: input.tool_name || "unknown",
              tool_input: input.tool_input || {},
              workingDirectory: process.cwd(),
              sessionId: input.session_id,
              timestamp: Date.now(),
            });
            if (result.blocked || result.fatal) {
              return {
                decision: "deny" as const,
                reason: `[Bounds] ${result.violations.map((v) => v.reason).join("; ")}`,
              };
            }
            return { decision: "allow" as const };
          },
          { enabled: true },
        );

        hookManager.registerHandler(
          "PostToolUse",
          async (input) => {
            if (!input.tool_result_is_error) return { decision: "allow" as const };
            const errorMsg = input.error || String(input.tool_result || "");
            const signal: FailureSignal = {
              id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              timestamp: Date.now(),
              tool_name: input.tool_name || "unknown",
              tool_input: input.tool_input || {},
              error: errorMsg,
              errorType: classifyError(errorMsg),
              sessionId: input.session_id,
              processed: false,
            };
            registry.recordSignal(signal);
            return { decision: "allow" as const };
          },
          { enabled: true },
        );
      }
    },
  };
}
