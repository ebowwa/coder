/**
 * TUI Bridge IPC Server
 *
 * Provides IPC server for external control via TUI Bridge MCP.
 * Supports:
 * 1. Unix socket transport (primary)
 * 2. HTTP transport (secondary, optional port)
 *
 * Uses JSON-RPC 2.0 protocol for communication.
 */

import { EventEmitter } from "events";
import { z } from "zod";
import type { TUIBridge } from "./index.js";
import type { BridgeEvent, BridgeCommand } from "./types.js";

// ============================================================================
// JSON-RPC 2.0 Types
// ============================================================================

/**
 * JSON-RPC 2.0 Request
 */
export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

/**
 * JSON-RPC 2.0 Response (success)
 */
export interface JSONRPCSuccessResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: unknown;
}

/**
 * JSON-RPC 2.0 Response (error)
 */
export interface JSONRPCErrorResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * JSON-RPC 2.0 Response
 */
export type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse;

/**
 * JSON-RPC 2.0 Notification (no id)
 */
export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

/**
 * Schema for JSON-RPC 2.0 Request
 */
export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.unknown().optional(),
});

/**
 * Schema for JSON-RPC 2.0 Notification
 */
export const JSONRPCNotificationSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.unknown().optional(),
});

/**
 * Schema for IPC Server Configuration
 */
export const IPCServerConfigSchema = z.object({
  /** Session ID for socket path */
  sessionId: z.string().min(1),
  /** Enable Unix socket transport */
  enableSocket: z.boolean().default(true),
  /** Custom socket path (defaults to /tmp/coder-bridge-${sessionId}.sock) */
  socketPath: z.string().optional(),
  /** Enable HTTP transport */
  enableHttp: z.boolean().default(false),
  /** HTTP port (defaults to 9876) */
  httpPort: z.number().int().positive().default(9876),
  /** HTTP host */
  httpHost: z.string().default("localhost"),
  /** Enable CORS for HTTP */
  cors: z.boolean().default(true),
  /** CORS origins */
  corsOrigins: z.array(z.string()).default(["*"]),
  /** Max connections */
  maxConnections: z.number().int().positive().default(100),
  /** Connection timeout in ms */
  connectionTimeout: z.number().int().positive().default(30000),
});

/**
 * IPC Server Configuration
 */
export type IPCServerConfig = z.infer<typeof IPCServerConfigSchema>;

// ============================================================================
// IPC Server Events
// ============================================================================

/**
 * IPC Server event types
 */
export type IPCServerEventType =
  | "client_connected"
  | "client_disconnected"
  | "request_received"
  | "response_sent"
  | "notification_sent"
  | "error"
  | "server_started"
  | "server_stopped"
  | "socket_server_started"
  | "http_server_started";

/**
 * IPC Server event payload
 */
export interface IPCServerEvent<T = unknown> {
  type: IPCServerEventType;
  payload: T;
  timestamp: number;
}

/**
 * Client connection info
 */
export interface ClientConnection {
  id: string;
  type: "socket" | "http";
  connectedAt: number;
  lastActivity: number;
  subscriberId?: string;
}

// ============================================================================
// IPC Server Implementation
// ============================================================================

/**
 * TUI Bridge IPC Server
 *
 * Provides bidirectional communication between TUI Bridge and external clients
 * via Unix sockets (primary) and HTTP (secondary).
 */
export class IPCServer extends EventEmitter {
  private config: IPCServerConfig;
  private bridge: TUIBridge;
  private socketServer: unknown = null;
  private httpServer: unknown = null;
  private clients: Map<string, ClientConnection> = new Map();
  private subscribers: Map<string, Set<string>> = new Map();
  private isRunning = false;
  private requestId = 0;

  constructor(bridge: TUIBridge, config: Partial<IPCServerConfig> = {}) {
    super();
    this.bridge = bridge;

    const parsed = IPCServerConfigSchema.parse({
      sessionId: config.sessionId || "default",
      ...config,
    });
    this.config = parsed;

    this.setupBridgeEventForwarding();
  }

