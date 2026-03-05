/**
 * SSH utility library - modular entry point
 * Refactored from monolithic ssh.ts
 */

// Types
export type { SSHOptions, SCPOptions } from "./types.js";

// Error
export { SSHError } from "./error.js";

// Core client
export { execSSH } from "./client.js";

// Command execution
export { execSSHParallel, testSSHConnection } from "./exec.js";

// Tmux-based command execution (consolidates SSH connections)
export { execViaTmux, execViaTmuxParallel } from "./tmux-exec.js";

// SCP operations
export { scpUpload, scpDownload } from "./scp.js";

// File operations
export {
  listFiles,
  previewFile,
  sanitizePath,
  PathTraversalError,
  getSecurityEvents,
  clearSecurityEvents,
  type FileType,
  type RemoteFile,
  type PreviewType,
  type FilePreview,
  type SanitizePathOptions,
} from "./files.js";

// Fingerprint utilities
export { getSSHFingerprint, getLocalKeyFingerprint, normalizeFingerprint, validateSSHKeyMatch, testSSHKeyConnection, validateSSHKeyForServer, SSHKeyMismatchError } from "./fingerprint.js";

// PTY (interactive terminal) operations
export {
  createPTYSession,
  writeToPTY,
  setPTYSize,
  readFromPTY,
  closePTYSession,
  getPTYSession,
  getActivePTYSessions,
  cleanupStaleSessions,
} from "./pty.js";

// Connection pool management
export {
  getSSHPool,
  closeGlobalSSHPool,
  getActiveSSHConnections,
  SSHConnectionPool,
} from "./pool.js";

// Doppler integration
export {
  parseDopplerLoginOutput,
  dopplerLoginRemote,
  checkDopplerAuth,
  getDopplerStatus,
  dopplerRun,
  type DopplerLoginInfo,
} from "../doppler.js";
