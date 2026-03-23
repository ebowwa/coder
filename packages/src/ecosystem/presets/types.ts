/**
 * Teammate Templates - Agent configuration templates for autonomous teammates
 *
 * A template defines everything needed to spawn a specialized agent:
 * - MCP servers (tools available to the agent)
 * - CLAUDE.md (identity, behavior, rules)
 * - Permissions (what the agent can do)
 * - Skills (specialized prompts)
 * - Environment (required secrets/vars)
 * - Loop behavior (turn limits, timeouts, compaction)
 *
 * These are used when spawning teammates in Ralph loops or fleet operations.
 */

import { z } from "zod";
import { MCPServerConfigSchema } from "../../schemas/mcp.zod.js";
import { PermissionModeSchema } from "../../schemas/permission-modes.zod.js";

// ============================================
// LOOP BEHAVIOR SCHEMA
// ============================================

/**
 * Compaction strategy determines when/how context is compacted
 */
export const CompactionStrategySchema = z.enum([
  "aggressive",    // Compact early and often
  "balanced",      // Default behavior
  "conservative",  // Compact only when necessary
  "minimal",       // Compact only on max_tokens
]);

/**
 * Error handling configuration
 */
export const ErrorHandlingSchema = z.object({
  maxRetries: z.number().int().nonnegative().default(3),
  retryDelayMs: z.number().int().positive().default(1000),
  backoffMultiplier: z.number().positive().default(2),
  onFailure: z.enum(["stop", "continue", "ask"]).default("ask"),
});

/**
 * Cost threshold configuration
 */
export const CostThresholdsSchema = z.object({
  warnAt: z.number().nonnegative().default(1.0),
  stopAt: z.number().nonnegative().default(10.0),
  enabled: z.boolean().default(true),
});

/**
 * Loop behavior settings that control how the agent loop runs
 */
export const LoopBehaviorSchema = z.object({
  // Turn limits
  maxTurns: z.number().int().nonnegative().default(0),  // 0 = unlimited
  warnAfterTurns: z.number().int().positive().default(50),

  // Token limits
  maxTokensPerTurn: z.number().int().positive().default(4096),
  contextWindowTarget: z.number().int().positive().default(180000),

  // Timeouts
  turnTimeoutMs: z.number().int().nonnegative().default(120000),  // 0 = no timeout
  sessionTimeoutMs: z.number().int().nonnegative().default(0),    // 0 = no timeout

  // Compaction
  compactionStrategy: CompactionStrategySchema.default("balanced"),
  compactionThreshold: z.number().min(0).max(1).default(0.75),
  autoCompact: z.boolean().default(true),

  // Thinking
  extendedThinking: z.boolean().default(false),
  thinkingEffort: z.enum(["low", "medium", "high", "max"]).default("medium"),
  interleavedThinking: z.boolean().default(false),

  // Error handling
  errorHandling: ErrorHandlingSchema.default({}),

  // Cost tracking
  costThresholds: CostThresholdsSchema.default({}),

  // Behavior flags
  verbose: z.boolean().default(false),
  parallelTools: z.boolean().default(true),
  detailedMetrics: z.boolean().default(true),
});

// ============================================
// TEAMMATE TEMPLATE SCHEMA
// ============================================

export const TeammateTemplateSchema = z.object({
  // Identity
  name: z.string(),
  description: z.string(),
  version: z.string().default("1.0.0"),

  // MCP Servers to load
  mcpServers: z.record(z.string(), MCPServerConfigSchema).optional(),

  // CLAUDE.md content (agent identity and behavior)
  claudeMd: z.string().optional(),

  // Permission settings
  permissions: z.object({
    defaultMode: PermissionModeSchema.optional(),
    allowedTools: z.array(z.string()).optional(),
    disallowedTools: z.array(z.string()).optional(),
  }).optional(),

  // Skills to load
  skills: z.array(z.string()).optional(),

  // Environment variables (references to Doppler secrets)
  env: z.record(z.string(), z.string()).optional(),

  // Loop behavior settings (determines how the agent loop runs)
  loopBehavior: LoopBehaviorSchema.optional(),

  // Metadata
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
});

export type TeammateTemplate = z.infer<typeof TeammateTemplateSchema>;

// Alias for backwards compatibility
export type TeammateTemplatePermissions = TeammateTemplate["permissions"];

// ============================================
// BUILT-IN TEMPLATES
// ============================================

