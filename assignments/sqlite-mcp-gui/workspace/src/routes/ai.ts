/**
 * AI-related routes for codespaces management
 *
 * Handles all AI-powered features including:
 * - Text generation and chat completions
 * - Server naming suggestions
 * - Server type recommendations
 * - Resource analysis
 * - SSH troubleshooting
 * - Action suggestions
 * - Status messages
 * - Historical metrics analysis
 */

import { Hono } from "hono";
import type { GLMClient } from "@codespaces/ai";
import { PROMPTS } from "@codespaces/ai/prompts";
import { getMetricsSummary, getLatestMetric } from "../lib/metrics";
import {
  AIGenerateRequestSchema,
  AIChatRequestSchema,
  AISuggestNameRequestSchema,
  AISuggestServerTypeRequestSchema,
  AIAnalyzeResourcesRequestSchema,
  AITroubleshootSSHRequestSchema,
  AISuggestActionsRequestSchema,
  AIStatusMessageRequestSchema,
  AIAnalyzeHistoricalRequestSchema,
} from "@ebowwa/codespaces-types/runtime/api";

// Validation helpers
function validateRequest<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: { issues: Array<{ path: string[]; message: string }> } } },
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.safeParse(data);
    if (result.success && result.data) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: result.error?.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ") || "Validation failed",
      };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Register all AI-related routes with the Hono app
 */
