# Z.AI Devpack Documentation: Using GLM-4.7 with OpenAI-Compatible Tools

## Overview

This document describes how to integrate the **GLM-4.7** model (from Z.AI) into any tool that supports the **OpenAI API protocol**. The integration method is straightforward: simply replace the default OpenAI API endpoint with Z.AI's endpoint.

## Core Concept

**Any tool that supports the OpenAI Protocol can run on GLM-4.7.**

The integration requires only two changes:
1. Replace the OpenAI Base URL
2. Set your Z.AI API Key

---

## Supported Tools

The following tools are explicitly mentioned as supporting the OpenAI Protocol and can integrate GLM-4.7:

- **Cursor** (Note: Custom configuration requires Cursor Pro+)
- **Gemini CLI**
- **Cherry Studio**
- Any other tool supporting the OpenAI Protocol

---

## Core Configuration Steps

### Step 1: Select a Provider
Choose an OpenAI-compatible tool/provider that you want to use with GLM-4.7.

### Step 2: Replace the Base URL
Replace the default OpenAI Base URL with:
```
https://api.z.ai/api/coding/paas/v4
```

### Step 3: Configure API Key and Model
- Enter your **Z.AI API Key** (obtained from Z.AI platform)
- Select one of the available models:
  - `GLM-4.7` - Standard model for complex tasks
  - `GLM-4.5-air` - Lightweight model for faster response

---

## Model Options

| Model | Description | Use Case |
|-------|-------------|----------|
| `GLM-4.7` | Standard model | Complex tasks, full-featured coding assistance |
| `GLM-4.5-air` | Lightweight/air model | Faster response times, lighter tasks |

---

## Pricing Plans & Usage Quotas

| Plan | Prompts per 5 Hours | Comparison to Claude |
|------|---------------------|---------------------|
| **Lite** | ~120 prompts | ~3× Claude Pro quota |
| **Pro** | ~600 prompts | ~3× Claude Max (5x) quota |
| **Max** | ~2400 prompts | ~3× Claude Max (20x) quota |

**Current Subscription:** Max Plan (up to ~2400 prompts every 5 hours)

---

## Detailed Configuration Example: Cursor

### Prerequisites
- **Cursor Pro or higher** (custom configuration only supported in paid versions)
- Z.AI API Key

### Step 1: Install Cursor
Download and install Cursor from the official website.

### Step 2: Create a New Custom Model

1. Navigate to the **"Models"** section in Cursor
2. Click **"Add Custom Model"**
3. Configure the following:
   - **Protocol**: Select "OpenAI Protocol"
   - **API Key**: Enter your Z.AI API Key
   - **Base URL Override**: Replace with `https://api.z.ai/api/coding/paas/v4`
   - **Model Name**: Enter in UPPERCASE (e.g., `GLM-4.7`)

### Step 3: Save and Switch
1. Save your configuration
2. On the homepage, select your newly created **GLM-4.7 Provider**

### Step 4: Get Started
You can now use GLM-4.7 for:
- Code generation
- Debugging
- Task analysis
- And more

---

## General API URL Replacement Steps

For any OpenAI-compatible tool:

### Step 1: Locate API Configuration
Find where API settings are configured in your tool:
- **Goose**: Typically in configuration file
- **VS Code plugins**: Through plugin settings interface
- **IntelliJ IDEA plugins**: Through plugin settings interface

### Step 2: Replace OpenAI Base URL
Replace the default OpenAI API URL with:
```
https://api.z.ai/api/coding/paas/v4
```

### Step 3: Enter API Key and Select Model
- Enter your **Z.AI API Key**
- Choose between:
  - `GLM-4.7` for standard, complex tasks
  - `GLM-4.5-air` for lightweight, faster response

---

## API Endpoint Summary

| Configuration | Value |
|---------------|-------|
| **Base URL** | `https://api.z.ai/api/coding/paas/v4` |
| **Protocol** | OpenAI API Protocol |
| **Models** | `GLM-4.7`, `GLM-4.5-air` |
| **Authentication** | Z.AI API Key |

---

## Important Notes

1. **Model Name Case Sensitivity**: In Cursor, model names must be entered in **UPPERCASE** (e.g., `GLM-4.7`, not `glm-4.7`)

2. **Pro Version Required**: Cursor custom configuration is only available in Cursor Pro and higher versions

3. **Protocol Compatibility**: This works with any tool that properly implements the OpenAI API protocol

