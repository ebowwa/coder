/**
 * Zod Validation Schemas for Teammate System
 *
 * Provides runtime type validation and parsing for all teammate-related types.
 * Includes safe parse functions with proper error handling.
 */

import { z } from "zod";

// ============================================
// BASE SCHEMAS
// ============================================

/**
 * TeammateStatus validation
 */
export const TeammateStatusSchema = z.enum([
  "pending",
  "in_progress",
  "idle",
  "completed",
  "failed",
]);

export type TeammateStatus = z.infer<typeof TeammateStatusSchema>;

/**
 * Teammate validation
 */
export const TeammateSchema = z.object({
  teammateId: z.string().min(1, "teammateId cannot be empty"),
  name: z.string().min(1, "name cannot be empty"),
  teamName: z.string().min(1, "teamName cannot be empty"),
  color: z.string().min(1, "color cannot be empty"),
  prompt: z.string().min(1, "prompt cannot be empty"),
  planModeRequired: z.boolean(),
  paneId: z.string().optional(),
  insideTmux: z.boolean().optional(),
  status: TeammateStatusSchema,
});

export type Teammate = z.infer<typeof TeammateSchema>;

/**
 * TeammateStatus validation
 */
export const TeamStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "archived",
]);

export type TeamStatus = z.infer<typeof TeamStatusSchema>;

/**
 * CoordinationSettings validation
 */
export const CoordinationSettingsSchema = z.object({
  dependencyOrder: z.array(z.string()).default([]),
  communicationProtocol: z.enum(["broadcast", "direct", "mixed"]).default("broadcast"),
  taskAssignmentStrategy: z.enum(["manual", "auto", "priority"]).default("manual"),
});

export type CoordinationSettings = z.infer<typeof CoordinationSettingsSchema>;

/**
 * Team validation
 */
export const TeamSchema = z.object({
  name: z.string().min(1, "name cannot be empty"),
  description: z.string().min(1, "description cannot be empty"),
  teammates: z.array(TeammateSchema).min(1, "team must have at least one teammate"),
  taskListId: z.string().default(""),
  status: TeamStatusSchema.default("active"),
  coordination: CoordinationSettingsSchema.default({
    dependencyOrder: [],
    communicationProtocol: "broadcast",
    taskAssignmentStrategy: "manual",
  }),
});

export type Team = z.infer<typeof TeamSchema>;

/**
 * TeammateMessage validation
 */
export const TeammateMessageSchema = z.object({
  type: z.enum(["broadcast", "direct", "notification"]),
  from: z.string().min(1, "from cannot be empty"),
  to: z.string().optional(),
  content: z.string(),
  timestamp: z.number().int().positive(),
});

export type TeammateMessage = z.infer<typeof TeammateMessageSchema>;

/**
 * StoredMessage validation (includes persistence fields)
 */
export const StoredMessageSchema = TeammateMessageSchema.extend({
  id: z.string().min(1, "id cannot be empty"),
  teamName: z.string().min(1, "teamName cannot be empty"),
  createdAt: z.number().int().positive(),
  readAt: z.number().int().positive().optional(),
});

export type StoredMessage = z.infer<typeof StoredMessageSchema>;

/**
 * TeamConfig validation (for team creation)
 */
export const TeamConfigSchema = z.object({
  name: z.string().min(1, "name cannot be empty"),
  description: z.string().min(1, "description cannot be empty"),
  teammates: z.array(
    TeammateSchema.omit({ status: true })
  ).min(1, "team must have at least one teammate"),
  taskListId: z.string().optional(),
  coordination: CoordinationSettingsSchema.optional(),
});

export type TeamConfig = z.infer<typeof TeamConfigSchema>;

/**
 * TeammateConfig validation (for teammate creation)
 */
export const TeammateConfigSchema = TeammateSchema.partial({
  teammateId: true,
  status: true,
  paneId: true,
  insideTmux: true,
}).required({
  name: true,
  teamName: true,
  color: true,
  prompt: true,
  planModeRequired: true,
});

export type TeammateConfig = z.infer<typeof TeammateConfigSchema>;

// ============================================
// INBOX STATS SCHEMA
// ============================================

/**
 * InboxStats validation
 */
export const InboxStatsSchema = z.object({
  pending: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  oldestPending: z.number().int().positive().optional(),
  newestPending: z.number().int().positive().optional(),
});

export type InboxStats = z.infer<typeof InboxStatsSchema>;

// ============================================
// WAIT RESULT SCHEMA
// ============================================

/**
 * WaitResult validation (for waitForTeammatesToBecomeIdle)
 */
