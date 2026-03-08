/**
 * Remote file operations via SSH
 */

import type { SSHOptions } from "./types.js";
import { execSSH } from "./client.js";
import { SSHError } from "./error.js";

/**
 * Path sanitization options
 */
export interface SanitizePathOptions {
  /**
   * Allowed base directories (absolute paths)
   * Default: ["/root"] for root user
   */
  allowedBaseDirs?: string[];

  /**
   * User context for determining default base directory
   */
  user?: string;

  /**
   * Whether to allow absolute paths
   * Default: false (security best practice)
   */
  allowAbsolutePaths?: boolean;

  /**
   * Maximum path depth to prevent deep traversal attempts
   * Default: 20
   */
  maxDepth?: number;

  /**
   * Log suspicious path attempts
   * Default: true
   */
  logSuspicious?: boolean;
}

/**
 * Path traversal security error
 */
export class PathTraversalError extends SSHError {
  constructor(
    message: string,
    public readonly attemptedPath: string,
    public readonly reason: string,
  ) {
    super(message);
    this.name = "PathTraversalError";
  }
}

/**
 * Security event log for path traversal attempts
 */
interface SecurityEvent {
  timestamp: string;
  attemptedPath: string;
  reason: string;
  severity: "blocked" | "suspicious" | "warning";
}

const securityEvents: SecurityEvent[] = [];
const MAX_SECURITY_EVENTS = 1000;

/**
 * Log a security event
 */
function logSecurityEvent(
  attemptedPath: string,
  reason: string,
  severity: SecurityEvent["severity"],
): void {
  const event: SecurityEvent = {
    timestamp: new Date().toISOString(),
    attemptedPath,
    reason,
    severity,
  };

  securityEvents.push(event);

  // Keep only recent events
  if (securityEvents.length > MAX_SECURITY_EVENTS) {
    securityEvents.shift();
  }

  // Log to console with appropriate severity
  const logPrefix = {
    blocked: "[SECURITY BLOCKED]",
    suspicious: "[SECURITY SUSPICIOUS]",
    warning: "[SECURITY WARNING]",
  }[severity];

  console.error(
    `${logPrefix} Path traversal attempt detected:`,
    JSON.stringify(event),
  );
}

/**
 * Get recent security events for monitoring
 */
export function getSecurityEvents(
  limit: number = 50,
): SecurityEvent[] {
  return securityEvents.slice(-limit);
}

/**
 * Clear old security events (for maintenance)
 */
export function clearSecurityEvents(olderThanMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - olderThanMs;
  const initialLength = securityEvents.length;

  for (let i = securityEvents.length - 1; i >= 0; i--) {
    const eventTime = new Date(securityEvents[i].timestamp).getTime();
    if (eventTime < cutoff) {
      securityEvents.splice(i, 1);
    }
  }

  return initialLength - securityEvents.length;
}

/**
 * Normalize a path by resolving . and removing redundant slashes
 * Does NOT resolve .. (those are checked separately)
 */
