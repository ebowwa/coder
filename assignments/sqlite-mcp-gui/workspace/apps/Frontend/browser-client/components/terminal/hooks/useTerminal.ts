import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { WebSocketCloseCode } from "../../../../../../../../@ebowwa/codespaces-types/compile/terminal-websocket";

export interface TerminalConfig {
  ipv4: string;
  name: string;
  status: string;
  createdAt?: string;
  environmentId: string;
}

export interface TerminalReturn {
  terminalRef: React.RefObject<HTMLDivElement>;
  connected: boolean;
  error: string | null;
  isBooting: boolean;
  bootRetryCount: number;
  sessionId: string | null;
  disconnect: () => void;
}

const TERMINAL_THEME = {
  cursorBlink: true,
  fontSize: 14,
  fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Menlo", monospace',
  theme: {
    background: "#0d1117",
    foreground: "#c9d1d9",
    cursor: "#c9d1d9",
    black: "#484f58",
    red: "#ff7b72",
    green: "#3fb950",
    yellow: "#d29922",
    blue: "#58a6ff",
    magenta: "#bc8cff",
    cyan: "#39c5cf",
    white: "#b1bac4",
    brightBlack: "#6e7681",
    brightRed: "#ffa198",
    brightGreen: "#56d364",
    brightYellow: "#e3b341",
    brightBlue: "#79c0ff",
    brightMagenta: "#d2a8ff",
    brightCyan: "#56d4dd",
    brightWhite: "#f0f6fc",
  },
  rows: 24,
  cols: 80,
  scrollback: 1000,
};

export function useTerminal(
  config: TerminalConfig,
  isOpen: boolean,
  initialSessionId?: string,
  onSessionIdChange?: (sessionId: string | null) => void,
): TerminalReturn {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(false);
  const [bootRetryCount, setBootRetryCount] = useState(0);
  const initializedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(initialSessionId || null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize terminal (only once)
  useEffect(() => {
    if (!terminalRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const terminal = new Terminal(TERMINAL_THEME);
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Welcome message
    terminal.writeln(
      "\x1b[1;36m╔════════════════════════════════════════════╗\x1b[0m",
    );
    terminal.writeln(
      "\x1b[1;36m║     \x1b[1;33mHetzner CodeSpaces Terminal\x1b[0m\x1b[1;36m           ║\x1b[0m",
    );
    terminal.writeln(
      "\x1b[1;36m╚════════════════════════════════════════════╝\x1b[0m",
    );
    terminal.writeln("");
    terminal.writeln(`  Connecting to \x1b[1;32m${config.ipv4}\x1b[0m...`);

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        const dims = { rows: terminal.rows, cols: terminal.cols };
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(
            JSON.stringify({ type: "resize", ...dims }),
          );
        }
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
    };
  }, [config.ipv4]);

  // Keep sessionIdRef in sync with sessionId state
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Set up input handler
  useEffect(() => {
    const terminal = terminalInstanceRef.current;
    if (!terminal) return;

    const handleInput = (data: string) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: "input", data }));
      }
    };

    terminal.onData(handleInput);
  }, []);

  // Establish WebSocket connection when sheet opens
  useEffect(() => {
    if (!isOpen || !terminalInstanceRef.current) return;

    const terminal = terminalInstanceRef.current;
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/api/terminal/ws`;

    setError(null);
    setIsBooting(false);
    setBootRetryCount(0);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl);
        websocketRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: "connect",
              host: config.ipv4,
              user: "root",
              rows: terminal.rows,
              cols: terminal.cols,
              sessionId: sessionIdRef.current,
              environmentId: config.environmentId,
            }),
          );
        };

        ws.onmessage = (event) => {
          const data = event.data;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "session") {
              const newSessionId = parsed.sessionId;
              if (newSessionId && newSessionId !== sessionIdRef.current) {
                sessionIdRef.current = newSessionId;
                setSessionId(newSessionId);
                onSessionIdChange?.(newSessionId);
              }

              setConnected(true);
              setIsBooting(false);
              setBootRetryCount(0);
              if (parsed.existing) {
                terminal.writeln(
                  `\x1b[1;36m↻ Resumed session\x1b[0m to \x1b[1;32m${config.name}\x1b[0m`,
                );
              } else {
                terminal.writeln(
                  `\x1b[1;32m✓ Connected\x1b[0m to \x1b[1;32m${config.name}\x1b[0m`,
                );
              }
              terminal.writeln("");
            } else if (parsed.type === "progress") {
              const message = parsed.message;
              const status = parsed.status || "info";

              let colorCode = "\x1b[1;36m";
              if (status === "success") {
                colorCode = "\x1b[1;32m";
              } else if (status === "error") {
                colorCode = "\x1b[1;31m";
              }

              terminal.writeln(`${colorCode}• ${message}\x1b[0m`);
            } else if (parsed.type === "error") {
              const errorMessage = parsed.message;

              const isConnectionRefused =
                errorMessage.includes("Connection refused") ||
                errorMessage.includes("connect to host") ||
                errorMessage.includes("exit code 255");

              const isFreshServer =
                config.status === "creating" ||
                config.createdAt &&
                new Date(config.createdAt).getTime() > Date.now() - 5 * 60 * 1000;

              if (isConnectionRefused && isFreshServer && bootRetryCount < 12) {
                setIsBooting(true);
                setBootRetryCount(prev => {
                  const newCount = prev + 1;
                  const retryDelay = 5000;

                  terminal.writeln(
                    `\x1b[1;33m⏳ Server booting... retrying in ${retryDelay / 1000}s (attempt ${newCount}/12)\x1b[0m`,
                  );

                  ws.close(WebSocketCloseCode.ENDPOINT_GOING_AWAY, "Server booting - will retry");

                  retryTimeoutRef.current = setTimeout(() => {
                    connectWebSocket();
                  }, retryDelay);

                  return newCount;
                });
              } else {
                setError(errorMessage);
                setIsBooting(false);
                terminal.writeln(`\x1b[1;31m✗ Error: ${errorMessage}\x1b[0m`);
              }
            }
          } catch {
            terminal.write(data);
          }
        };

        ws.onerror = () => {
          terminal.writeln("\x1b[1;33m⏳ Waiting for server...\x1b[0m");
        };

        ws.onclose = (event) => {
          if (!isBooting) {
            setConnected(false);
            terminal.writeln("\x1b[1;33m⚠ Connection closed\x1b[0m");
          }
        };

        return () => {
          ws.close(WebSocketCloseCode.NORMAL_CLOSURE, "Component unmounting");
          websocketRef.current = null;
          setConnected(false);
          setIsBooting(false);
        };
      } catch (err) {
        setError(String(err));
        terminal.writeln(`\x1b[1;31m✗ Failed to connect: ${err}\x1b[0m`);
      }
    };

    connectWebSocket();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close(WebSocketCloseCode.NORMAL_CLOSURE, "Effect cleanup");
      }
      setConnected(false);
      setIsBooting(false);
    };
  }, [isOpen, config.ipv4, config.name, config.status, config.createdAt, config.environmentId]);

  // Fit terminal when sheet opens
  useEffect(() => {
    if (isOpen && fitAddonRef.current) {
      const timer = setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const disconnect = () => {
    if (websocketRef.current) {
      websocketRef.current.close(WebSocketCloseCode.NORMAL_CLOSURE, "User disconnected");
    }
  };

  return {
    terminalRef,
    connected,
    error,
    isBooting,
    bootRetryCount,
    sessionId,
    disconnect,
  };
}