export const TEAMMATE_TEMPLATES: Record<string, TeammateTemplate> = {
  // Default developer template
  developer: {
    name: "developer",
    description: "AI coding assistant for software development",
    version: "1.0.0",
    mcpServers: {
      hetzner: {
        type: "stdio",
        command: "bun",
        args: ["run", "/packages/src/products/mcp/mcp-hetzner/dist/index.js"],
      },
      git: {
        type: "stdio",
        command: "bun",
        args: ["run", "/packages/src/products/mcp/mcp-git/dist/index.js"],
      },
      "npm-publish": {
        type: "stdio",
        command: "bun",
        args: ["run", "/packages/src/products/mcp/mcp-npm-publish/dist/index.js"],
      },
    },
    claudeMd: `# Developer Agent

You are an AI coding assistant focused on software development.

## Focus Areas
- Reading, writing, and editing code
- Running commands and scripts
- Searching and exploring codebases
- Debugging and fixing issues

## Behavior
- Write minimal, focused changes
- Test before committing
- Follow existing patterns
- Keep solutions simple`,
    permissions: {
      defaultMode: "default",
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    },
    loopBehavior: {
      maxTurns: 0, // unlimited
      warnAfterTurns: 75,
      maxTokensPerTurn: 8192,
      contextWindowTarget: 180000,
      turnTimeoutMs: 120000,
      sessionTimeoutMs: 0,
      compactionStrategy: "balanced",
      compactionThreshold: 0.75,
      autoCompact: true,
      extendedThinking: false,
      thinkingEffort: "medium",
      interleavedThinking: false,
      errorHandling: {
        maxRetries: 3,
        retryDelayMs: 1000,
        backoffMultiplier: 2,
        onFailure: "ask",
      },
      costThresholds: {
        warnAt: 1.0,
        stopAt: 10.0,
        enabled: true,
      },
      verbose: false,
      parallelTools: true,
      detailedMetrics: true,
    },
    tags: ["development", "coding", "software"],
  },

  // Quant trading template
  quant: {
    name: "quant",
    description: "AI trading agent for prediction markets and quantitative analysis",
    version: "1.0.0",
    mcpServers: {
      "prediction-markets": {
        type: "stdio",
        command: "bun",
        args: ["run", "/packages/src/products/mcp/mcp-prediction-markets/dist/index.js"],
      },
      hetzner: {
        type: "stdio",
        command: "bun",
        args: ["run", "/packages/src/products/mcp/mcp-hetzner/dist/index.js"],
      },
    },
    claudeMd: `# Quant Trading Agent

You are an AI trading agent focused on prediction markets and quantitative analysis.

## Focus Areas
- Market analysis and research
- Position management
- Risk assessment
- Cost optimization
- Trade execution

## Behavior
- Always assess risk before actions
- Consider transaction costs
- Monitor positions continuously
- Document reasoning for trades

## Risk Rules
- Never risk more than 5% on single position
- Always set stop-losses
- Diversify across markets
- Track all trades in a log`,
    permissions: {
      defaultMode: "acceptEdits",
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    },
    loopBehavior: {
      maxTurns: 0, // unlimited for monitoring
      warnAfterTurns: 100,
      maxTokensPerTurn: 8192,
      contextWindowTarget: 160000,
      turnTimeoutMs: 90000,
      sessionTimeoutMs: 0,
      compactionStrategy: "balanced",
      compactionThreshold: 0.7,
      autoCompact: true,
      extendedThinking: true,
      thinkingEffort: "high",
      interleavedThinking: true,
      errorHandling: {
        maxRetries: 5,
        retryDelayMs: 500,
        backoffMultiplier: 1.5,
        onFailure: "continue", // Keep monitoring
      },
      costThresholds: {
        warnAt: 5.0,
        stopAt: 50.0,
        enabled: true,
      },
      verbose: true,
      parallelTools: true,
      detailedMetrics: true,
    },
    env: {
      KALSHI_API_KEY: "${KALSHI_API_KEY}",
      KALSHI_PRIVATE_KEY: "${KALSHI_PRIVATE_KEY}",
      POLYMARKET_PRIVATE_KEY: "${POLYMARKET_PRIVATE_KEY}",
    },
    tags: ["trading", "quant", "prediction-markets", "finance"],
  },

  // Robotics fleet template
  robotics: {
    name: "robotics",
    description: "AI fleet operator for robot coordination and control",
    version: "1.0.0",
    mcpServers: {
      hetzner: {
        type: "stdio",
        command: "bun",
        args: ["run", "/packages/src/products/mcp/mcp-hetzner/dist/index.js"],
      },
      tailscale: {
        type: "stdio",
        command: "bun",
        args: ["run", "/packages/src/products/mcp/mcp-tailscale/dist/index.js"],
      },
    },
    claudeMd: `# Robotics Fleet Agent

You are an AI fleet operator for coordinating and controlling robots.

## Focus Areas
- Fleet status monitoring
- Mission planning and execution
- Sensor data analysis
- Safety management
- Coordination between robots

## Behavior
- Safety is ALWAYS the top priority
- Coordinate fleet actions
- Handle failures gracefully
- Monitor battery and connectivity

## Safety Rules
- Never send robot into unknown area without confirmation
- Always check battery before missions
- Maintain communication with all robots
- Emergency stop available at all times

## Coordination Patterns
- Broadcast mission updates
- Share sensor data between robots
- Delegate tasks based on robot capabilities
- Handle robot failures with fallback plans`,
    permissions: {
      defaultMode: "default",
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    },
    loopBehavior: {
      maxTurns: 0, // unlimited
      warnAfterTurns: 50,
      maxTokensPerTurn: 8192,
      contextWindowTarget: 200000,
      turnTimeoutMs: 60000, // Faster response needed
      sessionTimeoutMs: 0,
      compactionStrategy: "conservative", // Preserve context for safety
      compactionThreshold: 0.8,
      autoCompact: false,
      extendedThinking: false,
      thinkingEffort: "medium",
      interleavedThinking: false,
      errorHandling: {
        maxRetries: 3,
        retryDelayMs: 200,
        backoffMultiplier: 1.5,
        onFailure: "ask", // Safety first
      },
      costThresholds: {
        warnAt: 2.0,
        stopAt: 15.0,
        enabled: true,
      },
      verbose: true,
      parallelTools: true,
      detailedMetrics: true,
    },
    tags: ["robotics", "fleet", "automation", "hardware"],
  },

  // Infrastructure template
  infrastructure: {
    name: "infrastructure",
    description: "AI infrastructure operator for VPS and cloud management",
    version: "1.0.0",
    mcpServers: {
      hetzner: {
        type: "stdio",
        command: "bun",
        args: ["run", "/packages/src/products/mcp/mcp-hetzner/dist/index.js"],
      },
    },
    claudeMd: `# Infrastructure Agent

You are an AI infrastructure operator for managing VPS and cloud resources.

## Focus Areas
- Server provisioning and management
- Network configuration
- Security hardening
- Monitoring and alerts
- Cost optimization

## Behavior
- Always verify before destructive actions
- Document all changes
- Monitor resource usage
- Maintain security best practices

## Safety Rules
- Never delete servers without confirmation
- Always backup before major changes
- Use SSH keys, never passwords
- Keep firewall rules minimal`,
    permissions: {
      defaultMode: "default",
      allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
    },
    loopBehavior: {
      maxTurns: 0,
      warnAfterTurns: 50,
      maxTokensPerTurn: 8192,
      contextWindowTarget: 180000,
      turnTimeoutMs: 120000,
      sessionTimeoutMs: 0,
      compactionStrategy: "balanced",
      compactionThreshold: 0.75,
      autoCompact: true,
      extendedThinking: true,
      thinkingEffort: "medium",
      interleavedThinking: false,
      errorHandling: {
        maxRetries: 3,
        retryDelayMs: 2000,
        backoffMultiplier: 2,
        onFailure: "ask",
      },
      costThresholds: {
        warnAt: 1.0,
        stopAt: 10.0,
        enabled: true,
      },
      verbose: true,
      parallelTools: false, // Sequential for infra changes
      detailedMetrics: true,
    },
    tags: ["infrastructure", "devops", "cloud", "vps"],
  },
};

