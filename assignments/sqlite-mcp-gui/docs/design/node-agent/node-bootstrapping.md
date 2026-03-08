# Node Bootstrapping

## Problem Statement

When a new Hetzner server is created via cheapspaces, it boots as a **vanilla Ubuntu 24.04** image with only SSH keys attached. No automatic provisioning occurs, leaving nodes without the required services for full functionality.

**Current behavior:**
- Server boots vanilla Ubuntu 24.04
- SSH key is attached for authentication
- Node Agent shows "Not Running" in UI
- User must manually SSH in and run setup

**Required behavior:**
- Server boots and automatically installs dependencies
- Seed repo is cloned and setup.sh runs non-interactively
- Node Agent starts as a systemd service on port 8911
- UI immediately shows Node Agent status, Ralph Loops, and resource metrics

---

## Current Architecture

### Server Creation Flow

**File:** `app/backend/shared/api.ts` (lines 332-460)

```
POST /api/environments
    │
    ├─► ensureSSHKey()
    │       └─► Creates/retrieves SSH key from Hetzner
    │           Stores private key locally at ./.ssh-keys/hetzner-codespaces-default
    │
    ├─► hetznerClient.createServer({
    │       name,
    │       server_type,        // e.g., "cpx11", "cx23"
    │       ssh_keys: [keyId],  // SSH key IDs for root access
    │       location,           // e.g., "fsn1", "nbg1", "ash"
    │   })
    │       └─► NO user_data field (cloud-init not used)
    │
    ├─► setMetadata({ id, sshKeyPath })
    │       └─► Stores to local SQLite: ./db/metadata.db
    │
    └─► Returns { environment, actions, nextPollAt }
```

### createServer Schema

**File:** `app/backend/shared/lib/hetzner/servers.ts` (lines 67-77)

```typescript
const createServerOptionsSchema = z.object({
  name: z.string().min(1),
  server_type: z.string().min(1).default("cpx11"),
  image: z.string().min(1).default("ubuntu-24.04"),
  location: z.string().min(1).optional(),
  datacenter: z.string().min(1).optional(),
  ssh_keys: z.array(z.union([z.string(), z.number()])).default([]),
  volumes: z.array(z.number()).default([]),
  labels: z.record(z.string(), z.any()).optional(),
  start_after_create: z.boolean().default(true),
  // MISSING: user_data field for cloud-init
});
```

**Hetzner API supports but we don't use:**
- `user_data` - Cloud-init script (base64 encoded or raw)
- `automount` - Auto-mount volumes
- `firewalls` - Attach firewall rules

### SSH Key Management

**File:** `app/backend/shared/api.ts` (lines 88-170)

```
ensureSSHKey()
    │
    ├─► Check if ./.ssh-keys/hetzner-codespaces-default exists
    │
    ├─► If not, generate new Ed25519 key pair:
    │       ssh-keygen -t ed25519 -f {keyPath} -N "" -C "cheapspaces"
    │
    ├─► Upload public key to Hetzner API:
    │       POST /ssh_keys { name, public_key }
    │
    └─► Returns { keyId, name, keyPath, fingerprint }
```

### Node Agent Polling

**File:** `app/backend/shared/api.ts` (lines 1070-1200)

```
GET /api/environments/:id/node-agent
    │
    ├─► hetznerClient.getServer(serverId)
    │       └─► Gets server IP from Hetzner API
    │
    ├─► getMetadata(id)
    │       └─► Reads from SQLite (triggers validation warning with old datetime format)
    │
    ├─► Try Tailscale connection:
    │       fetch(`http://${tailscaleHostname}.tail-scale-alias.ts.net:8911/api/status`)
    │
    └─► Fallback to SSH check:
        execSSHParallel({ "node-agent-check": "curl -s http://localhost:8911/api/status" })
```

---

## Hetzner API: user_data Parameter

### API Reference

**Endpoint:** `POST https://api.hetzner.cloud/v1/servers`

