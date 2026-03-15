/**
 * ToolDisplay - Renders tool calls and results
 */

import React from "react";
import { Box, Text } from "ink";
import type { UIMessage } from "./types.js";

export interface ToolDisplayProps {
  message: UIMessage;
  /** Maximum content length for preview */
  maxContentLength?: number;
}

/**
 * Render a tool call or result message
 */
export function ToolDisplay({ message, maxContentLength = 500 }: ToolDisplayProps) {
  // Tool call
  if (message.type === "tool_call") {
    const content = message.content.slice(0, maxContentLength);
    return (
      <Box flexDirection="column">
        <Text bold color="yellow">
          {"\u25b6"} {message.toolName || "tool"}
        </Text>
        {content && (
          <Text dimColor color="gray">
            {"  "}
            {content}
            {message.content.length > maxContentLength ? "..." : ""}
          </Text>
        )}
      </Box>
    );
  }

  // Tool result
  if (message.type === "tool_result") {
    const isError = message.isError;
    const content = message.content.slice(0, maxContentLength);
    return (
      <Box flexDirection="column">
        <Text bold color={isError ? "red" : "green"}>
          {isError ? "\u2717" : "\u2713"} {message.toolName || "tool"}
        </Text>
        {content && (
          <Text dimColor color={isError ? "red" : "green"}>
            {"  "}
            {content}
            {message.content.length > maxContentLength ? "..." : ""}
          </Text>
        )}
      </Box>
    );
  }

  // Not a tool message
  return null;
}

export default ToolDisplay;
