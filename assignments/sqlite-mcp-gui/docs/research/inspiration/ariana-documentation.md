# Ariana.dev - Complete Documentation

## Overview

**Ariana** is an agentic IDE platform designed to maximize productivity with Claude Code. Built for power users of AI coding agents, it provides a platform to launch, manage, and share sessions with coding agents across web, mobile, and desktop.

- **Website**: https://ariana.dev
- **Documentation**: https://docs.ariana.dev
- **Creator**: Dedale AI
- **Twitter/X**: [@AniC_dev](https://x.com/AniC_dev)
- **Tagline**: "Get more quality work out of Claude Code"
- **Supported AI**: Claude Code by Anthropic

---

## Table of Contents

1. [Core Value Proposition](#core-value-proposition)
2. [Key Features](#key-features)
3. [Product Updates (Changelog)](#product-updates-changelog)
4. [Pricing](#pricing)
5. [Blog Articles](#blog-articles)
6. **[Technical Documentation](#technical-documentation)**
   - [Agent VPS](#agent-vps)
   - [Automations](#automations)
   - [Environments](#environments)
   - [Agent Server](#agent-server)
7. [MVP Development Guide](#mvp-development-guide)
8. [Business Model Analysis](#business-model-analysis)

---

## Core Value Proposition

Ariana enables developers to:
- Launch multiple agents on remote machines that work on coding tasks simultaneously and in the background
- Run agents from fully customizable cloud environments
- Maintain control with automations, self-documentation, and effortless local sync
- Use their existing Claude Code subscription (no additional AI costs)

**Target Audience**: Professional developers working on production systems that require serious control and isolation.

---

## Key Features

### 1. Agents That Ship in Isolation
- Launch multiple agents on remote machines
- Work from local files or directly from remote version control
- Agents operate independently without interference

### 2. Sync Locally with Any Agent
- Sync with agent's code and localhost network at any time
- Perfect for testing multiple versions
- Correct code directly from your IDE while agents work

### 3. Full Machine Control
- Connect via SSH
- Launch servers
- Execute scripts
- Forward ports
- You own your machines

### 4. Team Collaboration
- Share agents with your team
- Fork existing agents
- Collaborative workflows

---

## Product Updates (Changelog)

### December 14, 2025 - Remote Desktop Access
- Access your agent's desktop environment remotely via RustDesk
- Work with GUI applications
- Run visual debugging tools
- Interact with your development environment exactly as if you were sitting at the machine

### December 13, 2025 - Run on Your Own Compute
- Connect Ariana to your own infrastructure—Mac minis, Google Cloud instances, GPU servers, or any compute you have credits for
- Ariana wraps Hetzner VPSs by default for their versatility
- Bring your own machines and run agents wherever you need them

### December 12, 2025 - Open Agent in Your IDE via SSH
- One-click SSH connection to open your agent's workspace in VSCode, Cursor, Windsurf, or Zed
- Setup instructions included for JetBrains IDEs
- Work in your favorite editor with full remote development capabilities

### November 12, 2025 - Environments
- Define environment variables and configuration/secret files for agents
- Set up database connections
- Provide test OAuth client IDs
- Choose environments when launching new agents

### November 9, 2025 - Slop Mode
- Force Claude Code to work for several hours on prompts
- Follow-up agent constantly pushes for improvements
- Automatic prompts keep agent working when it stops

### October 29, 2025 - Multiline Code Block Support
- Added multiline code block support (``` syntax) to specification editor

### October 28, 2025 - Changelog
- Added changelog page for tracking updates

---

## Pricing

| Plan | Price | Agent Launch Limit | Notes |
|------|-------|-------------------|-------|
| **Free** | $0 | Up to 30 agents | Try for free |
| **Max** | $4.99/month | Up to 300 agents (10x free) | Best Value |
| **Ultra** | $45/month | Up to 3000 agents (100x free) | Priority support |

*Note: Launching limits impacted by agent forks and resuming stopped agents. Numbers accurate for smallest compute offering; larger compute may count 1.5x or more toward quota.*

---

## Blog Articles

### How to One-Shot Tasks with Claude Code
*By Kirill Makarov • November 13, 2025*

**Key Best Practices for Using Claude Code Effectively:**

#### 1. Write Bigger Prompts Outside of Terminal
Never write messages to Claude Code directly in the terminal. Use markdown editors like Ariana or Obsidian instead. Benefits:
- Code blocks with syntax highlighting
- Bullet points and proper line breaking
- Standard hotkeys work (ctrl-c, ctrl-v, etc.)
- Avoid accidentally sending incomplete prompts
- Puts you in the mood to write well-thought-out prompts
- Result: Agents do what you want and make fewer mistakes

#### 2. PMU: Plan Mode + Ultrathink + Auto Accept
This is a Claude Code pipeline that delivers 10x quality work.

**Plan Mode**: Use shift+tab in terminal or toggle in Ariana. Lets you map out complex coding tasks before diving in, breaking them down into clear steps. Like having a coding buddy who thinks through architecture first, then executes systematically.

**Ultrathink**: Claude Code's maximum thinking budget (~31,999 tokens). Keywords map to thinking budgets:
- `"think"`: 4,000 tokens
- `"megathink"`: 10,000 tokens
- `"ultrathink"`: maximum budget

**Auto-Accept**: After Ultrathink, auto-accept the plan and let Claude work non-stop for 5-10 minutes.

This workflow (30-40 minutes) gets average new features to test environment.

#### 3. Clean and Restart Is Faster Than Explaining What's Wrong
When Claude Code gets stuck or makes repetitive errors:
- Don't waste 15-20 minutes debugging confusion
- Starting fresh with a better, higher-quality prompt is faster
- Context becomes polluted with failed attempts
- Each new try compounds confusion

**Result**: Transformed workflow from frustrating trial-and-error to predictable, high-quality output.

---

### Finnish Train Introduced A Bug In My App
*By Kirill Makarov • December 29, 2025*

**Architecture Insights:**
- Backend spawns VPS' on Hetzner Cloud (Agent Machines)
- Establishes temporary SSH connection for installations and configuration
- After setup, all communication through HTTP (healthchecks, CRUDs)
- Architecture includes: Spawn Machine → SSH/install/start server → HTTP polling

**Lessons:** Network issues can mimic bugs - sometimes the "stupidly simple thing" (like switching networks) is the solution.

---

### We Don't Use Cloudflare, Yet Prisma Depends on It So the Outage Broke Our Infra
*By Anicet Nougaret • November 20, 2025*

**Infrastructure Philosophy:**
- Hosted on dedicated bare-metal servers in Europe
- No big cloud providers - just Ubuntu
- 80€ per month for most infrastructure
- Low surface area for unknown unknowns
- First-principles thinking over "easy" cloud solutions

**About Ariana:**
- Run multiple Claude Code instances in isolated Ubuntu VPSs
- Pre-configured with dev tools and languages
- Configure environments, automations, share with teams
- Each VPS has its own IPv4 and sudo rights
- Can host entire infra with docker compose, remote desktop, long-running tasks, dev builds & demos

---

### Ariana Has a New Blog!
*By Anicet Nougaret • October 29, 2025*

"Ariana lets you launch and supervise coding agents your way, while helping you and your squad efficiently share, review & build upon their work. Powered by Claude Code running in isolated, hardened VMs with dedicated IPv4s, agents in Ariana can be controlled seamlessly across Web & Mobile, or even sync with your local files & favorite IDE via our Desktop app."

---

# Technical Documentation

*Documentation from docs.ariana.dev*

## Agent VPS

### Overview

Dedicated VPS for your AI agents with complete development environment. When you create an agent in Ariana, it runs on a dedicated Virtual Private Server (VPS) provisioned specifically for your development needs. Each VPS comes with a complete development environment pre-installed, allowing you to start coding immediately without any setup.

**Note**: The VPS runs the **Ariana Agent Server**, which is an open-source component of Ariana. You can [install and connect](#agent-server-installation) the agent server from your own infrastructure if you prefer to use your own machines instead of the managed VPS.

### SSH Access

Each VPS is secured with SSH key authentication using ED25519 keys, with root password authentication disabled for security. Terminals inside the Ariana desktop application connect directly to your VPS via SSH, giving you immediate command-line access. Only necessary ports are exposed (SSH, agent server, RustDesk), with all other incoming connections blocked by the firewall.

### Pre-installed Software

#### Languages and Tools

**10+ languages** with modern toolchains pre-installed:

- **JavaScript/TypeScript**: Node.js (v20, v22, v24 via nvm), Bun, Deno, npm, pnpm
- **Python**: Python 3, pip, venv, Poetry, uv (fast package manager)
- **Go**: Go 1.23.4 with full toolchain
- **Rust**: rustc, cargo, rust-analyzer
- **Java/JVM**: OpenJDK 11, Maven, Gradle, Kotlin, Scala
- **PHP**: PHP 8.4 with common extensions, Composer
- **R**: R base and R dev tools
- **Elixir/Erlang**: Elixir, Erlang/OTP
- **.NET**: .NET SDK 8.0

#### Professional Tooling Included

- **Claude Code CLI** (pre-installed and configured)
- **Version Control**: Git, GitHub CLI
- **Docker**
- **Build Tools**: gcc, g++, make, CMake, clang, ninja
- **Multimedia**: ffmpeg, ImageMagick
- **Desktop Environment**: Budgie Desktop with Chromium browser
- **Remote Access**: RustDesk for graphical desktop access
- **Utilities**: screen, tree, zip/unzip, and more

### Full Capabilities

Each agent runs on a dedicated **Ubuntu 24.04 LTS** VPS with complete root access and no restrictions. Install any software, run any command. You have the same freedom as your local machine, without the setup overhead.

### Communication & Security

#### Encrypted Communication

All communication between your application and the VPS is protected using **AES-256-GCM encryption**. Each VPS receives a unique 256-bit shared secret key during provisioning, ensuring that data is encrypted at the application layer before transmission. Every request includes an encrypted authentication token to prevent unauthorized access.

#### How It Works

```
┌─────────────┐                    ┌──────────────┐                    ┌─────────────┐
│   Frontend  │                    │   Backend    │                    │  Agent VPS  │
└──────┬──────┘                    └──────┬───────┘                    └──────┬──────┘
       │                                  │                                     │
       │        1. HTTPS Request          │                                     │
       ├─────────────────────────────────>│                                     │
       │                                  │                                     │
       │                              2. Encrypt with AES-256-GCM             │
       │                              (Unique 256-bit shared key per VPS)       │
       │                                  │                                     │
       │        3. HTTP (encrypted payload)                                    │
       ├─────────────────────────────────────────────────────────────────────>│
       │                                  │                                     │
       │                                  │                                 4. Decrypt & Execute
       │                                  │                                     │
       │        5. Encrypted Response                                              │
       │<─────────────────────────────────────────────────────────────────────┤
       │                                  │                                     │
       │                              6. Decrypt                                │
       │<─────────────────────────────────┤                                     │
       │                                  │                                     │
       │        7. HTTPS Response                                                  │
       │<─────────────────────────────────┤                                     │
       │                                  │                                     │

Security: Application-layer AES-256-GCM encryption with unique keys per VPS.
Data encrypted before HTTP transport.
```

#### Why It's Secure

- **End-to-End Encryption**: Data is encrypted before leaving your computer and decrypted only on the destination VPS
- **Unique Keys**: Each VPS has its own unique encryption key - compromising one doesn't affect others

### Machine Specifications

Each agent runs on a VPS with the following specifications:

| Specification | Details |
|---------------|---------|
| **vCPU** | 2 shared cores |
| **RAM** | 4 GB |
| **Storage** | 40 GB NVMe SSD |
| **Operating System** | Ubuntu 24.04 LTS |
| **Location** | Frankfurt, Germany (fsn1) |

### Cloud Provider

Ariana uses European cloud providers that best match their requirements, with **Hetzner** being their primary partner. Infrastructure is hosted in data centers located in Germany and Finland.

---

## Automations

### Overview

Automate your development workflow with powerful scripting and triggers.

**Note**: Automations and [Environments](#environments) work together as a powerful system. Automations can access environment variables, and environments can bundle automations alongside configuration.

Automations allow you to run custom scripts automatically in response to agent events. Write scripts in Bash, JavaScript, or Python that execute when the agent performs specific actions—like editing files, running commands, or creating commits.

Use automations to enforce code quality, run tests, validate changes, integrate with external tools, or orchestrate complex workflows. Scripts have access to rich context about what the agent is doing, including file paths, git diffs, conversation history, and more.

### Key Concepts

#### Triggers

Automations respond to specific events in your agent's workflow:

| Trigger | Description |
|---------|-------------|
| **Manual** | Run on demand via command palette |
| **On agent ready** | Executes when agent is idle and waiting for input |
| **After edit files** | Runs when agent modifies files (optional glob filter) |
| **After read files** | Triggers when agent reads files (optional glob filter) |
| **After run command** | Executes after agent runs bash commands (optional regex filter) |
| **Before commit** | Runs before creating a git commit (always blocking, like a pre-commit hook) |
| **After commit** | Executes after a git commit is created |
| **After compaction** | Runs when conversation history is compacted |
| **After reset** | Triggers when agent is reset |
| **After automation finishes** | Chains automations together (runs after another automation completes) |

#### Script Languages

Choose the language that best fits your task:

- **Bash**: Best for shell commands, git operations, file manipulation
- **JavaScript**: Ideal for JSON processing, API calls, Node.js tools
- **Python**: Great for data processing, testing, complex logic

#### Feed Output to Agent

When enabled, the script's stdout and stderr are sent to the agent as context. The agent receives the last 1000 lines of output, which helps with debugging and decision-making.

### Available Variables

#### Bash Variables

| Variable | Type | Description |
|----------|------|-------------|
| `$INPUT_FILE_PATH` | string | Path of file being edited or read |
| `$INPUT_COMMAND` | string | Bash command being executed |
| `$CURRENT_COMMIT_SHA` | string | SHA hash of current commit |
| `$CURRENT_COMMIT_CHANGES` | string | Git diff of current commit |
| `$CURRENT_PENDING_CHANGES` | string | Git diff of uncommitted changes |
| `$ENTIRE_AGENT_DIFF` | string | All changes since agent started |
| `$LAST_PROMPT` | string | Most recent user prompt |
| `$ALL_LAST_PROMPTS` | string | All user prompts (newline-separated) |
| `$CONVERSATION_TRANSCRIPT` | JSON | Full conversation history |
| `$GITHUB_TOKEN` | string | GitHub authentication token (if available) |

*JavaScript and Python have equivalent variables with appropriate syntax.*

### Control Functions

Control functions allow your automation scripts to interact with and control the agent's behavior. These functions are automatically injected into your script's runtime environment and can be called directly without any imports or setup.

| Function | Parameters | Description |
|----------|------------|-------------|
| `stopAgent` | None | Immediately stops the agent execution. Use for critical validation failures. |
| `queuePrompt` | message (string) | Sends a prompt to the agent programmatically. |

### Example

#### Pre-Commit TypeScript Type Checking

Run TypeScript type checking before every commit and block the commit if there are errors:

```bash
#!/bin/bash
# Trigger: on_before_commit
# Blocking: true
# Feed Output: true

echo "Running TypeScript type checking..."
npx tsc --noEmit

if [ $? -ne 0 ]; then
  echo "❌ TypeScript type check failed - commit blocked"
  stopAgent
  exit 1
fi

echo "✓ TypeScript type check passed"
```

---

## Environments

### Overview

Manage environment variables, secrets, and SSH keys for your AI agents.

**Note**: Environments and [Automations](#automations) work together as a powerful system. Environments can bundle automations alongside configuration, and automations can access environment variables.

Use environments to provide API keys, database credentials, SSH access, or any configuration your agent needs to interact with external services. Environments work seamlessly with automations, allowing you to orchestrate complex workflows that require authenticated access to tools and services.

### Key Concepts

#### Personal & Private

Environments are **user-scoped**. Even within shared projects, each team member maintains their own set of environments with their own credentials and configurations.

#### Environment Variables

Define environment variables in standard `.env` format:

```bash
API_KEY=sk-1234567890abcdef
DATABASE_URL=postgresql://user:pass@localhost:5432/db
NODE_ENV=production
```

These variables are injected into your agent's runtime environment and are accessible to:
- Agent's bash commands
- Automation scripts
- Any processes spawned by the agent

The backend validates the `.env` format and parses key-value pairs, supporting both quoted and unquoted values.

#### Secret Files

Secret files allow you to inject sensitive files directly into your agent's filesystem. Common use cases include:
- **SSH private keys** (for git operations with private repositories)
- **Service account credentials** (`.json` files for Google Cloud, AWS, etc.)
- **Configuration files** (`.npmrc`, `.pypirc`, custom configs)

Each secret file consists of:
- **Path**: Where the file should be created (e.g., `/home/user/.ssh/id_rsa`)
- **Contents**: The file's content

Secret files are written when the agent starts and when the environment is updated on a running agent.

#### SSH Key Pairs

Generate ed25519 SSH keypairs directly from the Ariana interface. The backend uses `ssh-keygen` to create secure keypairs that can be added to your GitHub/GitLab account for repository access, used for SSH authentication to remote servers, or stored as secret files in the environment.

#### Integration with Automations

Environments can bundle [automations](#automations) alongside configuration. When you install an environment on an agent, all associated automations are activated.

### Example: Automated Commit Notifications

Send real-time development updates to your team every time your agent makes a commit.

**Environment Variables:**
```bash
BOSS_EMAIL=boss@company.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

**Automation** (trigger: `after_commit`):
```bash
#!/bin/bash
COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_HASH=$(git rev-parse --short HEAD)

curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d "{\"text\":\"🚀 Just shipped another commit! ($COMMIT_HASH)\n\n*${COMMIT_MSG}*\n\nI'm basically working 24/7 now that I have an AI agent. 😎\"}"

echo "✅ Boss notified of your productivity!"
```

Every commit = instant notification to your boss. Maximum perceived productivity achieved.

---

## Agent Server

### Installation

The Ariana Agent Server allows you to run AI agents on your own cloud VMs or local machines. The agent server comes with a CLI that makes installation and management straightforward.

**Note**: Your machine must be publicly accessible and reachable over the internet.

#### Quick Install (Recommended)

The easiest way to install the agent server is through the Ariana app:

1. Open the Ariana app
2. Click the top-left menu
3. Go to **Custom Machines**
4. Click **Add**

This generates a dynamic one-liner installation script that's valid for 60 minutes. The script automatically installs everything and connects to your Ariana account.

#### Install and Connect via CLI

Alternatively, you can install the CLI manually. The Ariana Agent Server is managed through the Ariana CLI. Install the CLI first:

```bash
curl -fsSL https://github.com/ariana-dot-dev/agent-server/releases/latest/download/install-cli.sh | sudo bash
```

**What this does:**
- Detects your platform (Linux/macOS) and architecture (x64/ARM64)
- Downloads the appropriate CLI binary from GitHub releases
- Installs it to `/usr/local/bin/ariana`
- Makes it executable and verifies the installation

After installation, you'll have access to the `ariana` command for managing your agent server.

**Warning**: Some `ariana` commands may require sudo access to manage system services and install dependencies.

#### Post-Installation: Connect to Ariana

After installing the CLI, connect your machine to your Ariana account using a registration token:

```bash
ariana connect --token <YOUR_TOKEN>
```

Get your registration token from the Ariana app: **Top-left menu → Custom Machines → Add**.

This will:
1. Register your machine with Ariana
2. Install the agent server
3. Install required dependencies (Git, GitHub CLI, Node.js, Claude Code CLI)
4. Start the agent server automatically

### Tech Overview

Technical overview of the Ariana agent server implementation.

#### Installation Process

##### Binary Installation

**Binary composition:**
- Bun runtime
- TypeScript code (compiled)
- npm dependencies
- Embedded Rust watcher (base64-encoded)

**Downloaded from:** https://github.com/ariana-dot-dev/agent-server/releases

**Installed to:** `/opt/ariana-agent/ariana-agents-server`

##### System Dependencies

The install script ensures these are available:

**Always installed:**
- Git (version control)
- GitHub CLI (`gh`) - for PR creation, issue management
- Node.js + npm (runtime for tools)
- Claude Code CLI (`claude`) - AI coding assistant
- Network tools: `ss` or `netstat` (Linux only)

**Installed on-demand:**
- Project-specific dependencies per agent requirements

##### Service Setup

The agent server runs as a system service that starts on boot and automatically restarts on failure.

**Linux (systemd):**
- Runs as `ariana` user (non-root)
- Logs to systemd journal

**macOS (launchd):**
- Runs as the actual user who installed (not root)
- Logs to `/var/log/ariana-agent.log`

**CLI access:** When installed via CLI, logs are accessible through:
- `ariana logs` - View recent logs
- `ariana follow-logs` - Stream logs in real-time

##### Environment Configuration

**File:** `/opt/ariana-agent/.env`

```bash
MACHINE_ID=mch_abc123...
SHARED_KEY=64-char-hex-string
ARIANA_PORT=8911
WORK_DIR=/home/ariana # or /Users/username on macOS
CLAUDE_PATH=/usr/local/bin/claude
IS_SANDBOX=1
```

**Variable purposes:**
- `MACHINE_ID`: Identifies this machine in backend database
- `SHARED_KEY`: Used for AES-256-GCM encryption
- `ARIANA_PORT`: Port the agent server listens on (default 8911)
- `WORK_DIR`: Directory where agents clone repositories
- `CLAUDE_PATH`: Path to Claude CLI binary
- `IS_SANDBOX`: Flag indicating sandboxed environment

#### Security Model

##### Encryption

All communication between the backend and agent server uses AES-256-GCM encryption.

##### Firewall Configuration

The install script configures firewall rules to allow inbound connections:

**Linux (ufw):**
```bash
ufw allow 8911/tcp
```

**Linux (firewalld):**
```bash
firewall-cmd --permanent --add-port=8911/tcp
firewall-cmd --reload
```

---

## Navigation Structure

### Main Website (ariana.dev)
- **Home** - Main landing page
- **Features** - Feature overview
- **Pricing** - Plan comparison
- **Changelog** - Product updates
- **Blog** - Articles and insights

### Documentation (docs.ariana.dev)

#### Getting Started
- [Welcome to Ariana](#welcome-to-ariana)
- [Agent VPS](#agent-vps)
- [Automations](#automations)
- [Environments](#environments)

#### Agent Server
- [Installation](#agent-server-installation)
- [Tech Overview](#agent-server-tech-overview)

---

## Positioning Summary

Ariana positions itself as:
1. **A layer on top of Claude Code** - uses your existing subscription
2. **Multi-agent orchestration** - run many agents simultaneously
3. **Remote-first** - agents work on cloud/VPS environments
4. **Developer control** - full machine access, local sync, team sharing
5. **Production-ready** - designed for serious development work

---

## Development Notes for MVP Replication

If building an MVP inspired by Ariana, core components to consider:

1. **Agent Management System**
   - Launch/stop/monitor multiple agents
   - Agent isolation (sandboxes/containers)
   - Resource allocation per agent

2. **Integration Layer**
   - Claude Code API integration
   - SSH/remote machine connectivity
   - File sync between local and remote

3. **User Interface**
   - Web dashboard for agent monitoring
   - Code editor integration
   - Terminal/console view per agent
   - Team collaboration features

4. **Infrastructure**
   - Cloud environment management
   - Environment variable/secrets management
   - Port forwarding
   - Persistent storage

5. **Pricing/Quota System**
   - Agent launch limits
   - Usage tracking
   - Tier-based access control

---

## Competitive Landscape (2025)

### Key Players in Agentic IDE Space

| Product | Description | Key Differentiator |
|---------|-------------|-------------------|
| **Ariana** | Multi-agent orchestration for Claude Code | Full VPS control, team collaboration, cloud environments |
| **Claude Code** | Official Anthropic CLI for AI coding | Native Claude integration, official support |
| **Gemini CLI** | Google's AI coding assistant | Deep Google ecosystem integration |
| **Zencoder** | AI coding agent platform | Enterprise-focused, custom model support |
| **Open-source alternatives** | Various community projects | Free, self-hosted options |

### What Developers Want from Agentic IDEs (2025)

According to [RedMonk analysis](https://redmonk.com/kholterhoff/2025/12/22/10-things-developers-want-from-their-agentic-ides-in-2025/):

1. **Memory features** - Remember preferences across sessions
2. **Subagents** - AI coding team working in parallel
3. **Hooks** - Automate workflows with custom triggers
4. **Plugins** - Shareable across projects
5. **LSP support** - Language Server Protocol for IDE integration
6. **Local-first** - Work offline with local models
7. **Transparent operations** - See what agents are doing
8. **Sandboxing** - Isolate agent work from main codebase
9. **Rollback capabilities** - Easy undo of agent changes
10. **Team workflows** - Shared sessions and collaboration

---

## Technical Architecture Insights

### How Ariana Works (Based on Available Information)

```
┌─────────────────────────────────────────────────────────────┐
│                         Ariana Platform                      │
├─────────────────────────────────────────────────────────────┤
│  Web Dashboard   │  Mobile App   │  Desktop Integration     │
├─────────────────────────────────────────────────────────────┤
│                    Agent Orchestration Layer                 │
│  - Launch/Stop/Monitor                                        │
│  - Environment Management                                     │
│  - Team Sharing & Forking                                     │
├─────────────────────────────────────────────────────────────┤
│                    Cloud Infrastructure                      │
│  - VPS Management (SSH, Ports, Scripts)                      │
│  - File Sync (Local ↔ Remote)                                │
│  - Environment Variables & Secrets                           │
├─────────────────────────────────────────────────────────────┤
│                    Claude Code Integration                   │
│  - User's existing subscription                              │
│  - Multi-agent sessions                                      │
│  - Specification Editor (with code blocks)                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Components

1. **Backend Architecture** (from Finnish Train article)
   - Spawns VPS' on Hetzner Cloud (Agent Machines)
   - Establishes temporary SSH connections for installation and configuration
   - After setup, all communication happens through HTTP
   - Healthchecks, CRUD operations, and status polling via HTTP
   - Self-healthcheck mechanism on each machine

2. **Agent Lifecycle Management**
   - Spawn agents in isolated containers/VPSs
   - Monitor agent status and resource usage
   - Handle agent termination and cleanup

2. **Synchronization Layer**
   - Bidirectional file sync between local and remote
   - Network forwarding (localhost access to agent services)
   - Conflict resolution for concurrent edits

3. **Environment Management**
   - Per-agent environment variables
   - Secret/credential injection
   - Database connection configuration
   - OAuth client management

4. **Collaboration Features**
   - Agent sharing (read-only vs fork permissions)
   - Team workspaces
   - Version control integration

---

## Deep Dive: Key Features Explained

### Environments (November 2025)
Allows defining:
- Environment variables (like `NODE_ENV`, `API_ENDPOINTS`)
- Configuration files (`.env`, `config.json`)
- Secrets (API keys, database passwords)
- Test credentials (OAuth client IDs, sandbox tokens)

Use case: An agent needs to test against a staging database without touching production credentials.

### Slop Mode (November 2025)
A unique feature that:
- Forces Claude Code to work continuously on a task
- Uses a "follow-up agent" that pushes the primary agent to improve
- Automatically sends prompts when the agent stops working
- Designed for long-running tasks requiring iteration

Use case: Complex refactoring that requires multiple passes to get right.

### Agent Forking
- Create a copy of an existing agent's session
- Useful for exploring different implementation paths
- Allows experimentation without losing the original work

### Local Sync
- Pull agent's code changes to local machine
- Push local corrections to running agent
- Access agent's localhost services via port forwarding
- Test agent's work in local IDE

---

## MVP Development Guide: Building an Ariana-like Platform

### Phase 1: Core Agent Management (Foundation)

**Tech Stack Recommendations:**
- Backend: Bun (per project preferences)
- Database: `bun:sqlite` for metadata
- WebSocket: Built-in `WebSocket` API
- SSH: `node-ssh` or similar
- Container: Docker API for agent isolation

**Components to Build:**

```typescript
// Core data structures
interface Agent {
  id: string;
  status: 'running' | 'stopped' | 'error';
  spec: string;              // Claude Code specification
  environment: Environment;   // Env vars and secrets
  vps: VPSConnection;         // SSH connection details
  createdAt: Date;
  owner: User;
}

interface Environment {
  name: string;
  variables: Record<string, string>;
  secrets: Record<string, string>;  // Encrypted
  configFiles: Record<string, string>;
}

interface VPSConnection {
  host: string;
  port: number;
  username: string;
  authMethod: 'key' | 'password';
}
```

**API Endpoints:**
```
POST   /api/agents          - Launch new agent
GET    /api/agents          - List all agents
GET    /api/agents/:id      - Get agent details
DELETE /api/agents/:id      - Stop/terminate agent
POST   /api/agents/:id/fork - Fork existing agent
PUT    /api/agents/:id/sync - Sync files with local
```

### Phase 2: Claude Code Integration

```typescript
// Claude Code session management
interface ClaudeSession {
  agentId: string;
  apiKey: string;           // User's own Claude Code API key
  specification: string;
  messages: Message[];
  status: 'active' | 'completed' | 'error';
}

// Launch Claude Code in remote container
async function launchClaudeAgent(
  agent: Agent,
  specification: string
): Promise<ClaudeSession> {
  // 1. Connect to VPS via SSH
  // 2. Spin up container with codebase
  // 3. Inject environment variables
  // 4. Launch Claude Code with specification
  // 5. Return session ID for monitoring
}
```

### Phase 3: Real-time Monitoring

```typescript
// WebSocket for agent status updates
interface AgentUpdate {
  agentId: string;
  status: AgentStatus;
  logs: LogEntry[];
  filesChanged: FileChange[];
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

// Broadcast updates to connected clients
function broadcastAgentUpdate(update: AgentUpdate) {
  clients.forEach(ws => {
    if (ws.subscribedTo(update.agentId)) {
      ws.send(JSON.stringify(update));
    }
  });
}
```

### Phase 4: File Synchronization

```typescript
// Sync engine for local ↔ remote
interface SyncOperation {
  type: 'pull' | 'push' | 'bidirectional';
  agentId: string;
  paths: string[];
  conflictResolution: 'remote' | 'local' | 'manual';
}

async function syncWithAgent(
  operation: SyncOperation
): Promise<SyncResult> {
  // 1. Establish SSH connection
  // 2. Compare file states (rsync-like algorithm)
  // 3. Apply changes based on direction
  // 4. Handle conflicts per resolution strategy
  // 5. Return sync summary
}
```

### Phase 5: Team Features

```typescript
// Sharing and permissions
interface AgentShare {
  agentId: string;
  sharedBy: string;
  sharedWith: string[];
  permissions: 'view' | 'fork' | 'edit';
  expiresAt?: Date;
}

interface ForkedAgent {
  originalAgentId: string;
  newAgentId: string;
  forkedBy: string;
  createdAt: Date;
}
```

---

## Implementation Complexity Assessment

| Component | Complexity | Key Challenges |
|-----------|-----------|----------------|
| Agent Lifecycle | Medium | Container management, resource cleanup |
| Claude Integration | Simple | API wrapper, session management |
| File Sync | Complex | Conflict resolution, delta computation |
| SSH/VPS Management | Medium | Connection pooling, authentication |
| Real-time Updates | Medium | WebSocket scaling, reconnection |
| Environment/Secrets | Medium | Secure storage, injection |
| Team/Collaboration | Complex | Permissions, concurrent access |
| Pricing/Quota | Simple | Counter, tier enforcement |

**Overall MVP Complexity: Complex** (multi-step, 2-3 month project for small team)

---

## Data Model (SQLite Schema)

```sql
-- Agents
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  spec TEXT NOT NULL,
  status TEXT NOT NULL,
  environment_id TEXT,
  vps_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  stopped_at DATETIME,
  FOREIGN KEY (environment_id) REFERENCES environments(id),
  FOREIGN KEY (vps_id) REFERENCES vps_configs(id)
);

-- Environments
CREATE TABLE environments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  variables JSON,  -- {KEY: VALUE}
  secrets TEXT,    -- Encrypted JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- VPS Configurations
CREATE TABLE vps_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  -- Never store passwords directly, use references
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent Shares
CREATE TABLE agent_shares (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  shared_by TEXT NOT NULL,
  shared_with TEXT NOT NULL,
  permissions TEXT NOT NULL,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Usage Tracking (for quota)
CREATE TABLE usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'launch', 'fork', 'resume'
  agent_id TEXT,
  quota_cost INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  claude_api_key_encrypted TEXT,
  plan TEXT DEFAULT 'free',  -- free, max, ultra
  quota_reset_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Business Model Analysis

### Revenue Streams

1. **Subscription Tiers**
   - Free: $0 (30 agents) - Acquisition, product-market fit
   - Max: $4.99/mo (300 agents) - Main revenue driver
   - Ultra: $45/mo (3000 agents) - High-volume users

2. **Potential Future Revenue**
   - Compute marketplace (premium VPS options)
   - Team/enterprise plans (SSO, audit logs)
   - API access for platform integration

### Unit Economics (Hypothetical)

| Metric | Assumption |
|--------|-----------|
| CAC (Customer Acquisition Cost) | $15-30 |
| ARPU (Average Revenue Per User) | $5-10 |
| LTV (Lifetime Value) | $60-120 |
| Payback period | 2-6 months |

### Pricing Economics: The $4.99 vs. Self-Hosting Comparison

**The insight**: Ariana's Max plan ($4.99/mo for 300 agents) provides equivalent value to ~300 hours of self-hosted VPS time.

| Comparison | Value |
|------------|-------|
| **Ariana Max Plan** | $4.99/month for 300 agents |
| **Self-hosted VPS equivalent** | ~300 hours on Hetzner CX31 |
| **Hetzner CX31 specs** | 4 vCPU / 8GB RAM @ ~€0.015/hour |
| **Cost for 300 hours** | ~$4.50 (300 × €0.015) |

**How Ariana achieves this economics**:

1. **Infra Sharing**: Multiple agents share infrastructure efficiently vs. dedicating one VPS per agent
2. **Copy Pool Pattern**: Reuse workspace copies instead of creating fresh ones (reduces I/O and storage overhead)
3. **On-Demand Spawning**: Agents only consume resources when actively running
4. **Optimization Over Scale**: Platform-level optimization beats per-user dedicated nodes

**The value proposition**:
- **Self-hosting 1 agent for 300 hours** = $4.50
- **Ariana: 300 agents** (any duration, concurrent or sequential) = $4.99

Ariana makes its margin through **efficient utilization** rather than charging per compute-hour. The platform becomes more profitable as users:
- Run agents for shorter durations (more turnover per slot)
- Don't fully utilize all 300 agent slots (headroom = profit margin)
- Share agents across teams (amortized cost)

This is a classic **multiplexing economics** play—similar to how airlines overbook flights or cloud providers oversubscribe resources.

### Key Metrics to Track

- Agent launch rate (DAU/WAU/MAU)
- Free to paid conversion
- Churn rate by tier
- Average agents per user
- Fork rate (virality indicator)

---

## Security Considerations

1. **Secret Management**
   - Never log environment variables or secrets
   - Encrypt at rest in database
   - Use secure injection into containers

2. **SSH Key Management**
   - Support key-based auth only
   - Never store private keys decryptable
   - Consider hardware security modules (HSM)

3. **Claude API Keys**
   - User brings their own key (BYOK)
   - Store encrypted with user-specific encryption
   - Never share across users

4. **Isolation**
   - Each agent in separate container/VM
   - Network segmentation between agents
   - Resource quotas (CPU, memory, disk)

5. **Audit Logging**
   - Log all agent launches/stops
   - Track file access and modifications
   - Monitor resource usage patterns

---

## Sources

### Primary Sources
- [Ariana.dev Official Website](https://ariana.dev/)
- [Ariana Documentation](https://docs.ariana.dev/)
- [Ariana GitHub Repository](https://github.com/ariana-dot-dev)
- [Ariana LinkedIn](https://www.linkedin.com/company/ariana-dev)

### Community & Analysis
- [10 Things Developers Want from Agentic IDEs in 2025 - RedMonk](https://redmonk.com/kholterhoff/2025/12/22/10-things-developers-want-from-their-agentic-ides-in-2025/)
- [AI Coding Agents 2025: Claude Code vs Challengers - Etixio](https://www.etixio.com/en/ai-coding-agents-2025-claude-code-challengers/)
- [Claude Code 2025 Summary - Medium](https://medium.com/@joe.njenga/claude-code-2025-summary-from-launch-to-beast-timeline-features-full-breakdown-45e5f3d8d5ff)
- [Zencoder AI](https://zencoder.ai/)
- [Claude 2025 Code & Desktop Update Guide - Skywork](https://skywork.ai/blog/agent/claude-2025-code-desktop-update-guide/)
- [How I Build AI Agent Products in 2025 - YouTube](https://www.youtube.com/watch?v=Phuew4RPwqA)

---

# Open Source Codebase Analysis

*Analysis of the `github.com/ariana-dot-dev/ariana` repository - The open-source IDE codebase released under AGPL-3.0*

## Repository Overview

**Location**: `/Users/ebowwa/apps/com.hetzner.codespaces/public/resources/ariana`

This is the **open-source ancestor/IDE portion** of Ariana - a collaborative workspace for coding agents. The repository contains:

- Desktop IDE built with Tauri (Rust + React)
- Database server for user/auth/backlog management
- iOS IDE codebase (separate)

**License**: AGPL-3.0-or-later

## Project Structure

```
ariana/
├── frontend/
│   ├── tauri-app/           # Main Tauri desktop app
│   │   ├── src/             # React frontend source
│   │   │   ├── App.tsx      # Main application component
│   │   │   ├── state/       # Global state management (Tauri Store)
│   │   │   ├── types/       # TypeScript domain models
│   │   │   ├── canvas/      # Canvas workspace components
│   │   │   ├── components/  # UI components
│   │   │   ├── services/    # Business logic services
│   │   │   ├── hooks/       # React hooks
│   │   │   └── bindings/    # Tauri command bindings
│   │   └── src-tauri/       # Rust backend
│   │       ├── src/
│   │       │   ├── lib.rs              # Main Tauri setup
│   │       │   ├── terminal.rs         # Terminal (xterm.js) manager
│   │       │   ├── custom_terminal.rs  # Custom VT100 terminal
│   │       │   ├── os.rs               # OS session abstraction
│   │       │   ├── git.rs              # Git operations
│   │       │   ├── filesystem.rs       # File operations
│   │       │   ├── system.rs           # System commands
│   │       │   └── commands.rs         # Command execution
│   │       ├── Cargo.toml
│   │       └── tauri.conf.json
│   └── package.json
├── db-server/               # PostgreSQL backend API
│   ├── database.js
│   ├── schema.sql
│   └── migrations/
├── ios-ide/                 # iOS IDE (separate project)
├── Justfile                 # Development commands
└── .claude/CLAUDE.md        # Project coding rules
```

## Technology Stack

### Frontend (Desktop App)
- **React 19** + TypeScript
- **Tauri 2.5** (desktop runtime)
- **Vite 6** (build tool)
- **Tailwind CSS v4** (styling)
- **xterm.js** (terminal emulation)
- **@swc/wasm-web** (code interpretation)
- **Framer Motion** (animations)

### Backend (Rust)
- **tokio** (async runtime)
- **portable-pty** (PTY handling)
- **vt100** (terminal parsing)
- **anyhow** (error handling)
- **window-vibrancy** (macOS visual effects)
- **Tauri plugins**: store, fs, os, dialog, shell

### Database Server (Node.js)
- **PostgreSQL** database
- **JWT** authentication
- **OAuth** (Google, GitHub)

## Core Architecture Concepts

### 1. OS Sessions

Abstracts different execution environments (Local filesystem vs WSL):

```typescript
// src/bindings/os.ts
type OsSession =
  | { Local: string }           // Native filesystem path
  | { Wsl: {                    // Windows Subsystem for Linux
      distribution: string,
      working_directory: string
    }}
```

**Key functions**:
- `osSessionGetWorkingDirectory(osSession)` - Get current directory
- `osSessionEquals(a, b)` - Compare sessions for equality

### 2. Canvases (Isolated Workspaces)

A **Canvas** is an isolated workspace with its own Git branch and task state:

```typescript
// src/types/GitProject.ts
interface GitProjectCanvas {
  id: string;
  name: string;
  elements: CanvasElement[];      // UI elements on canvas
  osSession: OsSession | null;    // Branch-specific session
  taskManager: TaskManager;       // Task state machine
  runningProcesses?: ProcessState[];
  lockState: 'normal' | 'loading' | 'merging' | 'merged';
  lockingAgentId?: string;        // Which background agent
  copyProgress?: CopyProgress;    // Loading state
  inProgressPrompts?: Map<string, string>;
}
```

### 3. Git Project

Container for multiple canvases (branch workspaces):

```typescript
class GitProject {
  id: string;
  name: string;
  root: OsSession;               // Original repository
  canvases: GitProjectCanvas[];  // Branch workspaces
  currentCanvasIndex: number;
  backgroundAgents: BackgroundAgent[];
  gitOriginUrl: string | null;
  repositoryId: string | null;   // For secure API access

  // Key methods
  addCanvasCopy(onProgress, initialPrompt, onCanvasReady): { success, canvasId, error }
  mergeCanvasToRoot(canvasId): Promise<MergeResult>
  lockCanvas(canvasId, lockState, agentId): boolean
  unlockCanvas(canvasId, agentId): boolean
}
```

### 4. Task Manager

State machine for managing coding agent tasks:

```
prompting -> queued -> running <-> paused -> running -> completed
                              \-> failed
```

```typescript
// src/types/Task.ts
class TaskManager {
  // State transitions
  createPromptingTask(prompt: string): string
  queueTask(taskId: string): boolean
  startTask(taskId: string, processId?: string): boolean
  pauseTask(taskId: string): boolean
  resumeTask(taskId: string): boolean
  failTask(taskId: string, reason?: string): boolean
  completeTask(taskId: string, commitHash: string): boolean

  // Multi-task fusion (combine into single commit)
  fuseRunningTasks(): CompletedTask

  // Revert/restore functionality
  performRevert(taskId: string, osSession: OsSession): Promise<boolean>
  performRestore(taskId: string, osSession: OsSession): Promise<boolean>

  // Agent-workspace linking
  linkTaskToAgents(taskId: string, canvasIds: string[]): boolean
}
```

### 5. Copy Pool Manager

Efficient workspace copying using a pool of pre-created copies:

```typescript
// src/services/CopyPoolManager.ts
class CopyPoolManager {
  // Get a copy (reuses existing or creates new)
  getCopy(rootDirectory: string, osSession: OsSession): Promise<CopyPoolEntry>

  // Return a copy for reuse
  returnCopy(entry: CopyPoolEntry, rootDirectory: string, osSession: OsSession): Promise<void>
}
```

**Purpose**: Avoids expensive file operations on every canvas creation by maintaining a pool of pre-copied workspaces.

### 6. Background Agents

Async operations that run outside the main canvas (primarily for merges):

```typescript
// src/types/BackgroundAgent.ts
type BackgroundAgentType = 'merge' | 'diff';

class BackgroundAgent {
  id: string;
  type: BackgroundAgentType;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  context: any;              // Agent-specific context
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}
```

**Merge agents handle**:
- Collecting historical prompts from all canvases
- Running Claude Code merge workflow
- Handling merge conflicts
- Cleaning up after completion

### 7. Canvas Elements

UI components that can be placed on canvases:

```typescript
// src/canvas/types.ts
type CanvasElement = {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  kind:
    | { textArea: TextArea }           // Code/spec editor
    | { fileTree: FileTree }           // File browser
    | { terminal: Terminal }           // xterm.js terminal
    | { customTerminal: CustomTerminal } // VT100 terminal
};
```

## Tauri Commands (Rust Backend API)

### Terminal Management (xterm.js)
```rust
create_terminal_connection(os_session: OsSession) -> Result<String, String>
send_terminal_data(connection_id: String, data: String)
resize_terminal(connection_id: String, cols: u16, rows: u16)
close_terminal_connection(connection_id: String)
cleanup_dead_connections() -> Result<(), String>
```

### Custom Terminal (VT100 rendering)
```rust
custom_connect_terminal(config: CustomTerminalConfig) -> Result<String, String>
custom_kill_terminal(terminal_id: String)
custom_send_input_lines(terminal_id: String, lines: Vec<String>)
custom_send_raw_input(terminal_id: String, input: String)
custom_send_ctrl_c(terminal_id: String)
custom_send_ctrl_d(terminal_id: String)
custom_send_scroll_up(terminal_id: String)
custom_send_scroll_down(terminal_id: String)
custom_resize_terminal(terminal_id: String, cols: u16, rows: u16)
```

### File System Operations
```rust
get_current_dir(os_session: OsSession) -> Result<String, String>
get_file_tree(os_session: OsSession, path: String) -> Result<Vec<FileNode>, String>
copy_files_optimized(source: String, dest: String, os_session: OsSession, exclude_git: Option<bool>)
get_copy_stats(source: String, dest: String, os_session: OsSession) -> Result<Value, String>
open_path_in_explorer(path: String)
open_path_in_explorer_with_os_session(path: String, os_session: OsSession)
delete_path(path: String)
delete_path_with_os_session(path: String, os_session: OsSession)
create_directory(path: String, os_session: OsSession)
```

### Git Operations
```rust
check_git_repository(directory: String, os_session: OsSession) -> Result<bool, String>
git_init_repository(directory: String, os_session: OsSession)
git_commit(directory: String, message: String, os_session: OsSession) -> Result<String, String>
git_revert_to_commit(directory: String, commit_hash: String, os_session: OsSession)
create_git_branch(directory: String, branch_name: String, os_session: OsSession)
git_get_current_branch(directory: String, os_session: OsSession) -> Result<String, String>
git_get_origin_url(directory: String, os_session: OsSession) -> Result<String, String>
git_check_merge_conflicts(directory: String, source: String, target: String, os_session: OsSession) -> Result<bool, String>
git_get_conflict_files(directory: String, os_session: OsSession) -> Result<Vec<String>, String>
git_merge_branch(directory: String, source: String, target: String, os_session: OsSession) -> Result<String, String>
```

### Git Search
```rust
start_git_directories_search(os_session_kind: OsSessionKind) -> Result<String, String>
get_found_git_directories_so_far(search_id: String) -> Result<GitSearchResult, String>
cancel_git_directories_search(search_id: String)
list_available_os_session_kinds() -> Result<Vec<OsSessionKind>, String>
```

### System Commands
```rust
execute_command(command: String, args: Vec<String>) -> Result<String, String>
execute_command_in_dir(command: String, args: Vec<String>, directory: String) -> Result<String, String>
execute_command_with_os_session(command: String, args: Vec<String>, directory: String, os_session: OsSession) -> Result<String, String>
```

## State Management

Uses Tauri's persistent store with React Context:

```typescript
// src/state/index.tsx
interface AppState {
  theme: string;
  showOnboarding: boolean;
  currentInterpreterScript: string;
  gitProjects: GitProject[];
}

interface IStore extends AppState {
  setTheme(theme: string): void;
  addGitProject(project: GitProject): string;
  removeGitProject(projectId: string): void;
  getGitProject(projectId: string): GitProject | null;
  updateGitProject(projectId: string): void;
  clearAllGitProjects(): void;
  resetStore(): Promise<void>;
  processCommand(command: Command): void;
  revertCommand(): void;
}
```

Auto-saves to `store.json` on every state change.

## Key Components

### App.tsx
Main application component with:
- Authentication flow (OAuth)
- Custom titlebar with window controls
- Project selector / Canvas view routing
- Communication palette for LLM chat
- Theme switcher

### Repl.tsx
Scriptable REPL (Ctrl+Shift+P to toggle):
- Runs interpreter commands
- Shows current script state
- Direct command execution

### GitProjectView.tsx
Main project interface:
- Canvas tab bar
- Element rendering on canvas
- Task list with state management
- Background agent status display

### CanvasView.tsx
Canvas workspace rendering:
- Draggable/resizable elements
- Grid-based layout with optimizer
- File tree, text areas, terminals

### DiffManagement.tsx
Git diff visualization:
- Side-by-side diff view
- Per-file hunk management
- Interactive conflict resolution

### CommunicationPalette.tsx
LLM chat interface:
- Creates agent workspaces (canvas copies)
- Pre-fills initial prompts
- Named agent workspaces

### CustomTerminal
VT100 terminal emulation:
- Renders terminal as text (no xterm.js dependency)
- Scrollable output
- Ctrl+C, Ctrl+D support
- Search functionality

## Services Layer

### GitService
- Repository initialization
- Commit, branch, merge operations
- Stash changes
- Revert to commit

### CanvasService
- Canvas element management
- Position calculations
- Grid optimization

### CopyPoolManager
- Workspace copy pooling
- Progress tracking
- Copy reuse logic

### BackgroundAgentManager
- Agent lifecycle management
- Merge agent creation
- Cleanup on completion
- Persistence triggering

### TerminalService
- Terminal process tracking
- Connection management
- Input/output handling

### ProcessManager
- Process spawning
- PID tracking
- Cleanup on exit

### AuthService
- OAuth flow handling
- JWT token storage
- API request signing
- Auth state management

### LLMService
- LLM API calls
- Communication palette integration

## Database Schema (db-server/)

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  provider VARCHAR,              -- OAuth provider
  provider_user_id VARCHAR,      -- User ID from provider
  email VARCHAR,
  email_verified BOOLEAN,
  name VARCHAR,
  avatar_url TEXT,
  created_at TIMESTAMP,
  last_login TIMESTAMP
);
```

### Git Repositories Table
```sql
CREATE TABLE git_repositories (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  repo_url TEXT,
  created_at TIMESTAMP,
  access_status BOOLEAN DEFAULT true,
  last_access_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Backlog Table
```sql
CREATE TABLE backlog (
  id SERIAL PRIMARY KEY,
  git_repository_url TEXT,
  task TEXT,
  status VARCHAR,  -- 'open', 'in_progress', 'completed'
  owner UUID REFERENCES users(id),
  created_at TIMESTAMP
);
```

## Development Commands (Justfile)

```bash
just dev-backend     # Install and run backend
just dev-frontend    # Install and run Tauri app
just dev-cli         # Install and run CLI (requires backend)
just build-windows   # Build for Windows
just build-macos     # Build for macOS
just build-linux     # Build for Linux
just format          # Format all code
```

## Key Patterns

### 1. Reactive Listeners
Objects expose `subscribe()` for change notifications:

```typescript
// GitProject canvas changes
project.subscribe('canvases', () => {
  // React to canvas changes
});

// TaskManager task changes
taskManager.subscribe(() => {
  // React to task changes
});
```

### 2. Canvas Locking
Prevents concurrent modification during merge operations:

```typescript
lockCanvas(canvasId, 'merging', agentId)
// ... perform merge ...
unlockCanvas(canvasId, agentId)
```

### 3. Process-Task Linking
Links terminal processes to tasks for tracking:

```typescript
interface ProcessState {
  processId: string;
  terminalId: string;
  elementId: string;  // Which canvas element owns this
  prompt?: string;    // Initial prompt
}
```

### 4. Auto-Recovery on Restore
When restoring from JSON:
- Checks for orphaned running tasks
- Fails tasks with dead terminals
- Performs git stash if needed
- Re-subscribes to agent status changes

### 5. Interpreter System
Scriptable commands using SWC WASM:
- Command parsing and execution
- Undo/redo stack
- Integration with store state

## Security Considerations

1. **Repository Random IDs** - Uses `random_id` for API access, not sequential IDs
2. **JWT Authentication** - All backlog API calls require valid token
3. **Parameterized Queries** - Database uses prepared statements
4. **OS Session Validation** - Checks directory existence before operations
5. **Root Branch Protection** - Prevents modification of original root branch
6. **AES-256-GCM Encryption** - Communication with agent VPS

## API Endpoints (db-server/)

### Backlog Management (all require JWT)

```
POST   /api/backlog              # Create backlog item
GET    /api/backlog              # Get user's backlog (with filters)
GET    /api/admin/backlog        # Get all backlog (admin)
GET    /api/backlog/:id          # Get specific item
PUT    /api/backlog/:id          # Update item
DELETE /api/backlog/:id          # Delete item
GET    /api/backlog/stats        # Get statistics
GET    /api/backlog/repository   # Get by repository URL
```

## Coding Rules (.claude/CLAUDE.md)

```markdown
## Comments
- Skip comments if names are clear
- Lowercase comments
- Focus on "why" not "what"

## Code Quality
- Avoid linting errors
- Make sure project compiles before passing to user
- Fix warnings, not just errors

## Rust
- Use `anyhow` for error handling
- Don't run `cargo build --release`, use `cargo check`
- Use `cargo add` for dependencies
- Prefer functional, compact transformations

## Tauri/Frontend
- Run `just build-frontend` in git root
- Use `npm run dev-tauri` for development
- Use `npm run build-tauri` for building
```

## Comparison to com.hetzner.codespaces

| Aspect | Ariana (Open Source) | Hetzner Codespaces |
|--------|----------------------|-------------------|
| **Form Factor** | Desktop (Tauri) | Web-based |
| **Isolation** | Git branches (local) | Actual VPS instances |
| **Terminal** | VT100/xterm.js | Browser-based terminal |
| **State** | Local Tauri store | Cloud backend |
| **Agent Model** | Canvas workspaces | Streaming agents |
| **License** | AGPL-3.0 | Proprietary |
| **Auth** | OAuth + JWT | (varies) |

## Inspirational Patterns for Your Platform

### 1. Copy Pool Manager
Reuse workspaces instead of creating fresh ones every time. Could apply to VPS snapshot management.

### 2. Task Fusion
Combine multiple agent runs into single commit. Useful for batch operations.

### 3. Background Agents
Async operations with status tracking and auto-cleanup.

### 4. Canvas Locking
Prevent concurrent modification issues during critical operations.

### 5. Process-Task Linking
Track which terminal belongs to which task for better monitoring.

### 6. Auto-Recovery
Handle orphaned tasks on app restart - useful for crashed agents.

### 7. Repository Random IDs
Security through non-sequential identifiers for API access.

## File Locations Reference

```
frontend/tauri-app/src/
├── App.tsx                    # Main app component
├── main.tsx                   # Entry point
├── Repl.tsx                   # Scriptable REPL
├── state/index.tsx            # Global state (Tauri Store)
├── types/
│   ├── Task.ts                # TaskManager class
│   ├── GitProject.ts          # GitProject class
│   ├── BackgroundAgent.ts     # Background agents
│   └── StatusTypes.ts         # Status enums
├── services/
│   ├── GitService.ts
│   ├── CanvasService.ts
│   ├── CopyPoolManager.ts
│   ├── BackgroundAgentManager.ts
│   ├── TerminalService.ts
│   ├── ProcessManager.ts
│   ├── AuthService.ts
│   └── LLMService.ts
├── canvas/
│   ├── Canvas.tsx             # Main canvas component
│   ├── TextArea.ts            # Spec editor
│   ├── FileTreeCanvas.ts      # File browser
│   ├── CustomTerminal.ts      # VT100 terminal
│   └── types.ts               # Canvas types
├── components/
│   ├── GitProjectView.tsx     # Project view
│   ├── DiffManagement.tsx     # Diff UI
│   ├── CommunicationPalette.tsx # LLM chat
│   └── AuthPage.tsx           # OAuth login
└── bindings/os.ts             # OS session bindings

frontend/tauri-app/src-tauri/src/
├── lib.rs                     # Main Tauri setup
├── terminal.rs                # xterm.js terminal
├── custom_terminal.rs         # VT100 terminal
├── os.rs                      # OS session abstraction
├── git.rs                     # Git operations
├── filesystem.rs              # File operations
├── system.rs                  # System commands
└── commands.rs                # Command execution
```

---

*Open source codebase analysis from github.com/ariana-dot-dev/ariana - Last updated: January 2026*

---

*Documentation compiled from ariana.dev, docs.ariana.dev, and open-source codebase - Last updated: January 2026*
