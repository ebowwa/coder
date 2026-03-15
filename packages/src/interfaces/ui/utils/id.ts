/**
 * ID Generation utilities
 */

let messageId = 0;

/**
 * Generate a unique message ID
 */
export function genId(): string {
  return `msg-${++messageId}-${Date.now()}`;
}

/**
 * Reset message ID counter (for testing)
 */
export function resetMessageId(): void {
  messageId = 0;
}
