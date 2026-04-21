/**
 * Meta-LLM Client -- lightweight, non-streaming LLM for meta-tasks.
 *
 * Used for: context compaction (summarization), session handoff, self-assessment.
 * Separated from the main agent loop so meta-tasks use a cheap/fast model
 * (glm-5-turbo) while the agent loop uses glm-5.
 *
 * Uses OpenAI chat/completions format because all z.ai models are OpenAI-compatible.
 */

import { META_LLM_MODEL, VISION_MODEL, getModel, getProviderConfig } from "./models.js";

export interface MetaLLMResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

const META_TIMEOUT_MS = 30_000;
const META_MAX_RETRIES = 1;

export class MetaLLMClient {
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(opts?: { model?: string; apiKey?: string; baseUrl?: string }) {
    this.model = opts?.model ?? META_LLM_MODEL;

    const modelDef = getModel(this.model);
    const providerCfg = modelDef
      ? getProviderConfig(modelDef.provider)
      : undefined;

    this.baseUrl =
      opts?.baseUrl ??
      modelDef?.baseUrl ??
      providerCfg?.baseUrl ??
      "https://api.z.ai/api/coding/paas/v4";

    this.apiKey =
      opts?.apiKey ??
      process.env.Z_AI_API_KEY ??
      process.env.ZHIPU_API_KEY ??
      process.env.ANTHROPIC_AUTH_TOKEN ??
      process.env.ANTHROPIC_API_KEY ??
      "";
  }

  /**
   * Single request/response completion (no streaming, no tools).
   * Returns the text output or null if the call fails.
   */
  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 2048,
  ): Promise<MetaLLMResponse | null> {
    if (!this.apiKey) return null;

    const body = {
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    for (let attempt = 0; attempt <= META_MAX_RETRIES; attempt++) {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), META_TIMEOUT_MS);

      try {
        const url = `${this.baseUrl}/chat/completions`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error(
            `\x1b[33m[MetaLLM] ${res.status} from ${this.model}: ${errText.slice(0, 200)}\x1b[0m`,
          );
          if (res.status >= 500 && attempt < META_MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 2_000));
            continue;
          }
          return null;
        }

        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              content?: string;
              reasoning_content?: string;
            };
          }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };

        const msg = data.choices?.[0]?.message;
        const text = msg?.content || msg?.reasoning_content || "";
        if (!text) return null;

        return {
          text,
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("abort") && attempt < META_MAX_RETRIES) {
          console.error(`\x1b[33m[MetaLLM] Timeout, retrying...\x1b[0m`);
          continue;
        }
        console.error(`\x1b[33m[MetaLLM] Error: ${errMsg}\x1b[0m`);
        return null;
      } finally {
        clearTimeout(timeout);
      }
    }

    return null;
  }

  /**
   * Completion with an image (base64 or URL).
   * Only works on vision-capable models (glm-4.5v, glm-4.6v, glm-5v-turbo).
   */
  async completeWithImage(
    systemPrompt: string,
    userText: string,
    image: { base64: string; mediaType: string } | { url: string },
    maxTokens = 512,
  ): Promise<MetaLLMResponse | null> {
    if (!this.apiKey) {
      console.error(`\x1b[33m[VisionLLM] no API key — vision disabled\x1b[0m`);
      return null;
    }

    const imageContent =
      "url" in image
        ? { type: "image_url" as const, image_url: { url: image.url } }
        : {
            type: "image_url" as const,
            image_url: {
              url: `data:${image.mediaType};base64,${image.base64}`,
            },
          };

    const body = {
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0,
      // Disable extended chain-of-thought so tokens go to response content, not reasoning_content
      enable_thinking: false,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            imageContent,
          ],
        },
      ],
    };

    for (let attempt = 0; attempt <= META_MAX_RETRIES; attempt++) {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), META_TIMEOUT_MS);

      try {
        const url = `${this.baseUrl}/chat/completions`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error(
            `\x1b[33m[VisionLLM] ${res.status} from ${this.model}: ${errText.slice(0, 200)}\x1b[0m`,
          );
          if (res.status >= 500 && attempt < META_MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 2_000));
            continue;
          }
          return null;
        }

        const data = (await res.json()) as {
          choices?: Array<{
            message?: {
              content?: string;
              reasoning_content?: string;
            };
          }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };

        const msg = data.choices?.[0]?.message;
        const finishReason = (data as { choices?: Array<{ finish_reason?: string }> }).choices?.[0]?.finish_reason;
        // Prefer explicit content; fall back to reasoning_content when content is empty (e.g. finish_reason=length on thinking models)
        const text = (msg?.content?.trim()) || (msg?.reasoning_content?.trim()) || "";
        if (!text) {
          console.error(`\x1b[33m[VisionLLM] empty response (finish_reason=${finishReason})\x1b[0m`);
          return null;
        }

        return {
          text,
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("abort") && attempt < META_MAX_RETRIES) {
          console.error(`\x1b[33m[VisionLLM] Timeout, retrying...\x1b[0m`);
          continue;
        }
        console.error(`\x1b[33m[VisionLLM] Error: ${errMsg}\x1b[0m`);
        return null;
      } finally {
        clearTimeout(timeout);
      }
    }

    return null;
  }
}

// ============================================
// Singletons
// ============================================

let _metaInstance: MetaLLMClient | undefined;
let _visionInstance: MetaLLMClient | undefined;

/** Meta-LLM (glm-5-turbo) -- compaction, handoff, self-assessment */
export function getMetaLLM(): MetaLLMClient {
  if (!_metaInstance) {
    _metaInstance = new MetaLLMClient();
    console.log(
      `\x1b[90m[MetaLLM] Initialized: model=${META_LLM_MODEL}, baseUrl=${_metaInstance["baseUrl"]}\x1b[0m`,
    );
  }
  return _metaInstance;
}

/** Vision-capable LLM (glm-5v-turbo) -- screenshot analysis, rendered output verification */
export function getVisionLLM(): MetaLLMClient {
  if (!_visionInstance) {
    _visionInstance = new MetaLLMClient({ model: VISION_MODEL });
    console.log(
      `\x1b[90m[VisionLLM] Initialized: model=${VISION_MODEL}, baseUrl=${_visionInstance["baseUrl"]}\x1b[0m`,
    );
  }
  return _visionInstance;
}
