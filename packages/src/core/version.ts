/**
 * Version Management Module
 *
 * Dynamically reads version from package.json at runtime.
 * Falls back to a default version if package.json cannot be read.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Cache the version once loaded
let _version: string | null = null;

/**
 * Get the package version from package.json
 * Attempts to find package.json from multiple possible locations
 */
export function getVersion(): string {
  if (_version) {
    return _version;
  }

  // Try multiple paths to find package.json
  const possiblePaths = [
    // When running from project root
    join(process.cwd(), "package.json"),
    // When running from dist directory
    join(process.cwd(), "..", "package.json"),
    // When __dirname is available (compiled JS)
    typeof __dirname !== "undefined" ? join(__dirname, "..", "..", "..", "..", "..", "package.json") : null,
    // Import.meta.url based path (ESM)
    typeof import.meta !== "undefined" && import.meta.url
      ? join(new URL(import.meta.url).pathname, "..", "..", "..", "..", "..", "package.json")
      : null,
  ].filter(Boolean) as string[];

  for (const packagePath of possiblePaths) {
    try {
      if (existsSync(packagePath)) {
        const content = readFileSync(packagePath, "utf-8");
        const pkg = JSON.parse(content);
        if (pkg.version) {
          _version = pkg.version;
          return pkg.version;
        }
      }
    } catch {
      // Continue to next path
    }
  }

  // Fallback version if package.json not found
  _version = "0.0.0-unknown";
  return _version;
}

/**
 * Get build timestamp (ISO string)
 */
export function getBuildTime(): string {
  return new Date().toISOString();
}

// Export constants for convenience (lazy-loaded)
export const VERSION = getVersion();
export const BUILD_TIME = getBuildTime();