export function registerAIRoutes(
  app: Hono,
  glmClient: GLMClient | null,
): void {
  /**
   * POST /api/ai/generate - Simple text generation
   */
  app.post("/api/ai/generate", async (c) => {
    if (!glmClient) {
      return c.json({ success: false, error: "AI service not available" }, 503);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(AIGenerateRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const { prompt, model, temperature, maxTokens } = validation.data;

      const result = await glmClient.generate(prompt, {
        model,
        temperature,
        maxTokens,
      });

      return c.json({
        success: true,
        content: result,
      });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/ai/chat - Chat with messages array
   */
  app.post("/api/ai/chat", async (c) => {
    if (!glmClient) {
      return c.json({ success: false, error: "AI service not available" }, 503);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(AIChatRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const { messages, model, temperature, maxTokens } = validation.data;

      const response = await glmClient.chatCompletion(messages, {
        model,
        temperature,
        maxTokens,
      });

      return c.json({
        success: true,
        message: response.choices[0]?.message?.content || "",
        usage: response.usage
          ? {
              promptTokens: response.usage.promptTokens,
              completionTokens: response.usage.completionTokens,
              totalTokens: response.usage.totalTokens,
            }
          : undefined,
      });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/ai/suggest/name - Generate server name
   */
  app.post("/api/ai/suggest/name", async (c) => {
    if (!glmClient) {
      return c.json({ success: false, error: "AI service not available" }, 503);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(AISuggestNameRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const { project, description } = validation.data;

      const prompt = PROMPTS.generateServerName(project, description);
      const name = await glmClient.generate(prompt, { temperature: 0.9 });

      // Clean up the response - remove quotes, extra whitespace
      const cleanName = name
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .toLowerCase()
        .replace(/\s+/g, "-");

      return c.json({ success: true, name: cleanName });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/ai/suggest/server-type - Suggest optimal server type
   */
  app.post("/api/ai/suggest/server-type", async (c) => {
    if (!glmClient) {
      return c.json({ success: false, error: "AI service not available" }, 503);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(AISuggestServerTypeRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const { workload } = validation.data;

      const prompt = PROMPTS.suggestServerType(workload);
      const suggestion = await glmClient.generate(prompt, { temperature: 0.5 });

      return c.json({ success: true, suggestion });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/ai/analyze/resources - Analyze resource usage
   */
  app.post("/api/ai/analyze/resources", async (c) => {
    if (!glmClient) {
      return c.json({ success: false, error: "AI service not available" }, 503);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(AIAnalyzeResourcesRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const { cpu, memory, disk } = validation.data;

      const prompt = PROMPTS.analyzeResources(cpu, memory, disk);
      const analysis = await glmClient.generate(prompt, { temperature: 0.6 });

      return c.json({ success: true, analysis });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/ai/troubleshoot/ssh - Get SSH troubleshooting help
   */
  app.post("/api/ai/troubleshoot/ssh", async (c) => {
    if (!glmClient) {
      return c.json({ success: false, error: "AI service not available" }, 503);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(AITroubleshootSSHRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const { error } = validation.data;

      const prompt = PROMPTS.sshTroubleshoot(error);
      const tips = await glmClient.generate(prompt, { temperature: 0.5 });

      return c.json({ success: true, tips });
    } catch (err) {
      return c.json({ success: false, error: String(err) }, 500);
    }
  });

  /**
   * POST /api/ai/suggest/actions - Suggest server actions
   */
  app.post("/api/ai/suggest/actions", async (c) => {
    if (!glmClient) {
      return c.json({ success: false, error: "AI service not available" }, 503);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(AISuggestActionsRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const { status, age } = validation.data;

      const prompt = PROMPTS.suggestActions(status, age);
      const suggestions = await glmClient.generate(prompt, { temperature: 0.6 });

      return c.json({ success: true, suggestions });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * POST /api/ai/status/message - Generate witty status message
   */
  app.post("/api/ai/status/message", async (c) => {
    if (!glmClient) {
      return c.json({ success: false, error: "AI service not available" }, 503);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(AIStatusMessageRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const { status, name } = validation.data;

      const prompt = PROMPTS.statusMessage(status, name);
      const message = await glmClient.generate(prompt, { temperature: 0.9 });

      return c.json({ success: true, message });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/ai/capabilities - Get AI service info
   */
  app.get("/api/ai/capabilities", (c) => {
    return c.json({
      available: glmClient !== null,
      provider: "Z.AI",
      models: ["GLM-4.7", "GLM-4.5-air"],
      endpoints: [
        "POST /api/ai/generate",
        "POST /api/ai/chat",
        "POST /api/ai/suggest/name",
        "POST /api/ai/suggest/server-type",
        "POST /api/ai/analyze/resources",
        "POST /api/ai/troubleshoot/ssh",
        "POST /api/ai/suggest/actions",
        "POST /api/ai/status/message",
        "POST /api/ai/analyze/historical",
      ],
    });
  });

  /**
   * POST /api/ai/analyze/historical - Analyze historical metrics
   */
  app.post("/api/ai/analyze/historical", async (c) => {
    if (!glmClient) {
      return c.json({ success: false, error: "AI service not available" }, 503);
    }

    try {
      const body = await c.req.json();
      const validation = validateRequest(AIAnalyzeHistoricalRequestSchema, body);

      if (!validation.success) {
        return c.json({ success: false, error: validation.error }, 400);
      }

      const { environmentId, hours = 24 } = validation.data;

      const summary = getMetricsSummary(environmentId.toString(), hours);
      const latest = getLatestMetric(environmentId.toString());

      if (!summary || !latest) {
        return c.json(
          { success: false, error: "No metrics found for this environment" },
          404,
        );
      }

      // Build prompt with historical context
      const prompt = `Analyze this server's resource usage over the past ${hours} hours:

**Current Values:**
- CPU: ${latest.cpuPercent}%
- Memory: ${latest.memoryPercent}%
- Disk: ${latest.diskPercent}%

**Historical Stats (past ${hours}h, ${summary.dataPoints} data points):**
CPU: avg ${summary.cpu.avg.toFixed(1)}%, min ${summary.cpu.min}%, max ${summary.cpu.max}%, trend: ${summary.cpu.trend || "unknown"}
Memory: avg ${summary.memory.avg.toFixed(1)}%, min ${summary.memory.min}%, max ${summary.memory.max}%, trend: ${summary.memory.trend || "unknown"}
Disk: avg ${summary.disk.avg.toFixed(1)}%, min ${summary.disk.min}%, max ${summary.disk.max}%, trend: ${summary.disk.trend || "unknown"}

Provide a 2-sentence analysis:
1. Overall health assessment with trend context
2. Specific actionable recommendation based on patterns`;

      const analysis = await glmClient.generate(prompt, { temperature: 0.6 });

      return c.json({
        success: true,
        analysis,
        summary,
        current: latest,
      });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