// Template names for easy access
export const TEAMMATE_TEMPLATE_NAMES = Object.keys(TEAMMATE_TEMPLATES);

// Backwards compatibility aliases
export const BUILTIN_PRESETS = TEAMMATE_TEMPLATES;
export { TeammateTemplateSchema as PresetSchema };
export type { TeammateTemplate as Preset };

// Export loop behavior types
export type LoopBehavior = z.infer<typeof LoopBehaviorSchema>;
export type CompactionStrategy = z.infer<typeof CompactionStrategySchema>;
export type ErrorHandling = z.infer<typeof ErrorHandlingSchema>;
export type CostThresholds = z.infer<typeof CostThresholdsSchema>;

// Default loop behavior (used when not specified in template)
export const DEFAULT_LOOP_BEHAVIOR: LoopBehavior = {
  maxTurns: 0,
  warnAfterTurns: 50,
  maxTokensPerTurn: 4096,
  contextWindowTarget: 180000,
  turnTimeoutMs: 120000,
  sessionTimeoutMs: 0,
  compactionStrategy: "balanced",
  compactionThreshold: 0.75,
  autoCompact: true,
  extendedThinking: false,
  thinkingEffort: "medium",
  interleavedThinking: false,
  errorHandling: {
    maxRetries: 3,
    retryDelayMs: 1000,
    backoffMultiplier: 2,
    onFailure: "ask",
  },
  costThresholds: {
    warnAt: 1.0,
    stopAt: 10.0,
    enabled: true,
  },
  verbose: false,
  parallelTools: true,
  detailedMetrics: true,
};

/**
 * Get loop behavior for a template, with defaults
 */
export function getLoopBehavior(template: TeammateTemplate): LoopBehavior {
  return { ...DEFAULT_LOOP_BEHAVIOR, ...template.loopBehavior };
}
