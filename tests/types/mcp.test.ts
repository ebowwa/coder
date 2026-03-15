/**
 * Unit tests for MCP types
 */

import { describe, test, expect } from "bun:test";
import {
  type TransportType,
  type MCPServerConfig,
  type MCPServerSettings,
  type MCPServerManagement,
  type JSONRPCRequest,
  type JSONRPCResponse,
  type JSONRPCError,
  type JSONRPCNotification,
  type MCPTool,
  type MCPInputSchema,
  type MCPProperty,
  type MCPClientState,
  type ToolListRequest,
  type ToolListResponse,
  type ToolCallRequest,
  type ToolCallResponse,
  type MCPContent,
  type MCPResource,
  MCP_PROTOCOL_VERSION,
  TRANSPORT_TYPES,
  MCP_TOOL_METHODS,
  MCP_RESOURCE_METHODS,
  MCP_PROMPT_METHODS,
  MCP_SAMPLING_METHODS,
  MCPMethods,
  MCPConfigKeys,
  formatMCPToolName,
  parseMCPToolName,
  isMCPToolName,
} from "../../packages/src/schemas/index.js";

// ============================================
// PROTOCOL VERSION TESTS
// ============================================

describe("MCP Protocol Version", () => {
  test("protocol version is defined", () => {
    expect(MCP_PROTOCOL_VERSION).toBe("2024-11-05");
  });

  test("protocol version is a string", () => {
    expect(typeof MCP_PROTOCOL_VERSION).toBe("string");
  });
});

// ============================================
// TRANSPORT TYPE TESTS
// ============================================

describe("TransportType", () => {
  test("accepts all valid transport types", () => {
    const types: TransportType[] = ["stdio", "sse", "http", "ws"];
    expect(types.length).toBe(4);
  });

  test("TRANSPORT_TYPES contains all types", () => {
    expect(TRANSPORT_TYPES).toContain("stdio");
    expect(TRANSPORT_TYPES).toContain("sse");
    expect(TRANSPORT_TYPES).toContain("http");
    expect(TRANSPORT_TYPES).toContain("ws");
    expect(TRANSPORT_TYPES.length).toBe(4);
  });
});

// ============================================
// MCP METHODS TESTS
// ============================================

describe("MCP Methods", () => {
  test("MCP_TOOL_METHODS structure", () => {
    expect(MCP_TOOL_METHODS.LIST).toBe("tools/list");
    expect(MCP_TOOL_METHODS.CALL).toBe("tools/call");
  });

  test("MCP_RESOURCE_METHODS structure", () => {
    expect(MCP_RESOURCE_METHODS.LIST).toBe("resources/list");
    expect(MCP_RESOURCE_METHODS.READ).toBe("resources/read");
  });

  test("MCP_PROMPT_METHODS structure", () => {
    expect(MCP_PROMPT_METHODS.LIST).toBe("prompts/list");
    expect(MCP_PROMPT_METHODS.GET).toBe("prompts/get");
  });

  test("MCP_SAMPLING_METHODS structure", () => {
    expect(MCP_SAMPLING_METHODS.CREATE_MESSAGE).toBe("sampling/createMessage");
  });

  test("MCPMethods aggregate object", () => {
    expect(MCPMethods.tools).toBe(MCP_TOOL_METHODS);
    expect(MCPMethods.resources).toBe(MCP_RESOURCE_METHODS);
    expect(MCPMethods.prompts).toBe(MCP_PROMPT_METHODS);
    expect(MCPMethods.sampling).toBe(MCP_SAMPLING_METHODS);
  });
});

// ============================================
// SERVER CONFIG TESTS
// ============================================