export const WaitResultSchema = z.object({
  success: z.boolean(),
  timedOut: z.boolean(),
  statuses: z.record(TeammateStatusSchema),
});

export type WaitResult = z.infer<typeof WaitResultSchema>;

// ============================================
// TEMPLATE SCHEMAS
// ============================================

/**
 * Template types for teammate creation
 */
export const TemplateTypeSchema = z.enum([
  "architect",
  "implementer",
  "reviewer",
  "tester",
]);

export type TemplateType = z.infer<typeof TemplateTypeSchema>;

/**
 * Valid color options for teammates
 */
export const TeammateColorSchema = z.enum([
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "brightBlack",
  "brightRed",
  "brightGreen",
  "brightYellow",
  "brightBlue",
  "brightMagenta",
  "brightCyan",
  "brightWhite",
  "gray",
  "orange",
  "purple",
  "pink",
]);

export type TeammateColor = z.infer<typeof TeammateColorSchema>;

// ============================================
// SAFE PARSE FUNCTIONS
// ============================================

/**
 * Validation error class
 */
export class ValidationError extends Error {
  public readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[]) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }

  /**
   * Format validation issues as a readable string
   */
  formatIssues(): string {
    return this.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `  - ${path}: ${issue.message}`;
      })
      .join("\n");
  }
}

/**
 * Safely parse a Teammate
 * @throws ValidationError if validation fails
 */
export function parseTeammate(data: unknown): Teammate {
  const result = TeammateSchema.safeParse(data);
  
  if (!result.success) {
    throw new ValidationError(
      "Invalid Teammate data",
      result.error.issues
    );
  }
  
  return result.data;
}

/**
 * Safely parse a Team
 * @throws ValidationError if validation fails
 */
export function parseTeam(data: unknown): Team {
  const result = TeamSchema.safeParse(data);
  
  if (!result.success) {
    throw new ValidationError(
      "Invalid Team data",
      result.error.issues
    );
  }
  
  return result.data;
}

/**
 * Safely parse a TeammateMessage
 * @throws ValidationError if validation fails
 */
export function parseTeammateMessage(data: unknown): TeammateMessage {
  const result = TeammateMessageSchema.safeParse(data);
  
  if (!result.success) {
    throw new ValidationError(
      "Invalid TeammateMessage data",
      result.error.issues
    );
  }
  
  return result.data;
}

/**
 * Safely parse a StoredMessage
 * @throws ValidationError if validation fails
 */
export function parseStoredMessage(data: unknown): StoredMessage {
  const result = StoredMessageSchema.safeParse(data);
  
  if (!result.success) {
    throw new ValidationError(
      "Invalid StoredMessage data",
      result.error.issues
    );
  }
  
  return result.data;
}

/**
 * Safely parse a TeamConfig
 * @throws ValidationError if validation fails
 */
export function parseTeamConfig(data: unknown): TeamConfig {
  const result = TeamConfigSchema.safeParse(data);
  
  if (!result.success) {
    throw new ValidationError(
      "Invalid TeamConfig data",
      result.error.issues
    );
  }
  
  return result.data;
}

/**
 * Safely parse a TeammateConfig
 * @throws ValidationError if validation fails
 */
export function parseTeammateConfig(data: unknown): TeammateConfig {
  const result = TeammateConfigSchema.safeParse(data);
  
  if (!result.success) {
    throw new ValidationError(
      "Invalid TeammateConfig data",
      result.error.issues
    );
  }
  
  return result.data;
}

/**
 * Safely parse InboxStats
 * @throws ValidationError if validation fails
 */
export function parseInboxStats(data: unknown): InboxStats {
  const result = InboxStatsSchema.safeParse(data);
  
  if (!result.success) {
    throw new ValidationError(
      "Invalid InboxStats data",
      result.error.issues
    );
  }
  
  return result.data;
}

/**
 * Safely parse WaitResult
 * @throws ValidationError if validation fails
 */
export function parseWaitResult(data: unknown): WaitResult {
  const result = WaitResultSchema.safeParse(data);
  
  if (!result.success) {
    throw new ValidationError(
      "Invalid WaitResult data",
      result.error.issues
    );
  }
  
  return result.data;
}

// ============================================
// SAFE PARSE WITH DEFAULTS
// ============================================

/**
 * Safely parse with validation error return (no throw)
 */
export function safeParseTeammate(data: unknown): {
  success: boolean;
  data?: Teammate;
  error?: string;
} {
  const result = TeammateSchema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      error: new ValidationError(
        "Invalid Teammate data",
        result.error.issues
      ).formatIssues(),
    };
  }
  
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Safely parse team with validation error return (no throw)
 */
