# Genesis Server - Bootstrap Infrastructure for Hetzner Codespaces

## Concept

A **genesis server** (bootstrap/seed node) that:
1. Boots via cloud-init (one-time manual setup in Hetzner console)
2. Runs `com.hetzner.codespaces` web application
3. Uses the existing Hetzner API to create **any** server: dev, prod, staging, etc.

**Key insight:** Genesis itself can be ephemeral. It's a bootstrapping tool that can:
- Spin up production servers
- Be torn down after provisioning
- Be recreated from nothing at any time

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Genesis Server (bootstrap pod - MAY BE EPHEMERAL)              │
│  - Runs com.hetzner.codespaces on port 3000                     │
│  - Has HETZNER_API_TOKEN                                        │
│  - Uses existing POST /api/environments endpoint                │
│                                                                 │
│  Creates: ───────► Dev Servers (on-demand, can be destroyed)   │
│           ───────► Prod Servers (persistent)                    │
│           ───────► Staging Servers                              │
│           ───────► Even another Genesis server!                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Hetzner Cloud API                                              │
│  - All server creation goes through here                        │
│  - Cloud-init user-data bootstraps each server                  │
└─────────────────────────────────────────────────────────────────┘

                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Servers created by Genesis:                                    │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Dev Server  │  │ Prod Server │  │ Another     │            │
│  │ (ephemeral) │  │ (persistent)│  │ Genesis     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  Any server can come down. Only Hetzner API + cloud-init       │
│  needed to rebuild everything from scratch.                    │
└─────────────────────────────────────────────────────────────────┘
```

---

# Table of Contents

1. [Concept](#concept)
2. [Current State](#current-state-already-built)
3. [Architecture Patterns](#architecture-patterns)
4. [Cloud-Init Best Practices](#cloud-init-best-practices)
5. [Systemd Service Configuration](#systemd-service-configuration)
6. [Security Patterns](#security-patterns)
7. [Compute Distribution](#compute-distribution)
8. [Server Type Selection](#server-type-selection)
9. [Observability](#observability)
10. [Hetzner-Specific Considerations](#hetzner-specific-considerations)
11. [Implementation](#implementation)
12. [Research Sources](#research-sources)

---

## Current State (Already Built)

### POST /api/environments

Location: `app/backend/shared/index.ts:390-510`

**Already does:**
- Creates Hetzner servers via Hetzner API
- Accepts `user_data` (cloud-init) parameter
- Adds SSH keys for authentication
- Auto-installs seed in background if requested
- Returns server info with login commands

### Existing Cloud-Init Bootstrap

Location: `app/backend/shared/lib/bootstrap/cloud-init.ts`

**Already generates:**
```yaml
#cloud-config
packages:
  - git
  - curl
  - jq
  - unzip

runcmd:
  - git clone --branch Bun-port https://github.com/ebowwa/seed /root/seed
  - cd /root/seed && NONINTERACTIVE=1 bash ./setup.sh
```

---

## Architecture Patterns

### The Chicken/Egg Recursion Pattern

```
Hetzner Cloud Console (manual paste cloud-init)
         │
         ▼
┌─────────────────┐
│  Genesis (egg)  │  ◄── First one booted manually
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Genesis (chicken)│  ◄── Now it can create!
└────────┬────────┘
         │
         ├──► Prod Server (egg)
         ├──► Dev Server (egg)
         └──► Another Genesis (egg) ◄── Recursion!
                │
                ▼
         ┌─────────────────┐
         │  Genesis (chicken)│
         └────────┬────────┘
                  │
                  └──► More servers...
```

**The pattern:**
1. Cloud-init (egg) → Genesis server (chicken)
2. Genesis (chicken) → Creates servers with cloud-init (eggs)
3. Those eggs can become chickens that lay more eggs

**Recursion depth:** ∞
**Bootstrap cost:** One manual cloud-init paste in Hetzner console

### Cattle vs Pets Philosophy

| **Pets** (Traditional) | **Cattle** (Cloud-Native) |
|------------------------|---------------------------|
| Carefully named servers | Interchangeable resources |
| Manual repair when broken | Replace rather than repair |
| SSH for manual fixes | All config via code |
| Horizontal scaling | Stateless design |
| | **Genesis should be CATTLE** |

### External Persistence Requirements

For genesis to be truly disposable, **ALL state must be externalized:**

| Data Type | External Storage | RTO |
|-----------|-----------------|-----|
| Configuration | Git, S3, etcd, Consul | Seconds |
| Secrets | Vault, AWS Secrets Manager | Seconds |
| Database Data | RDS, PostgreSQL with backups | Minutes |
| Files/Objects | S3, GCS, Blob Storage | Instant |
| Logs | CloudWatch, Loki, ELK | N/A (not needed) |
| Session Data | Redis, ElastiCache | N/A (can rebuild) |
| Certificates | ACM, cert-manager | Auto-renew |

**What CAN be ephemeral:**
- Application code (pulled from registry)
- Temporary files and caches
- Local logs (if shipped externally)
- Container images
- Compute capacity itself

---

## Cloud-Init Best Practices

### Boot Stages

Cloud-init executes in **five sequential stages:**

```
Detect → Local → Network → Config → Final
   ↓        ↓        ↓         ↓        ↓
