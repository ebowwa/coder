import React from "react";

interface TerminalViewProps {
  terminalRef: React.RefObject<HTMLDivElement>;
  isMinimized: boolean;
}

export function TerminalView({ terminalRef, isMinimized }: TerminalViewProps) {
  if (isMinimized) return null;

  return (
    <div className="terminal-content">
      <div ref={terminalRef} className="terminal-container" />
    </div>
  );
}
