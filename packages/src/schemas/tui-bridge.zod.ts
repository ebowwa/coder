/**
 * TUI Bridge Schemas
 * Zod schemas for terminal user interface bridge
 */

import { z } from "zod";

// ============================================
// TUI SESSION SCHEMAS
// ============================================

export const TUISessionStateSchema = z.enum([
  "starting",
  "running",
  "paused",
  "stopping",
  "stopped",
]);

export const TUISessionSchema = z.object({
  id: z.string(),
  command: z.string(),
  name: z.string().optional(),
  state: TUISessionStateSchema,
  pid: z.number().optional(),
  createdAt: z.number(),
  lastActivity: z.number().optional(),
  terminalSize: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
});

// ============================================
// TUI INPUT SCHEMAS
// ============================================

export const TUIInputKeySchema = z.object({
  key: z.string(),
  ctrl: z.boolean().optional(),
  alt: z.boolean().optional(),
  shift: z.boolean().optional(),
});

export const TUIInputMouseSchema = z.object({
  x: z.number(),
  y: z.number(),
  button: z.enum(["left", "right", "middle"]).optional(),
  action: z.enum(["click", "scroll", "move"]),
});

// ============================================
// TUI OUTPUT SCHEMAS
// ============================================

export const TUIOutputSchema = z.object({
  text: z.string(),
  cursor: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
});

// ============================================
// TUI ANSI CODES SCHEMAS
// ============================================

export const ANSI_ESCAPE_CODES = z.object({
  SAVE_CURSOR: z.literal("\x1b[s"),
  RESTORE_CURSOR: z.literal("\x1b[u"),
  CLEAR_LINE: z.literal("\x1b[2K"),
  CLEAR_SCREEN: z.literal("\x1b[2J"),
  HIDE_CURSOR: z.literal("\x1b[?25l"),
  SHOW_CURSOR: z.literal("\x1b[?25h"),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type TUISessionState = z.infer<typeof TUISessionStateSchema>;
export type TUISession = z.infer<typeof TUISessionSchema>;
export type TUIInputKey = z.infer<typeof TUIInputKeySchema>;
export type TUIInputMouse = z.infer<typeof TUIInputMouseSchema>;
export type TUIOutput = z.infer<typeof TUIOutputSchema>;