  /**
   * Get socket path for this server
   */
  getSocketPath(): string {
    return this.config.socketPath || `/tmp/coder-bridge-${this.config.sessionId}.sock`;
  }

  /**
   * Get HTTP URL for this server
   */
  getHttpUrl(): string {
    return `http://${this.config.httpHost}:${this.config.httpPort}`;
  }

  /**
   * Start the IPC server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    if (this.config.enableSocket) {
      await this.startSocketServer();
    }

    if (this.config.enableHttp) {
      await this.startHttpServer();
    }

    this.isRunning = true;
    this.emitEvent("server_started", {
      socketPath: this.getSocketPath(),
      httpUrl: this.config.enableHttp ? this.getHttpUrl() : undefined,
    });
  }

  /**
   * Stop the IPC server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const clientIds = Array.from(this.clients.keys());
    for (const clientId of clientIds) {
      await this.disconnectClient(clientId);
    }

    if (this.socketServer) {
      await this.stopSocketServer();
      this.socketServer = null;
    }

    if (this.httpServer) {
      await this.stopHttpServer();
      this.httpServer = null;
    }

    this.isRunning = false;
    this.emitEvent("server_stopped", {});
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get connected clients
   */
  getConnectedClients(): ClientConnection[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Disconnect a specific client
   */
  async disconnectClient(clientId: string): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    if (client.subscriberId) {
      const subscriberClients = this.subscribers.get(client.subscriberId);
      if (subscriberClients) {
        subscriberClients.delete(clientId);
        if (subscriberClients.size === 0) {
          this.subscribers.delete(client.subscriberId);
          this.bridge.unsubscribe(client.subscriberId);
        }
      }
    }

    this.clients.delete(clientId);
    this.emitEvent("client_disconnected", { clientId, client });
  }

  // ===========================================================================
  // Unix Socket Server (Bun native)
  // ===========================================================================

  private async startSocketServer(): Promise<void> {
    const socketPath = this.getSocketPath();

    try {
      const file = Bun.file(socketPath);
      if (await file.exists()) {
        await Bun.$`rm -f ${socketPath}`;
      }
    } catch {
      // Ignore errors
    }

    this.socketServer = Bun.serve({
      unix: socketPath,
      fetch: this.handleSocketRequest.bind(this),
    });

    this.emitEvent("socket_server_started", { socketPath });
  }

  private async stopSocketServer(): Promise<void> {
    if (this.socketServer && typeof this.socketServer === "object" && "stop" in this.socketServer) {
      (this.socketServer as { stop: () => void }).stop();
    }

    try {
      const socketPath = this.getSocketPath();
      await Bun.$`rm -f ${socketPath}`;
    } catch {
      // Ignore cleanup errors
    }
  }

  private async handleSocketRequest(request: Request): Promise<Response> {
    const clientId = this.generateClientId("socket");

    try {
      const body = await request.text();
      const message = JSON.parse(body);

      this.registerClient(clientId, "socket");
      const response = await this.handleMessage(clientId, message);

      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // ===========================================================================
  // HTTP Server (Bun native)
  // ===========================================================================

  private async startHttpServer(): Promise<void> {
    this.httpServer = Bun.serve({
      port: this.config.httpPort,
      hostname: this.config.httpHost,
      fetch: this.handleHttpRequest.bind(this),
    });

    this.emitEvent("http_server_started", {
      url: this.getHttpUrl(),
      port: this.config.httpPort,
    });
  }

  private async stopHttpServer(): Promise<void> {
    if (this.httpServer && typeof this.httpServer === "object" && "stop" in this.httpServer) {
      (this.httpServer as { stop: () => void }).stop();
    }
  }

  private async handleHttpRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return this.createCorsResponse();
    }

    if (url.pathname === "/jsonrpc" || url.pathname === "/") {
      return this.handleHttpJsonRpc(request);
    }

    if (url.pathname === "/health") {
      return this.handleHealthCheck();
    }

    if (url.pathname === "/sse") {
      return this.handleSseConnection(request);
    }

    return new Response("Not Found", { status: 404 });
  }

