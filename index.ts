/**
 * @ebowwa/claude-code-remake
 * A reimplementation of Claude Code CLI in TypeScript + Rust
 */

// Types
export * from "./src/types/index.js";

// Core
export { createMessageStream, calculateCost } from "./src/core/api-client.js";
export { agentLoop, formatCost, formatMetrics } from "./src/core/agent-loop.js";

// Tools
export { builtInTools, getToolByName } from "./src/tools/index.js";
export { ReadTool, WriteTool, EditTool, BashTool, GlobTool, GrepTool } from "./src/tools/index.js";

// MCP
export { MCPClientImpl, createMCPClients } from "./src/mcp/client.js";
// Alias for convenience
export { MCPClientImpl as MCPClient } from "./src/mcp/client.js";

// Hooks
export { HookManager, builtInHooks, hookEventDocs, hookExitCodes } from "./src/hooks/index.js";

// Skills
export {
  SkillManager,
  parseSkillFile,
  buildSkillPrompt,
  isSkillInvocation,
  getSkillArgs,
  builtInSkills,
} from "./src/skills/index.js";

// Teammates
export {
  TeammateManager,
  teammateTemplates,
  createTeammate,
  generateTeammateId,
} from "./src/teammates/index.js";