describe("MCPServerConfig", () => {
  test("minimal stdio config", () => {
    const config: MCPServerConfig = {
      command: "node",
      args: ["server.js"],
    };
    expect(config.command).toBe("node");
    expect(config.args).toEqual(["server.js"]);
  });

  test("stdio config with env", () => {
    const config: MCPServerConfig = {
      type: "stdio",
      command: "uv",
      args: ["run", "server.py"],
      env: { API_KEY: "secret" },
    };
    expect(config.type).toBe("stdio");
    expect(config.env?.API_KEY).toBe("secret");
  });

  test("http/sse config with url", () => {
    const config: MCPServerConfig = {
      type: "sse",
      url: "https://example.com/mcp",
      headers: { Authorization: "Bearer token" },
    };
    expect(config.type).toBe("sse");
    expect(config.url).toBe("https://example.com/mcp");
    expect(config.headers?.Authorization).toBe("Bearer token");
  });

  test("websocket config", () => {
    const config: MCPServerConfig = {
      type: "ws",
      url: "wss://example.com/mcp",
    };
    expect(config.type).toBe("ws");
  });

  test("config with timeout", () => {
    const config: MCPServerConfig = {
      command: "node",
      args: ["server.js"],
      timeout: 30000,
    };
    expect(config.timeout).toBe(30000);
  });

  test("disabled config", () => {
    const config: MCPServerConfig = {
      command: "node",
      args: ["server.js"],
      disabled: true,
    };
    expect(config.disabled).toBe(true);
  });

  test("MCPServerSettings is alias for MCPServerConfig", () => {
    const settings: MCPServerSettings = {
      command: "node",
      args: ["server.js"],
    };
    expect(settings.command).toBe("node");
  });
});

// ============================================
// SERVER MANAGEMENT TESTS
// ============================================

describe("MCPServerManagement", () => {
  test("minimal management config", () => {
    const management: MCPServerManagement = {
      mcpServers: {},
    };
    expect(management.mcpServers).toEqual({});
  });

  test("management with allowed servers", () => {
    const management: MCPServerManagement = {
      mcpServers: {},
      allowedMcpServers: ["server1", "server2"],
    };
    expect(management.allowedMcpServers).toContain("server1");
  });

  test("management with denied servers", () => {
    const management: MCPServerManagement = {
      mcpServers: {},
      deniedMcpServers: ["blocked-server"],
    };
    expect(management.deniedMcpServers).toContain("blocked-server");
  });

  test("management with auto-approve", () => {
    const management: MCPServerManagement = {
      mcpServers: {},
      autoApproveMcpServers: ["trusted-server"],
    };
    expect(management.autoApproveMcpServers).toContain("trusted-server");
  });

  test("management with enterprise lists", () => {
    const management: MCPServerManagement = {
      mcpServers: {},
      enterpriseMcpServerAllowlist: ["enterprise-approved"],
      enterpriseMcpServerDenylist: ["enterprise-blocked"],
    };
    expect(management.enterpriseMcpServerAllowlist).toContain("enterprise-approved");
    expect(management.enterpriseMcpServerDenylist).toContain("enterprise-blocked");
  });

  test("full management config", () => {
    const management: MCPServerManagement = {
      mcpServers: {
        "test-server": {
          command: "node",
          args: ["test.js"],
        },
      },
      allowedMcpServers: ["test-server"],
      deniedMcpServers: ["blocked"],
      autoApproveMcpServers: ["trusted"],
    };
    expect(management.mcpServers["test-server"]).toBeDefined();
  });
});

// ============================================
// MCP CONFIG KEYS TESTS
// ============================================

describe("MCPConfigKeys", () => {
  test("all config keys are defined", () => {
    expect(MCPConfigKeys.SERVERS).toBe("mcpServers");
    expect(MCPConfigKeys.ALLOWED).toBe("allowedMcpServers");
    expect(MCPConfigKeys.DENIED).toBe("deniedMcpServers");
    expect(MCPConfigKeys.AUTO_APPROVE).toBe("autoApproveMcpServers");
    expect(MCPConfigKeys.ENTERPRISE_ALLOW).toBe("enterpriseMcpServerAllowlist");
    expect(MCPConfigKeys.ENTERPRISE_DENY).toBe("enterpriseMcpServerDenylist");
  });
});

// ============================================
// JSON-RPC TYPES TESTS
// ============================================