  private async handleHttpJsonRpc(request: Request): Promise<Response> {
    const corsHeaders = this.getCorsHeaders();

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    const clientId = this.generateClientId("http");

    try {
      const body = await request.text();
      const message = JSON.parse(body);

      this.registerClient(clientId, "http");
      const response = await this.handleMessage(clientId, message);

      return new Response(JSON.stringify(response), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error",
            data: error instanceof Error ? error.message : "Unknown error",
          },
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  }

  private handleHealthCheck(): Response {
    return new Response(
      JSON.stringify({
        status: "ok",
        clients: this.clients.size,
        subscribers: this.subscribers.size,
        bridge: {
          enabled: this.bridge.isEnabled(),
          subscriberCount: this.bridge.getSubscriberCount(),
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          ...this.getCorsHeaders(),
        },
      }
    );
  }

  private handleSseConnection(request: Request): Response {
    const clientId = this.generateClientId("http");
    const subscriberId = `sse-${clientId}`;

    this.registerClient(clientId, "http");
    this.bridge.subscribe(subscriberId);

    const client = this.clients.get(clientId);
    if (client) {
      client.subscriberId = subscriberId;
    }

    if (!this.subscribers.has(subscriberId)) {
      this.subscribers.set(subscriberId, new Set());
    }
    this.subscribers.get(subscriberId)!.add(clientId);

    const stream = new ReadableStream({
      start: (controller) => {
        const encoder = new TextEncoder();

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`)
        );

        const eventHandler = (event: BridgeEvent) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          } catch {
            this.bridge.off("event", eventHandler);
          }
        };

        this.bridge.on("event", eventHandler);

        request.signal.addEventListener("abort", () => {
          this.bridge.off("event", eventHandler);
          this.disconnectClient(clientId);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        ...this.getCorsHeaders(),
      },
    });
  }

  private getCorsHeaders(): Record<string, string> {
    if (!this.config.cors) {
      return {};
    }

    return {
      "Access-Control-Allow-Origin": this.config.corsOrigins.join(", "),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }

  private createCorsResponse(): Response {
    return new Response(null, {
      status: 204,
      headers: this.getCorsHeaders(),
    });
  }

  // ===========================================================================
  // JSON-RPC Message Handling
  // ===========================================================================

  private async handleMessage(
    clientId: string,
    message: unknown
  ): Promise<JSONRPCResponse> {
    const requestResult = JSONRPCRequestSchema.safeParse(message);
    if (requestResult.success) {
      const request = requestResult.data as JSONRPCRequest;
      return this.handleRequest(clientId, request);
    }

    const notificationResult = JSONRPCNotificationSchema.safeParse(message);
    if (notificationResult.success) {
      const notification = notificationResult.data as JSONRPCNotification;
      await this.handleNotification(clientId, notification);
      return {
        jsonrpc: "2.0",
        id: ++this.requestId,
        result: { received: true },
      };
    }

    return {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32600,
        message: "Invalid Request",
        data: "Message must be a valid JSON-RPC 2.0 request or notification",
      },
    };
  }

  private async handleRequest(
    clientId: string,
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse> {
    this.emitEvent("request_received", { clientId, request });

    try {
      const result = await this.executeMethod(clientId, request.method, request.params);

      const response: JSONRPCSuccessResponse = {
        jsonrpc: "2.0",
        id: request.id,
        result,
      };

      this.emitEvent("response_sent", { clientId, response });
      return response;
    } catch (error) {
      const response: JSONRPCErrorResponse = {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      };

      this.emitEvent("error", { clientId, error, request });
      return response;
    }
  }

  private async handleNotification(
    clientId: string,
    notification: JSONRPCNotification
  ): Promise<void> {
    this.emitEvent("notification_received", { clientId, notification });
    await this.executeMethod(clientId, notification.method, notification.params);
  }

  private async executeMethod(
    clientId: string,
    method: string,
    params?: unknown
  ): Promise<unknown> {
    switch (method) {
      case "getState":
        return this.bridge.getState();

      case "sendMessage": {
        const command: BridgeCommand = {
          type: "send_message",
          content: (params as { content: string })?.content || "",
        };
        return this.bridge.executeCommand(command);
      }

      case "executeCommand": {
        const command: BridgeCommand = {
          type: "execute_command",
          command: (params as { command: string })?.command || "",
        };
        return this.bridge.executeCommand(command);
      }

      case "setModel": {
        const command: BridgeCommand = {
          type: "set_model",
          model: (params as { model: string })?.model || "",
        };
        return this.bridge.executeCommand(command);
      }

      case "clearMessages": {
        const command: BridgeCommand = { type: "clear_messages" };
        return this.bridge.executeCommand(command);
      }

      case "exportSession": {
        const command: BridgeCommand = {
          type: "export_session",
          format: (params as { format: "jsonl" | "json" | "markdown" })?.format || "jsonl",
        };
        return this.bridge.executeCommand(command);
      }

      case "getScreen": {
        const command: BridgeCommand = { type: "get_screen" };
        return this.bridge.executeCommand(command);
      }

      case "subscribe": {
        const subscriberId = (params as { subscriberId?: string })?.subscriberId || clientId;
        const success = this.bridge.subscribe(subscriberId);

        if (!this.subscribers.has(subscriberId)) {
          this.subscribers.set(subscriberId, new Set());
        }
        this.subscribers.get(subscriberId)!.add(clientId);

        const client = this.clients.get(clientId);
        if (client) {
          client.subscriberId = subscriberId;
        }

        return { success, subscriberId };
      }

      case "unsubscribe": {
        const subscriberId =
          (params as { subscriberId?: string })?.subscriberId ||
          this.clients.get(clientId)?.subscriberId;

        if (!subscriberId) {
          return { success: false, error: "Not subscribed" };
        }

        const success = this.bridge.unsubscribe(subscriberId);

        const subscriberClients = this.subscribers.get(subscriberId);
        if (subscriberClients) {
          subscriberClients.delete(clientId);
          if (subscriberClients.size === 0) {
            this.subscribers.delete(subscriberId);
          }
        }

        const client = this.clients.get(clientId);
        if (client) {
          client.subscriberId = undefined;
        }

        return { success };
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // ===========================================================================
  // Bridge Event Forwarding
  // ===========================================================================

  private setupBridgeEventForwarding(): void {
    this.bridge.on("event", (event: BridgeEvent) => {
      this.broadcastToSubscribers(event);
    });
  }

  private broadcastToSubscribers(event: BridgeEvent): void {
    const notification: JSONRPCNotification = {
      jsonrpc: "2.0",
      method: "event",
      params: event,
    };

    const subscriberEntries = Array.from(this.subscribers.entries());
    for (const [, clientIds] of subscriberEntries) {
      const clientIdArray = Array.from(clientIds);
      for (const clientId of clientIdArray) {
        this.sendToClient(clientId, notification).catch(() => {
          // Ignore send errors
        });
      }
    }

    this.emitEvent("notification_sent", { notification, subscriberCount: this.subscribers.size });
  }

  private async sendToClient(_clientId: string, _message: unknown): Promise<void> {
    // For stateless HTTP/socket connections, we can't push
    // SSE connections handle their own streaming via the ReadableStream
  }

  // ===========================================================================
  // Client Management
  // ===========================================================================

  private registerClient(clientId: string, type: "socket" | "http"): void {
    const client: ClientConnection = {
      id: clientId,
      type,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.clients.set(clientId, client);
    this.emitEvent("client_connected", { client });

    if (this.clients.size > this.config.maxConnections) {
      const entries = Array.from(this.clients.entries());
      const oldest = entries.sort((a, b) => a[1].connectedAt - b[1].connectedAt)[0];
      if (oldest) {
        this.disconnectClient(oldest[0]);
      }
    }
  }

  private generateClientId(type: "socket" | "http"): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ===========================================================================
  // Event Emission
  // ===========================================================================

  private emitEvent<T>(type: string, payload: T): void {
    const event = {
      type,
      payload,
      timestamp: Date.now(),
    };
    this.emit("event", event);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an IPC server for TUI Bridge
 */
export function createIPCServer(
  bridge: TUIBridge,
  config: Partial<IPCServerConfig> = {}
): IPCServer {
  return new IPCServer(bridge, config);
}

export default IPCServer;
