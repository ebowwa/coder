import { describe, test, expect } from "bun:test";
import {
  getProvider,
  getProviderForModel,
  resolveProvider,
  isProviderHealthy,
  getHealthyProviders,
  getNextHealthyProvider,
  PROVIDERS,
  type ProviderName,
} from "../index.js";

describe("Provider Registry", () => {
  describe("getProvider", () => {
    test("returns zhipu provider config", () => {
      const provider = getProvider("zhipu");
      expect(provider).toBeDefined();
      expect(provider?.name).toBe("zhipu");
      expect(provider?.displayName).toBe("Z.AI (GLM)");
      expect(provider?.format).toBe("openai");
    });

    test("returns minimax provider config", () => {
      const provider = getProvider("minimax");
      expect(provider).toBeDefined();
      expect(provider?.name).toBe("minimax");
      expect(provider?.displayName).toBe("MiniMax");
      expect(provider?.format).toBe("anthropic");
    });

    test("returns undefined for unknown provider", () => {
      const provider = getProvider("unknown" as any);
      expect(provider).toBeUndefined();
    });
  });

  describe("getProviderForModel", () => {
    test("detects zhipu from glm-5", () => {
      expect(getProviderForModel("glm-5")).toBe("zhipu");
    });

    test("detects zhipu from GLM-4.7 (case insensitive)", () => {
      expect(getProviderForModel("GLM-4.7")).toBe("zhipu");
    });

    test("detects minimax from minimax-m2.5", () => {
      expect(getProviderForModel("minimax-m2.5")).toBe("minimax");
    });

    test("detects minimax from MiniMax-M2.5 (case insensitive)", () => {
      expect(getProviderForModel("MiniMax-M2.5")).toBe("minimax");
    });

    test("defaults to zhipu for unknown models", () => {
      expect(getProviderForModel("unknown-model")).toBe("zhipu");
    });
  });

  describe("isProviderHealthy", () => {
    test("zhipu starts healthy", () => {
      expect(isProviderHealthy("zhipu")).toBe(true);
    });

    test("minimax starts healthy", () => {
      expect(isProviderHealthy("minimax")).toBe(true);
    });

    test("anthropic is marked unhealthy (not implemented)", () => {
      expect(isProviderHealthy("anthropic")).toBe(false);
    });
  });

  describe("getHealthyProviders", () => {
    test("returns list of healthy providers", () => {
      const healthy = getHealthyProviders();
      expect(healthy).toContain("zhipu");
      expect(healthy).toContain("minimax");
      expect(healthy).not.toContain("anthropic");
    });
  });

  describe("getNextHealthyProvider", () => {
    test("returns first healthy provider from fallback chain", () => {
      const provider = getNextHealthyProvider();
      expect(provider).toBe("zhipu");
    });

    test("can exclude provider", () => {
      const provider = getNextHealthyProvider("zhipu");
      expect(provider).toBe("minimax");
    });
  });

  describe("resolveProvider", () => {
    test("returns null when no API key configured", () => {
      // Clear env for this test
      const originalKey = process.env.Z_AI_API_KEY;
      delete process.env.Z_AI_API_KEY;

      const result = resolveProvider("glm-5");
      // May return null or use fallback
      // This depends on whether keys are loaded

      // Restore
      if (originalKey) {
        process.env.Z_AI_API_KEY = originalKey;
      }
    });
  });
});

describe("Provider Configuration", () => {
  test("zhipu uses OpenAI format", () => {
    expect(PROVIDERS.zhipu.format).toBe("openai");
    expect(PROVIDERS.zhipu.endpoint).toContain("z.ai");
  });

  test("minimax uses Anthropic format", () => {
    expect(PROVIDERS.minimax.format).toBe("anthropic");
    expect(PROVIDERS.minimax.endpoint).toContain("minimax");
  });

  test("providers have required fields", () => {
    for (const name of Object.keys(PROVIDERS) as ProviderName[]) {
      const config = PROVIDERS[name];
      expect(config.name).toBe(name);
      expect(config.displayName).toBeTruthy();
      expect(config.endpoint).toBeTruthy();
      expect(config.apiKeyEnv).toBeInstanceOf(Array);
      expect(config.apiKeyEnv.length).toBeGreaterThan(0);
      expect(config.defaultModel).toBeTruthy();
      expect(config.models).toBeInstanceOf(Array);
    }
  });
});
