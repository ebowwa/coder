/**
 * Chrome Bridge Schemas
 * Zod schemas for Chrome browser automation bridge
 */

import { z } from "zod";

// ============================================
// CHROME BRIDGE FEATURES SCHEMAS
// ============================================

export const ChromeBridgeFeaturesSchema = z.object({
  browserAutomation: z.boolean(),
  screenshots: z.boolean(),
  formInteraction: z.boolean(),
  networkMonitoring: z.boolean(),
  consoleLogs: z.boolean(),
  javascriptExecution: z.boolean(),
});

// ============================================
// CHROME BRIDGE TOOLS SCHEMAS
// ============================================

export const ChromeBridgeToolNameSchema = z.enum([
  "tabs_context",
  "tabs_create",
  "tabs_navigate",
  "tabs_resize",
  "tabs_execute_js",
  "tabs_find",
  "tabs_click",
  "tabs_select_option",
  "tabs_screenshot",
  "tabs_export_gif",
  "tabs_read_console",
  "tabs_read_network",
  "tabs_upload_image",
  "tabs_switch_browser",
]);

export const ChromeBridgeToolSchema = z.object({
  name: ChromeBridgeToolNameSchema,
  mcpName: z.string(),
  description: z.string(),
});

// ============================================
// CONNECTION EVENTS SCHEMAS
// ============================================

export const ChromeConnectionEventNameSchema = z.enum([
  "chrome_bridge_connection_started",
  "chrome_bridge_connection_succeeded",
  "chrome_bridge_connection_failed",
  "chrome_bridge_disconnected",
  "chrome_bridge_peer_connected",
  "chrome_bridge_peer_disconnected",
  "chrome_bridge_tool_call_started",
  "chrome_bridge_tool_call_completed",
  "chrome_bridge_tool_call_timeout",
  "chrome_bridge_tool_call_error",
  "chrome_bridge_reconnect_exhausted",
]);

export const ChromeConnectionEventSchema = z.object({
  name: ChromeConnectionEventNameSchema,
  timestamp: z.number(),
  data: z.unknown().optional(),
});

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

export const ChromeBridgeAuthenticationSchema = z.object({
  oauthToken: z.string().optional(),
  tabPairing: z.string().optional(),
});

// ============================================
// MESSAGE SCHEMAS
// ============================================

export const ChromeBridgeMessageTypeSchema = z.enum(["request", "response"]);

export const ChromeBridgeMessageSchema = z.object({
  type: ChromeBridgeMessageTypeSchema,
  payload: z.unknown(),
  timestamp: z.number(),
});

// ============================================
// RECONNECT SCHEMAS
// ============================================

export const ChromeBridgeReconnectConfigSchema = z.object({
  maxAttempts: z.number(),
  initialDelayMs: z.number(),
  exponentialBackoff: z.boolean(),
});

// ============================================
// TAB CONTEXT SCHEMAS
// ============================================

export const TabContextSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
  active: z.boolean().optional(),
  windowId: z.number().optional(),
});

export const TabsContextResultSchema = z.object({
  tabs: z.array(TabContextSchema),
  activeTab: TabContextSchema.optional(),
});

// ============================================
// SCREENSHOT SCHEMAS
// ============================================

export const ScreenshotOptionsSchema = z.object({
  fullPage: z.boolean().optional(),
  format: z.enum(["png", "jpeg"]).optional(),
  quality: z.number().min(1).max(100).optional(),
});

export const ScreenshotResultSchema = z.object({
  data: z.string(),
  mimeType: z.enum(["image/png", "image/jpeg"]),
  width: z.number(),
  height: z.number(),
});

// ============================================
// CONSOLE & NETWORK SCHEMAS
// ============================================

export const ConsoleLogEntrySchema = z.object({
  level: z.enum(["log", "warn", "error", "info", "debug"]),
  message: z.string(),
  timestamp: z.number(),
  url: z.string().optional(),
  lineNumber: z.number().optional(),
});

export const NetworkRequestEntrySchema = z.object({
  url: z.string(),
  method: z.string(),
  status: z.number(),
  timestamp: z.number(),
  duration: z.number().optional(),
  requestHeaders: z.record(z.string()).optional(),
  responseHeaders: z.record(z.string()).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ChromeBridgeFeatures = z.infer<typeof ChromeBridgeFeaturesSchema>;
export type ChromeBridgeToolName = z.infer<typeof ChromeBridgeToolNameSchema>;
export type ChromeBridgeTool = z.infer<typeof ChromeBridgeToolSchema>;
export type ChromeConnectionEventName = z.infer<typeof ChromeConnectionEventNameSchema>;
export type ChromeConnectionEvent = z.infer<typeof ChromeConnectionEventSchema>;
export type ChromeBridgeAuthentication = z.infer<typeof ChromeBridgeAuthenticationSchema>;
export type ChromeBridgeMessageType = z.infer<typeof ChromeBridgeMessageTypeSchema>;
export type ChromeBridgeMessage = z.infer<typeof ChromeBridgeMessageSchema>;
export type ChromeBridgeReconnectConfig = z.infer<typeof ChromeBridgeReconnectConfigSchema>;
export type TabContext = z.infer<typeof TabContextSchema>;
export type TabsContextResult = z.infer<typeof TabsContextResultSchema>;
export type ScreenshotOptions = z.infer<typeof ScreenshotOptionsSchema>;
export type ScreenshotResult = z.infer<typeof ScreenshotResultSchema>;
export type ConsoleLogEntry = z.infer<typeof ConsoleLogEntrySchema>;
export type NetworkRequestEntry = z.infer<typeof NetworkRequestEntrySchema>;
