/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
/**
 * Message Area Component - Simple plain text display
 */

import React from "react";
import { Text } from "ink";
import type { MessageAreaProps, UIMessage, MessageSubType } from "./types.js";
import { VERSION } from "../shared/status-line.js";

function getMessageColor(role: UIMessage["role"], subType?: MessageSubType, isError?: boolean): string {
  if (role === "system") {
    if (isError || subType === "error") return "red";
    if (subType === "tool_call") return "blue";
    if (subType === "tool_result") return "green";
    if (subType === "hook") return "yellow";
    if (subType === "thinking") return "gray";
    if (subType === "info") return "cyan";
    return "yellow";
  }
  switch (role) {
    case "user": return "cyan";
    case "assistant": return "magenta";
    default: return "white";
  }
}

function getMessageLabel(message: UIMessage): string {
  const { role, subType, toolName, isError } = message;

  if (role === "system" && subType) {
    switch (subType) {
      case "tool_call": return toolName ? `[${toolName}]` : "[Tool]";
      case "tool_result": return isError ? "[Error]" : "[Result]";
      case "hook": return "[Hook]";
      case "error": return "[Error]";
      case "thinking": return "[Thinking]";
      case "info": return "[Info]";
    }
  }

  switch (role) {
    case "user": return "You:";
    case "system": return "[System]";
    case "assistant": return "Claude:";
    default: return "";
  }
}

export function MessageArea({
  messages,
  isLoading,
  spinnerFrame,
  height,
  scrollOffset = 0,
  contextWarning,
  streamingText,
}: MessageAreaProps) {
  const totalMessages = messages.length;
  const maxVisibleMessages = 50;
  const endIdx = totalMessages - scrollOffset;
  const startIdx = Math.max(0, endIdx - maxVisibleMessages);
  const visibleMessages = messages.slice(startIdx, endIdx);

  const isEmpty = visibleMessages.length === 0 && !isLoading && !streamingText;

  return (
    <>
      {contextWarning && (
        <Text color="yellow" bold>Warning: {contextWarning}{"\n"}</Text>
      )}

      {isEmpty && (
        <Text dimColor>Welcome to Coder v{VERSION}. Type your message or /help for commands.{"\n"}</Text>
      )}

      {visibleMessages.map((msg) => {
        const displayContent = msg.content.length > 2000
          ? msg.content.slice(0, 2000) + "..."
          : msg.content;
        const color = getMessageColor(msg.role, msg.subType, msg.isError);
        const label = getMessageLabel(msg);

        return (
          <Text key={msg.id}>
            <Text bold color={color}>{label} </Text>
            <Text dimColor={msg.role === "system"}>{displayContent}{"\n"}</Text>
          </Text>
        );
      })}

      {streamingText && (
        <Text>
          <Text bold color="magenta">Claude: </Text>
          <Text dimColor>{streamingText.length > 500 ? "..." + streamingText.slice(-500) : streamingText}{"\n"}</Text>
        </Text>
      )}

      {isLoading && !streamingText && (
        <Text color="cyan">{spinnerFrame} Processing...{"\n"}</Text>
      )}
    </>
  );
}

export default MessageArea;
