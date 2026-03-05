# Genesis Server - Control Plane Deployment

The Genesis Server is the bootstrap/control plane node that runs the `cheapspaces` dashboard and API, managing Hetzner VPS worker nodes via Tailscale VPN.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Your Local Machine                           │
│                    (via Tailscale VPN)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Tailscale Tunnel
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Genesis Server (Hetzner VPS)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  cheapspaces Dashboard (port 3000)                       │  │
│  │  - Hetzner VPS management                                │  │
│  │  - Worker node orchestration                             │  │
│  │  - Terminal access                                       │  │
│  │  - AI insights                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                      systemd-managed, auto-start               │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Hetzner API + SSH
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Worker Nodes (N x VPS)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  worker-1   │  │  worker-2   │  │  worker-N   │              │
│  │  ~/seed/    │  │  ~/seed/    │  │  ~/seed/    │              │
│  │  node-agent │  │  node-agent │  │  node-agent │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Create Hetzner VPS for Genesis

Via Hetzner Console or hcloud CLI:

```bash
# Install hcloud CLI
brew install hcloud  # macOS
# or
curl -o /usr/local/bin/hcloud https://github.com/hetznercloud/cli/releases/download/v1.39.0/hcloud-linux-amd64.tar.gz

# Configure
hcloud context create genesis

# Create server (minimum: cpx11 - €3.72/mo)
hcloud server create \
  --name genesis-1 \
  --type cpx11 \
  --image ubuntu-24.04 \
  --location nbg1 \
  --ssh-key your-ssh-key
```

### 2. Run Setup Script

SSH into the new server and run:

```bash
# Clone and run setup
curl -fsSL https://raw.githubusercontent.com/your-org/com.hetzner.codespaces/main/genesis/setup.sh | bash

# Or manually:
git clone https://github.com/your-org/com.hetzner.codespaces.git ~/genesis
cd ~/genesis/genesis
chmod +x setup.sh
./setup.sh
```

### 3. Configure Environment

```bash
# Edit configuration
cd ~/genesis
nano .env
```

Required settings:
```bash
HETZNER_API_TOKEN=your_token_here
```

### 4. Connect Tailscale

```bash
# Option A: Auth key (automated)
export TAILSCALE_AUTH_KEY=tskey-auth-xxxxx
sudo tailscale up --authkey $TAILSCALE_AUTH_KEY --ssh

# Option B: Manual login
sudo tailscale up --ssh
# Follow the URL to authenticate
```

### 5. Access Dashboard

After Tailscale connects, note the IP:

```bash
tailscale ip -4
# Output: 100.x.x.x
```

Access dashboard at: `http://100.x.x.x:3000`

## Environment Variables

See `.env.genesis.template` for all options.

Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Dashboard port | `3000` |
| `HOST` | Bind address | `0.0.0.0` |
| `HETZNER_API_TOKEN` | Hetzner API token | *required* |
| `HETZNER_DEFAULT_TYPE` | Default server type | `cpx11` |
| `MAX_WORKER_NODES` | Max concurrent workers | `10` |
| `DASHBOARD_PASSWORD` | Basic auth password | *empty* |
| `TAILSCALE_AUTH_KEY` | Tailscale auth key | *empty* |

## Service Management

### Start/Stop/Restart

```bash
sudo systemctl start genesis    # Start
sudo systemctl stop genesis     # Stop
sudo systemctl restart genesis  # Restart
```

### Check Status

```bash
sudo systemctl status genesis
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u genesis -f

# Last 100 lines
sudo journalctl -u genesis -n 100

# Since boot
sudo journalctl -u genesis -b
```

## Firewall Rules

The setup script configures UFW with:

```bash
# Allow SSH (port 22)
# Allow Tailscale (UDP 41694)
# Allow dashboard from Tailscale IPs (port 3000)
```

View rules:
```bash
sudo ufw status verbose
```

## Security Recommendations

1. **Tailscale Only Access** - Dashboard is only accessible via Tailscale
2. **Firewall** - UFW configured to allow only necessary ports
3. **SSH Keys** - Use SSH keys, disable password auth
4. **Updates** - Keep system updated: `sudo apt update && sudo apt upgrade`
5. **Auth** - Set `DASHBOARD_PASSWORD` for additional layer

## Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u genesis -n 50

# Check port availability
sudo lsof -i :3000

# Test manually
cd ~/genesis
bun run index.ts
```

### Tailscale not connecting

```bash
# Check status
sudo tailscale status

# Restart tailscale
sudo systemctl restart tailscaled

# Re-authenticate
sudo tailscale up --ssh
```

### Can't access dashboard

```bash
# Verify service running
sudo systemctl status genesis

# Check firewall
sudo ufw status

# Verify Tailscale IP
tailscale ip -4

# Test locally
curl http://localhost:3000
```

### Worker nodes can't connect

```bash
# Check Hetzner API token
hcloud server list

# Verify Tailscale on worker
# SSH to worker and run: tailscale status

# Check node-agent port
# On worker: curl http://localhost:8911/health
```

## Cost Estimation

| Component | Cost |
|-----------|------|
| Genesis Server (cpx11) | €3.72/month |
| Worker Nodes (cpx11) | €3.72/month each |
| Tailscale | Free (personal tier) |

**Example**: 1 Genesis + 4 Workers = **~€18.60/month** (~$20 USD)

## Scaling

To add more worker nodes:

1. Via dashboard: Click "Create Worker"
2. Via API: `POST /api/workers/create`
3. Via CLI (on genesis):
   ```bash
   curl -X POST http://localhost:3000/api/workers/create \
     -H "Content-Type: application/json" \
     -d '{"count": 2, "type": "cpx11"}'
   ```

## Backup & Recovery

### Backup Genesis Config

```bash
# Backup environment and database
tar -czf genesis-backup-$(date +%Y%m%d).tar.gz \
  ~/genesis/.env \
  ~/genesis/data/genesis.db
```

### Restore on New Server

```bash
# Run setup script
./setup.sh

# Restore backup
tar -xzf genesis-backup-YYYYMMDD.tar.gz -C ~/
```

## References

- [cheapspaces Architecture](../docs/ARCHITECTURE.md)
- [seed Architecture](../../seed/docs/ARCHITECTURE.md)
- [Hetzner Cloud Docs](https://docs.hetzner.com/cloud)
- [Tailscale Docs](https://tailscale.com/kb/)