**Documentation:**
- [Hetzner Cloud API Reference](https://docs.hetzner.cloud/reference/cloud)
- [Basic Cloud Config Tutorial](https://community.hetzner.com/tutorials/basic-cloud-config/)
- [Cloud-Init Official Examples](https://cloudinit.readthedocs.io/en/latest/reference/examples.html)

### user_data Field

| Property | Value |
|----------|-------|
| Type | `string` |
| Required | No |
| Size Limit | **32 KiB** |
| Format | Raw YAML or `#include\n{url}` |
| Execution | First boot only |

### Example API Call

```bash
curl -X POST \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-server",
    "server_type": "cx23",
    "image": "ubuntu-24.04",
    "ssh_keys": [12345],
    "location": "fsn1",
    "user_data": "#cloud-config\npackage_update: true\npackages:\n  - git\n  - curl\nruncmd:\n  - echo \"Bootstrap complete\" > /root/ready"
  }' \
  "https://api.hetzner.cloud/v1/servers"
```

### Remote Config via #include

For configs exceeding inline limits or for reusability:

```
#include
https://raw.githubusercontent.com/ebowwa/seed/main/cloud-init.yaml
```

The server fetches the config from the URL at boot time.

### Cloud-Init YAML Modules

#### packages - Install apt packages

```yaml
#cloud-config
package_update: true    # apt update
package_upgrade: true   # apt upgrade

packages:
  - git
  - curl
  - jq
  - htop
  - [nginx, 1.18.0-0ubuntu1]  # Specific version
```

#### write_files - Create files on disk

```yaml
write_files:
  - path: /etc/systemd/system/node-agent.service
    permissions: '0644'
    content: |
      [Unit]
      Description=Node Agent
      After=network.target

      [Service]
      Type=simple
      ExecStart=/usr/local/bin/node-agent
      Restart=always
      RestartSec=5

      [Install]
      WantedBy=multi-user.target

  - path: /opt/config.json
    permissions: '0600'
    encoding: b64
    content: eyJrZXkiOiAidmFsdWUifQ==  # Base64 encoded
```

#### runcmd - Execute shell commands

```yaml
runcmd:
  # Simple string (runs via sh)
  - echo "Hello from cloud-init"

  # List format (execve-style, no shell interpretation)
  - [git, clone, "https://github.com/ebowwa/seed", /opt/seed]

  # Complex shell commands
  - |
    cd /opt/seed
    export NONINTERACTIVE=1
    bash ./setup.sh

  # Systemd operations
  - systemctl daemon-reload
  - systemctl enable node-agent
  - systemctl start node-agent
```

#### users - Create user accounts

```yaml
users:
  - name: deploy
    groups: [sudo, docker]
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-ed25519 AAAA...
```

#### power_state - Reboot after completion

```yaml
power_state:
  mode: reboot
  message: "Cloud-init complete, rebooting"
  timeout: 30
  condition: true
```

### Complete Bootstrap Example

```yaml
#cloud-config

# System updates
package_update: true
package_upgrade: true

# Required packages
packages:
  - git
  - curl
  - jq
  - htop
  - build-essential

# Create systemd service file
write_files:
  - path: /etc/systemd/system/node-agent.service
    permissions: '0644'
    content: |
      [Unit]
      Description=Cheapspaces Node Agent
      After=network.target

      [Service]
      Type=simple
      WorkingDirectory=/opt/node-agent
      ExecStart=/opt/node-agent/bin/node-agent
      Restart=always
      RestartSec=5
      Environment=PORT=8911

      [Install]
      WantedBy=multi-user.target

  - path: /root/.bootstrap-status
    content: |
      status=started
      started_at=$(date -Iseconds)

# Bootstrap commands
runcmd:
  # Clone seed repository
  - git clone https://github.com/ebowwa/seed /opt/seed

  # Run seed setup non-interactively
  - |
    cd /opt/seed
    export NONINTERACTIVE=1
    bash ./setup.sh 2>&1 | tee /var/log/seed-setup.log

  # Clone/install Node Agent
  - git clone https://github.com/ebowwa/node-agent /opt/node-agent
  - cd /opt/node-agent && ./install.sh

  # Enable and start Node Agent
  - systemctl daemon-reload
  - systemctl enable node-agent
  - systemctl start node-agent

  # Mark bootstrap complete
  - echo "status=complete" > /root/.bootstrap-status
  - echo "completed_at=$(date -Iseconds)" >> /root/.bootstrap-status

# Reboot to ensure clean state
power_state:
  mode: reboot
  message: "Bootstrap complete"
  timeout: 30
  condition: true
```

### Verifying Cloud-Init Completion

**On the server:**
```bash
# Check cloud-init status
cloud-init status

# View cloud-init logs
cat /var/log/cloud-init-output.log

# Check specific module logs
cat /var/log/cloud-init.log | grep runcmd
```

**From Hetzner Console:**
- Go to server → Graphs
- Wait until CPU usage drops to near zero
- Cloud-init is complete when activity subsides

### Size Considerations

The 32KiB limit means:
- Inline configs work for simple setups
- Complex configs should use `#include` with hosted YAML
- Binary data should be base64 encoded in `write_files`
- Large scripts should be fetched via `runcmd` curl/wget

---

## What Needs to Run on Nodes

### Seed Repository

**Reference:** `app/backend/shared/lib/seed/install.ts`

```bash
git clone https://github.com/ebowwa/seed
cd seed
bash ./setup.sh
```

**setup.sh installs:**
1. **Doppler CLI** - Secrets management
2. **GitHub CLI** - Repository access
3. **Claude Code CLI** - AI-assisted development

### Node Agent Service

**Expected endpoint:** `http://localhost:8911/api/status`

**File:** `app/shared/types.ts` (lines 393-400)

```typescript
interface NodeAgentStatus {
  node_id: string;
  hostname: string;
  tailscale_ip: string;
  capacity: {
    cpu_percent: number;
    memory_percent: number;
    disk_percent: number;
  };
  worktrees: Worktree[];
  ralph_loops: RalphLoop[];
}
```

**Node Agent provides:**
- System resource metrics (CPU, memory, disk)
- Active Ralph Loops (automated coding sessions)
- Git worktrees management
- Health check endpoint

### UI Expectations

**File:** `app/browser-client/components/environments/NodeServices.tsx`

The NodeServices component expects:
- `GET /api/environments/:id/node-agent` to return running status
- Resource bars for CPU/Memory/Disk
- List of active Ralph Loops with iteration progress
- List of git worktrees

Currently shows: "Node Agent is not running on this server."

---

## Implementation Requirements

### 1. Add user_data to CreateServerOptions

**File:** `app/backend/shared/lib/hetzner/servers.ts`

```typescript
const createServerOptionsSchema = z.object({
  // ... existing fields ...
  user_data: z.string().optional(), // Cloud-init script
});
```

### 2. Create Cloud-Init Bootstrap Script

```yaml
#cloud-config
package_update: true
package_upgrade: true

packages:
  - git
  - curl
  - jq

runcmd:
  # Clone seed repo
  - git clone https://github.com/ebowwa/seed /opt/seed

  # Run setup non-interactively
  - cd /opt/seed && NONINTERACTIVE=1 bash ./setup.sh

  # Install Node Agent
  - # [Node Agent installation commands]

  # Start Node Agent as systemd service
  - systemctl enable node-agent
  - systemctl start node-agent

write_files:
  - path: /etc/systemd/system/node-agent.service
    content: |
      [Unit]
      Description=Cheapspaces Node Agent
      After=network.target

      [Service]
      Type=simple
      ExecStart=/usr/local/bin/node-agent
      Restart=always
      RestartSec=5

      [Install]
      WantedBy=multi-user.target
```

### 3. Pass user_data on Server Creation

**File:** `app/backend/shared/api.ts`

```typescript
response = await hetznerClient.createServer({
  name,
  server_type: serverType,
  ssh_keys: [sshKeyInfo.keyId],
  ...(location && { location }),
  user_data: bootstrapScript, // Add cloud-init
});
```

### 4. Node Agent Repository/Binary

Need to create or specify:
- Node Agent source code location
- How it gets built/distributed
- Systemd service configuration
- Port 8911 binding
- API endpoints (/api/status, etc.)

---

## Environment Metadata Schema

**File:** `app/shared/types.ts` (lines 258-302)

```typescript
permissions?: {
  // Seed/clone configuration
  seedConfig?: {
    sourceEnvironmentId?: string;   // Clone from existing env
    dependencySnapshot?: string;    // Lock file snapshot
    setupScript?: string;           // Custom setup script
  };

  // Authentication providers
  logins?: {
    github?: { enabled: boolean; username?: string; tokenScopes?: string[] };
    doppler?: { enabled: boolean; project?: string; config?: string };
    tailscale?: { enabled: boolean; authKey?: string; hostname?: string };
  };

  // VPN configurations
  vpns?: Array<{
    name: string;
    type: "wireguard" | "openvpn" | "tailscale";
    config: string;
    connected: boolean;
  }>;

  plugins?: Record<string, ClaudeCodePlugin>;
};
```

These metadata fields should inform the cloud-init script:
- `seedConfig.setupScript` - Custom setup commands
- `logins.doppler` - Doppler CLI authentication
- `logins.github` - GitHub CLI authentication
- `logins.tailscale` - Tailscale VPN setup

---

## SSH Connection Timeline

After server creation, SSH becomes available in stages:

```
t=0s    Server created (Hetzner API returns)
t=10s   Server booting (status: "initializing")
t=30s   Server running (status: "running")
t=45s   SSH daemon starting
t=60s   SSH accepting connections (port 22 open)
t=90s   Cloud-init running (if user_data provided)
t=120s+ Cloud-init complete, Node Agent starting
```

**Current issue:** Terminal tries to SSH before port 22 is ready:
```
[Terminal] stderr: ssh: connect to host 49.13.5.208 port 22: Connection refused
```

Need to implement SSH readiness polling before allowing terminal connections.

---

## Files to Modify

| File | Change |
|------|--------|
| `app/backend/shared/lib/hetzner/servers.ts` | Add `user_data` to schema |
| `app/backend/shared/lib/hetzner/types.ts` | Add `user_data` to `CreateServerOptions` type |
| `app/backend/shared/api.ts` | Pass cloud-init script in createServer call |
| `app/backend/shared/lib/seed/install.ts` | Expand with actual bootstrap logic |
| NEW: `app/backend/shared/lib/bootstrap/cloud-init.ts` | Cloud-init script generator |
| NEW: Node Agent source | Service that runs on port 8911 |

---

## Related Issues

### DateTime Validation Warning

**Current:** SQLite `CURRENT_TIMESTAMP` produces `2025-01-18 12:34:56`
**Expected:** Zod `z.string().datetime()` expects `2025-01-18T12:34:56Z`

**Fixed in:** `app/backend/shared/lib/metadata.ts`
- Changed `DEFAULT CURRENT_TIMESTAMP` to `DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))`
- Changed INSERT/UPDATE statements to use `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`

**Note:** Existing records still have old format. Delete `db/metadata.db` or run migration.

### Request Timeout

```
[Bun.serve]: request timed out after 10 seconds
```

Long-running operations (server creation, SSH checks) may exceed default timeout. Consider:
- Increasing `idleTimeout` in Bun.serve()
- Moving long operations to background jobs
- Using action polling instead of blocking requests

---

---

## Troubleshooting

### `/usr/bin/env: 'node': No such file or directory`

**Symptom:**
```bash
root@server:~# doppler run --project seed --config prd -- which node
/usr/bin/env: 'node': No such file or directory

root@server:~# which node
# (no output)

root@server:~# node --version
Command 'node' not found, but can be installed with:
apt install nodejs
```

**Cause:**
- Seed repository `setup.sh` or tooling expects `node` command
- Only Bun is installed, not Node.js
- Some tools have hardcoded `#!/usr/bin/env node` shebangs

**Solutions:**

| Solution | Command | Pros | Cons |
|----------|---------|------|------|
| **Symlink Bun as node** | `bun install -g node` | One runtime, fast | Not 100% Node.js compatible |
| **Install Node.js via apt** | `apt install -y nodejs` | Full compatibility | Two runtimes to maintain |
| **Install Node via NodeSource** | `curl -fsSL https://deb.nodesource.com/setup_lts.x \| bash - && apt install -y nodejs` | Latest LTS | Extra steps |

**Recommended:** Symlink Bun as node (per project guidelines to default to Bun)

**Add to cloud-init `runcmd`:**
```yaml
runcmd:
  # Install Bun and create node symlink
  - curl -fsSL https://bun.sh/install | bash
  - /root/.bun/bin/bun install -g node  # Creates 'node' symlink to bun
```

---

### `systemctl status node-agent` - Unit not found

**Symptom:**
```bash
root@server:~# systemctl status node-agent
Unit node-agent.service could not be found.
```

**Cause:**
- systemd service file was never created
- Service not enabled/started after installation

**Solution:** Add systemd service to cloud-init `write_files`:

```yaml
write_files:
  - path: /etc/systemd/system/node-agent.service
    permissions: '0644'
    content: |
      [Unit]
      Description=Node Agent for Ralph Loop Orchestration
      After=network.target

      [Service]
      Type=simple
      WorkingDirectory=/opt/node-agent
      ExecStart=/root/.bun/bin/bun run src/index.ts
      Restart=always
      RestartSec=5
      Environment=PORT=8911
      Environment="PATH=/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

      [Install]
      WantedBy=multi-user.target

runcmd:
  # Enable and start Node Agent
  - systemctl daemon-reload
  - systemctl enable node-agent
  - systemctl start node-agent
```

**Verify:**
```bash
# Check service status
systemctl status node-agent

# View logs
journalctl -u node-agent -f

# Test endpoint
curl http://localhost:8911/api/status
```

---

### Doppler CLI not authenticating

**Symptom:**
```bash
root@server:~# doppler run --project seed --config prd -- which node
Doppler Error: No tokens configured for scope (cli)
```

**Cause:**
- Doppler CLI installed but not authenticated
- No `DOPPLER_TOKEN` environment variable

**Solutions:**

1. **Pass token via environment (recommended for automation):**
```yaml
runcmd:
  - export DOPPLER_TOKEN="dp.x.xxxxx" && doppler run --project seed --config prd -- your-command
```

2. **Authenticate interactively (not for cloud-init):**
```bash
doppler login
```

3. **Service token in systemd:**
```ini
[Service]
Environment="DOPPLER_TOKEN=dp.x.xxxxx"
```

---

## Open Questions

1. **Node Agent source** - Where does the Node Agent binary/code live?
2. **Doppler integration** - How to pass auth keys to cloud-init securely?
3. **Tailscale setup** - Pre-auth keys vs interactive auth?
4. **SSH readiness** - Implement polling or use Hetzner action completion?
5. **Custom setup scripts** - How should seedConfig.setupScript be injected?
