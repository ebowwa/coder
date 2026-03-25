/**
 * MCP Client - Model Context Protocol implementation
 */

import type {
  MCPServerConfig,
  MCPTool,
  MCPInputSchema,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  JSONSchema,
  ToolResult,
} from "../../schemas/index.js";
import { spawn, type ChildProcess } from "child_process";
import WebSocket from "ws";
import { VERSION } from "../../core/version.js";

export interface MCPClientOptions {
  name: string;
  config: MCPServerConfig;
  onLog?: (message: string) => void;
}

export class MCPClientImpl {
  // Alias for backwards compatibility
  static readonly MCPClient = MCPClientImpl;
  name: string;
  config: MCPServerConfig;
  connected = false;
  tools: MCPTool[] = [];

  private process: ChildProcess | null = null;
  private websocket: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  private buffer = "";
  private onLog?: (message: string) => void;

  constructor(options: MCPClientOptions) {
    this.name = options.name;
    this.config = options.config;
    this.onLog = options.onLog;
  }

  async connect(): Promise<void> {
    // Infer type if not specified - stdio is default when command is present
    const inferredType = this.config.type || (this.config.command ? "stdio" : "http");

    if (inferredType === "stdio") {
      await this.connectStdio();
    } else if (inferredType === "http" || inferredType === "sse") {
      await this.connectHttp();
    } else if (inferredType === "ws") {
      await this.connectWebSocket();
    }
  }