function normalizePath(path: string): string {
  // Remove redundant slashes
  let normalized = path.replace(/\/+/g, "/");

  // Remove trailing slash (unless it's just "/")
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  // Resolve single dots (current directory)
  normalized = normalized.replace(/\/\.\//g, "/").replace(/\/\.$/, "");

  return normalized;
}

/**
 * Check if a path contains parent directory references
 */
function hasParentDirReference(path: string): boolean {
  // Check for .. in path components
  const parts = path.split("/");
  return parts.some((part) => part === ".." || part.includes("\\.."));
}

/**
 * Check if path attempts to escape using null bytes
 */
function hasNullByte(path: string): boolean {
  return path.includes("\0");
}

/**
 * Calculate path depth (number of directories)
 */
function calculatePathDepth(path: string): number {
  return path.split("/").filter((p) => p.length > 0).length;
}

/**
 * Validate that a resolved path stays within allowed base directories
 */
function validatePathInAllowedDirs(
  resolvedPath: string,
  allowedDirs: string[],
): boolean {
  // Normalize all paths for comparison
  const normalizedResolved = normalizePath(resolvedPath);
  const normalizedAllowed = allowedDirs.map(normalizePath);

  // Check if resolved path starts with any allowed directory
  return normalizedAllowed.some((allowedDir) => {
    // Ensure allowed directory ends with / for proper prefix matching
    const prefix = allowedDir.endsWith("/") ? allowedDir : allowedDir + "/";
    return (
      normalizedResolved === allowedDir || normalizedResolved.startsWith(prefix)
    );
  });
}

/**
 * Resolve a path relative to a base directory
 * Throws if the result would escape the base directory
 */
function resolveRelativePath(
  baseDir: string,
  inputPath: string,
): string {
  const normalizedBase = normalizePath(baseDir);
  const normalizedInput = normalizePath(inputPath);

  // If input is absolute, reject (unless allowed by options)
  if (normalizedInput.startsWith("/")) {
    throw new Error("Absolute paths are not allowed");
  }

  // Build full path
  let fullPath = normalizedBase + "/" + normalizedInput;
  fullPath = normalizePath(fullPath);

  // Check for parent directory references in the full path
  if (hasParentDirReference(fullPath)) {
    throw new Error("Path contains parent directory references");
  }

  // Verify the path is still within base directory
  if (!fullPath.startsWith(normalizedBase + "/") && fullPath !== normalizedBase) {
    throw new Error("Path escapes allowed directory");
  }

  return fullPath;
}

/**
 * Sanitize and validate a file path for security
 *
 * This function prevents path traversal attacks by:
 * 1. Rejecting paths with .. components
 * 2. Validating against allowed base directories
 * 3. Normalizing paths to remove . and redundant /
 * 4. Checking for null bytes and other escape sequences
 * 5. Limiting path depth to prevent deep traversal
 *
 * @param inputPath - The user-provided path to sanitize
 * @param options - Sanitization options
 * @returns Sanitized absolute path
 * @throws PathTraversalError if path is suspicious or invalid
 *
 * @example
 * ```ts
 * // Safe: within /root
 * sanitizePath("project/file.txt", { user: "root" })
 * // Returns: "/root/project/file.txt"
 *
 * // BLOCKED: attempts to escape
 * sanitizePath("../../../etc/passwd", { user: "root" })
 * // Throws: PathTraversalError
 *
 * // BLOCKED: null byte injection
 * sanitizePath("file.txt\0../../../etc/passwd", { user: "root" })
 * // Throws: PathTraversalError
 * ```
 */
export function sanitizePath(
  inputPath: string,
  options: SanitizePathOptions = {},
): string {
  const {
    allowedBaseDirs,
    user = "root",
    allowAbsolutePaths = false,
    maxDepth = 20,
    logSuspicious = true,
  } = options;

  // Determine default allowed base directories based on user
  const defaultAllowedDirs = user === "root"
    ? ["/root"]
    : [`/home/${user}`, "/tmp"];

  const finalAllowedDirs = allowedBaseDirs || defaultAllowedDirs;

  // ===== SECURITY CHECKS =====

  // 1. Check for null byte injection (CWE-158)
  if (hasNullByte(inputPath)) {
    const error = "Path contains null byte (possible injection attempt)";
    if (logSuspicious) {
      logSecurityEvent(inputPath, "Null byte injection detected", "blocked");
    }
    throw new PathTraversalError(
      "Invalid path: contains null byte",
      inputPath,
      error,
    );
  }

  // 2. Check for parent directory references (CWE-22)
  if (hasParentDirReference(inputPath)) {
    const error = "Path contains parent directory reference (..)";
    if (logSuspicious) {
      logSecurityEvent(inputPath, "Path traversal attempt detected", "blocked");
    }
    throw new PathTraversalError(
      "Path traversal blocked: parent directory references not allowed",
      inputPath,
      error,
    );
  }

  // 3. Check for backslashes (Windows path separator, potential escape)
  if (inputPath.includes("\\")) {
    const error = "Path contains backslashes";
    if (logSuspicious) {
      logSecurityEvent(inputPath, "Backslash in path detected", "suspicious");
    }
    throw new PathTraversalError(
      "Invalid path: backslashes not allowed",
      inputPath,
      error,
    );
  }

  // 4. Check for URL-encoded characters (possible bypass attempt)
  if (/%2e|%2f|%5c/i.test(inputPath)) {
    const error = "Path contains URL-encoded characters";
    if (logSuspicious) {
      logSecurityEvent(inputPath, "URL encoding detected in path", "suspicious");
    }
    throw new PathTraversalError(
      "Invalid path: URL-encoded characters not allowed",
      inputPath,
      error,
    );
  }

  // 5. Check path depth
  const pathDepth = calculatePathDepth(inputPath);
  if (pathDepth > maxDepth) {
    const error = `Path depth ${pathDepth} exceeds maximum ${maxDepth}`;
    if (logSuspicious) {
      logSecurityEvent(inputPath, error, "suspicious");
    }
    throw new PathTraversalError(
      "Path too deep: possible traversal attempt",
      inputPath,
      error,
    );
  }

  // 6. Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.[\/\\]/,  // ../ or ..\
    /\/\.\./,       // /..
    /\.\.$/,        // ends with ..
    /^\.\./,        // starts with ..
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(inputPath)) {
      const error = `Path matches suspicious pattern: ${pattern}`;
      if (logSuspicious) {
        logSecurityEvent(inputPath, error, "blocked");
      }
      throw new PathTraversalError(
        "Path blocked: matches suspicious pattern",
        inputPath,
        error,
      );
    }
  }

  // ===== PATH RESOLUTION =====

  let sanitizedPath: string;

  if (inputPath.startsWith("/")) {
    // Handle absolute paths
    if (!allowAbsolutePaths) {
      const error = "Absolute paths are not allowed";
      if (logSuspicious) {
        logSecurityEvent(inputPath, error, "blocked");
      }
      throw new PathTraversalError(
        error + ": use relative paths only",
        inputPath,
        error,
      );
    }

    // Normalize the absolute path
    sanitizedPath = normalizePath(inputPath);

    // Validate against allowed directories
    if (!validatePathInAllowedDirs(sanitizedPath, finalAllowedDirs)) {
      const error = `Absolute path not within allowed directories: ${finalAllowedDirs.join(", ")}`;
      if (logSuspicious) {
        logSecurityEvent(inputPath, error, "blocked");
      }
      throw new PathTraversalError(
        "Access denied: path outside allowed directories",
        inputPath,
        error,
      );
    }
  } else {
    // Handle relative paths - resolve against each allowed base directory
    // Use the first valid resolution
    let resolved = false;

    for (const baseDir of finalAllowedDirs) {
      try {
        sanitizedPath = resolveRelativePath(baseDir, inputPath);
        resolved = true;
        break;
      } catch {
        // Try next base directory
        continue;
      }
    }

    if (!resolved) {
      const error = `Path cannot be resolved within allowed directories: ${finalAllowedDirs.join(", ")}`;
      if (logSuspicious) {
        logSecurityEvent(inputPath, error, "blocked");
      }
      throw new PathTraversalError(
        "Access denied: path outside allowed directories",
        inputPath,
        error,
      );
    }
  }

  // Final validation
  if (!sanitizedPath || sanitizedPath.length === 0) {
    throw new PathTraversalError(
      "Invalid path: resulted in empty path",
      inputPath,
      "Empty path after sanitization",
    );
  }

  return sanitizedPath;
}