export function safeParseTeam(data: unknown): {
  success: boolean;
  data?: Team;
  error?: string;
} {
  const result = TeamSchema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      error: new ValidationError(
        "Invalid Team data",
        result.error.issues
      ).formatIssues(),
    };
  }
  
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Safely parse message with validation error return (no throw)
 */
export function safeParseTeammateMessage(data: unknown): {
  success: boolean;
  data?: TeammateMessage;
  error?: string;
} {
  const result = TeammateMessageSchema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      error: new ValidationError(
        "Invalid TeammateMessage data",
        result.error.issues
      ).formatIssues(),
    };
  }
  
  return {
    success: true,
    data: result.data,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate a teammate ID format
 */
export function isValidTeammateId(id: string): boolean {
  // Format: teammate_<timestamp>_<random>
  const pattern = /^teammate_\d+_[a-z0-9]{6}$/;
  return pattern.test(id);
}

/**
 * Validate a message ID format
 */
export function isValidMessageId(id: string): boolean {
  // Format: msg_<timestamp>_<random>
  const pattern = /^msg_\d+_[a-z0-9]{6}$/;
  return pattern.test(id);
}

/**
 * Validate a team name (alphanumeric, hyphens, underscores)
 */
export function isValidTeamName(name: string): boolean {
  const pattern = /^[a-zA-Z0-9_-]+$/;
  return pattern.test(name) && name.length > 0 && name.length <= 50;
}

/**
 * Create a teammate with automatic validation
 */
export function createValidatedTeammate(
  config: TeammateConfig
): Teammate {
  const parsed = parseTeammateConfig(config);
  
  return {
    ...parsed,
    teammateId: parsed.teammateId || generateTeammateId(),
    status: parsed.status || "pending",
  };
}

/**
 * Create a team with automatic validation
 */
export function createValidatedTeam(config: TeamConfig): Team {
  const parsed = parseTeamConfig(config);
  
  return {
    ...parsed,
    status: "active",
    teammates: parsed.teammates.map((t) => ({
      ...t,
      teammateId: t.teammateId || generateTeammateId(),
      status: t.status || "pending",
    })),
    taskListId: parsed.taskListId || "",
    coordination: parsed.coordination || {
      dependencyOrder: [],
      communicationProtocol: "broadcast",
      taskAssignmentStrategy: "manual",
    },
  };
}

/**
 * Generate a valid teammate ID
 */
export function generateTeammateId(): string {
  return `teammate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a valid message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================
// BATCH VALIDATION
// ============================================

/**
 * Validate multiple teammates
 * @returns Object with valid teammates and array of errors
 */
export function validateTeammatesBatch(
  teammates: unknown[]
): {
  valid: Teammate[];
  invalid: Array<{ index: number; error: string }>;
} {
  const valid: Teammate[] = [];
  const invalid: Array<{ index: number; error: string }> = [];
  
  teammates.forEach((teammate, index) => {
    const result = safeParseTeammate(teammate);
    
    if (result.success && result.data) {
      valid.push(result.data);
    } else {
      invalid.push({
        index,
        error: result.error || "Unknown validation error",
      });
    }
  });
  
  return { valid, invalid };
}

/**
 * Validate multiple messages
 * @returns Object with valid messages and array of errors
 */
export function validateMessagesBatch(
  messages: unknown[]
): {
  valid: TeammateMessage[];
  invalid: Array<{ index: number; error: string }>;
} {
  const valid: TeammateMessage[] = [];
  const invalid: Array<{ index: number; error: string }> = [];
  
  messages.forEach((message, index) => {
    const result = safeParseTeammateMessage(message);
    
    if (result.success && result.data) {
      valid.push(result.data);
    } else {
      invalid.push({
        index,
        error: result.error || "Unknown validation error",
      });
    }
  });
  
  return { valid, invalid };
}

// ============================================
// EXPORTS
// ============================================

export {
  TeammateSchema,
  TeamSchema,
  TeammateMessageSchema,
  StoredMessageSchema,
  TeamConfigSchema,
  TeammateConfigSchema,
  CoordinationSettingsSchema,
  InboxStatsSchema,
  WaitResultSchema,
  TeammateStatusSchema,
  TeamStatusSchema,
  TemplateTypeSchema,
  TeammateColorSchema,
};

// Re-export types for convenience
export type {
  Teammate,
  Team,
  TeammateMessage,
  StoredMessage,
  TeamConfig,
  TeammateConfig,
  CoordinationSettings,
  InboxStats,
  WaitResult,
  TemplateType,
  TeammateColor,
};
