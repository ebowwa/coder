/**
 * Text formatting utilities
 */

import type { Message, ContentBlock } from "../../../schemas/index.js";

/**
 * Convert API message content to text
 */
export function apiToText(msg: Message): string {
  if (typeof msg.content === "string") return msg.content;
  if (!Array.isArray(msg.content)) return "";
  return msg.content.map((b: ContentBlock) => {
    if (b.type === "text") return b.text;
    if (b.type === "tool_use") return `[Tool: ${b.name}]`;
    if (b.type === "tool_result") return b.is_error ? "[Error]" : "[Result]";
    return "";
  }).join("\n");
}

/**
 * Format elapsed time for display
 */
export function formatElapsedTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes}m`;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Format a loading message with spinner indicator
 */
export function formatLoadingMessage(message: string, isLoading: boolean): string {
  return isLoading ? `⏳ ${message}` : message;
}
