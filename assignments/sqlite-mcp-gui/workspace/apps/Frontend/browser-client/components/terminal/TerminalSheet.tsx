import React, { useState } from "react";
import { Environment } from "../../../../../../../@ebowwa/codespaces-types/compile";
import { useTerminal } from "./hooks/useTerminal";
import { TerminalHeader } from "./components/TerminalHeader";
import { TerminalView } from "./components/TerminalView";
import "./TerminalSheet.css";

interface TerminalSheetProps {
  environment: Environment;
  isOpen: boolean;
  onClose: () => void;
  initialSessionId?: string;
  onSessionIdChange?: (sessionId: string | null) => void;
}

export function TerminalSheet({
  environment,
  isOpen,
  onClose,
  initialSessionId,
  onSessionIdChange,
}: TerminalSheetProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const terminal = useTerminal(
    {
      ipv4: environment.ipv4,
      name: environment.name,
      status: environment.status,
      createdAt: environment.createdAt,
      environmentId: environment.id,
    },
    isOpen,
    initialSessionId,
    onSessionIdChange,
  );

  const handleMinimizeToggle = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isOpen) return null;

  return (
    <div className={`terminal-sheet ${isMinimized ? "minimized" : ""}`}>
      <TerminalHeader
        environment={environment}
        connected={terminal.connected}
        isBooting={terminal.isBooting}
        bootRetryCount={terminal.bootRetryCount}
        error={terminal.error}
        isMinimized={isMinimized}
        onMinimizeToggle={handleMinimizeToggle}
        onClose={onClose}
      />
      <TerminalView terminalRef={terminal.terminalRef} isMinimized={isMinimized} />
    </div>
  );
}
