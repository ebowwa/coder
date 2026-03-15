/**
 * MessageList - Renders a list of UI messages
 */

import React from "react";
import { Box, Text } from "ink";
import type { UIMessage } from "./types.js";
import { ToolDisplay } from "./ToolDisplay.js";

export interface MessageListProps {
  /** Messages to display */
  messages: UIMessage[];
  /** Maximum visible messages (for terminal height) */
  visibleCount?: number;
  /** Maximum content length per message */
  maxContentLength?: number;
}

/**
 * Render a scrollable list of messages
 */
export function MessageList({
  messages,
  visibleCount,
  maxContentLength = 1000,
}: MessageListProps) {
  // Slice to visible messages
  const visibleMessages = visibleCount
    ? messages.slice(-visibleCount)
    : messages;

  return (
    <Box flexDirection="column" flexGrow={1} overflow="hidden">
      {visibleMessages.map(msg => {
        // Tool messages use ToolDisplay
        if (msg.type === "tool_call" || msg.type === "tool_result") {
          return <ToolDisplay key={msg.id} message={msg} maxContentLength={maxContentLength} />;
        }

        // Regular message
        const content = msg.content.slice(0, maxContentLength);
        const truncated = msg.content.length > maxContentLength;

        return (
          <Text key={msg.id}>
            {msg.role === "user" ? (
              <Text bold color="cyan">You: </Text>
            ) : msg.role === "assistant" ? (
              <Text bold color="magenta">Claude: </Text>
            ) : (
              <Text bold color="yellow">System: </Text>
            )}
            <Text dimColor={msg.role === "system"}>
              {content}
              {truncated ? "..." : ""}
            </Text>
          </Text>
        );
      })}
    </Box>
  );
}

export default MessageList;
