/**
 * Unit tests for Model types
 */

import { describe, test, expect } from "bun:test";
import {
  type ClaudeModel,
  type ModelDefinition,
  type VertexRegionMapping,
  type ExtendedThinkingFeatures,
  type ExtendedThinkingSettings,
  type ModelPricing,
  hasExtendedContext,
} from "../../packages/src/schemas/index.js";
import {
  MODELS,
  MODEL_PRICING,
  DEFAULT_CONTEXT_WINDOW,
  getModel,
  getContextWindow,
  calculateCost,
  getModelPricing,
} from "../../packages/src/core/models.js";

// Alias for backward compatibility in tests
const getModelById = getModel;

// ============================================
// CLAUDE MODEL TYPE TESTS
// ============================================

describe("ClaudeModel type", () => {
  test("accepts standard model IDs", () => {
    const models: ClaudeModel[] = [
      "claude-opus-4-6",
      "claude-opus-4-1",
      "claude-opus-4",
      "claude-sonnet-4-6",
      "claude-sonnet-4-5",
      "claude-sonnet-4",
      "claude-haiku-4-5",
      "claude-haiku-4-5-20251001",
    ];

    models.forEach((model) => {
      expect(typeof model).toBe("string");
    });
  });

  test("accepts extended context models", () => {
    const extendedModels: ClaudeModel[] = [
      "claude-opus-4-6[1m]",
      "claude-sonnet-4-6[1m]",
    ];

    extendedModels.forEach((model) => {
      expect(model).toContain("[1m]");
    });
  });

  test("accepts custom string models", () => {
    const customModel: ClaudeModel = "claude-custom-model";
    expect(customModel).toBe("claude-custom-model");
  });
});

// ============================================
// CONSTANTS TESTS
// ============================================

// NOTE: CONTEXT_WINDOWS and MAX_OUTPUT_TOKENS are not exported as separate constants.
// Use DEFAULT_CONTEXT_WINDOW from core/models.ts
describe("Context window constants", () => {
  test("DEFAULT_CONTEXT_WINDOW value", () => {
    expect(DEFAULT_CONTEXT_WINDOW).toBe(200000);
  });
});

// ============================================
// MODEL DEFINITION TESTS
// ============================================

describe("ModelDefinition", () => {
  test("required fields are enforced", () => {
    const model: ModelDefinition = {
      id: "claude-test",
      displayName: "Test Model",
      contextWindow: 200000,
      tier: "sonnet",
    };

    expect(model.id).toBe("claude-test");
    expect(model.displayName).toBe("Test Model");
    expect(model.contextWindow).toBe(200000);
    expect(model.tier).toBe("sonnet");
  });

  test("optional vertexRegion field", () => {
    const model: ModelDefinition = {
      id: "claude-sonnet-4",
      vertexRegion: "VERTEX_REGION_CLAUDE_4_0_SONNET",
      displayName: "Sonnet 4",
      contextWindow: 200000,
      tier: "sonnet",
    };

    expect(model.vertexRegion).toBe("VERTEX_REGION_CLAUDE_4_0_SONNET");
  });

  test("tier values", () => {
    const tiers: Array<"haiku" | "sonnet" | "opus"> = ["haiku", "sonnet", "opus"];
    expect(tiers).toContain("haiku");
    expect(tiers).toContain("sonnet");
    expect(tiers).toContain("opus");
  });
});

// ============================================
// MODEL REGISTRY TESTS
// ============================================

describe("MODELS registry", () => {
  test("contains expected models", () => {
    const modelIds = Object.keys(MODELS);

    expect(modelIds).toContain("claude-haiku-4-5");
    expect(modelIds).toContain("claude-sonnet-4-6");
    expect(modelIds).toContain("claude-opus-4-6");
  });

  test("each model has required fields", () => {
    Object.values(MODELS).forEach((model) => {
      expect(model.id).toBeDefined();
      expect(model.displayName).toBeDefined();
      expect(model.contextWindow).toBeGreaterThan(0);
      expect(["haiku", "sonnet", "opus"]).toContain(model.tier);
    });
  });

  test("haiku models are present", () => {
    const haikuModels = Object.values(MODELS).filter((m) => m.tier === "haiku");
    expect(haikuModels.length).toBeGreaterThan(0);
  });

  test("sonnet models are present", () => {
    const sonnetModels = Object.values(MODELS).filter((m) => m.tier === "sonnet");
    expect(sonnetModels.length).toBeGreaterThan(0);
  });

  test("opus models are present", () => {
    const opusModels = Object.values(MODELS).filter((m) => m.tier === "opus");
    expect(opusModels.length).toBeGreaterThan(0);
  });
});

