/**
 * Zod Validation Schemas for MCP Integration Types
 * Based on MCP protocol version 2024-11-05
 */

import { z } from "zod";

// ============================================
// PROTOCOL TYPES
// ============================================

/**
 * MCP protocol version
 */
export const MCPProtocolVersionSchema = z.literal("2024-11-05");
export const MCP_PROTOCOL_VERSION = "2024-11-05";

/**
 * Transport types supported by MCP
 */
export const TransportTypeSchema = z.enum(["stdio", "sse", "http", "ws"]);
export const TRANSPORT_TYPES = ["stdio", "sse", "http", "ws"] as const;

// ============================================
// MCP METHOD CONSTANTS
// ============================================

export const MCP_TOOL_METHODS = {
  LIST: "tools/list",
  CALL: "tools/call",
} as const;

export const MCP_RESOURCE_METHODS = {
  LIST: "resources/list",
  READ: "resources/read",
  SUBSCRIBE: "resources/subscribe",
  UNSUBSCRIBE: "resources/unsubscribe",
  TEMPLATES: "resources/templates/list",
} as const;

export const MCP_PROMPT_METHODS = {
  LIST: "prompts/list",
  GET: "prompts/get",
} as const;

export const MCP_SAMPLING_METHODS = {
  CREATE_MESSAGE: "sampling/createMessage",
} as const;

export const MCPMethods = {
  tools: MCP_TOOL_METHODS,
  resources: MCP_RESOURCE_METHODS,
  prompts: MCP_PROMPT_METHODS,
  sampling: MCP_SAMPLING_METHODS,
} as const;

export const MCPConfigKeys = {
  SERVERS: "mcpServers",
  ALLOWED: "allowedMcpServers",
  DENIED: "deniedMcpServers",
  AUTO_APPROVE: "autoApproveMcpServers",
  ENTERPRISE_ALLOW: "enterpriseMcpServerAllowlist",
  ENTERPRISE_DENY: "enterpriseMcpServerDenylist",
} as const;

/**
 * Format an MCP tool name from server and tool components
 */
export function formatMCPToolName(server: string, tool: string): string {
  return `mcp__${server}__${tool}`;
}

// ============================================
// SERVER CONFIGURATION
// ============================================

/**
 * MCP server configuration schema
 */
export const MCPServerConfigSchema = z.object({
  type: TransportTypeSchema.optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().positive().optional(),
  disabled: z.boolean().optional(),
});

/**
 * Server management configuration
 */
export const MCPServerManagementSchema = z.object({
  mcpServers: z.record(z.string(), MCPServerConfigSchema),
  allowedMcpServers: z.array(z.string()).optional(),
  deniedMcpServers: z.array(z.string()).optional(),
  autoApproveMcpServers: z.array(z.string()).optional(),
  enterpriseMcpServerAllowlist: z.array(z.string()).optional(),
  enterpriseMcpServerDenylist: z.array(z.string()).optional(),
});

// ============================================
// JSON-RPC TYPES
// ============================================

/**
 * JSON-RPC 2.0 Error schema
 */
export const JSONRPCErrorSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown().optional(),
});

/**
 * JSON-RPC 2.0 Request schema
 */
export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.unknown().optional(),
});

/**
 * JSON-RPC 2.0 Response schema
 */
export const JSONRPCResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: JSONRPCErrorSchema.optional(),
});

/**
 * JSON-RPC 2.0 Notification schema
 */
export const JSONRPCNotificationSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.unknown().optional(),
});

// ============================================
// MCP TOOL TYPES
// ============================================

/**
 * MCP Property type definition for recursive schema
 */
export interface MCPPropertyType {
  type: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  items?: MCPPropertyType;
  properties?: Record<string, MCPPropertyType>;
  required?: string[];
}

/**
 * MCP Property definition schema (recursive)
 * Using z.lazy for self-referencing type
 */
export const MCPPropertySchema: z.ZodType<MCPPropertyType> = z.lazy(() =>
  z.object({
    type: z.string(),
    description: z.string().optional(),
    enum: z.array(z.string()).optional(),
    default: z.unknown().optional(),
    items: MCPPropertySchema.optional(),
    properties: z.record(z.string(), MCPPropertySchema).optional(),
    required: z.array(z.string()).optional(),
  })
);

/**
 * Type alias for MCP Property
 */
export type MCPProperty = z.infer<typeof MCPPropertySchema>;

/**
 * JSON Schema for MCP tool input
 */