describe("JSON-RPC Request", () => {
  test("minimal request with string id", () => {
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: "req-1",
      method: "tools/list",
    };
    expect(request.jsonrpc).toBe("2.0");
    expect(request.id).toBe("req-1");
    expect(request.method).toBe("tools/list");
  });

  test("request with numeric id", () => {
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
    };
    expect(request.id).toBe(1);
  });

  test("request with params", () => {
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: "req-2",
      method: "tools/call",
      params: { name: "test", arguments: {} },
    };
    expect(request.params).toBeDefined();
  });
});

describe("JSON-RPC Response", () => {
  test("successful response", () => {
    const response: JSONRPCResponse = {
      jsonrpc: "2.0",
      id: "req-1",
      result: { tools: [] },
    };
    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();
  });

  test("error response", () => {
    const response: JSONRPCResponse = {
      jsonrpc: "2.0",
      id: "req-1",
      error: {
        code: -32600,
        message: "Invalid Request",
      },
    };
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32600);
  });
});

describe("JSON-RPC Error", () => {
  test("minimal error", () => {
    const error: JSONRPCError = {
      code: -32601,
      message: "Method not found",
    };
    expect(error.code).toBe(-32601);
    expect(error.message).toBe("Method not found");
  });

  test("error with data", () => {
    const error: JSONRPCError = {
      code: -32602,
      message: "Invalid params",
      data: { field: "name", reason: "required" },
    };
    expect(error.data).toBeDefined();
  });
});

describe("JSON-RPC Notification", () => {
  test("notification without id", () => {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    };
    expect(notification).not.toHaveProperty("id");
  });

  test("notification with params", () => {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method: "notifications/progress",
      params: { progress: 50, total: 100 },
    };
    expect(notification.params).toBeDefined();
  });
});

// ============================================
// MCP TOOL TYPES TESTS
// ============================================

describe("MCPTool", () => {
  test("minimal tool definition", () => {
    const tool: MCPTool = {
      name: "read_file",
      description: "Read a file",
      inputSchema: {
        type: "object",
        properties: {},
      },
    };
    expect(tool.name).toBe("read_file");
    expect(tool.description).toBe("Read a file");
  });

  test("tool with full schema", () => {
    const tool: MCPTool = {
      name: "write_file",
      description: "Write content to a file",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "File path",
          },
          content: {
            type: "string",
            description: "File content",
          },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    };
    expect(tool.inputSchema.required).toContain("path");
    expect(tool.inputSchema.additionalProperties).toBe(false);
  });
});

describe("MCPInputSchema", () => {
  test("minimal schema", () => {
    const schema: MCPInputSchema = {
      type: "object",
      properties: {},
    };
    expect(schema.type).toBe("object");
  });

  test("schema with required fields", () => {
    const schema: MCPInputSchema = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
    };
    expect(schema.required).toContain("name");
  });
});

describe("MCPProperty", () => {
  test("string property", () => {
    const prop: MCPProperty = {
      type: "string",
      description: "A string value",
    };
    expect(prop.type).toBe("string");
  });

  test("enum property", () => {
    const prop: MCPProperty = {
      type: "string",
      enum: ["option1", "option2", "option3"],
    };
    expect(prop.enum).toHaveLength(3);
  });

  test("array property", () => {
    const prop: MCPProperty = {
      type: "array",
      items: { type: "string" },
    };
    expect(prop.items?.type).toBe("string");
  });

  test("nested object property", () => {
    const prop: MCPProperty = {
      type: "object",
      properties: {
        nested: { type: "string" },
      },
      required: ["nested"],
    };
    expect(prop.properties?.nested.type).toBe("string");
  });

  test("property with default", () => {
    const prop: MCPProperty = {
      type: "string",
      default: "default-value",
    };
    expect(prop.default).toBe("default-value");
  });
});

// ============================================
// MCP CLIENT STATE TESTS
// ============================================