---

## Summary

By following these steps, you can integrate the **GLM-4.7** model into any tool supporting the OpenAI protocol. The process is:

1. Replace the API endpoint to `https://api.z.ai/api/coding/paas/v4`
2. Enter your Z.AI API Key
3. Select your preferred model (GLM-4.7 or GLM-4.5-air)

Once configured, you can leverage GLM-4.7 for powerful code generation, debugging, and analysis tasks within your preferred development environment.

---

## Questions Raised (Unanswered in Documentation)

1. **API Key Acquisition**: Where/how to obtain a Z.AI API Key? (Not covered in this document)

2. **Rate Limits**: Are there rate limits for the API endpoint?

3. **Pricing**: What is the cost structure for GLM-4.7 vs GLM-4.5-air?

4. **Feature Support**: What specific features are supported?
   - Streaming responses?
   - Function calling?
   - Vision/multimodal capabilities?
   - System prompts?

5. **Full Model Catalog**: Is there a complete list of available models?

6. **Other Tool-Specific Guides**: Are there configuration guides for other popular tools (VS Code extensions, JetBrains IDEs, etc.)?

7. **Authentication Details**: How is the API key passed? (Bearer token, custom header, etc.)

8. **Error Handling**: What error responses should clients expect?

9. **Response Format**: Are responses identical to OpenAI's format or are there differences?

10. **Versioning**: How does the `/v4/` in the URL relate to model versions?

---

## Building New Products with GLM-4.7

This section explains how to integrate GLM-4.7 into new products using the OpenAI-compatible endpoint.

### Direct Integration Pattern

Since Z.AI provides an OpenAI-compatible endpoint, any product can use standard OpenAI client libraries:

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
  apiKey: process.env.ZAI_API_KEY
});

const response = await client.chat.completions.create({
  model: 'GLM-4.7',
  messages: [{ role: 'user', content: 'Write a React component' }]
});
```

This approach works for:
- **Web apps** (Next.js, Remix, etc.)
- **CLI tools** (any language)
- **Desktop apps** (Electron, Tauri)
- **Mobile apps** (React Native, native iOS/Android)

### Architecture Pattern

```
┌─────────────────────────────────────────────────────┐
│                   Your Product                       │
│  ┌──────────────────────────────────────────────┐  │
│  │   OpenAI-compatible Client Layer             │  │
│  │   (just swap baseURL + apiKey)               │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│            Z.AI Gateway (OpenAI Protocol)            │
│  https://api.z.ai/api/coding/paas/v4                 │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                  GLM-4.7 Model                       │
└─────────────────────────────────────────────────────┘
```

### Product Integration Examples

#### Web App (Next.js)

```typescript
// app/api/generate/route.ts
import OpenAI from 'openai';

const glm = new OpenAI({
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
  apiKey: process.env.ZAI_API_KEY
});

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const completion = await glm.chat.completions.create({
    model: 'GLM-4.7',
    messages: [{ role: 'user', content: prompt }]
  });

  return Response.json(completion);
}
```

#### VS Code Extension

```json
// package.json
{
  "contributes": {
    "configuration": {
      "title": "GLM Coding Assistant",
      "properties": {
        "glm.apiKey": {"type": "string"},
        "glm.baseURL": {
          "default": "https://api.z.ai/api/coding/paas/v4"
        }
      }
    }
  }
}
```

#### CLI Tool

```typescript
#!/usr/bin/env bun
import OpenAI from 'openai';

const glm = new OpenAI({
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
  apiKey: process.env.ZAI_API_KEY
});

const result = await glm.chat.completions.create({
  model: 'GLM-4.7',
  messages: [{ role: 'user', content: Bun.args.join(' ') }]
});

console.log(result.choices[0].message.content);
```

### Shared Infrastructure for Multiple Products

Create a reusable GLM client package:

```typescript
// packages/glm-client/src/index.ts
import OpenAI from 'openai';

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export class GLMClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: 'https://api.z.ai/api/coding/paas/v4',
      apiKey
    });
  }

  async generate(prompt: string, options?: GenerateOptions) {
    return this.client.chat.completions.create({
      model: 'GLM-4.7',
      messages: [{ role: 'user', content: prompt }],
      ...options
    });
  }

  async generateStreaming(prompt: string) {
    return this.client.chat.completions.create({
      model: 'GLM-4.7',
      messages: [{ role: 'user', content: prompt }],
      stream: true
    });
  }
}
```

Usage across products:

```typescript
import { GLMClient } from '@yourcompany/glm-client';

