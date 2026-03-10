/**
 * useBridge Hook
 * React hook for TUI Bridge integration
 */

import { useCallback, useEffect, useState, useRef } from "react";
import { TUIBridge } from "./index.js";
import type {
  BridgeState,
  BridgeEvent,
  BridgeCommand,
  BridgeCommandResult,
  TUIBridgeConfig,
} from "./types.js";

/**
 * Hook options
 */
export interface UseBridgeOptions {
  /** Enable bridge mode */
  enabled?: boolean;
  /** Unix socket path */
  socketPath?: string;
  /** HTTP port */
  httpPort?: number;
  /** Event callback */
  onEvent?: (event: BridgeEvent) => void;
}

/**
 * Hook return type
 */
export interface UseBridgeReturn {
  /** Bridge instance */
  bridge: TUIBridge | null;
  /** Current state */
  state: BridgeState | null;
  /** Is bridge enabled */
  isEnabled: boolean;
  /** Update state */
  updateState: (state: Partial<BridgeState>) => void;
  /** Execute command */
  executeCommand: (command: BridgeCommand) => Promise<BridgeCommandResult>;
  /** Emit event */
  emitEvent: <T>(type: BridgeEvent<T>["type"], payload: T) => void;
  /** Last received command */
  lastCommand: BridgeCommand | null;
  /** Clear last command */
  clearLastCommand: () => void;
}

/**
 * Hook for TUI Bridge integration
 */
export function useBridge(options: UseBridgeOptions = {}): UseBridgeReturn {
  const { enabled = false, socketPath, httpPort, onEvent } = options;

  const [state, setState] = useState<BridgeState | null>(null);
  const [lastCommand, setLastCommand] = useState<BridgeCommand | null>(null);
  const bridgeRef = useRef<TUIBridge | null>(null);

  // Initialize bridge
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const config: TUIBridgeConfig = {
      enabled,
      socketPath,
      httpPort,
      onEvent: (event) => {
        // Update local state on state_update events
        if (event.type === "state_update") {
          setState(event.payload as BridgeState);
        }
        // Call user callback
        onEvent?.(event);
      },
    };

    bridgeRef.current = TUIBridge.init(config);

    return () => {
      bridgeRef.current?.destroy();
      bridgeRef.current = null;
    };
  }, [enabled, socketPath, httpPort, onEvent]);

  // Listen for command events
  useEffect(() => {
    if (!bridgeRef.current) {
      return;
    }

    const handleCommand = (event: BridgeEvent) => {
      if (event.type === "command_executed") {
        setLastCommand(event.payload as BridgeCommand);
      }
    };

    bridgeRef.current.on("event", handleCommand);

    return () => {
      bridgeRef.current?.off("event", handleCommand);
    };
  }, [enabled]);

  const updateState = useCallback((newState: Partial<BridgeState>) => {
    bridgeRef.current?.updateState(newState);
    setState((prev) => (prev ? { ...prev, ...newState } : null));
  }, []);

  const executeCommand = useCallback(async (command: BridgeCommand): Promise<BridgeCommandResult> => {
    if (!bridgeRef.current) {
      return { success: false, error: "Bridge not initialized" };
    }
    return bridgeRef.current.executeCommand(command);
  }, []);

  const emitEvent = useCallback(<T,>(type: BridgeEvent<T>["type"], payload: T) => {
    bridgeRef.current?.emitEvent(type, payload);
  }, []);

  const clearLastCommand = useCallback(() => {
    setLastCommand(null);
  }, []);

  return {
    bridge: bridgeRef.current,
    state,
    isEnabled: enabled && bridgeRef.current !== null,
    updateState,
    executeCommand,
    emitEvent,
    lastCommand,
    clearLastCommand,
  };
}

/**
 * Hook for handling bridge commands in TUI components
 */
export interface UseBridgeCommandHandlerOptions {
  /** Bridge instance from useBridge */
  bridge: TUIBridge | null;
  /** Handler for send_message commands */
  onSendMessage?: (content: string) => void;
  /** Handler for execute_command commands */
  onExecuteCommand?: (command: string) => void;
  /** Handler for set_model commands */
  onSetModel?: (model: string) => void;
  /** Handler for clear_messages commands */
  onClearMessages?: () => void;
  /** Handler for export_session commands */
  onExportSession?: (format: "jsonl" | "json" | "markdown") => void;
}

/**
 * Hook for handling bridge commands
 */
export function useBridgeCommandHandler(options: UseBridgeCommandHandlerOptions): void {
  const { bridge, onSendMessage, onExecuteCommand, onSetModel, onClearMessages, onExportSession } = options;

  useEffect(() => {
    if (!bridge) {
      return;
    }

    const handleEvent = async (event: BridgeEvent) => {
      if (event.type !== "command_executed") {
        return;
      }

      const command = event.payload as BridgeCommand;

      switch (command.type) {
        case "send_message":
          onSendMessage?.(command.content);
          break;

        case "execute_command":
          onExecuteCommand?.(command.command);
          break;

        case "set_model":
          onSetModel?.(command.model);
          break;

        case "clear_messages":
          onClearMessages?.();
          break;

        case "export_session":
          onExportSession?.(command.format);
          break;

        case "get_state":
          // Already handled by bridge
          break;
      }
    };

    bridge.on("event", handleEvent);

    return () => {
      bridge.off("event", handleEvent);
    };
  }, [bridge, onSendMessage, onExecuteCommand, onSetModel, onClearMessages, onExportSession]);
}
