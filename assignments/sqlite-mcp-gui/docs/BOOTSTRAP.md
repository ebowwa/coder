# Cloud-Init Bootstrap Documentation

## Overview

The bootstrap system automates the provisioning of Hetzner servers using cloud-init. When a new server is created, it automatically installs the seed repository and runs the setup script non-interactively, preparing the environment for development work.

**Complexity:** Simple to Medium (depending on customization needs)

## What the Bootstrap Does

The bootstrap script (`generateSeedBootstrap()` in `app/backend/shared/lib/bootstrap/cloud-init.ts`) performs the following:

1. **System Updates**
   - Runs `apt update` and `apt upgrade`
   - Installs required packages: git, curl, jq, unzip

2. **PATH Configuration**
   - Writes `/etc/environment` to include bun in system-wide PATH
   - Ensures tools are available in all shell sessions (interactive and non-interactive)

3. **Seed Repository Installation**
   - Clones the seed repo to `/root/seed`
   - Runs `setup.sh` non-interactively with `NONINTERACTIVE=1`
   - Logs output to `/var/log/seed-setup.log`

4. **Status Tracking**
   - Creates `/root/.bootstrap-status` with timestamps
   - Marks setup complete at `/root/seed/.seed-setup-complete`

## The PATH Persistence Problem

### Problem Discovery

After the initial successful bootstrap, SSH sessions couldn't find the `bun` command:

```bash
$ bun --version
bash: bun: command not found

$ which bun
# (empty output)

$ ls -la /root/.bun/bin/bun
# exists and is executable
```

**Root Cause:** Different SSH session types don't source the same shell configuration files:

| Shell Type | Sources `.bashrc` | Sources `.profile` | Sources `/etc/environment` |
|------------|-------------------|-------------------|----------------------------|
| Interactive login | Yes | Yes | Yes |
| Interactive non-login | Yes | No | Yes |
| Non-interactive (SSH with commands) | No | No | Yes |

### Failed Attempts

#### v1: `/etc/profile.d/bun.sh` (Failed)

```yaml
write_files:
  - path: /etc/profile.d/bun.sh
    content: |
      export PATH="/root/.bun/bin:$PATH"
```

**Why it failed:** Only sourced by interactive shells. SSH with commands like `ssh root@host "bun --version"` doesn't source profile.d.

#### v2: `/root/.bashrc` Append (Failed)

```yaml
runcmd:
  - echo 'export PATH="/root/.bun/bin:$PATH"' >> /root/.bashrc
```

**Why it failed:** `.bashrc` is only sourced by interactive shells. Non-interactive SSH sessions skip it entirely.

#### v3: `/etc/environment` Append (Corrupted File)

```yaml
write_files:
  - path: /etc/environment
    content: |
      PATH="$PATH:/root/.bun/bin"
```

**Why it failed:** `/etc/environment` doesn't support variable expansion. The literal string `$PATH` was included, breaking the PATH.

#### v4: `/etc/environment` Replacement (Success)

```yaml
write_files:
  - path: /etc/environment
    content: |
      PATH="/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
```

**Why it works:** Complete PATH with all standard paths, no variable expansion needed.

## Lessons Learned

### About `/etc/environment`