(Platform) (No net) (Net up)  (Packages) (User scripts)
```

### Multi-Stage Genesis Cloud-Init Structure

```yaml
#cloud-config
# Genesis Server Bootstrap Configuration
# Version: 1.0.0

# =====================================================
# STAGE 1: Network & Early Setup (Network stage)
# =====================================================

hostname: genesis-${environment}
manage_etc_hosts: true
timezone: UTC

# =====================================================
# STAGE 2: SSH & Security (Network stage)
# =====================================================

ssh_pwauth: false

users:
  - name: genesis
    gecos: Genesis Service Account
    primary_group: genesis
    groups: docker,wheel
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    lock_passwd: true
    ssh_authorized_keys:
      - ${admin_ssh_key}

# =====================================================
# STAGE 3: Package Management (Config stage)
# =====================================================

package_update: true
package_upgrade: false
package_reboot_if_required: true

packages:
  - curl
  - wget
  - git
  - unzip
  - jq

# =====================================================
# STAGE 4: Application Setup (Config stage)
# =====================================================

write_files:
  # Genesis directories
  - path: /opt/genesis
    owner: genesis:genesis
    permissions: '0755'

  # Genesis systemd service (see full config below)
  - path: /etc/systemd/system/genesis.service
    content: |
      [Unit]
      Description=Genesis Application Server
      After=network-online.target
      Wants=network-online.target

      [Service]
      Type=simple
      User=genesis
      WorkingDirectory=/opt/genesis
      Environment="GENESIS_CONFIG=/opt/genesis/config.yml"
      ExecStart=/usr/bin/bun start
      Restart=on-failure
      RestartSec=5s

      [Install]
      WantedBy=multi-user.target
    permissions: '0644'

# =====================================================
# STAGE 5: Run Commands (Config stage)
# =====================================================

runcmd:
  - systemctl daemon-reload
  - systemctl enable genesis.service
  - systemctl start genesis.service

# =====================================================
# STAGE 6: Final (Final stage)
# =====================================================

final_message: "Genesis server bootstrap completed after $UPTIME seconds"
```

### Idempotency Patterns

**GOOD - Check before acting:**
```bash
if [ ! -f /etc/app/configured ]; then
    configure_app
    touch /etc/app/configured
fi
```

**BAD - Runs every time:**
```bash
configure_app  # May fail on re-run
```

### Security: NEVER Store Secrets in Cloud-Init

**❌ INSECURE:**
```yaml
write_files:
  - path: /etc/secrets
    content: |
      API_KEY=sk-live-abc123  # Visible in metadata, logs
```

**✅ SECURE - Use IAM/Instance Profiles:**
```yaml
runcmd:
  - /opt/app/install --use-iam-role  # No credentials stored
```

---

## Systemd Service Configuration

### Production-Ready Service Unit

```ini
# /etc/systemd/system/genesis.service

[Unit]
Description=Genesis Application Server (com.hetzner.codespaces)
Documentation=https://github.com/ebowwa/com.hetzner.codespaces
After=network-online.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=genesis
Group=genesis
WorkingDirectory=/opt/genesis

# Execution
ExecStart=/usr/bin/bun start
ExecReload=/bin/kill -HUP $MAINPID

# Restart Policy (with rate limiting)
Restart=on-failure
RestartSec=5s
StartLimitIntervalSec=300   # 5-minute window
StartLimitBurst=5           # Max 5 restarts

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=genesis

# Environment
Environment="NODE_ENV=production"
Environment="PORT=3000"
EnvironmentFile=/etc/default/genesis
EnvironmentFile=-/etc/default/genesis.local  # Optional override (- = not required)

# Resource Limits
LimitNOFILE=65536

