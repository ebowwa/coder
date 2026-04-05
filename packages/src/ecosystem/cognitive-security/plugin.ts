/**
 * Cognitive Security Plugin
 *
 * Self-registers all security hooks (SessionStart, PreToolUse, PostToolUse,
 * UserPromptSubmit, SessionEnd) through the HookManager.
 *
 * Usage:
 *   plugins.push(createCognitiveSecurityPlugin({ enabled: true }));
 */

import type { EcosystemPlugin, PluginContext } from "../plugin.js";
import type { HookEvent } from "../../schemas/index.js";
import {
  CognitiveSecurityHooks,
  type SecurityHookConfig,
} from "./hooks.js";

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

export function createCognitiveSecurityPlugin(
  config?: Partial<SecurityHookConfig>,
): EcosystemPlugin {
  return {
    name: "cognitive-security",
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
    },
  };
}
