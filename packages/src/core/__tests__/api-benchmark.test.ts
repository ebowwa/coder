/**
 * API Benchmark Tests
 *
 * Measures latency, throughput, and concurrency behavior across
 * z.ai GLM models to optimize daemon API usage patterns.
 *
 * Run: doppler run -p seed -c prd -- bunx vitest run --reporter verbose api-benchmark
 */

import { describe, test, expect } from "vitest";
import { MetaLLMClient, type MetaLLMResponse } from "../meta-llm-client.js";

// ============================================
// Test Configuration
// ============================================

const MODELS_TO_BENCH = [
  // Text models (sorted by expected cost: high -> low)
  { id: "glm-5", tier: "opus", quotaMultiplier: "2-3x", inputCost: 1.0, outputCost: 3.2 },
  { id: "glm-5-turbo", tier: "opus", quotaMultiplier: "1x(promo)/2-3x", inputCost: 1.2, outputCost: 4.0 },
  { id: "glm-4.7", tier: "sonnet", quotaMultiplier: "1x", inputCost: 0.6, outputCost: 2.2 },
  { id: "glm-4.6", tier: "sonnet", quotaMultiplier: "1x", inputCost: 0.6, outputCost: 2.2 },
  { id: "glm-4.5", tier: "sonnet", quotaMultiplier: "1x", inputCost: 0.6, outputCost: 2.2 },
  { id: "glm-4.5-air", tier: "haiku", quotaMultiplier: "1x", inputCost: 0.2, outputCost: 1.1 },
] as const;

const VISION_MODELS = [
  { id: "glm-4.5v", inputCost: 0.6, outputCost: 1.8 },
  { id: "glm-4.6v", inputCost: 0.3, outputCost: 0.9 },
  { id: "glm-4.6v-flash", inputCost: 0, outputCost: 0 },
] as const;

const CODING_PROMPT = {
  system: "You are a coding assistant. Be concise.",
  user: "Write a TypeScript function that reverses a string. Only output the code, nothing else.",
  maxTokens: 256,
};

const ANALYSIS_PROMPT = {
  system: "You are a code reviewer. Be concise.",
  user: "Review this function for bugs:\n```typescript\nfunction add(a: number, b: number): string {\n  return a + b;\n}\n```\nList issues in 1-2 sentences.",
  maxTokens: 128,
};

const TRIVIAL_PROMPT = {
  system: "You are a helpful assistant. Do not use thinking or reasoning. Just answer directly.",
  user: "What is 2+2? Reply with just the number.",
  maxTokens: 32,
};

// ============================================
// Helpers
// ============================================

interface BenchResult {
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  tokensPerSec: number;
  costPerCall: number;
  success: boolean;
  error?: string;
}

