/**
 * Models Tests
 *
 * Tests for model definitions, pricing calculations, and model utilities.
 */

import { describe, it, expect } from "bun:test";
import {
  MODELS,
  AVAILABLE_MODELS,
  MODEL_ALIASES,
  DEFAULT_MODEL,
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_OUTPUT,
  getModel,
  requireModel,
  getContextWindow,
  getMaxOutput,
  getModelDisplayName,
  supportsExtendedThinking,
  supportsVision,
  getModelPricing,
  calculateCost,
  formatCost,
  resolveModelAlias,
  getModelsByProvider,
  getProviders,
  listAllModels,
  isBackupModelAvailable,
} from "../models.js";

describe("MODELS", () => {
  it("should have Claude Opus 4.6 model", () => {
    expect(MODELS["claude-opus-4-6"]).toBeDefined();
    expect(MODELS["claude-opus-4-6"]?.name).toBe("Opus 4.6");
    expect(MODELS["claude-opus-4-6"]?.tier).toBe("opus");
    expect(MODELS["claude-opus-4-6"]?.provider).toBe("anthropic");
  });

  it("should have Claude Sonnet 4.6 model", () => {
    expect(MODELS["claude-sonnet-4-6"]).toBeDefined();
    expect(MODELS["claude-sonnet-4-6"]?.name).toBe("Sonnet 4.6");
    expect(MODELS["claude-sonnet-4-6"]?.tier).toBe("sonnet");
    expect(MODELS["claude-sonnet-4-6"]?.provider).toBe("anthropic");
  });

  it("should have Claude Haiku 4.5 model", () => {
    expect(MODELS["claude-haiku-4-5"]).toBeDefined();
    expect(MODELS["claude-haiku-4-5"]?.name).toBe("Haiku 4.5");
    expect(MODELS["claude-haiku-4-5"]?.tier).toBe("haiku");
    expect(MODELS["claude-haiku-4-5"]?.provider).toBe("anthropic");
  });

  it("should have GLM-5 model", () => {
    expect(MODELS["glm-5"]).toBeDefined();
    expect(MODELS["glm-5"]?.provider).toBe("zhipu");
  });

  it("should have pricing for all models", () => {
    for (const [id, model] of Object.entries(MODELS)) {
      expect(model.pricing, `Model ${id} should have pricing`).toBeDefined();
      expect(model.pricing.input, `Model ${id} should have input pricing`).toBeGreaterThanOrEqual(0);
      expect(model.pricing.output, `Model ${id} should have output pricing`).toBeGreaterThanOrEqual(0);
    }
  });

  it("should have context window for all models", () => {
    for (const [id, model] of Object.entries(MODELS)) {
      expect(model.contextWindow, `Model ${id} should have contextWindow`).toBeGreaterThan(0);
    }
  });
});

describe("AVAILABLE_MODELS", () => {
  it("should be an array of model objects", () => {
    expect(Array.isArray(AVAILABLE_MODELS)).toBe(true);
    expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
  });

  it("should include claude-opus-4-6", () => {
    const model = AVAILABLE_MODELS.find((m: any) => m.id === "claude-opus-4-6");
    expect(model).toBeDefined();
  });

  it("should include claude-sonnet-4-6", () => {
    const model = AVAILABLE_MODELS.find((m: any) => m.id === "claude-sonnet-4-6");
    expect(model).toBeDefined();
  });
});

describe("MODEL_ALIASES", () => {
  it("should map opus to claude-opus-4-6", () => {
    expect(MODEL_ALIASES["opus"]).toBe("claude-opus-4-6");
  });

  it("should map sonnet to claude-sonnet-4-6", () => {
    expect(MODEL_ALIASES["sonnet"]).toBe("claude-sonnet-4-6");
  });

  it("should map haiku to claude-haiku-4-5", () => {
    expect(MODEL_ALIASES["haiku"]).toBe("claude-haiku-4-5");
  });
});

describe("DEFAULT_MODEL", () => {
  it("should be defined", () => {
    expect(DEFAULT_MODEL).toBeDefined();
    expect(typeof DEFAULT_MODEL).toBe("string");
  });
});

describe("getModel", () => {
  it("should return model definition for valid ID", () => {
    const model = getModel("claude-sonnet-4-6");
    expect(model).toBeDefined();
    expect(model?.id).toBe("claude-sonnet-4-6");
  });

  it("should return undefined for invalid ID", () => {
    const model = getModel("invalid-model");
    expect(model).toBeUndefined();
  });
});

