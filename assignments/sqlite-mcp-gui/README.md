# Cheapspaces - Hetzner Development Environments

## Quick Start

```bash
bun run dev
```

Open http://localhost:3000

## Architecture

Unified Bun server on single port (3000):

- **Frontend**: React 19 app served from `/app/browser-client/`
- **API**: Hono backend at `/api/*`
- **No Vite**: Uses Bun's native HMR

## Development

```bash
bun run dev    # Start unified server with HMR (port 3000)
bun run build  # TypeScript compile
```

Run on custom port:
```bash
PORT=3001 bun run dev
```

## Authentication

The app needs API tokens for Hetzner (required) and optional AI features.

### Hetzner API Token (Required)

The app tries these sources in order:

1. **Environment variable** (`.env` file):
   ```bash
   HETZNER_API_TOKEN=your_token_here bun run dev
   ```

2. **Hetzner CLI config** (automatic):
   If you use the Hetzner CLI, the app reads from `~/.config/hetzner/cli.toml`

Create a `.env` file:
```
HETZNER_API_TOKEN=your_token_here
```

Without Hetzner authentication, the app runs in mock mode.

### GLM-4.7 AI Features (Optional)

The app includes AI-powered features using GLM-4.7 via Z.AI's OpenAI-compatible endpoint.

**Required environment variable:**
```
Z_AI_API_KEY=your_zai_api_key
```

**Using Doppler (recommended):**
```bash
doppler run --project seed --config prd -- bun run dev
```

**With local .env:**
```bash
echo "Z_AI_API_KEY=your_key" >> .env
bun run dev
```

**What AI features unlock:**
- Server name suggestions based on project context
- Resource analysis with historical trends
- SSH troubleshooting tips
- Server action recommendations
- Smart status messages

Without the AI key, these features are gracefully disabled.

## Structure

```
├── index.ts           # Unified server entry point
├── index.html         # SPA entry point
├── app/
│   ├── browser-client/ # React application
│   └── server/        # Hono API backend
```

## API Endpoints

### Environments
- `GET /api/environments` - List Hetzner servers
- `POST /api/environments` - Create new server
- `DELETE /api/environments/:id` - Delete server
- `POST /api/environments/:id/start` - Power on server
- `POST /api/environments/:id/stop` - Power off server
- `GET /api/environments/:id/resources` - Get resource usage (auto-saves metrics)

### Metrics (Time Series)
- `GET /api/environments/:id/metrics` - Get metrics history
- `GET /api/environments/:id/metrics/summary` - Get stats + trends
- `POST /api/metrics` - Manually insert metric

### AI Features (requires `Z_AI_API_KEY`)
- `POST /api/ai/generate` - General text generation
- `POST /api/ai/chat` - Chat with message history
- `POST /api/ai/suggest/name` - Generate server names
- `POST /api/ai/suggest/server-type` - Suggest Hetzner server type
- `POST /api/ai/analyze/resources` - Analyze current resources
- `POST /api/ai/analyze/historical` - Analyze with historical trends
- `POST /api/ai/troubleshoot/ssh` - SSH troubleshooting tips
- `POST /api/ai/suggest/actions` - Server action recommendations
- `GET /api/ai/capabilities` - List available AI features

### System
- `GET /api/health` - Health check (includes AI status)
- `POST /api/screenshot` - Take screenshot
- `POST /api/ssh` - Open SSH connection
- `POST /api/scp/upload` - Upload file via SCP
- `POST /api/scp/download` - Download file via SCP

## Time Series Metrics

The app automatically collects and stores resource usage metrics for AI-powered analysis.

**Captured Metrics:**
- CPU, Memory, Disk percentages
- Network I/O (rx/tx bytes)
- Load average (1min, 5min, 15min)
- Active process count
- Network connection count

**Automatic Collection:**
Metrics are saved to SQLite (`db/metadata.db`) whenever you fetch server resources via `/api/environments/:id/resources`.

**Trend Detection:**
- **Rising**: Values increasing over time
- **Falling**: Values decreasing over time
- **Stable**: Values staying consistent

**AI Analysis:**
Use `/api/ai/analyze/historical` to get AI-powered insights that consider:
- Current values vs historical averages
- Min/max peaks over time period
- Trend direction
- Pattern-based recommendations
