# Terminal Connection & Seed Installation

## Overview

When users connect to a terminal, the system automatically installs the [ebowwa/seed](https://github.com/ebowwa/seed) repository if it's not already present. This provides a consistent development environment across all VPS instances with tools like Claude Code, GitHub CLI, Tailscale VPN, Doppler secrets management, and MCP servers.

## User Experience

### First Connection (Fresh Server)

```
 Connecting to 46.224.35.21...
• Waiting for SSH connection to 46.224.35.21...
• SSH connected, checking seed installation...
• Seed not installed, installing...
• Cloning ebowwa/seed repository (feat/node-agent branch)...
• Running setup.sh with auto-confirmation...

[setup.sh output scrolls by - ~60-120 seconds]
- Tailscale VPN installation
- GitHub CLI installation
- Claude Code CLI installation
- Doppler CLI installation
- MCP servers configuration
...

• Seed installed successfully at /root/seed
✓ Connected to joyce
```

### Subsequent Connections

```
 Connecting to 46.224.35.21...
• Waiting for SSH connection to 46.224.35.21...
• SSH connected, checking seed installation...
• Seed already installed and setup complete
• Setup already completed, pulling latest...
✓ Connected to joyce
```

### Server Still Booting

```
 Connecting to 46.224.35.21...
• Waiting for SSH connection to 46.224.35.21...
• Server not ready yet (SSH command failed...) - terminal will connect when server is ready
⏳ Waiting for server... retrying in 5s (attempt 1/12)
```

## Technical Flow

### 1. WebSocket Connection

```
Client                          Server
  |                               |
  |------ WebSocket open -------->|
  |                               |
  |--- connect message ---------->|
  |    { host, user, sessionId,   |
  |      environmentId }          |
  |                               |
```

### 2. Session Creation (`sessions.ts:getOrCreateSession()`)

```
Server (getOrCreateSession)
  |
  |-- Check if reusing existing session
  |-- If no, create new session ID
  |
  |-- SSH Connectivity Check (NEW)
  |    |-- Try echo ok via SSH (3 attempts, 5s timeout)
  |    |-- If reachable → continue
  |    |-- If not reachable → skip seed install, continue to terminal
  |
  |-- Seed Installation (only if SSH reachable)
  |    |-- getSeedStatus() - check /root/seed and marker file
  |    |-- If not installed → installSeed()
  |    |    |-- git clone ebowwa/seed (feat/node-agent branch)
  |    |    |-- yes | bash setup.sh (3 minute timeout)
  |    |    |-- Create .seed-setup-complete marker
  |    |-- If already installed → git pull
  |
  |-- Tmux Session Setup
  |    |-- createOrAttachTmuxSession()
  |    |-- Install tmux if not present
  |    |-- Create/attach to named session
  |
  |-- Spawn SSH Process
  |    |-- Bun.spawn(ssh -t -t ... tmux new-session -A -s <name>)
  |    |-- Pipe stdin/stdout/stderr
  |
  |-- Return session object
```

### 3. Progress Messages

```
Server                          Client
  |                               |
  |<-- (SSH check runs) ----------|
  |                               |
  |--- progress message --------->|
  |    { type: "progress",        |
  |      message: "SSH connected...",|
  |      status: "info" }         |
  |                               |
  |<-- (git clone runs) ----------|
  |                               |
  |--- progress message --------->|
  |    { type: "progress",        |
  |      message: "Cloning repo...",|
  |      status: "info" }         |
  |                               |
  |<-- (setup.sh runs) -----------|
  |                               |
  |--- progress message --------->|
  |    { type: "progress",        |
  |      message: "Seed installed...",|
  |      status: "success" }      |
  |                               |
```

### 4. Terminal Ready

```
Server                          Client
  |                               |
  |--- session message ---------->|
  |    { type: "session",         |
  |      sessionId: "...",        |
  |      existing: false }        |
  |                               |
  |--- (start streaming stdout) -->|
  |                               |
  |<-- user types "ls" -----------|
  |--- (send to SSH) ------------>|
  |<-- (SSH response) ------------|
  |--- (stream to client) -------->|
```

## Code Architecture

### Backend Files

| File | Responsibility |
|------|---------------|
| `app/backend/shared/lib/terminal/sessions.ts` | Session lifecycle, seed install orchestration |
| `app/backend/shared/lib/seed/install.ts` | Seed cloning, setup.sh execution, progress callbacks |
| `app/backend/shared/lib/terminal/tmux.ts` | Tmux session creation/attachment |
| `app/backend/shared/lib/ssh/client.ts` | SSH execution via connection pool |
| `app/backend/shared/lib/ssh/pool.ts` | Persistent SSH connection pooling |
| `index.ts` | WebSocket handler, progress message routing |

### Frontend Files

| File | Responsibility |
|------|---------------|
| `app/browser-client/components/terminal/TerminalSheet.tsx` | xterm.js UI, WebSocket client, progress display |

## Progress Message Protocol

### Server → Client

```typescript
// Progress update during connection/setup
{
  type: "progress",
  message: string,
  status: "info" | "success" | "error"
}

// Session established
{
  type: "session",
  sessionId: string,
  existing: boolean,
  host: string,
  user: string
}

// Error
{
  type: "error",
  message: string
}

// Raw terminal output (non-JSON)
"<terminal bytes>"
```

### Client → Server

```typescript
// Initiate connection
{
  type: "connect",
  host: string,
  user: string,
  rows: number,
  cols: number,
  sessionId?: string,  // optional - reuse existing
  environmentId: string
}

// Terminal input
{
  type: "input",
  data: string  // raw keystrokes
}

// Terminal resize
{
  type: "resize",
  rows: number,
  cols: number
}
```

## Configuration

### Seed Repository

- **Repo**: `https://github.com/ebowwa/seed`
- **Branch**: `feat/node-agent`
- **Path**: `/root/seed`
- **Marker**: `.seed-setup-complete` (indicates setup.sh ran successfully)

### Installation Timeouts

| Operation | Timeout |
|-----------|----------|
| SSH connectivity check | 5s × 3 attempts |
| Git clone | 120s |
| setup.sh execution | 180s |
| Git pull | 30s |

### Tmux Session

- **Naming**: `codespaces-XX-XX-XX-XX` (based on IP)
- **Persistence**: Survives disconnections
- **Reconnection**: `tmux new-session -A -s <name>` attaches if exists

## Error Handling

### Server Not Ready (Boot Sequence)

```
SSH check fails (3 attempts)
  → Skip seed installation
  → Show: "Server not ready yet - terminal will connect when ready"
  → Create SSH connection anyway
  → Frontend retry logic handles booting
```

### Seed Installation Fails

```
Seed install throws error
  → Show error message in progress (red)
  → Show installation output preview
  → Continue to terminal connection
  → Terminal works even if seed fails
```

### Clone Times Out but Succeeds

```
Git clone command times out (>120s)
  → Check if directory exists anyway
  → If exists → continue with setup
  → If not exists → fail and show error
```

## Key Implementation Details

### SSH Reachability Check (sessions.ts:164-190)

Before attempting seed installation, the code first verifies SSH is reachable:

```typescript
let sshReachable = false;
for (let i = 0; i < 3; i++) {
  try {
    await execSSH("echo ok", { host, user, keyPath, timeout: 5 });
    sshReachable = true;
    break;
  } catch (err) {
    // Server might be booting, retry after 1s
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

This prevents scary error messages when servers are still booting.

### Progress Callback Pattern (install.ts:75-79)

A helper function logs to both output array and progress callback:

```typescript
const log = (msg: string) => {
  output.push(msg);
  onProgress?.(msg);  // Send to WebSocket
};
```

Every step in `installSeed()` uses this helper, ensuring real-time updates.

### Tmux Fallback (tmux.ts:195-218)

If tmux installation fails, falls back to plain SSH:

```typescript
try {
  const tmuxResult = await createOrAttachTmuxSession(...);
  sshCmd = tmuxResult.sshArgs;
} catch (tmuxError) {
  // Fallback to plain SSH without tmux
  sshCmd = ["ssh", "-o", "StrictHostKeyChecking=no", ...];
}
```

## Troubleshooting

### "Seed installation failed" errors

1. Check server logs for actual error
2. Verify SSH key is correct
3. Ensure server has internet connectivity
4. Check GitHub is accessible from server

### "Server not ready yet" message

1. Server is still booting (wait 30-60s for fresh Hetzner servers)
2. Frontend will auto-retry (up to 12 attempts, 5s intervals)
3. SSH port 22 must be open

### Terminal connects but seed not installed

1. Check if `/root/seed` directory exists on server
2. Check if `.seed-setup-complete` marker exists
3. Manual fix: `cd /root/seed && bash setup.sh`

## Future Improvements

See [`IMPROVEMENTS.md`](./IMPROVEMENTS.md) for planned enhancements.

---

**Last Updated**: 2025-01-19
**Related Docs**: [IMPROVEMENTS.md](./IMPROVEMENTS.md), [CLAUDE.md](./CLAUDE.md)