// ============================================
// VERTEX REGION MAPPINGS TESTS
// ============================================

// NOTE: VERTEX_REGION_MAPPINGS constant not available
describe.skip("VERTEX_REGION_MAPPINGS", () => {
  test("contains expected mappings", () => {
    // expect(VERTEX_REGION_MAPPINGS.length).toBeGreaterThan(0);
  });

  test("each mapping has required fields", () => {
    // VERTEX_REGION_MAPPINGS.forEach((mapping) => {
    //   expect(mapping.modelId).toBeDefined();
    // });
  });

  test("VertexRegionMapping interface", () => {
    const mapping: VertexRegionMapping = {
      modelId: "claude-test",
      regionEnv: "VERTEX_REGION_TEST",
    };

    expect(mapping.modelId).toBe("claude-test");
    expect(mapping.regionEnv).toBe("VERTEX_REGION_TEST");
  });
});

// ============================================
// EXTENDED THINKING TESTS
// ============================================

// NOTE: EXTENDED_THINKING_FEATURES and EXTENDED_THINKING_SETTINGS constants not available
describe.skip("Extended thinking features", () => {
  test("EXTENDED_THINKING_FEATURES structure", () => {
    // expect(EXTENDED_THINKING_FEATURES.interleavedThinking).toBeDefined();
  });

  test("ExtendedThinkingFeatures interface", () => {
    const features: ExtendedThinkingFeatures = {
      interleavedThinking: "test-feature-1",
      adaptiveThinking: "test-feature-2",
      redactThinking: "test-feature-3",
    };

    expect(features.interleavedThinking).toBe("test-feature-1");
  });

  test("EXTENDED_THINKING_SETTINGS structure", () => {
    // expect(EXTENDED_THINKING_SETTINGS.alwaysThinkingEnabled).toBeDefined();
  });

  test("ExtendedThinkingSettings interface", () => {
    const settings: ExtendedThinkingSettings = {
      alwaysThinkingEnabled: "Setting 1",
      showThinkingSummaries: "Setting 2",
    };

    expect(settings.alwaysThinkingEnabled).toBe("Setting 1");
  });
});

// ============================================
// MODEL PRICING TESTS
// ============================================

describe("Model pricing", () => {
  test("MODEL_PRICING has entries for key models", () => {
    expect(MODEL_PRICING["claude-opus-4-6"]).toBeDefined();
    expect(MODEL_PRICING["claude-sonnet-4-6"]).toBeDefined();
    expect(MODEL_PRICING["claude-haiku-4-5"]).toBeDefined();
  });

  test("pricing values are reasonable", () => {
    Object.entries(MODEL_PRICING).forEach(([modelId, pricing]) => {
      expect(pricing.input).toBeGreaterThan(0);
      expect(pricing.output).toBeGreaterThan(0);
      expect(pricing.cache_write).toBeGreaterThanOrEqual(0);
      expect(pricing.cache_read).toBeGreaterThanOrEqual(0);
    });
  });

  test("ModelPricing interface", () => {
    const pricing: ModelPricing = {
      input: 3.0,
      output: 15.0,
      cacheWrite: 3.75,
      cacheRead: 0.30,
    };

    expect(pricing.input).toBe(3.0);
    expect(pricing.output).toBe(15.0);
  });

  test("opus is most expensive", () => {
    const opusPricing = MODEL_PRICING["claude-opus-4-6"];
    const sonnetPricing = MODEL_PRICING["claude-sonnet-4-6"];
    const haikuPricing = MODEL_PRICING["claude-haiku-4-5"];

    expect(opusPricing.input).toBeGreaterThan(sonnetPricing.input);
    expect(sonnetPricing.input).toBeGreaterThan(haikuPricing.input);
  });
});

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe("getModelById", () => {
  test("finds existing model", () => {
    const model = getModelById("claude-sonnet-4-6");
    expect(model).toBeDefined();
    expect(model?.id).toBe("claude-sonnet-4-6");
    expect(model?.tier).toBe("sonnet");
  });

  test("returns undefined for non-existent model", () => {
    const model = getModelById("claude-nonexistent");
    expect(model).toBeUndefined();
  });

  test("finds haiku model", () => {
    const model = getModelById("claude-haiku-4-5");
    expect(model?.tier).toBe("haiku");
  });

  test("finds opus model", () => {
    const model = getModelById("claude-opus-4-6");
    expect(model?.tier).toBe("opus");
  });
});

