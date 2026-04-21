/**
 * Tool Capabilities — reads capability metadata declared on tools.
 *
 * Tools declare their own capabilities via annotations.capabilities[].
 * No name-pattern matching. Same approach as Claude Code uses isMcp/annotations.
 *
 * To add a new capability:
 *   1. Add a field to ToolCapabilityMap
 *   2. Set annotations: { capabilities: ["your-cap"] } on the tool definition
 *   3. Done — no regex, no hardcoded names here
 */

import type { ToolDefinition } from "../schemas/index.js";

// ─── Capability map ───────────────────────────────────────────────────────────

export interface ToolCapabilityMap {
  /** Navigate, snapshot, screenshot, interact with a live browser */
  browser: string | null;
  /** Analyze images with a vision LLM */
  vision: string | null;
  /** Run tests + typecheck + git diff before commits */
  quality: string | null;
  /** Web search / research */
  search: string | null;

  /** Full index: capability name → first matching tool name */
  _index: Record<string, string>;
  /** All tools provided at build time */
  _all: ToolDefinition[];
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildToolCapabilities(tools: ToolDefinition[]): ToolCapabilityMap {
  const index: Record<string, string> = {};

  for (const tool of tools) {
    const caps = tool.annotations?.capabilities ?? [];
    for (const cap of caps) {
      // First tool that declares a capability wins
      if (!(cap in index)) {
        index[cap] = tool.name;
      }
    }
  }

  return {
    browser: index["browser"] ?? null,
    vision: index["vision"] ?? null,
    quality: index["quality"] ?? null,
    // "search" capability declared explicitly, or fall back to server name "exa"
    search: index["search"] ?? index["exa"] ?? null,
    _index: index,
    _all: tools,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function hasCapability(cap: ToolCapabilityMap, capability: string): boolean {
  return capability in cap._index;
}

export function toolFor(cap: ToolCapabilityMap, capability: string): string | null {
  return cap._index[capability] ?? null;
}

/** All tool names that declare a given capability */
export function toolsFor(cap: ToolCapabilityMap, capability: string): string[] {
  return cap._all
    .filter((t) => t.annotations?.capabilities?.includes(capability))
    .map((t) => t.name);
}
