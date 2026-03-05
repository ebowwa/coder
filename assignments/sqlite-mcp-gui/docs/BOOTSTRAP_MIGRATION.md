# Bootstrap PATH Migration Guide

## Problem

Bun was installed to `/root/.bun/bin` but this path wasn't available in non-login shells (like SSH commands), causing "bun: command not found" errors during bootstrap.

## Solution

Use `/etc/environment` to set system-wide PATH that applies to all users and shells, including non-interactive SSH sessions.

## Migrate Existing Servers

SSH into each server and run:

```bash
# Backup existing config
sudo cp /etc/environment /etc/environment.backup

# Set proper PATH with bun
echo 'PATH="/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"' | sudo tee /etc/environment

# Reload the environment (for current session)
source /etc/environment
```

## Verify

Test in a fresh non-interactive shell:

```bash
# Open new SSH session without loading profile
ssh user@server 'bun --version'

# Or test locally
env -i bash -c 'source /etc/environment && bun --version'
```

Expected output: Bun version number (not "command not found").

---

**Note:** New servers created after this fix will have the correct PATH automatically via cloud-init.