export type FileType = "file" | "directory";

export interface RemoteFile {
  name: string;
  path: string;
  size: string;
  modified: string;
  type: FileType;
}

export type PreviewType = "text" | "image" | "binary" | "error";

export interface FilePreview {
  type: PreviewType;
  content?: string;
  error?: string;
}

/**
 * List files in a directory on remote server
 * @param path - Directory path to list (default: .)
 * @param options - SSH connection options
 * @returns List of files with metadata
 * @throws PathTraversalError if path attempts to escape allowed directories
 * @throws SSHError if SSH command fails
 */
export async function listFiles(
  path: string = ".",
  options: SSHOptions,
): Promise<RemoteFile[]> {
  const { host, user = "root", timeout = 5 } = options;

  // SECURITY: Sanitize path to prevent directory traversal attacks
  let sanitizedPath: string;
  try {
    sanitizedPath = sanitizePath(path, {
      user,
      allowAbsolutePaths: false,
      logSuspicious: true,
    });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      // Re-throw path traversal errors with security context
      throw error;
    }
    throw new SSHError(`Failed to sanitize path: ${path}`, error);
  }

  try {
    // Use sanitized path in command
    const command = `ls -la "${sanitizedPath}" 2>/dev/null || echo "FAILED"`;
    const output = await execSSH(command, { host, user, timeout });

    if (output === "FAILED" || output === "0") {
      throw new SSHError(
        `Failed to list directory: ${sanitizedPath} (original: ${path})`,
      );
    }

    const lines = output.split("\n").slice(1); // Skip first line (total)
    const files: RemoteFile[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 8) continue;

      const permissions = parts[0];
      const isDir = permissions.startsWith("d");
      const fileName = parts[8]?.split(" ->")[0] || parts[8]; // Handle symlinks

      // Build file path based on sanitized base path
      const filePath = `${sanitizedPath}/${fileName}`.replace(/\/\//g, "/");

      files.push({
        name: fileName,
        path: filePath,
        size: isDir ? "-" : parts[4],
        modified:
          parts[5] +
            " " +
            parts[6] +
            " " +
            parts[7]?.split(".").slice(0, 2).join(":") || "",
        type: isDir ? "directory" : "file",
      });
    }

    return files;
  } catch (error) {
    throw new SSHError(`Failed to list files: ${path}`, error);
  }
}

