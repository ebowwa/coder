/** @jsx React.createElement */
/**
 * Status Bar Component - Simple plain text
 */

import React from "react";
import { Text } from "ink";
import type { StatusBarProps } from "./types.js";
import { calculateContextInfo, getPermissionModeDisplay } from "../shared/status-line.js";

function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens}`;
  } else if (tokens < 100000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  } else {
    return `${(tokens / 1000).toFixed(0)}k`;
  }
}

export function StatusBar({
  permissionMode,
  tokensUsed,
  model,
  isLoading,
  spinnerFrame,
}: StatusBarProps) {
  const contextInfo = calculateContextInfo(tokensUsed, model);
  const permDisplay = getPermissionModeDisplay(permissionMode);

  const parts: string[] = [];

  if (isLoading) {
    parts.push(spinnerFrame);
  }

  const percentColor = contextInfo.isCritical
    ? "red"
    : contextInfo.isLow
      ? "yellow"
      : undefined;

  const contextDisplay = `Context: ${contextInfo.percentRemaining.toFixed(0)}% (${formatTokens(tokensUsed)})`;
  parts.push(contextDisplay);
  parts.push(`${permDisplay.symbol} ${permDisplay.label}`);

  return (
    <Text dimColor={percentColor === undefined} color={percentColor}>
      {parts.join(" | ")}
    </Text>
  );
}

export default StatusBar;
