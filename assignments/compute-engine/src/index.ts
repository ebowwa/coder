/**
 * Compute Engine - High-performance hash computation
 *
 * Exports the native module and TypeScript types
 */

export interface HashResult {
  path: string;
  xxhash: string;
  sha256: string;
  blake3: string;
  size: string | number;  // Native returns string, fallback returns number
  duration_ms: number;
  error?: string;
}

export interface HashOptions {
  chunk_size?: number;
  xxhash?: boolean;
  sha256?: boolean;
  blake3?: boolean;
}

export interface FileInfo {
  path: string;
  exists: boolean;
  is_file: boolean;
  is_dir: boolean;
  is_symlink: boolean;
  size: number;
  error?: string;
}

export interface BenchmarkResult {
  data_size_mb: number;
  xxhash_ms: number;
  sha256_ms: number;
  blake3_ms: number;
  xxhash_mbps: number;
  sha256_mbps: number;
  blake3_mbps: number;
}

// Native module loader
async function loadNative() {
  const platforms = [
    "darwin-arm64",
    "darwin-x64",
    "linux-arm64",
    "linux-x64",
    "win32-x64",
  ];

  for (const platform of platforms) {
    try {
      return await import(`../native/compute-engine.${platform}.node`);
    } catch {}
  }

  throw new Error("Native module not found. Run `bun run build:native` first.");
}

export const native = {
  load: loadNative,
};

// CLI exports - use native.load() for programmatic access
// The CLI module is an entry point, not a library