  private async connectStdio(): Promise<void> {
    if (!this.config.command) {
      throw new Error("No command specified for stdio transport");
    }

    this.log(`Starting stdio transport: ${this.config.command}`);

    this.process = spawn(this.config.command, this.config.args || [], {
      env: { ...process.env, ...this.config.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      this.handleData(data.toString());
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      this.log(`stderr: ${data.toString()}`);
    });

    this.process.on("error", (error: Error) => {
      this.log(`Process error: ${error.message}`);
    });

    this.process.on("close", (code: number, signal: string | null) => {
      this.log(`Process closed with code ${code}, signal=${signal}`);
      this.connected = false;
    });

    // Wait for process to be ready (check stdin is writable)
    let retries = 0;
    const maxRetries = 50; // 5 seconds max
    while (!this.process.stdin?.writable && retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!this.process.stdin?.writable) {
      throw new Error("Process stdin not writable after 5 seconds");
    }

    if (retries > 0) {
      this.log(`Process ready after ${retries * 100}ms`);
    }

    // Initialize connection
    await this.initialize();
    this.log(`Connected: ${this.connected}`);
  }

  private async connectHttp(): Promise<void> {
    if (!this.config.url) {
      throw new Error("No URL specified for HTTP transport");
    }

    this.log(`Starting HTTP transport: ${this.config.url}`);

    // For HTTP transport, we just validate the endpoint
    try {
      const response = await fetch(this.config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "coder",
              version: VERSION,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = (await response.json()) as JSONRPCResponse;
      this.connected = true;

      // Get tools
      await this.loadTools();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to HTTP server: ${errorMessage}`);
    }
  }

  private async connectWebSocket(): Promise<void> {
    if (!this.config.url) {
      throw new Error("No URL specified for WebSocket transport");
    }

    const url = this.config.url;
    this.log(`Starting WebSocket transport: ${url}`);

    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        ...this.config.headers,
      };

      const ws = new WebSocket(url, {
        headers,
        handshakeTimeout: this.config.timeout || 30000,
      });

      ws.on("open", () => {
        this.log("WebSocket connection established");
        this.websocket = ws;
        this.connected = true;

        // Initialize the MCP connection
        this.initialize()
          .then(() => resolve())
          .catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.log(`Initialization failed: ${errorMessage}`);
            reject(error);
          });
      });

      ws.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
        const message = isBinary ? data.toString() : data.toString();
        this.handleData(message);
      });

      ws.on("error", (error: Error) => {
        this.log(`WebSocket error: ${error.message}`);
        if (!this.connected) {
          reject(new Error(`WebSocket connection failed: ${error.message}`));
        }
      });

      ws.on("close", (code: number, reason: Buffer) => {
        this.log(`WebSocket closed: code=${code}, reason=${reason.toString()}`);
        this.connected = false;
        this.websocket = null;

        // Reject any pending requests
        for (const [id, pending] of this.pendingRequests) {
          this.pendingRequests.delete(id);
          pending.reject(new Error(`WebSocket closed: ${reason.toString()}`));
        }
      });

      ws.on("ping", () => {
        ws.pong();
      });
    });
  }

  private async initialize(): Promise<void> {
    this.log("Sending initialize request...");

    try {
      // Add a 10 second timeout for initialization
      const initTimeout = 10000;
      const result = await Promise.race([
        this.request("initialize", {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          clientInfo: {
            name: "coder",
            version: VERSION,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Initialize timeout after 10s")), initTimeout)
        ),
      ]);

      this.log(`Initialized with: ${JSON.stringify(result).slice(0, 200)}`);
      this.connected = true;

      // Send initialized notification
      this.notify("notifications/initialized", {});

      // Load tools
      await this.loadTools();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Initialize failed: ${errorMessage}`);
      throw error;
    }
  }

  private async loadTools(): Promise<void> {
    try {
      const result = (await this.request("tools/list", {})) as {
        tools: Array<{
          name: string;
          description: string;
          inputSchema: JSONSchema;
        }>;
      };

      this.tools = result.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: "object" as const,
          properties: tool.inputSchema.properties as Record<string, MCPInputSchema["properties"][string]>,
          required: tool.inputSchema.required,
        },
      }));

      this.log(`Loaded ${this.tools.length} tools`);
    } catch (error) {
      this.log(`Failed to load tools: ${error}`);
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const result = (await this.request("tools/call", {
      name,
      arguments: args,
    })) as { content: Array<{ type: string; text?: string }> };

    const text = result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text || "")
      .join("\n");

    return {
      content: text,
    };
  }

  async request(method: string, params: unknown): Promise<unknown> {
    const id = ++this.requestId;

    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    // HTTP transport - stateless, make a new request each time
    if (this.config.type === "http" || this.config.type === "sse") {
      return this.requestHttp(request);
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const message = JSON.stringify(request);

      // Send via WebSocket or stdio depending on transport type
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(message);
      } else if (this.process?.stdin?.writable) {
        this.process.stdin.write(message + "\n");
      } else {
        this.pendingRequests.delete(id);
        reject(new Error("No active connection to send request"));
        return;
      }

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout for " + method));
        }
      }, this.config.timeout || 120000);
    });
  }

  /**
   * Make a stateless HTTP request
   */
  private async requestHttp(request: JSONRPCRequest): Promise<unknown> {
    if (!this.config.url) {
      throw new Error("No URL specified for HTTP transport");
    }

    const response = await fetch(this.config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error("HTTP error: " + response.status);
    }

    const result = (await response.json()) as JSONRPCResponse;

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.result;
  }

  notify(method: string, params: unknown): void {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    const message = JSON.stringify(notification);

    // Send via WebSocket or stdio depending on transport type
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(message);
    } else if (this.process?.stdin?.writable) {
      this.process.stdin.write(message + "\n");
    }
  }

  private handleData(data: string): void {
    this.buffer += data;

    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line) as JSONRPCResponse;

        if (response.id !== undefined) {
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
              pending.reject(new Error(response.error.message));
            } else {
              pending.resolve(response.result);
            }
          }
        }
      } catch (error) {
        this.log(`Parse error: ${error}`);
      }
    }
  }

  async close(): Promise<void> {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connected = false;
  }

  private log(message: string): void {
    const formatted = `[MCP:${this.name}] ${message}`;
    // Always log to console for debugging
    if (process.env.DEBUG_API === '1') {
      console.log(`\x1b[90m${formatted}\x1b[0m`);
    }
    this.onLog?.(formatted);
  }
}

/**
 * Create MCP clients from config
 */
export async function createMCPClients(
  servers: Record<string, MCPServerConfig>,
  onLog?: (message: string) => void
): Promise<Map<string, MCPClientImpl>> {
  const clients = new Map<string, MCPClientImpl>();

  for (const [name, config] of Object.entries(servers)) {
    if (config.disabled) continue;

    const client = new MCPClientImpl({ name, config, onLog });

    try {
      await client.connect();

      // Only add to clients map if connection was successful
      if (client.connected) {
        clients.set(name, client);
        onLog?.(`[MCP:${name}] Connected with ${client.tools.length} tools`);
      } else {
        onLog?.(`[MCP:${name}] Connection failed (connected=false after connect())`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onLog?.(`[MCP:${name}] Failed to connect: ${errorMessage}`);
    }
  }

  return clients;
}