**Critical Format Rules:**
- Simple `KEY="value"` pairs only
- No variable expansion (`$PATH` won't work)
- No comments (lines starting with `#` are invalid)
- No multi-line blocks
- No shell syntax (this is parsed by PAM, not bash)

**Example of correct format:**
```
PATH="/custom/bin:/usr/bin:/bin"
LANG="en_US.UTF-8"
EDITOR="vim"
```

**Example of incorrect format:**
```
# This comment will break the file
PATH="$PATH:/custom/bin"
```

### About Shell Configuration Files

| File | When It's Sourced | Best For |
|------|-------------------|----------|
| `/etc/environment` | All sessions (PAM level) | System-wide PATH and environment variables |
| `/etc/profile` | Login shells | System-wide shell initialization |
| `/etc/profile.d/*` | Login shells | Modular system-wide configuration |
| `~/.profile` | Login shells | User-specific environment setup |
| `~/.bashrc` | Interactive shells | Aliases, functions, shell-specific settings |

### About Cloud-Init

**Key behaviors:**
- Runs only on first boot
- Executes as root
- Logs to `/var/log/cloud-init-output.log`
- Status can be checked with `cloud-init status`

**Best practices:**
- Use absolute paths everywhere
- Don't rely on shell expansions in `write_files`
- Test bootstrap scripts on disposable servers
- Include status markers for debugging

## Final Working Bootstrap YAML

```yaml
#cloud-config

# Update system packages
package_update: true
package_upgrade: true

# Install required packages
packages:
  - git
  - curl
  - jq
  - unzip

# Write bootstrap status file
write_files:
  - path: /root/.bootstrap-status
    owner: root:root
    permissions: '0644'
    content: |
      status=started
      started_at=$(date -Iseconds)
      source=cloud-init

  # Add bun to /etc/environment for all users/shells
  # Format: Simple KEY="value" pairs, no variable expansion
  - path: /etc/environment
    owner: root:root
    permissions: '0644'
    content: |
      PATH="/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Bootstrap commands
runcmd:
  # Clone seed repository
  - git clone --depth 1 --branch Bun-port https://github.com/ebowwa/seed /root/seed

  # Run seed setup non-interactively
  - cd /root/seed && NONINTERACTIVE=1 bash ./setup.sh 2>&1 | tee /var/log/seed-setup.log

  # Mark setup complete
  - touch /root/seed/.seed-setup-complete

  # Mark bootstrap complete
  - echo "status=complete" >> /root/.bootstrap-status
  - echo "completed_at=$(date -Iseconds)" >> /root/.bootstrap-status
```

## How to Test the Bootstrap Manually

### Method 1: Generate and Review YAML

```bash
cd /Users/ebowwa/apps/com.hetzner.codespaces
bun run scripts/generate-bootstrap.ts
```

This outputs the YAML to stdout for review before deployment.

### Method 2: Automated Test Server

```bash
cd /Users/ebowwa/apps/com.hetzner.codespaces
bun run scripts/test-bootstrap.ts
```

This script:
1. Generates the bootstrap YAML
2. Creates a test Hetzner server (cx22, Ubuntu 24.04)
3. Waits for the server to be ready
4. Provides SSH verification steps

**Note:** Requires `HCLOUD_TOKEN` environment variable to be set.

### Method 3: Manual Server Creation

```bash
# Generate the bootstrap YAML
bun run scripts/generate-bootstrap.ts > bootstrap.yaml

# Create server with Hetzner CLI
hcloud server create \
  --name bootstrap-test \
  --type cx22 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key ebowwa \
  --user-data-from-file bootstrap.yaml
```

### Verification Steps

After the server is created (wait ~2-3 minutes for cloud-init to complete):

```bash
# SSH into the server
ssh root@<server-ip>

# Check bootstrap status
cat /root/.bootstrap-status

# Verify bun is in PATH
which bun
bun --version

# Check seed installation
ls -la /root/seed

# Review setup logs
cat /var/log/seed-setup.log

# Verify node-agent
/root/seed/v2/node-agent/dist/index.js --help

# Check cloud-init logs
cat /var/log/cloud-init-output.log
```

### Cleanup

```bash
# Delete test server
hcloud server delete <server-id>

# Or via Hetzner CLI with name
hcloud server delete bootstrap-test
```

## Bootstrap Customization

### Change Seed Repository or Branch

```typescript
generateSeedBootstrap({
  seedRepo: "https://github.com/custom/repo",
  seedBranch: "main",
  seedPath: "/opt/seed"
})
```

### Skip Setup Script

```typescript
generateSeedBootstrap({
  runSetup: false  // Clone only, don't run setup.sh
})
```

### Add Environment Variables

```typescript
generateSeedBootstrap({
  setupEnv: {
    DEBUG: "1",
    VERBOSE: "1",
    CUSTOM_VAR: "value"
  }
})
```

### Add Custom Packages

```typescript
generateSeedBootstrap({
  packages: ["htop", "vim", "build-essential"]
})
```

### Add Custom Commands

```typescript
generateSeedBootstrap({
  additionalCommands: [
    "curl -fsSL https://example.com/install.sh | bash",
    "systemctl enable some-service"
  ]
})
```

## Related Files

- `/Users/ebowwa/apps/com.hetzner.codespaces/app/backend/shared/lib/bootstrap/cloud-init.ts` - Bootstrap generator
- `/Users/ebowwa/apps/com.hetzner.codespaces/scripts/generate-bootstrap.ts` - Generate YAML for review
- `/Users/ebowwa/apps/com.hetzner.codespaces/scripts/test-bootstrap.ts` - Automated testing
- `/Users/ebowwa/apps/com.hetzner.codespaces/docs/design/node-agent/node-bootstrapping.md` - Architecture documentation

## Troubleshooting

### Bootstrap Status Unknown

```bash
# Check if cloud-init completed
cloud-init status

# View detailed logs
cat /var/log/cloud-init-output.log
```

### Tools Not Found in SSH Sessions

```bash
# Check current PATH
echo $PATH

# Verify /etc/environment content
cat /etc/environment

# Test if tool exists directly
/root/.bun/bin/bun --version
```

### Seed Setup Failed

```bash
# Check setup logs
cat /var/log/seed-setup.log

# Retry manually
cd /root/seed
NONINTERACTIVE=1 bash ./setup.sh
```

### Permission Issues

```bash
# Check file ownership
ls -la /root/.bootstrap-status
ls -la /etc/environment

# Fix ownership if needed
chown root:root /etc/environment
chmod 644 /etc/environment
```
