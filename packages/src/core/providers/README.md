# Provider System

Multi-provider architecture for Coder CLI supporting multiple LLM backends.

## Supported Providers

| Provider | Models | Format | Endpoint |
|----------|--------|--------|----------|
| **Zhipu (Z.AI)** | GLM-5, GLM-4.7, GLM-4.6, GLM-4.5V, GLM-4.5, GLM-4.5-air | OpenAI | `https://api.z.ai/api/coding/paas/v4` |
| **MiniMax** | MiniMax-M2.5 | Anthropic | `https://api.minimax.io/anthropic` |
| **OpenAI** | GPT-4, GPT-4-turbo | OpenAI | `https://api.openai.com/v1` |
| **Anthropic** | Claude Opus 4.6, Sonnet 4.6 | Anthropic | *Not implemented (stub)* |

## Z.AI Endpoints

Z.AI provides **two different endpoints**:

| Endpoint | Format | Auth | Use Case |
|----------|--------|------|----------|
| `https://api.z.ai/api/coding/paas/v4` | OpenAI | `Z_AI_API_KEY` | **Coding plan** (default) |
| `https://api.z.ai/api/anthropic` | Anthropic | `ANTHROPIC_AUTH_TOKEN` | Anthropic-compatible |

Our implementation uses the **coding plan endpoint** with shared quotas.

### GLM Models (Coding Plan - Shared Quota)

| Model | Context | Max Output | Vision | Thinking | Quota |
|-------|---------|------------|--------|----------|-------|
| **GLM-5** | 200K | 128K | Yes | Yes | 3x peak, 2x off-peak |
| **GLM-4.7** | 128K | 8K | Yes | Yes | 1x |
| **GLM-4.6** | 128K | 8K | Yes | Yes | 1x |
| **GLM-4.5V** | 128K | 4K | Yes | No | 1x |
| **GLM-4.5** | 128K | 4K | No | No | 1x |
| **GLM-4.5-Air** | 128K | 4K | No | No | 1x (fast/cheap) |

## Configuration

### Environment Variables

```bash
# Z.AI / GLM (Coding Plan)
Z_AI_API_KEY=xxx                    # Single key
Z_AI_API_KEYS='["key1","key2"]'     # Rolling keys (JSON array)
ZHIPU_BASE_URL=https://api.z.ai/api/coding/paas/v4  # Optional override

# MiniMax
MINIMAX_API_KEY=xxx
MINIMAX_BASE_URL=https://api.minimax.io/anthropic  # Optional: use minimaxi.com for China

# OpenAI (Future)
OPENAI_API_KEY=xxx
```

### Doppler Configuration

Add keys to your Doppler project:

```bash
doppler secrets set Z_AI_API_KEY=xxx
doppler secrets set Z_AI_API_KEYS='["key1","key2"]'  # For rolling keys
doppler secrets set MINIMAX_API_KEY=xxx
```

## Usage

### Model Selection

```bash
# Use GLM-5 (Zhipu)
coder --model glm-5

# Use MiniMax M2.5
coder --model minimax-m2.5

# Use GLM-4.5-air (fast/cheap)
coder --model glm-4.5-air
```

### Model Aliases

```typescript
// In code
import { MODEL_ALIASES } from "@ebowwa/coder";

MODEL_ALIASES.glm     // → "glm-5"
MODEL_ALIASES.glm4    // → "glm-4.5-air"
MODEL_ALIASES.minimax // → "minimax-m2.5"
MODEL_ALIASES.m25     // → "minimax-m2.5"
MODEL_ALIASES.fast    // → "glm-4.5-air"
```

### Provider Resolution

```typescript
import { resolveProvider, getProviderForModel } from "@ebowwa/coder";

// Detect provider from model name
const provider = getProviderForModel("glm-5"); // → "zhipu"

// Resolve full provider info
const resolved = resolveProvider("glm-5");
// {
//   config: ProviderConfig,
//   apiKey: string,
//   endpoint: string,
//   model: string
// }
```

### Health Tracking

```typescript
import {
  isProviderHealthy,
  getHealthyProviders,
  recordProviderSuccess,
  recordProviderFailure,
} from "@ebowwa/coder";

// Check if provider is healthy
if (isProviderHealthy("zhipu")) {
  // Use zhipu
}

// Get all healthy providers
const healthy = getHealthyProviders(); // ["zhipu", "minimax"]

// Track success (auto-called by API client)
recordProviderSuccess("zhipu", 1500); // 1.5s latency

// Track failure (auto-called on retry)
recordProviderFailure("zhipu");
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Model Request                      │
│                 (model: "glm-5")                     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
           ┌─────────────────────────┐
           │    resolveProvider()     │
           │  - Detect from name       │
           │  - Load API key           │
           │  - Build endpoint         │
           └─────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│  Zhipu (Z.AI)  │       │   MiniMax     │
│  OpenAI format │       │ Anthropic fmt │
│  /chat/        │       │ /v1/messages  │
│  completions   │       │               │
└───────────────┘       └───────────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
           ┌─────────────────────────┐
           │   Health Tracking        │
           │  - Latency metrics        │
           │  - Failure backoff        │
           │  - Rolling key rotation   │
           └─────────────────────────┘
```

## Rolling Keys

The provider system supports multiple API keys with round-robin rotation:

```bash
# Set multiple keys as JSON array
Z_AI_API_KEYS='["key1","key2","key3"]'
```

Features:
- **Round-robin rotation** - Cycles through keys on each request
- **Exponential backoff** - Keys that fail are temporarily disabled
- **Health tracking** - Keys are tracked per-provider

## Fallback Chain

Default fallback order:
1. `zhipu` (Z.AI / GLM)
2. `minimax` (MiniMax)

Configure via environment:
```bash
MODEL_FALLBACK_CHAIN='["zhipu","minimax","openai"]'
```

## Adding New Providers

1. Add provider config to `providers/index.ts`:
```typescript
PROVIDERS.newprovider = {
  name: "newprovider",
  displayName: "New Provider",
  endpoint: "https://api.newprovider.com/v1",
  authHeader: "Authorization",
  apiKeyEnv: ["NEWPROVIDER_API_KEY"],
  format: "openai", // or "anthropic"
  defaultModel: "newprovider-1",
  models: ["newprovider-1", "newprovider-2"],
  supportsStreaming: true,
  supportsToolCalling: true,
  supportsVision: true,
  supportsThinking: false,
};
```

2. Add model to `models.ts`:
```typescript
"newprovider-1": {
  id: "newprovider-1",
  name: "NP-1",
  fullName: "NewProvider 1",
  provider: "newprovider",
  // ...
}
```

3. Add to fallback chain (optional):
```typescript
DEFAULT_ROUTING_CONFIG.fallbackChain.push("newprovider");
```