async function benchCall(
  modelId: string,
  prompt: { system: string; user: string; maxTokens: number },
): Promise<BenchResult> {
  const client = new MetaLLMClient({ model: modelId });
  const start = Date.now();

  try {
    const result = await client.complete(prompt.system, prompt.user, prompt.maxTokens);
    const latencyMs = Date.now() - start;

    if (!result) {
      return {
        model: modelId,
        latencyMs,
        inputTokens: 0,
        outputTokens: 0,
        tokensPerSec: 0,
        costPerCall: 0,
        success: false,
        error: "null response",
      };
    }

    const modelInfo = [...MODELS_TO_BENCH, ...VISION_MODELS].find((m) => m.id === modelId);
    const costPerCall =
      ((result.inputTokens * (modelInfo?.inputCost ?? 1)) +
        (result.outputTokens * (modelInfo?.outputCost ?? 3))) / 1_000_000;

    return {
      model: modelId,
      latencyMs: result.durationMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      tokensPerSec: result.outputTokens / (result.durationMs / 1000),
      costPerCall,
      success: true,
    };
  } catch (err) {
    return {
      model: modelId,
      latencyMs: Date.now() - start,
      inputTokens: 0,
      outputTokens: 0,
      tokensPerSec: 0,
      costPerCall: 0,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function printTable(label: string, results: BenchResult[]) {
  console.log(`\n${"=".repeat(90)}`);
  console.log(` ${label}`);
  console.log(`${"=".repeat(90)}`);
  console.log(
    `${"Model".padEnd(20)} ${"Latency".padStart(9)} ${"In Tok".padStart(8)} ${"Out Tok".padStart(8)} ${"Tok/s".padStart(8)} ${"Cost".padStart(10)} ${"Status".padStart(8)}`,
  );
  console.log("-".repeat(90));
  for (const r of results) {
    console.log(
      `${r.model.padEnd(20)} ${(r.latencyMs + "ms").padStart(9)} ${String(r.inputTokens).padStart(8)} ${String(r.outputTokens).padStart(8)} ${r.tokensPerSec.toFixed(1).padStart(8)} ${("$" + r.costPerCall.toFixed(6)).padStart(10)} ${(r.success ? "OK" : "FAIL").padStart(8)}`,
    );
    if (r.error) console.log(`${"".padEnd(20)} -> ${r.error}`);
  }
  console.log("-".repeat(90));
}

// ============================================
// Tests
// ============================================

describe("API Latency Benchmark", { timeout: 120_000 }, () => {
  test("single-call latency per model (coding prompt)", async () => {
    const results: BenchResult[] = [];

    for (const model of MODELS_TO_BENCH) {
      const r = await benchCall(model.id, CODING_PROMPT);
      results.push(r);
    }

    printTable("Single Call Latency - Coding Prompt", results);

    const successful = results.filter((r) => r.success);
    expect(successful.length).toBeGreaterThan(0);
  });

  test("single-call latency per model (trivial prompt)", async () => {
    const results: BenchResult[] = [];

    for (const model of MODELS_TO_BENCH) {
      const r = await benchCall(model.id, TRIVIAL_PROMPT);
      results.push(r);
    }

    printTable("Single Call Latency - Trivial Prompt (min latency floor)", results);

    // Intermittent null responses expected from rate limits; log but don't fail
    const successful = results.filter((r) => r.success);
    console.log(`${successful.length}/${results.length} models responded`);
  });
});

describe("Concurrency Throttling", { timeout: 180_000 }, () => {
  test("serial vs parallel: 3 calls to same model", async () => {
    const model = "glm-4.7"; // Use 1x quota model for safety

    // Serial: one after another
    const serialStart = Date.now();
    const serialResults: BenchResult[] = [];
    for (let i = 0; i < 3; i++) {
      serialResults.push(await benchCall(model, ANALYSIS_PROMPT));
    }
    const serialTotalMs = Date.now() - serialStart;

    // Parallel: all at once
    const parallelStart = Date.now();
    const parallelResults = await Promise.all([
      benchCall(model, ANALYSIS_PROMPT),
      benchCall(model, ANALYSIS_PROMPT),
      benchCall(model, ANALYSIS_PROMPT),
    ]);
    const parallelTotalMs = Date.now() - parallelStart;

    printTable("Serial (3 sequential calls)", serialResults);
    printTable("Parallel (3 concurrent calls)", parallelResults);

    const serialAvg = serialResults.reduce((s, r) => s + r.latencyMs, 0) / 3;
    const parallelAvg = parallelResults.reduce((s, r) => s + r.latencyMs, 0) / 3;
    const parallelMax = Math.max(...parallelResults.map((r) => r.latencyMs));

    console.log(`\n--- Concurrency Analysis ---`);
    console.log(`Serial:   total=${serialTotalMs}ms, avg_latency=${serialAvg.toFixed(0)}ms`);
    console.log(`Parallel: total=${parallelTotalMs}ms, avg_latency=${parallelAvg.toFixed(0)}ms, max=${parallelMax}ms`);
    console.log(`Speedup:  ${(serialTotalMs / parallelTotalMs).toFixed(2)}x`);
    console.log(`Throttle: ${parallelAvg > serialAvg * 1.5 ? "YES - parallel calls are throttled" : "NO - parallel calls not throttled"}`);

    // Intermittent null responses expected; log concurrency data regardless
    console.log(`Parallel success: ${parallelResults.filter((r) => r.success).length}/3`);
  });

  test("cross-model parallel: glm-5 + glm-4.7 + glm-4.5-air simultaneously", async () => {
    const models = ["glm-5", "glm-4.7", "glm-4.5-air"];

    const start = Date.now();
    const results = await Promise.all(
      models.map((m) => benchCall(m, ANALYSIS_PROMPT)),
    );
    const totalMs = Date.now() - start;

    printTable("Cross-Model Parallel (3 different models)", results);

    console.log(`\n--- Cross-Model Concurrency ---`);
    console.log(`Wall time: ${totalMs}ms`);
    console.log(`Sum of latencies: ${results.reduce((s, r) => s + r.latencyMs, 0)}ms`);
    console.log(`Parallelism efficiency: ${(results.reduce((s, r) => s + r.latencyMs, 0) / totalMs).toFixed(2)}x`);
  });
});

describe("Token Throughput", { timeout: 120_000 }, () => {
  test("output throughput: generate 512 tokens per model", async () => {
    const longPrompt = {
      system: "You are a coding assistant.",
      user: "Write a comprehensive TypeScript class for a LinkedList with insert, delete, find, reverse, and toString methods. Include type parameters. Output only code.",
      maxTokens: 512,
    };

    const results: BenchResult[] = [];
    const targetModels = ["glm-5", "glm-5-turbo", "glm-4.7", "glm-4.5-air"];

    for (const modelId of targetModels) {
      const r = await benchCall(modelId, longPrompt);
      results.push(r);
    }

    printTable("Output Throughput (512 max tokens)", results);

    console.log(`\n--- Throughput Ranking ---`);
    const sorted = results.filter((r) => r.success).sort((a, b) => b.tokensPerSec - a.tokensPerSec);
    for (const r of sorted) {
      console.log(`  ${r.model}: ${r.tokensPerSec.toFixed(1)} tok/s (${r.outputTokens} tokens in ${r.latencyMs}ms)`);
    }
  });
});

describe("Vision Model Benchmark", { timeout: 90_000 }, () => {
  test("vision model availability + latency (text-only probe)", async () => {
    const results: BenchResult[] = [];

    for (const model of VISION_MODELS) {
      const r = await benchCall(model.id, {
        system: "You are a helpful assistant.",
        user: "What color is the sky on a clear day? One word.",
        maxTokens: 16,
      });
      results.push(r);
    }

    printTable("Vision Models (text-only availability probe)", results);

    const available = results.filter((r) => r.success).map((r) => r.model);
    console.log(`\nAvailable vision models: ${available.join(", ") || "NONE"}`);
    console.log(`Recommended for daemon: ${available[0] ?? "none available"}`);
  });
});

describe("Cost Optimization Analysis", { timeout: 60_000 }, () => {
  test("cost per equivalent task across tiers", async () => {
    const models = ["glm-5", "glm-4.7", "glm-4.5-air"];
    const results: BenchResult[] = [];

    for (const modelId of models) {
      const r = await benchCall(modelId, CODING_PROMPT);
      results.push(r);
    }

    printTable("Cost Per Task Comparison", results);

    console.log(`\n--- Cost Analysis (per 1000 daemon tasks) ---`);
    for (const r of results.filter((r) => r.success)) {
      const modelMeta = MODELS_TO_BENCH.find((m) => m.id === r.model);
      const costPer1k = r.costPerCall * 1000;
      const quotaImpact = modelMeta?.quotaMultiplier ?? "?";
      console.log(`  ${r.model}: $${costPer1k.toFixed(3)}/1k tasks, quota impact: ${quotaImpact}, latency: ${r.latencyMs}ms`);
    }

    const glm5 = results.find((r) => r.model === "glm-5" && r.success);
    const glm47 = results.find((r) => r.model === "glm-4.7" && r.success);
    if (glm5 && glm47) {
      console.log(`\n--- GLM-5 vs GLM-4.7 for daemon routine tasks ---`);
      console.log(`  Latency: ${glm5.latencyMs}ms vs ${glm47.latencyMs}ms (${((glm5.latencyMs - glm47.latencyMs) / glm5.latencyMs * 100).toFixed(0)}% ${glm47.latencyMs < glm5.latencyMs ? "faster" : "slower"})`);
      console.log(`  Cost:    $${glm5.costPerCall.toFixed(6)} vs $${glm47.costPerCall.toFixed(6)} (${((glm5.costPerCall - glm47.costPerCall) / glm5.costPerCall * 100).toFixed(0)}% cheaper)`);
      console.log(`  Quota:   2-3x vs 1x (${glm5.latencyMs > 0 ? "2-3x" : "?"} more quota per task with GLM-5)`);
      console.log(`  Verdict: ${glm47.latencyMs < glm5.latencyMs ? "GLM-4.7 recommended for routine daemon tasks" : "GLM-5 still faster (unexpected)"}`);
    }
  });
});
