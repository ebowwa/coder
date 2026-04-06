/**
 * Prompts Plugin
 *
 * Registers identity, principles, directives, and behavioral patterns
 * as a built-in skill (discoverable, overridable) and as a PrePrompt hook
 * that injects the base system prompt into every session.
 *
 * Usage:
 *   plugins.push(createPromptsPlugin());
 */

import type { EcosystemPlugin, PluginContext } from "../types.js";
import type { SkillFile } from "../../skills/index.js";
import { buildBaseSystemPrompt } from "./index.js";

export function createPromptsPlugin(): EcosystemPlugin {
  return {
    name: "prompts",
    description:
      "Core identity, principles, directives, and behavioral patterns injected as a built-in skill",
    version: "1.0.0",
    defaultEnabled: true,
    register({ skillManager }) {
      const skill: SkillFile = {
        path: "built-in://identity",
        name: "identity",
        description: "Core identity, principles, directives, and behavioral patterns",
        prompt: buildBaseSystemPrompt(),
        source: "built-in",
      };

      skillManager.register(skill);
    },
  };
}