describe("requireModel", () => {
  it("should return model definition for valid ID", () => {
    const model = requireModel("claude-sonnet-4-6");
    expect(model.id).toBe("claude-sonnet-4-6");
  });

  it("should throw for invalid ID", () => {
    expect(() => requireModel("invalid-model")).toThrow();
  });
});

describe("getContextWindow", () => {
  it("should return context window for valid model", () => {
    const window = getContextWindow("claude-opus-4-6");
    expect(window).toBe(200_000);
  });

  it("should return default for invalid model", () => {
    const window = getContextWindow("invalid-model");
    expect(window).toBe(DEFAULT_CONTEXT_WINDOW);
  });
});

describe("getMaxOutput", () => {
  it("should return max output for valid model", () => {
    const max = getMaxOutput("claude-opus-4-6");
    expect(max).toBe(32_000);
  });

  it("should return 1/4 context window for invalid model", () => {
    const max = getMaxOutput("invalid-model");
    // Returns 1/4 of default context window (200,000 / 4 = 50,000)
    expect(max).toBe(Math.floor(DEFAULT_CONTEXT_WINDOW / 4));
  });
});

describe("getModelDisplayName", () => {
  it("should return display name for valid model", () => {
    const name = getModelDisplayName("claude-opus-4-6");
    expect(name).toBe("Opus 4.6");
  });

  it("should return ID for invalid model", () => {
    const name = getModelDisplayName("invalid-model");
    expect(name).toBe("invalid-model");
  });
});

describe("supportsExtendedThinking", () => {
  it("should return true for Opus 4.6", () => {
    expect(supportsExtendedThinking("claude-opus-4-6")).toBe(true);
  });

  it("should return true for Sonnet 4.6", () => {
    expect(supportsExtendedThinking("claude-sonnet-4-6")).toBe(true);
  });

  it("should return false for invalid model", () => {
    expect(supportsExtendedThinking("invalid-model")).toBe(false);
  });
});

describe("supportsVision", () => {
  it("should return true for Opus 4.6", () => {
    expect(supportsVision("claude-opus-4-6")).toBe(true);
  });

  it("should return true for Sonnet 4.6", () => {
    expect(supportsVision("claude-sonnet-4-6")).toBe(true);
  });

  it("should return false for invalid model", () => {
    expect(supportsVision("invalid-model")).toBe(false);
  });
});

describe("getModelPricing", () => {
  it("should return pricing for valid model", () => {
    const pricing = getModelPricing("claude-sonnet-4-6");
    expect(pricing).toBeDefined();
    expect(pricing.input).toBe(3);
    expect(pricing.output).toBe(15);
  });

  it("should return default pricing for invalid model", () => {
    const pricing = getModelPricing("invalid-model");
    // Returns default Sonnet pricing for unknown models
    expect(pricing).toBeDefined();
    expect(pricing.input).toBe(3);
    expect(pricing.output).toBe(15);
  });
});