const glm = new GLMClient(process.env.ZAI_API_KEY);
const result = await glm.generate('Write a function');
```

### Implementation Considerations

#### 1. API Key Management

Decide how users authenticate:
- **Your keys** - You pay for all usage, easier UX
- **User BYOK** - Users bring their own key, you pay nothing
- **Hybrid** - Free tier with your keys, paid tier with BYOK

#### 2. Rate Limiting

Z.AI may have rate limits. Consider implementing:
- Per-user quotas
- Request queuing with backoff
- Fallback to GLM-4.5-air for faster/cheaper requests

#### 3. Cost Tracking & Usage Monitoring

Even with a Max Plan (2400 prompts/5 hours), you need visibility into usage. Below is a complete implementation for tracking tokens, costs, and quotas.

##### Token Counting with Client-Side Tracking

```typescript
// packages/glm-client/src/index.ts
import OpenAI from 'openai';

export interface UsageRecord {
  userId: string;
  productId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  timestamp: Date;
}

export class GLMClient {
  private client: OpenAI;

  constructor(apiKey: string, private config: {
    userId: string;
    productId: string;
  }) {
    this.client = new OpenAI({
      baseURL: 'https://api.z.ai/api/coding/paas/v4',
      apiKey
    });
  }

  async generate(prompt: string, options?: GenerateOptions) {
    const response = await this.client.chat.completions.create({
      model: 'GLM-4.7',
      messages: [{ role: 'user', content: prompt }],
      ...options
    });

    // Track usage from response
    if (response.usage) {
      await this.trackUsage({
        userId: this.config.userId,
        productId: this.config.productId,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        model: response.model,
        timestamp: new Date()
      });
    }

    return response;
  }

  private async trackUsage(record: UsageRecord) {
    // Log to database, analytics, etc.
    console.log('[Usage]', JSON.stringify(record));
  }
}
```

##### SQLite Database Schema

```typescript
// db/schema.ts
import { Database } from 'bun:sqlite';

const db = new Database('usage.db');

// Create usage tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    model TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_user_product ON usage_logs(user_id, product_id);
  CREATE INDEX IF NOT EXISTS idx_created_at ON usage_logs(created_at);
`);

export function logUsage(record: UsageRecord) {
  const query = db.prepare(`
    INSERT INTO usage_logs
    (user_id, product_id, prompt_tokens, completion_tokens, total_tokens, model)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  query.run(
    record.userId,
    record.productId,
    record.promptTokens,
    record.completionTokens,
    record.totalTokens,
    record.model
  );
}