# Security Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/genesis/data /var/log/genesis

[Install]
WantedBy=multi-user.target
```

### Environment File Template

```bash
# /etc/default/genesis

# Application Settings
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Hetzner API (use Vault/Secrets Manager in production)
# HETZNER_API_TOKEN should come from secure source
```

### Management Commands

```bash
# Installation
sudo useradd --system --shell /bin/false --home /opt/genesis genesis
sudo mkdir -p /opt/genesis /var/log/genesis
sudo chown -R genesis:genesis /opt/genesis /var/log/genesis

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable genesis
sudo systemctl start genesis

# View logs
sudo journalctl -u genesis -f

# Restart
sudo systemctl restart genesis
```

---

## Security Patterns

### Credential Management: The Secret Zero Problem

> "How do you authenticate to get credentials to authenticate?"

**Recommended Solutions (in order of preference):**

| Method | Complexity | Security | Use Case |
|--------|-----------|----------|----------|
| **Vault AppRole** | Medium | Highest | Production |
| **SOPS + age encryption** | Low | High | GitOps/IaC |
| **Instance IAM roles** | Low | High | AWS/GCP only |
| **Tailscale ephemeral** | Low | High | Zero-trust networks |

### Vault AppRole Pattern (Recommended)

```bash
# Genesis cloud-init retrieves from Vault
VAULT_ROLE_ID=$(age --decrypt -i /root/.age/key.txt /opt/bootstrap/vault-role-id.age)
VAULT_SECRET_ID=$(age --decrypt -i /root/.age/key.txt /opt/bootstrap/vault-secret-id.age)

VAULT_TOKEN=$(vault write auth/approle/login role_id=$VAULT_ROLE_ID secret_id=$VAULT_SECRET_ID -format=json | jq -r '.auth.client_token')

# Fetch Hetzner token
HETZNER_API_TOKEN=$(vault kv get -field=token hetzner/genesis)
```

### Least-Privilege Hetzner Tokens

```bash
# Create minimal token (not full access!)
hcloud token create --label genesis-bootstrap \
  --server-types cx22,cx32,cpx21 \
  --locations fsn1,nbg1
```

### SSH Key Management

**Use SSH Certificates, Not Static Keys:**
```bash
# Sign with Vault SSH
vault write ssh/sign/genesis \
  public_key=@/etc/ssh/ssh_host_ed25519_key.pub \
  ttl="4h" > /etc/ssh/ssh_host_ed25519_key-cert.pub
```

**Or Tailscale Ephemeral Nodes:**
```bash
tailscale up --authkey ${TAILSCALE_AUTH_KEY} --hostname genesis-${HOSTNAME} --ephemeral
```

### Security Checklist

- [ ] Never embed API tokens in cloud-init
- [ ] Use instance profiles/IAM roles where possible
- [ ] Retrieve secrets at runtime from Vault/Secrets Manager
- [ ] Implement automatic credential rotation
- [ ] Use SSH certificates or Tailscale ephemeral nodes
- [ ] Enable auditd for security event logging
- [ ] Configure firewall with default deny
- [ ] Disable password authentication, SSH keys only
- [ ] Run services as non-root user
- [ ] Enable fail2ban for SSH protection

---

## Compute Distribution

### Recommended: Orchestrator-Worker Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  Genesis Server (Orchestrator)                               │
│                                                              │
│  Worker Registry:                                            │
│  - worker_id → {last_heartbeat, status, capabilities}       │
│  - Updated every 5-10s via worker heartbeat                  │
│                                                              │
│  Task Queues (Redis):                                        │
│  - queue:tasks:pending      [task1, task2, ...]             │
│  - queue:tasks:processing   {task_id: worker_id}            │
│  - queue:tasks:completed    [task4, ...]                     │
│  - queue:tasks:failed       [task6, ...] (DLQ)              │
└─────────────────────────────────────────────────────────────┘
```

### Worker Registration Flow

```
Worker → Genesis: POST /register {worker_id, capabilities}
Genesis → Redis: HSET workers:registry worker_id "{...}"

Worker → Genesis: POST /heartbeat {worker_id} (every 5-10s)
Genesis → Redis: HSET workers:heartbeat worker_id timestamp (with TTL)

Genesis Monitor: If heartbeat expired → HDEL worker, re-queue tasks
```

### Work Distribution: Pull Model with Long Polling

**Why pull model?**
- Workers control when they request work (can throttle)
- Better scalability - workers can be added/removed without genesis pushing
- Simpler failure handling - if worker crashes, it just stops polling
- Natural backpressure

