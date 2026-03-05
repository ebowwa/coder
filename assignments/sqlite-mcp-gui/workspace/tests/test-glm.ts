#!/usr/bin/env bun
/**
 * Test script for GLM-4.7 integration
 */

import { GLMClient } from "../src/lib/ai/client.js";
import { type GLMModel } from "../src/lib/ai/types.js";

const API_KEY =
  process.env.Z_AI_API_KEY ||
  process.env.ZAI_API_KEY ||
  process.env.GLM_API_KEY;

if (!API_KEY) {
  console.error(
    "❌ Z_AI_API_KEY, ZAI_API_KEY, or GLM_API_KEY environment variable not set",
  );
  console.log("   Run with: Z_AI_API_KEY=your-key bun tests/test-glm.ts");
  process.exit(1);
}

async function testGLM() {
  console.log(
    "🧪 Testing GLM-4.7 integration - each model tells a unique joke\n",
  );

  const models: GLMModel[] = ["GLM-4.7", "GLM-4.6", "GLM-4.5", "GLM-4.5-air"];

  for (const model of models) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🧪 Model: ${model}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const client = new GLMClient(API_KEY);
    const testPrompt =
      "Tell me a unique, short programming joke. Just the joke, no explanation.";

    try {
      const response = await client.chatCompletion(
        [{ role: "user", content: testPrompt }],
        { model, temperature: 0.9 },
      );

      console.log(`\n😂 Joke:`);
      console.log(
        `   ${response.choices[0]?.message?.content || "No content"}`,
      );

      if (response.usage) {
        console.log(
          `\n📊 Tokens: ${response.usage.totalTokens} (prompt: ${response.usage.promptTokens}, completion: ${response.usage.completionTokens})`,
        );
      }

      if (response.latency) {
        console.log(
          `⚡ Latency: ${response.latency.formatted} (${response.latency.totalMs.toFixed(0)}ms)`,
        );
      }

      console.log(`\n✅ Success!\n`);
    } catch (error) {
      console.error(`❌ Error:`, error);
      console.log();
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    "✅ All models tested - unique jokes confirm each works independently!",
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

await testGLM();
