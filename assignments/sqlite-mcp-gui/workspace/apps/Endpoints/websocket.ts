/**
 * WebSocket Handler
 * Manages terminal sessions over WebSocket
 */

// Import terminal session management from src/
import {
  getOrCreateSession,
  attachWebSocket,
  writeToSession,
  resizeSession,
  detachWebSocket,
} from "@codespaces/terminal";

// Import metadata functions
import { getMetadata } from "../../src/lib/metadata";

// Import network error detection
import { detectNetworkError } from "@codespaces/terminal/network-error-detector";

// Import server status fetching
import { getServerStatusByIPWithDefault } from "../../src/lib/hetzner/server-status";

// Import shared types from packages
import type {
  ClientToServerMessage,
  SessionResponse,
  ProgressResponse,
  ErrorResponse,
} from "../../../../@ebowwa/codespaces-types/compile/terminal-websocket";
import { WebSocketCloseCode } from "../../../../@ebowwa/codespaces-types/compile/terminal-websocket";

// Local types for Bun WebSocket
type BunWebSocket = import("bun").ServerWebSocket;
type WebSocketData = {
  sessionId: string | null;
  host: string | null;
  user: string;
  connectedAt: number;
};
type WebSocketMessage = ClientToServerMessage;

export const websocket = {
  // Enable per-message deflate compression for WebSocket frames.
  // Terminal output is highly compressible text, reducing bandwidth significantly.
  // Must be set here in the websocket handler config, not in server.upgrade().
  // See: https://bun.sh/docs/api/websockets
  perMessageDeflate: true,

  open(ws: BunWebSocket) {
    console.log("[Terminal] WebSocket opened");
    // Initialize per-connection data
    ws.data = {
      sessionId: null,
      host: null,
      user: "root",
      connectedAt: Date.now(),
    };
  },

  async message(ws: BunWebSocket, message: string | Buffer) {
    if (typeof message !== "string") {
      ws.close(
        WebSocketCloseCode.INVALID_MESSAGE_FORMAT,
        "Message must be a JSON string"
      );
      return;
    }

    let data: WebSocketMessage;

    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error("[Terminal] Failed to parse JSON:", message, err);
      const errorResponse: ErrorResponse = {
        type: "error",
        code: WebSocketCloseCode.INVALID_MESSAGE_FORMAT,
        message: "Invalid JSON format",
        details: err instanceof Error ? err.message : String(err),
      };
      ws.send(JSON.stringify(errorResponse));
      ws.close(
        WebSocketCloseCode.INVALID_MESSAGE_FORMAT,
        "Invalid JSON"
      );
      return;
    }

    try {
      // Connect to session
      if (data.type === "connect") {
        const { host, user = "root", sessionId: requestedSessionId, environmentId } = data;

        // Validate host
        if (!host || typeof host !== "string") {
          const errorResponse: ErrorResponse = {
            type: "error",
            code: WebSocketCloseCode.INVALID_HOST,
            message: "Invalid or missing host parameter",
          };
          ws.send(JSON.stringify(errorResponse));
          ws.close(WebSocketCloseCode.INVALID_HOST, "Invalid host");
          return;
        }

        ws.data.host = host;
        ws.data.user = user;

        console.log(`[Terminal] Attaching to session for ${user}@${host}${requestedSessionId ? ` (requested: ${requestedSessionId})` : ""}`);

        // Get SSH key path from metadata if environment ID provided
        let keyPath: string | undefined;
        if (environmentId) {
          const metadata = getMetadata(environmentId);
          keyPath = metadata?.sshKeyPath;
          if (keyPath) {
            console.log(`[Terminal] Using SSH key from metadata: ${keyPath}`);
          } else {
            console.warn(`[Terminal] No SSH key found in metadata for environment ${environmentId}`);
          }
        }

        // Helper to send progress messages to the client
        const sendProgress = (message: string, status: ProgressResponse["status"] = "info") => {
          try {
            const progressMsg: ProgressResponse = { type: "progress", message, status };
            ws.send(JSON.stringify(progressMsg));
          } catch (sendErr) {
            console.error("[Terminal] Failed to send progress:", sendErr);
          }
        };

        // Helper to send bootstrap log output to the client (raw text, not JSON)
        const sendBootstrapOutput = (data: string) => {
          try {
            ws.send(data);
          } catch (sendErr) {
            console.error("[Terminal] Failed to send bootstrap output:", sendErr);
          }
        };

        // Send initial connection message
        sendProgress(`Connecting to ${host}...`);

        try {
          // Get or create session (pass sessionId to reuse specific session, or null for new)
          // Pass progress callback to get installation updates
          // Pass bootstrap output callback to stream cloud-init logs
          const session = await getOrCreateSession(
            host,
            user,
            requestedSessionId || null,
            keyPath,
            sendProgress,
            environmentId,
            sendBootstrapOutput,
          );

          // Store session ID in ws data
          ws.data.sessionId = session.sessionId;

          // Attach this WebSocket to the session
          attachWebSocket(session, ws, requestedSessionId !== null);
        } catch (sessionErr) {
          console.error("[Terminal] Failed to create session:", sessionErr);

          // Fetch actual server status from API for better error detection
          const serverStatus = await getServerStatusByIPWithDefault(host);

          // Normalize error type for detectNetworkError
          const normalizedError = sessionErr instanceof Error ? sessionErr : String(sessionErr);

          // Detect network blocking vs server issues
          const errorDetails = detectNetworkError(
            normalizedError,
            host,
            serverStatus
          );

          if (errorDetails.isLikelyNetworkBlock) {
            console.warn("[Terminal] ⚠️  NETWORK BLOCK DETECTED");
            sendProgress(
              `⚠️  ${errorDetails.message}\n\n${errorDetails.troubleshooting.join("\n")}`,
              "warning"
            );
          } else {
            sendProgress(
              `Failed to connect: ${sessionErr instanceof Error ? sessionErr.message : String(sessionErr)}`,
              "error"
            );
          }

          ws.close(
            WebSocketCloseCode.SSH_CONNECTION_FAILED,
            errorDetails.message
          );
        }
      }

      // Input to terminal
      else if (data.type === "input" && ws.data.sessionId) {
        console.log(
          "[Terminal] Received input:",
          JSON.stringify(data.data),
        );
        const success = await writeToSession(ws.data.sessionId, data.data);
        if (!success) {
          console.error("[Terminal] Failed to write to session:", ws.data.sessionId);
          const errorResponse: ErrorResponse = {
            type: "error",
            code: WebSocketCloseCode.SESSION_ALREADY_CLOSED,
            message: "Failed to write to session",
            details: "Session may be closed or invalid",
          };
          ws.send(JSON.stringify(errorResponse));
        }
      }

      // Terminal resize
      else if (data.type === "resize" && ws.data.sessionId) {
        const { rows, cols } = data;

        // Validate resize parameters
        if (typeof rows !== "number" || typeof cols !== "number" ||
            rows < 1 || cols < 1 || rows > 1000 || cols > 1000) {
          const errorResponse: ErrorResponse = {
            type: "error",
            code: WebSocketCloseCode.INVALID_MESSAGE_FORMAT,
            message: "Invalid resize parameters",
            details: `rows and cols must be numbers between 1 and 1000, got: rows=${rows}, cols=${cols}`,
          };
          ws.send(JSON.stringify(errorResponse));
          return;
        }

        const success = await resizeSession(ws.data.sessionId, rows, cols);
        if (!success) {
          console.error("[Terminal] Failed to resize session:", ws.data.sessionId);
          const errorResponse: ErrorResponse = {
            type: "error",
            code: WebSocketCloseCode.SESSION_ALREADY_CLOSED,
            message: "Failed to resize terminal",
            details: "Session may be closed or invalid",
          };
          ws.send(JSON.stringify(errorResponse));
        }
      }

      // Disconnect message
      else if (data.type === "disconnect") {
        console.log("[Terminal] Client requested disconnect:", data.reason || "No reason provided");
        ws.close(WebSocketCloseCode.NORMAL_CLOSURE, data.reason || "Client disconnected");
      }

      // Unknown message type
      else {
        console.warn("[Terminal] Unknown message type:", (data as { type?: string }).type);
        const errorResponse: ErrorResponse = {
          type: "error",
          code: WebSocketCloseCode.INVALID_MESSAGE_FORMAT,
          message: "Unknown message type",
          details: `Expected 'connect', 'input', 'resize', or 'disconnect', got: '${(data as { type?: string }).type}'`,
        };
        ws.send(JSON.stringify(errorResponse));
      }
    } catch (err) {
      console.error("[Terminal] Error processing message:", err);
      const errorResponse: ErrorResponse = {
        type: "error",
        code: WebSocketCloseCode.INTERNAL_ERROR,
        message: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      };
      try {
        ws.send(JSON.stringify(errorResponse));
      } catch (sendErr) {
        // WebSocket might already be closing
      }
    }
  },

  close(ws: BunWebSocket, code: number, reason: string) {
    const sessionId = ws.data?.sessionId;
    console.log(
      `[Terminal] WebSocket closed (code: ${code}, reason: "${reason}"), session: ${sessionId}`,
    );

    // Log abnormal closures
    if (code !== WebSocketCloseCode.NORMAL_CLOSURE) {
      console.warn(`[Terminal] Abnormal WebSocket closure: ${code} - ${reason}`);
    }

    // Detach WebSocket from session (don't close the SSH process)
    if (sessionId) {
      const detached = detachWebSocket(sessionId, ws);
      if (!detached) {
        console.warn(`[Terminal] Failed to detach WebSocket from session ${sessionId}`);
      }
    }
  },

  drain(ws: BunWebSocket) {
    // Called when the WebSocket send buffer is drained and ready for more data
    // This is important for handling backpressure during high-throughput terminal output
    const sessionId = ws.data?.sessionId;
    console.log(`[Terminal] WebSocket buffer drained, session: ${sessionId}`);
    // Note: The actual data flow is controlled by the terminal session reader
    // This handler is primarily for logging and monitoring backpressure events
  },
};