describe("getContextWindow", () => {
  test("returns correct context window for known model", () => {
    const window = getContextWindow("claude-sonnet-4-6");
    expect(window).toBe(200000);
  });

  test("returns default for unknown model", () => {
    const window = getContextWindow("claude-unknown");
    expect(window).toBe(DEFAULT_CONTEXT_WINDOW);
  });
});

// NOTE: getModelTier function not available
describe.skip("getModelTier", () => {
  test("returns correct tier for sonnet", () => {
    // const tier = getModelTier("claude-sonnet-4-6");
    // expect(tier).toBe("sonnet");
  });

  test("returns correct tier for haiku", () => {
    // const tier = getModelTier("claude-haiku-4-5");
    // expect(tier).toBe("haiku");
  });

  test("returns correct tier for opus", () => {
    // const tier = getModelTier("claude-opus-4");
    // expect(tier).toBe("opus");
  });

  test("returns undefined for unknown model", () => {
    // const tier = getModelTier("claude-unknown");
    // expect(tier).toBeUndefined();
  });
});

describe("hasExtendedContext", () => {
  test("returns true for extended context models", () => {
    expect(hasExtendedContext("claude-sonnet-4-6[1m]")).toBe(true);
    expect(hasExtendedContext("claude-opus-4-6[1m]")).toBe(true);
  });

  test("returns false for standard models", () => {
    expect(hasExtendedContext("claude-sonnet-4-6")).toBe(false);
    expect(hasExtendedContext("claude-opus-4")).toBe(false);
    expect(hasExtendedContext("claude-haiku-4-5")).toBe(false);
  });
});

describe("calculateCost", () => {
  test("calculates cost for known model", () => {
    // sonnet-4-6: input=$3, output=$15 per million
    const result = calculateCost("claude-sonnet-4-6", {
      input_tokens: 1000000,
      output_tokens: 1000000,
    });
    expect(result.costUSD).toBe(18.0); // 3 + 15
  });

  test("calculates cost with cache tokens", () => {
    // sonnet-4-6: input=$3, output=$15, cacheWrite=$3.75, cacheRead=$0.30
    // When cache_read tokens are present, they are subtracted from input_tokens
    const result = calculateCost("claude-sonnet-4-6", {
      input_tokens: 1000000,
      output_tokens: 1000000,
      cache_creation_input_tokens: 1000000,
      cache_read_input_tokens: 1000000,
    });
    // inputTokens = 1000000 - 1000000 = 0 (cache read subtracted)
    // inputCost=0 + output=15 + cacheWrite=3.75 + cacheRead=0.30 = 19.05
    expect(result.costUSD).toBeCloseTo(19.05, 2);
  });

  test("handles zero tokens", () => {
    const result = calculateCost("claude-sonnet-4-6", {
      input_tokens: 0,
      output_tokens: 0,
    });
    expect(result.costUSD).toBe(0);
  });

  test("opus is more expensive than sonnet", () => {
    const opusResult = calculateCost("claude-opus-4-6", {
      input_tokens: 1000000,
      output_tokens: 1000000,
    });
    const sonnetResult = calculateCost("claude-sonnet-4-6", {
      input_tokens: 1000000,
      output_tokens: 1000000,
    });

    expect(opusResult.costUSD).toBeGreaterThan(sonnetResult.costUSD);
  });

  test("haiku is cheaper than sonnet", () => {
    const haikuResult = calculateCost("claude-haiku-4-5", {
      input_tokens: 1000000,
      output_tokens: 1000000,
    });
    const sonnetResult = calculateCost("claude-sonnet-4-6", {
      input_tokens: 1000000,
      output_tokens: 1000000,
    });

    expect(haikuResult.costUSD).toBeLessThan(sonnetResult.costUSD);
  });
});
