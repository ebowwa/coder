/**
 * Route utility functions
 * Shared helpers for route handlers
 */

import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";

const execAsync = promisify(exec);

/**
 * Helper function to validate request body against Zod schema
 * Returns { success: true, data } or { success: false, error }
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: result.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Helper function to validate query parameters against Zod schema
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  query: Record<string, string | undefined>,
): { success: true; data: T } | { success: false; error: string } {
  return validateRequest(schema, query);
}

/**
 * Execute AppleScript and return stdout
 */
export async function runAppleScript(script: string): Promise<string> {
  // Escape single quotes in the script
  const escapedScript = script.replace(/'/g, "'\\''");
  const cmd = `osascript -e '${escapedScript}'`;

  try {
    const { stdout } = await execAsync(cmd);
    return stdout.trim();
  } catch (error) {
    throw new Error(`AppleScript execution failed: ${error}`);
  }
}
