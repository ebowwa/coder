/**
 * Version Management Module
 *
 * Version is injected at build time via bun's --define flag.
 * Falls back to reading from package.json at runtime if not defined.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Build-time injected version (set via --define by build script)
declare const CODER_VERSION: string | undefined;

// Cache the version once loaded
let _version: string | null = null;

/**
 * Get the package version
 * Priority:
 * 1. Build-time injected CODER_VERSION
 * 2. package.json with name "@ebowwa/coder"
 * 3. Fallback to "0.0.0-unknown"
 */
export function getVersion(): string {
  if (_version) {
    return _version;
  }

  // Check for build-time injected version first
  if (typeof CODER_VERSION !== "undefined" && CODER_VERSION) {
    _version = CODER_VERSION;
    return _version;
  }

  // Try to find @ebowwa/coder package.json
  const cwd = process.cwd();
  const possiblePaths = [
    join(cwd, "package.json"),
    join(cwd, "..", "package.json"),
    join(cwd, "..", "..", "package.json"),
  ];

  for (const packagePath of possiblePaths) {
    try {
      if (existsSync(packagePath)) {
        const content = readFileSync(packagePath, "utf-8");
        const pkg = JSON.parse(content);
        // Only use if this is the coder package
        if (pkg.name === "@ebowwa/coder" && pkg.version) {
          const version = pkg.version as string;
          _version = version;
          return version;
        }
      }
    } catch {
      // Continue to next path
    }
  }

  // Fallback
  _version = "0.0.0-unknown";
  return _version;
}

/**
 * Get build timestamp (ISO string)
 */
export function getBuildTime(): string {
  return new Date().toISOString();
}

// Export constants (lazy-loaded)
export const VERSION = getVersion();
export const BUILD_TIME = getBuildTime();
