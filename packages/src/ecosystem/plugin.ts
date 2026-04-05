/**
 * EcosystemPlugin — standard contract for self-registering modules.
 *
 * Modules implement this interface so setup.ts can load them in a loop
 * instead of hand-wiring each import and registration call.
 */

import type { HookManager } from "./hooks/index.js";
import type { SkillManager, SkillFile } from "./skills/index.js";
import type { ToolDefinition } from "../schemas/index.js";

export interface PluginContext {
  hookManager: HookManager;
  skillManager: SkillManager;
  tools: ToolDefinition[];
  config: Record<string, unknown>;
}

export interface EcosystemPlugin {
  readonly name: string;
  register(ctx: PluginContext): void | Promise<void>;
}