describe("MCPClientState", () => {
  test("minimal state", () => {
    const state: MCPClientState = {
      name: "test-server",
      config: { command: "node", args: ["server.js"] },
      connected: false,
      tools: [],
    };
    expect(state.name).toBe("test-server");
    expect(state.connected).toBe(false);
    expect(state.tools).toEqual([]);
  });

  test("connected state with tools", () => {
    const state: MCPClientState = {
      name: "git-server",
      config: { command: "mcp-git" },
      connected: true,
      tools: [
        {
          name: "git_status",
          description: "Get git status",
          inputSchema: { type: "object", properties: {} },
        },
      ],
      connectedAt: Date.now(),
    };
    expect(state.connected).toBe(true);
    expect(state.tools.length).toBe(1);
    expect(state.connectedAt).toBeDefined();
  });

  test("state with error", () => {
    const state: MCPClientState = {
      name: "failing-server",
      config: { command: "invalid-command" },
      connected: false,
      tools: [],
      lastError: "Command not found",
    };
    expect(state.lastError).toBe("Command not found");
  });
});

// ============================================
// TOOL LIST REQUEST/RESPONSE TESTS
// ============================================

describe("ToolListRequest", () => {
  test("request without cursor", () => {
    const request: ToolListRequest = {};
    expect(request.cursor).toBeUndefined();
  });

  test("request with cursor", () => {
    const request: ToolListRequest = {
      cursor: "next-page-token",
    };
    expect(request.cursor).toBe("next-page-token");
  });
});