/**
 * Preview a file's content from remote server
 * @param filePath - Path to the file to preview
 * @param options - SSH connection options
 * @returns File content for preview
 * @throws PathTraversalError if path attempts to escape allowed directories
 * @throws SSHError if SSH command fails
 */
export async function previewFile(
  filePath: string,
  options: SSHOptions,
): Promise<FilePreview> {
  const { host, user = "root", timeout = 10 } = options;

  // SECURITY: Sanitize path to prevent directory traversal attacks
  let absolutePath: string;
  try {
    absolutePath = sanitizePath(filePath, {
      user,
      allowAbsolutePaths: false,
      logSuspicious: true,
    });
  } catch (error) {
    if (error instanceof PathTraversalError) {
      // Re-throw path traversal errors with security context
      return {
        type: "error",
        error: "Access denied: path outside allowed directories",
      };
    }
    return { type: "error", error: "Failed to validate file path" };
  }

  try {
    // Check if file exists (using sanitized path)
    const checkCmd = `test -f "${absolutePath}" && echo "EXISTS" || echo "NOFILE"`;
    const checkOutput = await execSSH(checkCmd, { host, user, timeout });

    if (checkOutput !== "EXISTS") {
      return { type: "error", error: "File not found" };
    }

    // Try to read file content to determine if it's text or binary
    const readCmd = `cat "${absolutePath}" 2>/dev/null || echo "READFAIL"`;
    const content = await execSSH(readCmd, { host, user, timeout: 15 });

    if (content === "READFAIL" || content === "0") {
      return { type: "error", error: "Failed to read file content" };
    }

    // Determine if content is text or binary by checking for null bytes and non-printable characters
    const hasNullBytes = content.includes("\u0000");
    // Count non-printable ASCII characters (excluding whitespace and common text chars)
    const nonPrintableCount = (content.match(/[\x00-\x08\x0E-\x1F]/g) || [])
      .length;
    const isLikelyBinary =
      hasNullBytes ||
      (content.length > 0 && nonPrintableCount / content.length > 0.3);

    // Check for image file extensions
    const imageExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".svg",
      ".webp",
      ".ico",
    ];
    const isImage = imageExtensions.some((ext) =>
      absolutePath.toLowerCase().endsWith(ext),
    );

    if (isImage) {
      return { type: "image", content: "[Image file - download to view]" };
    } else if (isLikelyBinary) {
      return { type: "binary", content: "[Binary file - download to view]" };
    } else {
      // Text file - limit content size for preview
      const maxPreviewSize = 10000; // 10KB max for preview
      const trimmedContent =
        content.length > maxPreviewSize
          ? content.slice(0, maxPreviewSize) + "\n\n... (truncated)"
          : content;

      return {
        type: "text",
        content: trimmedContent,
      };
    }
  } catch (error) {
    // Log the error for security auditing
    console.error(`[File Preview Error] path="${filePath}", sanitized="${absolutePath}", error=${error}`);

    // Return error without exposing internal details
    if (error instanceof SSHError || error instanceof PathTraversalError) {
      return { type: "error", error: "Access denied" };
    }
    return { type: "error", error: "Failed to preview file" };
  }
}
