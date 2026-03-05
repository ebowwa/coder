/**
 * Hetzner authentication utilities
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export function getTokenFromCLI(): string {
  try {
    const configPath = join(homedir(), ".config", "hcloud", "cli.toml");
    if (existsSync(configPath)) {
      const config = readFileSync(configPath, "utf-8");
      const match = config.match(/token\s*=\s*["']([^"']+)["']/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return "";
}

export function isAuthenticated(apiToken: string): boolean {
  return apiToken.length > 0;
}

export function resolveApiToken(explicitToken?: string): string {
  if (explicitToken) {
    return explicitToken;
  }
  if (process.env.HETZNER_API_TOKEN) {
    return process.env.HETZNER_API_TOKEN;
  }
  return getTokenFromCLI();
}