describe("ToolListResponse", () => {
  test("response with tools", () => {
    const response: ToolListResponse = {
      tools: [
        {
          name: "tool1",
          description: "First tool",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    };
    expect(response.tools.length).toBe(1);
  });

  test("response with pagination", () => {
    const response: ToolListResponse = {
      tools: [],
      nextCursor: "more-results",
    };
    expect(response.nextCursor).toBe("more-results");
  });
});

// ============================================
// TOOL CALL REQUEST/RESPONSE TESTS
// ============================================

describe("ToolCallRequest", () => {
  test("request without arguments", () => {
    const request: ToolCallRequest = {
      name: "list_items",
    };
    expect(request.name).toBe("list_items");
    expect(request.arguments).toBeUndefined();
  });

  test("request with arguments", () => {
    const request: ToolCallRequest = {
      name: "read_file",
      arguments: { path: "/src/index.ts" },
    };
    expect(request.arguments?.path).toBe("/src/index.ts");
  });
});

describe("ToolCallResponse", () => {
  test("text response", () => {
    const response: ToolCallResponse = {
      content: [{ type: "text", text: "File contents" }],
    };
    expect(response.content[0].type).toBe("text");
  });

  test("error response", () => {
    const response: ToolCallResponse = {
      content: [{ type: "text", text: "Error: File not found" }],
      isError: true,
    };
    expect(response.isError).toBe(true);
  });

  test("image response", () => {
    const response: ToolCallResponse = {
      content: [
        {
          type: "image",
          data: "base64imagedata",
          mimeType: "image/png",
        },
      ],
    };
    expect(response.content[0].type).toBe("image");
  });

  test("resource response", () => {
    const response: ToolCallResponse = {
      content: [
        {
          type: "resource",
          resource: {
            uri: "file:///path/to/file.txt",
            mimeType: "text/plain",
            text: "File contents",
          },
        },
      ],
    };
    expect(response.content[0].type).toBe("resource");
  });
});

// ============================================
// MCP CONTENT TESTS
// ============================================

describe("MCPContent", () => {
  test("text content", () => {
    const content: MCPContent = {
      type: "text",
      text: "Hello",
    };
    expect(content.type).toBe("text");
    if (content.type === "text") {
      expect(content.text).toBe("Hello");
    }
  });

  test("image content", () => {
    const content: MCPContent = {
      type: "image",
      data: "base64data",
      mimeType: "image/jpeg",
    };
    expect(content.type).toBe("image");
  });

  test("resource content", () => {
    const content: MCPContent = {
      type: "resource",
      resource: {
        uri: "file:///test.txt",
      },
    };
    expect(content.type).toBe("resource");
  });
});

// ============================================
// MCP RESOURCE TESTS
// ============================================

describe("MCPResource", () => {
  test("minimal resource", () => {
    const resource: MCPResource = {
      uri: "file:///test.txt",
    };
    expect(resource.uri).toBe("file:///test.txt");
  });

  test("resource with mimeType", () => {
    const resource: MCPResource = {
      uri: "file:///test.json",
      mimeType: "application/json",
    };
    expect(resource.mimeType).toBe("application/json");
  });

  test("resource with text", () => {
    const resource: MCPResource = {
      uri: "file:///test.txt",
      mimeType: "text/plain",
      text: "File contents",
    };
    expect(resource.text).toBe("File contents");
  });

  test("resource with blob", () => {
    const resource: MCPResource = {
      uri: "file:///image.png",
      mimeType: "image/png",
      blob: "base64imagedata",
    };
    expect(resource.blob).toBe("base64imagedata");
  });
});

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe("formatMCPToolName", () => {
  test("formats simple tool name", () => {
    const result = formatMCPToolName("git", "status");
    expect(result).toBe("mcp__git__status");
  });

  test("formats tool with underscores", () => {
    const result = formatMCPToolName("my_server", "do_something");
    expect(result).toBe("mcp__my_server__do_something");
  });

  test("formats tool with hyphens", () => {
    const result = formatMCPToolName("my-server", "do-something");
    expect(result).toBe("mcp__my-server__do-something");
  });
});

describe("parseMCPToolName", () => {
  test("parses valid MCP tool name", () => {
    const result = parseMCPToolName("mcp__git__status");
    expect(result).toEqual({ server: "git", tool: "status" });
  });

  test("parses tool with underscores", () => {
    const result = parseMCPToolName("mcp__my_server__do_something");
    expect(result).toEqual({ server: "my_server", tool: "do_something" });
  });

  test("parses tool with hyphens", () => {
    const result = parseMCPToolName("mcp__my-server__do-something");
    expect(result).toEqual({ server: "my-server", tool: "do-something" });
  });

  test("returns null for non-MCP tool name", () => {
    const result = parseMCPToolName("regular_tool_name");
    expect(result).toBeNull();
  });

  test("returns null for incomplete MCP tool name", () => {
    const result = parseMCPToolName("mcp__server");
    expect(result).toBeNull();
  });

  test("returns null for single underscore", () => {
    const result = parseMCPToolName("mcp_server_tool");
    expect(result).toBeNull();
  });

  test("handles tool names with numbers", () => {
    const result = parseMCPToolName("mcp__server1__tool2");
    expect(result).toEqual({ server: "server1", tool: "tool2" });
  });
});

describe("isMCPToolName", () => {
  test("returns true for MCP tool names", () => {
    expect(isMCPToolName("mcp__git__status")).toBe(true);
    expect(isMCPToolName("mcp__hetzner__create_server")).toBe(true);
    expect(isMCPToolName("mcp__any_server__any_tool")).toBe(true);
  });

  test("returns false for non-MCP tool names", () => {
    expect(isMCPToolName("read_file")).toBe(false);
    expect(isMCPToolName("write_file")).toBe(false);
    expect(isMCPToolName("mcp_tool")).toBe(false);
    expect(isMCPToolName("mcp_")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isMCPToolName("")).toBe(false);
  });

  test("is case sensitive", () => {
    expect(isMCPToolName("MCP__git__status")).toBe(false);
    expect(isMCPToolName("Mcp__git__status")).toBe(false);
  });
});

// ============================================
// ROUND-TRIP TESTS
// ============================================

describe("formatMCPToolName and parseMCPToolName round-trip", () => {
  test("round-trip for simple names", () => {
    const server = "git";
    const tool = "status";
    const formatted = formatMCPToolName(server, tool);
    const parsed = parseMCPToolName(formatted);

    expect(parsed).toEqual({ server, tool });
  });

  test("round-trip for complex names", () => {
    const server = "claude-code-config";
    const tool = "add_keybinding";
    const formatted = formatMCPToolName(server, tool);
    const parsed = parseMCPToolName(formatted);

    expect(parsed).toEqual({ server, tool });
  });
});