export const MCPInputSchemaSchema = z.object({
  type: z.literal("object"),
  properties: z.record(z.string(), MCPPropertySchema),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
});

/**
 * MCP Tool definition schema
 */
/** MCP protocol tool annotations (from tools/list response) */
export const MCPToolAnnotationsSchema = z.object({
  readOnlyHint: z.boolean().optional(),
  destructiveHint: z.boolean().optional(),
  openWorldHint: z.boolean().optional(),
}).optional();

export const MCPToolSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  inputSchema: MCPInputSchemaSchema,
  /** MCP protocol annotations — declared by the server, not inferred */
  annotations: MCPToolAnnotationsSchema,
  /** Anthropic-specific metadata extensions (searchHint, capabilities, etc.) */
  _meta: z.record(z.string(), z.unknown()).optional(),
});

// ============================================
// MCP CLIENT STATE
// ============================================

/**
 * MCP Client state tracking schema
 */
export const MCPClientStateSchema = z.object({
  name: z.string(),
  config: MCPServerConfigSchema,
  connected: z.boolean(),
  tools: z.array(MCPToolSchema),
  lastError: z.string().optional(),
  connectedAt: z.number().optional(),
});

// ============================================
// MCP MESSAGE TYPES
// ============================================

/**
 * Tool list request schema
 */
export const ToolListRequestSchema = z.object({
  cursor: z.string().optional(),
});

/**
 * Tool list response schema
 */
export const ToolListResponseSchema = z.object({
  tools: z.array(MCPToolSchema),
  nextCursor: z.string().optional(),
});

/**
 * Tool call request schema
 */
export const ToolCallRequestSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).optional(),
});

/**
 * MCP Resource schema
 */
export const MCPResourceSchema = z.object({
  uri: z.string(),
  mimeType: z.string().optional(),
  text: z.string().optional(),
  blob: z.string().optional(),
});

/**
 * MCP Content block schema (discriminated union)
 */
export const MCPContentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image"), data: z.string(), mimeType: z.string() }),
  z.object({ type: z.literal("resource"), resource: MCPResourceSchema }),
]);

/**
 * Tool call response schema
 */
export const ToolCallResponseSchema = z.object({
  content: z.array(MCPContentSchema),
  isError: z.boolean().optional(),
});

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for TransportType
 */
export function isValidTransportType(value: unknown): value is z.infer<typeof TransportTypeSchema> {
  return TransportTypeSchema.safeParse(value).success;
}

/**
 * Type guard for MCPServerConfig
 */
export function isValidMCPServerConfig(config: unknown): config is z.infer<typeof MCPServerConfigSchema> {
  return MCPServerConfigSchema.safeParse(config).success;
}

/**
 * Type guard for JSONRPCRequest
 */
export function isValidJSONRPCRequest(request: unknown): request is z.infer<typeof JSONRPCRequestSchema> {
  return JSONRPCRequestSchema.safeParse(request).success;
}

/**
 * Type guard for JSONRPCResponse
 */
export function isValidJSONRPCResponse(response: unknown): response is z.infer<typeof JSONRPCResponseSchema> {
  return JSONRPCResponseSchema.safeParse(response).success;
}

/**
 * Type guard for MCPTool
 */
export function isValidMCPTool(tool: unknown): tool is z.infer<typeof MCPToolSchema> {
  return MCPToolSchema.safeParse(tool).success;
}

/**
 * Type guard for ToolCallRequest
 */
export function isValidToolCallRequest(request: unknown): request is z.infer<typeof ToolCallRequestSchema> {
  return ToolCallRequestSchema.safeParse(request).success;
}

/**
 * Type guard for ToolCallResponse
 */
export function isValidToolCallResponse(response: unknown): response is z.infer<typeof ToolCallResponseSchema> {
  return ToolCallResponseSchema.safeParse(response).success;
}

/**
 * Type guard to check if a string is an MCP tool name
 */
export function isMCPToolName(toolName: string): boolean {
  return toolName.startsWith("mcp__");
}

/**
 * Parse and validate MCP tool name into server and tool components
 */
export function parseMCPToolName(fullName: string): { server: string; tool: string } | null {
  const result = fullName.match(/^mcp__(.+)__(.+)$/);
  if (!result || !result[1] || !result[2]) return null;
  return { server: result[1], tool: result[2] };
}

/** @deprecated Use parseMCPToolName */
export const parseMCPToolNameSchema = parseMCPToolName;
