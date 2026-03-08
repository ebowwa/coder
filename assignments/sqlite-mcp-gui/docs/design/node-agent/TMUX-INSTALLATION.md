# Issue: tmux Installation Should Be Via Cloud-Init, Not Fallback

**Status:** Open
**Priority:** Medium
**Created:** 2025-01-22

## Problem Statement

tmux is currently installed **on-demand** as a fallback mechanism when a user connects to a terminal via the web UI. This works but should not be the primary installation method. tmux should be installed via cloud-init during initial node provisioning.

## Current Behavior

### Fallback Installation (Current)

When a user connects to a node terminal via the web UI, the system:

1. Connects to the node via SSH
2. Checks if tmux is installed via `type tmux`
3. If not found, installs it via package manager (apt/yum/dnf/apk)
4. Then creates/attaches to the tmux session

**Files:**
- `workspace/src/lib/terminal/tmux.ts:62-100` - `installTmux()` function
- `workspace/src/lib/terminal/tmux.ts:111-121` - `ensureTmux()` function
- `workspace/src/lib/terminal/tmux.ts:154-231` - `createOrAttachTmuxSession()` calls `ensureTmux()`
- `workspace/src/lib/terminal/sessions.ts:244-256` - Terminal session creation triggers tmux setup

**Code snippet from `tmux.ts:62-100`:**
```typescript
export async function installTmux(
  host: string,
  user: string,
  keyPath: string
): Promise<{ success: boolean; message: string }> {
  // Detect package manager and install tmux
  const installCommands = {
    debian: "apt-get update -qq && apt-get install -y -qq tmux",
    redhat: "yum install -y -q tmux",
    fedora: "dnf install -y -q tmux",
    alpine: "apk add --no-cache tmux",
  };
  // ... installation logic
}
```

**Code snippet from `tmux.ts:111-121`:**
```typescript
export async function ensureTmux(
  sshOptions: SSHOptions
): Promise<{ success: boolean; message: string }> {
  const isInstalled = await checkTmuxInstalled(sshOptions);
  if (isInstalled) {
    return { success: true, message: "tmux already installed" };
  }
  return await installTmux(sshOptions.host, sshOptions.user, sshOptions.keyPath);
}
```

### Cloud-Init Bootstrap (Missing tmux)

The cloud-init script generated for worker nodes does **NOT** include tmux:

**File:** `workspace/src/lib/bootstrap/cloud-init.ts:31-65`
```typescript
export interface BootstrapOptions {
  // ...
  packages?: string[];
  // ...
}

export function generateSeedBootstrap(options: BootstrapOptions = {}): string {
  // ...
  lines.push("# Install required packages");
  lines.push("packages:");
  lines.push("  - git");
  lines.push("  - curl");
  lines.push("  - jq");
  lines.push("  - unzip");

  // Add additional packages
  for (const pkg of packages) {
    lines.push(`  - ${pkg}`);
  }
  // ...
}
```

**Calling code (no tmux passed):**
- `workspace/src/api.ts:472` - `const cloudInitScript = generateSeedBootstrap();`
- `workspace/src/routes/environments/crud.ts:334` - `const cloudInitScript = generateSeedBootstrap();`

## Why This Matters

1. **First terminal connection is slower** - tmux installation happens on first use
2. **Race conditions** - If multiple terminals connect simultaneously, multiple installation attempts could occur
3. **Network dependency** - Installation requires `apt-get update`, adding network latency
4. **Inconsistent with philosophy** - Other tools (git, curl, jq) are pre-installed via cloud-init

## Proposed Solution

Add `tmux` to the default packages in the cloud-init bootstrap:

### Option 1: Add to Default Packages

**File:** `workspace/src/lib/bootstrap/cloud-init.ts:56`

```typescript
lines.push("# Install required packages");
lines.push("packages:");
lines.push("  - git");
lines.push("  - curl");
lines.push("  - jq");
lines.push("  - unzip");
lines.push("  - tmux");  // <-- ADD THIS
```

### Option 2: Add via BootstrapOptions Parameter

**File:** `workspace/src/api.ts:472`

```typescript
const cloudInitScript = generateSeedBootstrap({
  packages: ["tmux"],
});
```

## Keep Fallback as Backup

The current `installTmux()` fallback should remain as a **backup mechanism** for:
- Nodes that were provisioned before this change
- Manual node provisioning outside of cheapspaces
- Recovery scenarios where cloud-init failed

**Add comment to indicate this is backup:**

**File:** `workspace/src/lib/terminal/tmux.ts:62`

```typescript
/**
 * Install tmux on the remote server
 *
 * NOTE: This is a FALLBACK mechanism. tmux should be installed via cloud-init
 * during initial node provisioning (see workspace/src/lib/bootstrap/cloud-init.ts).
 * This function exists for:
 * - Legacy nodes provisioned before cloud-init included tmux
 * - Manual node provisioning outside cheapspaces
 * - Recovery scenarios
 *
 * @see workspace/docs/design/node-agent/TMUX-INSTALLATION.md
 */
export async function installTmux(
  // ...
```

## Related Files

### Bootstrap/Cloud-Init:
- `workspace/src/lib/bootstrap/cloud-init.ts` - Cloud-init generator
- `workspace/src/lib/bootstrap/genesis.ts` - Genesis server bootstrap (includes tmux in development preset)
- `workspace/src/api.ts:472` - Calls `generateSeedBootstrap()`
- `workspace/src/routes/environments/crud.ts:334` - Calls `generateSeedBootstrap()`

### tmux Fallback Installation:
- `workspace/src/lib/terminal/tmux.ts:62-100` - `installTmux()` function
- `workspace/src/lib/terminal/tmux.ts:111-121` - `ensureTmux()` function
- `workspace/src/lib/terminal/tmux.ts:154-231` - `createOrAttachTmuxSession()`
- `workspace/src/lib/terminal/sessions.ts:244-256` - Terminal session creation
- `workspace/src/lib/terminal/manager.ts:264-267` - Multi-node tmux manager

### tmux API:
- `workspace/src/lib/terminal/api.ts` - REST API for tmux management
- `workspace/src/routes/terminal/tmux.ts` - tmux route handlers

## Genesis Server Note

The Genesis server bootstrap **already includes tmux** in the development preset:

**File:** `workspace/src/lib/bootstrap/genesis.ts:380`
```typescript
development: (adminSSHKey: string) =>
  generateGenesisBootstrap({
    adminSSHKey,
    packages: ["htop", "vim", "tmux", "strace"],
    // ...
  }),
```

Worker nodes should have the same treatment.

## Tasks

1. [ ] Add `tmux` to default packages in `generateSeedBootstrap()`
2. [ ] Add comment to `installTmux()` indicating it's a fallback mechanism
3. [ ] Update documentation to reflect tmux as pre-installed
4. [ ] Test with new node provisioning
5. [ ] Verify fallback still works for legacy nodes

## References

- Original bootstrap design: `docs/design/node-agent/node-bootstrapping.md`
- tmux terminal implementation: `workspace/src/lib/terminal/tmux.ts`
- Genesis bootstrap: `workspace/src/lib/bootstrap/genesis.ts`