```
Worker → Genesis: POST /tasks/poll {worker_id}
Genesis → Redis: Move task from pending → processing
Genesis → Worker: Return task or wait (long poll up to 10s)

Worker → Genesis: POST /tasks/complete {task_id, result}
Genesis → Redis: Move task to completed
```

### Failure Handling

| Timeout Type | Duration | Action |
|--------------|----------|--------|
| Task timeout | 5 minutes | Move back to pending |
| Heartbeat timeout | 30 seconds | Mark unhealthy, re-queue tasks |
| Retry backoff | 1s, 2s, 4s, 8s... | Exponential with jitter |
| Max retries | 3-5 attempts | Send to dead letter queue |

---

## Server Type Selection

### Hetzner Server Type Hierarchy (2026)

| Series | CPU Type | Use Case | Price | Performance/€ |
|--------|----------|----------|-------|---------------|
| **CAX** | ARM | Best €/performance | €3.49-6.49 | Excellent |
| **CX** | Intel/AMD (older) | Cost-efficient | €3.49-6.49 | Lowest |
| **CPX** | Newer Xeon | Performance (30% faster) | €10-50 | High |
| **CCX** | Dedicated vCPU | Sustained high CPU | €11.99+ | Best for load |

### Workload-Based Selection Algorithm

```
IF x86_required AND performance_critical:
    USE CPX (30% faster than CX)
ELSE IF compatibility_flexible AND cost_sensitive:
    USE CAX (ARM, best €/performance)
ELSE IF legacy_compatibility_required:
    USE CX (older x86)
ELSE IF sustained_high_cpu_required:
    USE CCX (dedicated vCPU)
```

### Right-Sizing Formula

```
# Use P95 (95th percentile) for resource allocation
Memory Recommendation = P95_memory × 2.0  # Safety margin
CPU Recommendation = P95_cpu × 1.5

# Idle baselines
Idle Memory: 2.5-3 GB
Idle CPU: 0-2%
```

### Server Type Selection Matrix

| Scenario | Hetzner Type | vCPU | RAM | Monthly | Rationale |
|----------|--------------|------|-----|---------|-----------|
| Free tier | CAX11 | 2 | 4 GB | €3.49 | Minimum viable |
| JS/TS dev | CPX21 | 3 | 6 GB | €10.49 | x86 compatibility |
| Go/Rust dev | CPX31 | 4 | 8 GB | €17.49 | Parallel compile |
| Python/ML | CAX21 | 4 | 8 GB | €6.49 | More RAM, ARM value |
| Production | CCX13 | 6 | 16 GB | €34.48 | Dedicated CPU |

### Resource Ratios by Workload

| Workload | CPU:Memory Ratio | Characteristics |
|----------|------------------|-----------------|
| Development/IDE | 1:2 to 1:4 | Memory-intensive |
| Build/Compilation | 1:1 to 2:1 | CPU-bound |
| Database | 1:2 to 1:3 | Memory for caching |
| Web Services | 1:2 | Balanced |

---

## Observability

### Push-Based Metrics Collection

**For ephemeral servers, use OpenTelemetry in push mode:**

```
Workers send metrics directly to OTel Collector
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  OpenTelemetry Collector (on genesis or dedicated)          │
│  - Receives metrics/logs/traces (push from workers)         │
│  - Batches & forwards to backends                           │
└─────┬───────────────┬───────────────┬──────────────────────┘
      │               │               │
      ▼               ▼               ▼
┌─────────────┐ ┌─────────────┐ ┌──────────────┐
│ Prometheus  │ │ Loki/ELK    │ │ Tempo/Jaeger │
│ (Metrics)   │ │ (Logs)      │ │ (Traces)     │
└─────────────┘ └─────────────┘ │              │
      └─────────────────────────┴──────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Grafana       │
              │ (Dashboards)  │
              └───────────────┘
```

### Essential Metrics

**Bootstrap Metrics:**
```
worker_bootstrap_total{status="success|failed"}
worker_bootstrap_duration_seconds{server_type}
worker_bootstrap_failure_reason{reason}
```

**Golden Signals (Per Worker):**
```
worker_latency_seconds{operation, p50/p95/p99}
worker_tasks_processed_total{status}
worker_error_rate{error_type}
worker_saturation_cpu_percent
worker_saturation_memory_percent
```

**Lifecycle Metrics:**
```
worker_heartbeat_timestamp{worker_id}  # Liveness detection
worker_lifecycle_phase_seconds{phase}
```