describe("calculateCost", () => {
  it("should calculate cost for input tokens", () => {
    // Sonnet 4.6: $3/1M input tokens
    const cost = calculateCost("claude-sonnet-4-6", {
      input_tokens: 1_000_000,
      output_tokens: 0,
    });
    expect(cost.costUSD).toBe(3);
  });

  it("should calculate cost for output tokens", () => {
    // Sonnet 4.6: $15/1M output tokens
    const cost = calculateCost("claude-sonnet-4-6", {
      input_tokens: 0,
      output_tokens: 1_000_000,
    });
    expect(cost.costUSD).toBe(15);
  });

  it("should calculate combined cost", () => {
    // Sonnet 4.6: $3/1M input + $15/1M output
    const cost = calculateCost("claude-sonnet-4-6", {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost.costUSD).toBe(18);
  });

  it("should handle zero tokens", () => {
    const cost = calculateCost("claude-sonnet-4-6", {
      input_tokens: 0,
      output_tokens: 0,
    });
    expect(cost.costUSD).toBe(0);
  });

  it("should handle partial millions", () => {
    // Sonnet 4.6: $3/1M input = $0.000003/token
    const cost = calculateCost("claude-sonnet-4-6", {
      input_tokens: 1000,
      output_tokens: 0,
    });
    expect(cost.costUSD).toBeCloseTo(0.003, 6);
  });

  it("should calculate cache savings", () => {
    const cost = calculateCost("claude-sonnet-4-6", {
      input_tokens: 1_000_000,
      output_tokens: 0,
      cache_read_input_tokens: 500_000, // 500K cached
    });
    // 500K at $3/1M + 500K cached at $0.3/1M
    // Regular: 500K * 3/1M = 1.5
    // Cached: 500K * 0.3/1M = 0.15
    // Total: 1.65
    expect(cost.costUSD).toBeCloseTo(1.65, 2);
    // Savings: 500K * (3 - 0.3)/1M = 1.35
    expect(cost.estimatedSavingsUSD).toBeCloseTo(1.35, 2);
  });
});

describe("formatCost", () => {
  it("should format zero cost", () => {
    const formatted = formatCost(0);
    expect(formatted).toContain("$0");
  });

  it("should format small costs with precision", () => {
    const formatted = formatCost(0.001);
    expect(formatted).toContain("$");
    expect(formatted).toContain("0.001");
  });

  it("should format typical costs", () => {
    const formatted = formatCost(0.15);
    expect(formatted).toContain("0.15");
  });

  it("should format large costs", () => {
    const formatted = formatCost(123.45);
    expect(formatted).toContain("123.45");
  });
});

describe("resolveModelAlias", () => {
  it("should resolve opus alias", () => {
    expect(resolveModelAlias("opus")).toBe("claude-opus-4-6");
  });

  it("should resolve sonnet alias", () => {
    expect(resolveModelAlias("sonnet")).toBe("claude-sonnet-4-6");
  });

  it("should resolve haiku alias", () => {
    expect(resolveModelAlias("haiku")).toBe("claude-haiku-4-5");
  });

  it("should return original ID if not an alias", () => {
    expect(resolveModelAlias("claude-opus-4-6")).toBe("claude-opus-4-6");
  });

  it("should return unknown ID unchanged", () => {
    expect(resolveModelAlias("unknown-model")).toBe("unknown-model");
  });
});

describe("getModelsByProvider", () => {
  it("should return anthropic models", () => {
    const models = getModelsByProvider("anthropic");
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.provider === "anthropic")).toBe(true);
  });

  it("should return zhipu models", () => {
    const models = getModelsByProvider("zhipu");
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.provider === "zhipu")).toBe(true);
  });

  it("should return empty array for unknown provider", () => {
    const models = getModelsByProvider("unknown" as any);
    expect(models).toEqual([]);
  });
});

describe("getProviders", () => {
  it("should return list of providers", () => {
    const providers = getProviders();
    expect(providers).toContain("anthropic");
    expect(providers).toContain("zhipu");
  });

  it("should return unique providers", () => {
    const providers = getProviders();
    const unique = new Set(providers);
    expect(unique.size).toBe(providers.length);
  });
});

describe("listAllModels", () => {
  it("should return array of model info", () => {
    const models = listAllModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it("should include model ID and name", () => {
    const models = listAllModels();
    const sonnet = models.find((m) => m.id === "claude-sonnet-4-6");
    expect(sonnet).toBeDefined();
    expect(sonnet?.name).toBe("Sonnet 4.6");
  });
});

describe("isBackupModelAvailable", () => {
  it("should return boolean", () => {
    const result = isBackupModelAvailable();
    expect(typeof result).toBe("boolean");
  });
});

describe("Model Tiers", () => {
  it("should have correct tier for Opus", () => {
    expect(MODELS["claude-opus-4-6"]?.tier).toBe("opus");
  });

  it("should have correct tier for Sonnet", () => {
    expect(MODELS["claude-sonnet-4-6"]?.tier).toBe("sonnet");
  });

  it("should have correct tier for Haiku", () => {
    expect(MODELS["claude-haiku-4-5"]?.tier).toBe("haiku");
  });
});

describe("Model Pricing Consistency", () => {
  it("should have higher output price than input for all models", () => {
    for (const [id, model] of Object.entries(MODELS)) {
      if (model.pricing.input > 0) {
        expect(
          model.pricing.output >= model.pricing.input,
          `Model ${id} output price should be >= input price`
        ).toBe(true);
      }
    }
  });

  it("should have cache read cheaper than or equal to cache write", () => {
    for (const [id, model] of Object.entries(MODELS)) {
      if (model.pricing.cacheWrite > 0) {
        expect(
          model.pricing.cacheRead <= model.pricing.cacheWrite,
          `Model ${id} cache read should be <= cache write`
        ).toBe(true);
      }
    }
  });
});
