/**
 * Retry Module Tests
 *
 * Tests for exponential backoff, jitter, error detection,
 * and retry behavior.
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { withRetry, createFetchWithRetry, parseRetryAfter } from "../retry.js";
import { DEFAULT_RETRY_OPTIONS } from "../../schemas/index.js";

describe("Retry Module", () => {
  describe("DEFAULT_RETRY_OPTIONS", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_RETRY_OPTIONS.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_OPTIONS.baseDelayMs).toBe(1000);
      expect(DEFAULT_RETRY_OPTIONS.maxDelayMs).toBe(30000);
      expect(DEFAULT_RETRY_OPTIONS.jitterFactor).toBe(0.2);
      expect(DEFAULT_RETRY_OPTIONS.retryableStatusCodes).toContain(429);
      expect(DEFAULT_RETRY_OPTIONS.retryableStatusCodes).toContain(500);
    });
  });

  describe("withRetry", () => {
    it("should return result on successful call", async () => {
      const fn = mock(async () => "success");
      const result = await withRetry(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should not retry on success", async () => {
      const fn = mock(async () => "success");
      await withRetry(fn, { maxRetries: 3 });

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable error", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("429 rate limit");
        }
        return "success";
      });

      // Speed up the test by using small delays
      const result = await withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 1,
        maxDelayMs: 100,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should throw after max retries exceeded", async () => {
      const fn = mock(async () => {
        throw new Error("500 server error");
      });

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          baseDelayMs: 1,
          maxDelayMs: 10,
        })
      ).rejects.toThrow("500 server error");

      // maxRetries + 1 attempts (initial + retries)
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should not retry non-retryable errors", async () => {
      const fn = mock(async () => {
        throw new Error("400 bad request");
      });

      await expect(
        withRetry(fn, { maxRetries: 3 })
      ).rejects.toThrow("400 bad request");

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should call onRetry callback", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("503 service unavailable");
        }
        return "success";
      });

      const onRetry = mock<(attempt: number, error: Error, delayMs: number) => void>();

      await withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 1,
        maxDelayMs: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
      expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), expect.any(Number));
    });

    it("should handle zero maxRetries", async () => {
      const fn = mock(async () => {
        throw new Error("429 rate limit");
      });

      await expect(
        withRetry(fn, { maxRetries: 0 })
      ).rejects.toThrow("429 rate limit");

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should handle non-Error throws", async () => {
      const fn = mock(async () => {
        throw "string error";
      });

      await expect(
        withRetry(fn, { maxRetries: 0 })
      ).rejects.toThrow("string error");
    });

    it("should recognize rate limit errors", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("rate limit exceeded");
        }
        return "success";
      });

      const result = await withRetry(fn, {
        maxRetries: 1,
        baseDelayMs: 1,
        maxDelayMs: 10,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should recognize network errors", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("ECONNREFUSED");
        }
        return "success";
      });

      const result = await withRetry(fn, {
        maxRetries: 1,
        baseDelayMs: 1,
        maxDelayMs: 10,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should recognize fetch failed errors", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("fetch failed");
        }
        return "success";
      });

      const result = await withRetry(fn, {
        maxRetries: 1,
        baseDelayMs: 1,
        maxDelayMs: 10,
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should recognize custom status codes", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("API error: 418");
        }
        return "success";
      });

      const result = await withRetry(fn, {
        maxRetries: 1,
        baseDelayMs: 1,
        maxDelayMs: 10,
        retryableStatusCodes: [418],
      });

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should recognize server error codes in message", async () => {
      const serverErrors = ["500", "502", "503", "504"];

      for (const code of serverErrors) {
        let retried = false;
        const fn = mock(async () => {
          if (!retried) {
            retried = true;
            throw new Error(`Server error: ${code}`);
          }
          return "success";
        });

        const result = await withRetry(fn, {
          maxRetries: 1,
          baseDelayMs: 1,
          maxDelayMs: 10,
        });

        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledTimes(2);
      }
    });

    it("should recognize network error patterns", async () => {
      const networkErrors = ["ENOTFOUND", "ETIMEDOUT", "network error"];

      for (const errorMsg of networkErrors) {
        let retried = false;
        const fn = mock(async () => {
          if (!retried) {
            retried = true;
            throw new Error(errorMsg);
          }
          return "success";
        });

        const result = await withRetry(fn, {
          maxRetries: 1,
          baseDelayMs: 1,
          maxDelayMs: 10,
        });

        expect(result).toBe("success");
        expect(fn).toHaveBeenCalledTimes(2);
      }
    });
  });

  describe("createFetchWithRetry", () => {
    it("should return a function", () => {
      const fetchWithRetry = createFetchWithRetry();
      expect(typeof fetchWithRetry).toBe("function");
    });

    it("should pass through successful responses", async () => {
      // Mock fetch
      const originalFetch = global.fetch;
      global.fetch = mock(async () => new Response("ok", { status: 200 }));

      const fetchWithRetry = createFetchWithRetry({ maxRetries: 1 });
      const response = await fetchWithRetry("https://example.com");

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      global.fetch = originalFetch;
    });

    it("should retry on retryable status codes", async () => {
      const originalFetch = global.fetch;
      let attempts = 0;

      global.fetch = mock(async () => {
        attempts++;
        if (attempts === 1) {
          return new Response("rate limited", { status: 429 });
        }
        return new Response("ok", { status: 200 });
      });

      const fetchWithRetry = createFetchWithRetry({
        maxRetries: 2,
        baseDelayMs: 1,
        maxDelayMs: 10,
        retryableStatusCodes: [429],
      });

      // This will throw because 429 is configured as retryable
      // but our mock returns 429 first, which triggers the retry
      const response = await fetchWithRetry("https://example.com");
      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      global.fetch = originalFetch;
    });
  });

  describe("parseRetryAfter", () => {
    it("should parse retry-after header in seconds", () => {
      const response = new Response("", {
        headers: { "retry-after": "30" },
      });

      const delay = parseRetryAfter(response);
      expect(delay).toBe(30000); // 30 seconds in ms
    });

    it("should return null for missing header", () => {
      const response = new Response("");
      const delay = parseRetryAfter(response);

      expect(delay).toBeNull();
    });

    it("should return null for invalid header", () => {
      const response = new Response("", {
        headers: { "retry-after": "invalid" },
      });

      const delay = parseRetryAfter(response);
      expect(delay).toBeNull();
    });

    it("should handle zero retry-after", () => {
      const response = new Response("", {
        headers: { "retry-after": "0" },
      });

      const delay = parseRetryAfter(response);
      expect(delay).toBe(0);
    });
  });

  describe("Exponential Backoff", () => {
    it("should increase delay with attempts", async () => {
      const delays: number[] = [];
      let attempts = 0;

      const fn = mock(async () => {
        attempts++;
        if (attempts < 4) {
          throw new Error("429 rate limit");
        }
        return "success";
      });

      await withRetry(fn, {
        maxRetries: 5,
        baseDelayMs: 10,
        maxDelayMs: 1000,
        jitterFactor: 0, // No jitter for predictable testing
        onRetry: (_, __, delay) => {
          delays.push(delay);
        },
      });

      // Verify exponential increase (approximately, since we have no jitter)
      expect(delays.length).toBe(3);
      // Base delay * 2^attempt: 10, 20, 40
      expect(delays[0]).toBeGreaterThanOrEqual(5);
      expect(delays[1]).toBeGreaterThan(delays[0]!);
      expect(delays[2]).toBeGreaterThan(delays[1]!);
    });

    it("should cap delay at maxDelayMs", async () => {
      const delays: number[] = [];
      let attempts = 0;

      const fn = mock(async () => {
        attempts++;
        if (attempts < 10) {
          throw new Error("503 service unavailable");
        }
        return "success";
      });

      await withRetry(fn, {
        maxRetries: 15,
        baseDelayMs: 1000,
        maxDelayMs: 100,
        jitterFactor: 0,
        onRetry: (_, __, delay) => {
          delays.push(delay);
        },
      });

      // All delays should be capped at maxDelayMs
      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(100);
      }
    });

    it("should add jitter to delays", async () => {
      const delays: number[] = [];
      let attempts = 0;

      const fn = mock(async () => {
        attempts++;
        if (attempts < 5) {
          throw new Error("502 bad gateway");
        }
        return "success";
      });

      await withRetry(fn, {
        maxRetries: 5,
        baseDelayMs: 100,
        maxDelayMs: 10000,
        jitterFactor: 0.5,
        onRetry: (_, __, delay) => {
          delays.push(delay);
        },
      });

      // With jitter, delays should vary (unlikely to be exactly the same)
      const uniqueDelays = new Set(delays);
      // At least some delays should be different due to jitter
      // (statistically very likely with 4 retries and 0.5 jitter)
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe("Error Classification", () => {
    it("should classify 429 as retryable", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) throw new Error("429 Too Many Requests");
        return "ok";
      });

      await withRetry(fn, { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 10 });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should classify rate limit message as retryable", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) throw new Error("rate limit exceeded");
        return "ok";
      });

      await withRetry(fn, { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 10 });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should classify 500 as retryable", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) throw new Error("500 Internal Server Error");
        return "ok";
      });

      await withRetry(fn, { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 10 });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should classify 529 as retryable (default)", async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) throw new Error("529 Overloaded");
        return "ok";
      });

      await withRetry(fn, { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 10 });
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should NOT classify 400 as retryable", async () => {
      const fn = mock(async () => {
        throw new Error("400 Bad Request");
      });

      await expect(
        withRetry(fn, { maxRetries: 3 })
      ).rejects.toThrow("400 Bad Request");

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should NOT classify 401 as retryable", async () => {
      const fn = mock(async () => {
        throw new Error("401 Unauthorized");
      });

      await expect(
        withRetry(fn, { maxRetries: 3 })
      ).rejects.toThrow("401 Unauthorized");

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should NOT classify 404 as retryable", async () => {
      const fn = mock(async () => {
        throw new Error("404 Not Found");
      });

      await expect(
        withRetry(fn, { maxRetries: 3 })
      ).rejects.toThrow("404 Not Found");

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle async function that returns undefined", async () => {
      const fn = mock(async () => undefined);
      const result = await withRetry(fn);

      expect(result).toBeUndefined();
    });

    it("should handle async function that returns null", async () => {
      const fn = mock(async () => null);
      const result = await withRetry(fn);

      expect(result).toBeNull();
    });

    it("should handle async function that returns object", async () => {
      const fn = mock(async () => ({ data: "test" }));
      const result = await withRetry(fn);

      expect(result).toEqual({ data: "test" });
    });

    it("should handle async function that throws undefined", async () => {
      const fn = mock(async () => {
        throw undefined;
      });

      await expect(
        withRetry(fn, { maxRetries: 0 })
      ).rejects.toThrow();
    });

    it("should work with function that resolves immediately", async () => {
      const fn = mock(async () => Promise.resolve("immediate"));
      const result = await withRetry(fn);

      expect(result).toBe("immediate");
    });
  });
});