### Alert Patterns

```yaml
# Bootstrap failure rate spike
Alert: rate(worker_bootstrap_total{status="failed"}[5m]) > 0.1
Severity: Critical
Action: Stop spawning, investigate

# Worker heartbeat timeout
Alert: worker_heartbeat_timestamp < time() - 300
Severity: Warning
Action: Worker stuck, investigate

# Cost anomaly
Alert: sum(rate(worker_cost_total[1h])) > expected_budget / 24
Severity: Warning
Action: Check for orphaned workers
```

### Logging Best Practices

```bash
# Log to stdout/stderr, systemd captures to journald
# Structured JSON logging with consistent schema

{
  "worker_id": "worker-abc123",
  "genesis_job_id": "job-456",
  "bootstrap_timestamp": "2025-01-22T10:30:00Z",
  "cloud_provider": "hetzner",
  "instance_type": "cpx21",
  "lifecycle_phase": "processing"
}
```

---

## Hetzner-Specific Considerations

### Rate Limits

- **3,600 requests per hour per project**
- Implement exponential backoff on 429 responses
- Use bulk operations when available
- Queue requests during high-volume operations

### Features to Leverage

**Placement Groups (Spread Distribution):**
- Ensures servers run on different physical hosts
- Critical for high availability

**Private Networks:**
- Use for genesis-worker communication
- More secure, no public traffic costs

**SSH Key Management:**
- Pre-upload SSH keys via API before creating servers
- Enforce key-based authentication only

### Cost Optimization

| Strategy | Savings |
|----------|---------|
| Use Regular Performance (CX/CPX) | Baseline |
| Consider ARM (CAX) for compatible workloads | 30-40% |
| Use hourly billing for short-lived workers | Variable |
| IPv6-only workers | Save €0.50/month each |
| Same datacenter for genesis+workers | Avoid inter-zone costs |

### Common Gotchas

- **Account deactivations without warning** - Monitor spam folders
- **Cross-region connectivity issues** - Test thoroughly
- **Storage Box unreliability** - Use offsite backup for true DR
- **Email ports blocked (25, 465)** - Plan accordingly

---

## Implementation

### Files Created (V1 Complete)

```
bootstrap/
├── genesis-cloud-init.yaml     # ✅ Cloud-init for genesis server
├── hetzner-codespaces.service  # ✅ Systemd service unit
└── genesis.env.template         # ✅ Environment variables template

app/backend/shared/lib/bootstrap/
├── genesis.ts                   # ✅ Genesis bootstrap functions
└── cloud-init.ts                # ✅ Updated to export genesis functions

docs/
└── genesis-server.md            # ✅ This file (complete)
```

### Usage

#### Generate Genesis Cloud-Init Programmatically

```typescript
import { generateGenesisBootstrap, GenesisBootstrapPresets } from './app/backend/shared/lib/bootstrap';

// Using your SSH public key
const adminSSHKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... your-key";

// Generate with default options
const cloudInit = generateGenesisBootstrap({ adminSSHKey });

// Or use a preset
const cloudInitARM = GenesisBootstrapPresets.arm(adminSSHKey);
```

#### Manual Deployment

1. **Generate cloud-init YAML:**
   ```bash
   cd /Users/ebowwa/Desktop/codespaces/com.hetzner.codespaces
   bun run -e "import { generateGenesisBootstrap } from './app/backend/shared/lib/bootstrap/genesis.ts';
     console.log(generateGenesisBootstrap({ adminSSHKey: 'YOUR_SSH_KEY' }))" > genesis-bootstrap.yaml
   ```

2. **Create Hetzner server:**
   ```bash
   hcloud server create \
     --name genesis-1 \
     --type cpx21 \
     --image ubuntu-24.04 \
     --location fsn1 \
     --ssh-key your-ssh-key \
     --user-data-from-file genesis-bootstrap.yaml
   ```

3. **Configure after bootstrap:**
   ```bash
   # SSH into the new genesis server
   ssh root@<server-ip>

   # Set Hetzner API token
   nano /etc/default/genesis
   # Add: HETZNER_API_TOKEN=your_token_here

   # Restart service
   sudo systemctl restart genesis
   ```

4. **Access dashboard:**
   ```bash
   # Service runs on port 3000
   curl http://<server-ip>:3000
   ```

### Open Questions