export function getUsageStats(userId: string, productId: string, hours: number = 5) {
  const query = db.prepare(`
    SELECT
      COUNT(*) as request_count,
      SUM(total_tokens) as total_tokens,
      SUM(prompt_tokens) as prompt_tokens,
      SUM(completion_tokens) as completion_tokens
    FROM usage_logs
    WHERE user_id = ?
      AND product_id = ?
      AND created_at > datetime('now', '-' || ? || ' hours')
  `);

  return query.get(userId, productId, hours) as {
    request_count: number;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

// Check if user has remaining quota
export function checkQuota(userId: string, productId: string): boolean {
  const stats = getUsageStats(userId, productId, 5);
  const MAX_REQUESTS = 2400; // Max Plan
  return stats.request_count < MAX_REQUESTS;
}
```

##### Quota Enforcement Middleware

```typescript
// middleware/quota.ts
import { getUsageStats } from '@/db/schema';

export function quotaMiddleware(userId: string, productId: string) {
  const stats = getUsageStats(userId, productId, 5);
  const used = stats.request_count;
  const max = 2400; // Max Plan
  const remaining = max - used;
  const resetAt = new Date(Date.now() + (5 * 60 * 60 * 1000));

  if (remaining <= 0) {
    return {
      allowed: false,
      error: {
        code: 'quota_exceeded',
        message: `Quota exceeded. ${used}/${max} requests used in last 5 hours.`,
        resetAt: resetAt.toISOString()
      }
    };
  }

  return {
    allowed: true,
    remaining,
    usage: { used, max, percentage: (used / max) * 100 }
  };
}
```

##### Usage Dashboard API

```typescript
// app/api/usage-stats/route.ts
import { getUsageStats } from '@/db/schema';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || 'default';
  const productId = url.searchParams.get('productId') || 'default';

  const stats = getUsageStats(userId, productId, 5);

  return Response.json({
    requests: {
      used: stats.request_count,
      max: 2400,
      remaining: 2400 - stats.request_count,
      percentage: (stats.request_count / 2400) * 100
    },
    tokens: {
      prompt: stats.prompt_tokens,
      completion: stats.completion_tokens,
      total: stats.total_tokens
    },
    resetAt: new Date(Date.now() + (5 * 60 * 60 * 1000)).toISOString()
  });
}
```

##### Cost Estimation

```typescript
// utils/cost.ts
// Note: Actual GLM-4.7 pricing may vary - check Z.AI documentation
const GLM_PRICING = {
  'GLM-4.7': {
    input: 0.00001,  // per token (example - update with actual pricing)
    output: 0.00002  // per token (example - update with actual pricing)
  }
} as const;

export function calculateCost(usage: UsageRecord): number {
  const pricing = GLM_PRICING[usage.model as keyof typeof GLM_PRICING];
  if (!pricing) return 0;

  const inputCost = usage.promptTokens * pricing.input;
  const outputCost = usage.completionTokens * pricing.output;

  return inputCost + outputCost;
}

export function getProductCost(productId: string, hours: number = 24) {
  const query = db.prepare(`
    SELECT prompt_tokens, completion_tokens, model
    FROM usage_logs
    WHERE product_id = ?
      AND created_at > datetime('now', '-' || ? || ' hours')
  `);

  const records = query.all(productId, hours) as Array<{
    prompt_tokens: number;
    completion_tokens: number;
    model: string;
  }>;

  return records.reduce((total, record) => {
    return total + calculateCost({
      userId: '',
      productId,
      promptTokens: record.prompt_tokens,
      completionTokens: record.completion_tokens,
      totalTokens: record.prompt_tokens + record.completion_tokens,
      model: record.model,
      timestamp: new Date()
    });
  }, 0);
}
```

##### Alert Thresholds

```typescript
// utils/alerts.ts
const ALERT_THRESHOLDS = [
  { percentage: 80, level: 'warning' },
  { percentage: 90, level: 'critical' },
  { percentage: 100, level: 'exceeded' }
];

export function checkAlerts(usage: { used: number; max: number }) {
  const percentage = (usage.used / usage.max) * 100;

  for (const threshold of ALERT_THRESHOLDS) {
    if (percentage >= threshold.percentage) {
      return {
        level: threshold.level,
        percentage,
        message: `${threshold.level.toUpperCase()}: ${percentage.toFixed(0)}% of quota used`
      };
    }
  }

  return null;
}
```

##### Dashboard React Component

```typescript
// app/dashboard/page.tsx
export default async function Dashboard() {
  const stats = await getUsageStats('user-1', 'product-1', 5);
  const percentage = (stats.request_count / 2400) * 100;

  return (
    <div className="p-8">
      <h1>Usage Dashboard</h1>

      <div className="mt-4">
        <div className="flex justify-between mb-2">
          <span>5-Hour Quota</span>
          <span>{stats.request_count} / 2400 requests</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm mt-2">
          {percentage.toFixed(1)}% used • {2400 - stats.request_count} remaining
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Total Tokens</p>
          <p className="text-2xl font-bold">{stats.total_tokens.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Prompt Tokens</p>
          <p className="text-2xl font-bold">{stats.prompt_tokens.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-600">Completion Tokens</p>
          <p className="text-2xl font-bold">{stats.completion_tokens.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
```

#### 4. Error Handling

Handle common scenarios:
- API downtime / timeouts
- Rate limit exceeded (HTTP 429)
- Invalid API key (HTTP 401)
- Model unavailable

```typescript
try {
  const result = await glm.generate(prompt);
} catch (error) {
  if (error.status === 429) {
    // Rate limit - queue or retry
  } else if (error.status === 401) {
    // Invalid key - prompt user
  }
}
```

### Key Advantages of This Approach

1. **Instant Distribution** - Any tool with OpenAI support works immediately
2. **No Custom Integrations** - Don't build per-tool adapters
3. **Standard Protocol** - Leverage existing OpenAI SDKs and documentation
4. **Easy Model Swapping** - Change models without client code changes

---

*Document generated from: https://docs.z.ai/devpack/tool/others*
*Date: 2025-01-13*
*Product Integration Section Added: 2025-01-13*