| Question | Options | Decision Needed |
|----------|---------|-----------------|
| How does genesis get HETZNER_API_TOKEN? | Vault AppRole, SOPS+age, manual setup | |
| Should genesis be a specific server type? | CX22, CPX21, CAX21 | |
| Should genesis run behind a domain? | Yes (SSL), no (IP only) | |
| SSH key for genesis? | Tailscale ephemeral, Vault SSH, static | |
| Is genesis ephemeral or persistent? | Tear down after, keep running | **★ KEY** |

### Minimal V1 Scope

1. ✅ Genesis cloud-init script
2. ✅ Systemd service file
3. ✅ Documentation for manual setup
4. ✅ Security patterns (no secrets in cloud-init)
5. ✅ External persistence requirements

**Out of scope for V1:**
- SSL/domain setup
- Auto-updates
- Multi-genesis HA
- Advanced monitoring

### Recovery Time Objectives (RTO)

| Approach | RTO | Complexity |
|----------|-----|------------|
| Container-based | 1-3 min | Medium |
| Golden image + bootstrap | 2-5 min | Low |
| Cloud-init + config mgmt | 5-15 min | Low |

**Recommended for V1:** Cloud-init + systemd (5-15 min RTO)

---

## Research Sources

### Cloud-Init
- [All cloud config examples - cloud-init documentation](https://cloudinit.readthedocs.io/en/latest/reference/examples.html)
- [Boot stages - cloud-init documentation](https://cloudinit.readthedocs.io/en/latest/explanation/boot.html)
- [How to debug cloud-init](https://cloudinit.readthedocs.io/en/latest/howto/debugging.html)
- [Best Practices for Cloud-Init User Data](https://shape.host/resources/best-practices-for-writing-cloud-init-user-data-scripts)

### Systemd
- [Bun - Run Bun as a daemon with systemd](https://bun.com/docs/guides/ecosystem/systemd)
- [systemd.service manual](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [Running services after network is up](https://systemd.io/NETWORK_ONLINE/)
- [DigitalOcean - Understanding systemd units](https://www.digitalocean.com/community/tutorials/understanding-systemd-units-and-unit-files)

### Security
- [Solving the Secret Zero Problem - SPIFFE](https://spiffe.io/pdf/Solving-the-bottom-turtle-SPIFFE-SPIRE-Book.pdf)
- [Vault AppRole Best Practices](https://developer.hashicorp.com/vault/docs/auth/approle/approle-pattern)
- [Tailscale Ephemeral Nodes](https://tailscale.com/kb/1111/ephemeral-nodes)
- [SOPS + age encryption](https://github.com/getsops/sops)

### Infrastructure Patterns
- [Kubernetes control plane contract - Cluster API](https://cluster-api.sigs.k8s.io/developer/providers/contracts/control-plane)
- [K3s architecture](https://docs.k3s.io/architecture)
- [Zero Touch Provisioning - StarWind](https://www.starwindsoftware.com/blog/zero-touch-provisioning-ztp/)
- [Cattle vs Pets philosophy](https://www.redhat.com/en/topics/cloud-native-apps/stateless-vs-stateful)

### Hetzner
- [Hetzner Cloud API Documentation](https://docs.hetzner.cloud/reference/cloud)
- [Hetzner server types](https://www.hetzner.com/cloud)
- [Placement Groups overview](https://docs.hetzner.com/cloud/placement-groups/overview/)
- [Hetzner pricing calculator](https://costgoat.com/pricing/hetzner)

### Observability
- [OpenTelemetry in 2025 - Medium](https://medium.com/@serverwalainfra/opentelemetry-in-2025-the-backbone-of-full-stack-observability-for-container-environments-619d44135a5a)
- [Golden Signals monitoring - Dynatrace](https://www.dynatrace.com/knowledge-base/golden-signals/)
- [Monitoring ephemeral environments - Qovery](https://www.qovery.com/blog/full-stack-backend-frontend-ephemeral-environment)
- [Distributed tracing best practices](https://uptrace.dev/opentelemetry/distributed-tracing)

---

## Summary

The genesis server pattern provides:

1. **Infinite recursion** - One cloud-init paste → entire infrastructure tree
2. **Ephemeral by design** - Treat genesis as cattle, not a pet
3. **No single point of failure** - Genesis itself is disposable
4. **Externalized state** - Config, secrets, data in durable storage
5. **5-15 minute RTO** - Rebuild from cloud-init + external state
6. **Production-ready** - Security, observability, and automation patterns

**The chicken/egg solution:** Cloud-init provides the first egg, which becomes a chicken that lays more eggs.
