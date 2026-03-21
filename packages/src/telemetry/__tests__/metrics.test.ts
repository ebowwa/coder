/**
 * Metrics Tests
 *
 * Tests for counters, gauges, histograms, and metric registry.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  MetricsRegistry,
  getMetricsRegistry,
  resetMetricsRegistry,
  metrics,
} from "../metrics.js";
import { METRIC_NAMES } from "../types.js";

describe("MetricsRegistry", () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry({
      metricsEnabled: true,
      tracingEnabled: false,
      logLevel: "error",
      prettyPrint: false,
      includeStackTrace: false,
      exportPath: undefined,
      sampleRate: 1,
    });
  });

  describe("counters", () => {
    it("should increment counter", () => {
      registry.incrementCounter("test.counter");

      const exported = registry.export();
      const counter = exported.find((m) => m.name === "test.counter");

      expect(counter).toBeDefined();
      expect(counter?.type).toBe("counter");
      expect(counter?.dataPoints[0]?.value).toBe(1);
    });

    it("should increment counter by custom value", () => {
      registry.incrementCounter("test.counter", 5);

      const exported = registry.export();
      const counter = exported.find((m) => m.name === "test.counter");

      expect(counter?.dataPoints[0]?.value).toBe(5);
    });

    it("should increment counter with attributes", () => {
      registry.incrementCounter("test.counter", 1, { model: "claude-sonnet-4-6" });

      const exported = registry.export();
      const counter = exported.find((m) => m.name === "test.counter");

      expect(counter?.dataPoints[0]?.attributes).toEqual({
        model: "claude-sonnet-4-6",
      });
    });

    it("should aggregate counter with same attributes", () => {
      registry.incrementCounter("test.counter", 1, { model: "claude" });
      registry.incrementCounter("test.counter", 2, { model: "claude" });

      const exported = registry.export();
      const counter = exported.find((m) => m.name === "test.counter");

      expect(counter?.dataPoints[0]?.value).toBe(3);
    });

    it("should track separate counters for different attributes", () => {
      registry.incrementCounter("test.counter", 1, { model: "claude" });
      registry.incrementCounter("test.counter", 1, { model: "gpt" });

      const exported = registry.export();
      // Different attributes create separate metric entries (keyed by name+attrs)
      const counters = exported.filter((m) => m.name === "test.counter");

      expect(counters.length).toBe(2);
      expect(counters[0]?.dataPoints[0]?.attributes.model).toBe("claude");
      expect(counters[1]?.dataPoints[0]?.attributes.model).toBe("gpt");
    });
  });

  describe("gauges", () => {
    it("should set gauge value", () => {
      registry.setGauge("test.gauge", 42);

      const exported = registry.export();
      const gauge = exported.find((m) => m.name === "test.gauge");

      expect(gauge).toBeDefined();
      expect(gauge?.type).toBe("gauge");
      expect(gauge?.dataPoints[0]?.value).toBe(42);
    });

    it("should overwrite gauge value", () => {
      registry.setGauge("test.gauge", 42);
      registry.setGauge("test.gauge", 100);

      const exported = registry.export();
      const gauge = exported.find((m) => m.name === "test.gauge");

      expect(gauge?.dataPoints[0]?.value).toBe(100);
    });

    it("should set gauge with attributes", () => {
      registry.setGauge("test.gauge", 75.5, { instance: "us-east-1" });

      const exported = registry.export();
      const gauge = exported.find((m) => m.name === "test.gauge");

      expect(gauge?.dataPoints[0]?.attributes).toEqual({
        instance: "us-east-1",
      });
    });
  });

  describe("histograms", () => {
    it("should record histogram value", () => {
      registry.recordHistogram("test.histogram", 100);

      const exported = registry.export();
      const histogram = exported.find((m) => m.name === "test.histogram");

      expect(histogram).toBeDefined();
      expect(histogram?.type).toBe("histogram");
      expect(histogram?.histogram?.count).toBe(1);
      expect(histogram?.histogram?.sum).toBe(100);
    });

    it("should aggregate histogram values", () => {
      registry.recordHistogram("test.histogram", 100);
      registry.recordHistogram("test.histogram", 200);
      registry.recordHistogram("test.histogram", 300);

      const exported = registry.export();
      const histogram = exported.find((m) => m.name === "test.histogram");

      expect(histogram?.histogram?.count).toBe(3);
      expect(histogram?.histogram?.sum).toBe(600);
      expect(histogram?.histogram?.min).toBe(100);
      expect(histogram?.histogram?.max).toBe(300);
    });

    it("should calculate histogram average", () => {
      registry.recordHistogram("test.histogram", 100);
      registry.recordHistogram("test.histogram", 200);

      const exported = registry.export();
      const histogram = exported.find((m) => m.name === "test.histogram");

      // Average is stored in dataPoint value
      expect(histogram?.dataPoints[0]?.value).toBe(150);
    });

    it("should build histogram buckets", () => {
      // Record values across different bucket boundaries
      for (let i = 0; i < 10; i++) {
        registry.recordHistogram("test.histogram", i * 10);
      }

      const exported = registry.export();
      const histogram = exported.find((m) => m.name === "test.histogram");

      expect(histogram?.histogram?.buckets).toBeDefined();
      expect(histogram?.histogram?.buckets!.length).toBeGreaterThan(0);
    });
  });

  describe("export", () => {
    it("should export all metric types", () => {
      registry.incrementCounter("test.counter", 1);
      registry.setGauge("test.gauge", 42);
      registry.recordHistogram("test.histogram", 100);

      const exported = registry.export();

      expect(exported.length).toBe(3);
      expect(exported.find((m) => m.type === "counter")).toBeDefined();
      expect(exported.find((m) => m.type === "gauge")).toBeDefined();
      expect(exported.find((m) => m.type === "histogram")).toBeDefined();
    });

    it("should include metric descriptions", () => {
      registry.incrementCounter(METRIC_NAMES.API_CALLS_TOTAL);

      const exported = registry.export();
      const counter = exported.find((m) => m.name === METRIC_NAMES.API_CALLS_TOTAL);

      expect(counter?.description).toBeDefined();
    });

    it("should include metric units", () => {
      registry.recordHistogram(METRIC_NAMES.API_LATENCY, 100);

      const exported = registry.export();
      const histogram = exported.find((m) => m.name === METRIC_NAMES.API_LATENCY);

      expect(histogram?.unit).toBe("ms");
    });
  });

  describe("getSummary", () => {
    it("should return summary of all metrics", () => {
      registry.incrementCounter("counter1", 10);
      registry.incrementCounter("counter2", 20);
      registry.setGauge("gauge1", 100);
      registry.recordHistogram("histogram1", 50);

      const summary = registry.getSummary();

      expect(summary.counters).toBeDefined();
      expect(summary.gauges).toBeDefined();
      expect(summary.histograms).toBeDefined();
    });

    it("should aggregate counter values in summary", () => {
      registry.incrementCounter("test.counter", 5);
      registry.incrementCounter("test.counter", 3);

      const summary = registry.getSummary();
      const counters = summary.counters as Record<string, number>;

      expect(counters["test.counter"]).toBe(8);
    });

    it("should show latest gauge value in summary", () => {
      registry.setGauge("test.gauge", 50);
      registry.setGauge("test.gauge", 75);

      const summary = registry.getSummary();
      const gauges = summary.gauges as Record<string, number>;

      expect(gauges["test.gauge"]).toBe(75);
    });

    it("should show histogram stats in summary", () => {
      registry.recordHistogram("test.histogram", 10);
      registry.recordHistogram("test.histogram", 20);

      const summary = registry.getSummary();
      const histograms = summary.histograms as Record<string, { count: number; avg: number }>;

      expect(histograms["test.histogram"].count).toBe(2);
      expect(histograms["test.histogram"].avg).toBe(15);
    });
  });

  describe("reset", () => {
    it("should clear all metrics", () => {
      registry.incrementCounter("test.counter", 1);
      registry.setGauge("test.gauge", 42);
      registry.recordHistogram("test.histogram", 100);

      registry.reset();

      const exported = registry.export();
      expect(exported.length).toBe(0);
    });
  });

  describe("disabled metrics", () => {
    it("should not record when metrics disabled", () => {
      const disabledRegistry = new MetricsRegistry({
        metricsEnabled: false,
        tracingEnabled: false,
        logLevel: "error",
        prettyPrint: false,
        includeStackTrace: false,
        sampleRate: 1,
      });

      disabledRegistry.incrementCounter("test.counter", 1);
      disabledRegistry.setGauge("test.gauge", 42);
      disabledRegistry.recordHistogram("test.histogram", 100);

      const exported = disabledRegistry.export();
      expect(exported.length).toBe(0);
    });
  });
});

describe("Global Metrics Registry", () => {
  beforeEach(() => {
    resetMetricsRegistry();
  });

  it("should return singleton registry", () => {
    const registry1 = getMetricsRegistry();
    const registry2 = getMetricsRegistry();

    expect(registry1).toBe(registry2);
  });

  it("should reset to new registry", () => {
    const registry1 = getMetricsRegistry();
    registry1.incrementCounter("test", 1);

    resetMetricsRegistry();

    const registry2 = getMetricsRegistry();
    const exported = registry2.export();

    expect(registry1).not.toBe(registry2);
    expect(exported.length).toBe(0);
  });
});

describe("metrics convenience functions", () => {
  beforeEach(() => {
    resetMetricsRegistry();
  });

  it("should increment counter via convenience function", () => {
    metrics.incrementCounter("test.counter", 5);

    const registry = getMetricsRegistry();
    const exported = registry.export();
    const counter = exported.find((m) => m.name === "test.counter");

    expect(counter?.dataPoints[0]?.value).toBe(5);
  });

  it("should set gauge via convenience function", () => {
    metrics.setGauge("test.gauge", 100);

    const registry = getMetricsRegistry();
    const exported = registry.export();
    const gauge = exported.find((m) => m.name === "test.gauge");

    expect(gauge?.dataPoints[0]?.value).toBe(100);
  });

  it("should record histogram via convenience function", () => {
    metrics.recordHistogram("test.histogram", 250);

    const registry = getMetricsRegistry();
    const exported = registry.export();
    const histogram = exported.find((m) => m.name === "test.histogram");

    expect(histogram?.histogram?.sum).toBe(250);
  });
});

describe("METRIC_NAMES", () => {
  it("should have API metric names", () => {
    expect(METRIC_NAMES.API_CALLS_TOTAL).toBe("coder.api.calls.total");
    expect(METRIC_NAMES.API_LATENCY).toBe("coder.api.latency");
    expect(METRIC_NAMES.API_TTFT).toBe("coder.api.ttft");
    expect(METRIC_NAMES.API_TOKENS_INPUT).toBe("coder.api.tokens.input");
    expect(METRIC_NAMES.API_TOKENS_OUTPUT).toBe("coder.api.tokens.output");
    expect(METRIC_NAMES.API_COST_USD_TOTAL).toBe("coder.api.cost_usd.total");
    expect(METRIC_NAMES.API_ERRORS_TOTAL).toBe("coder.api.errors.total");
  });

  it("should have turn metric names", () => {
    expect(METRIC_NAMES.TURN_TOTAL).toBe("coder.turn.total");
    expect(METRIC_NAMES.TURN_DURATION_MS).toBe("coder.turn.duration_ms");
    expect(METRIC_NAMES.TURN_ERRORS_TOTAL).toBe("coder.turn.errors.total");
  });

  it("should have tool metric names", () => {
    expect(METRIC_NAMES.TOOL_CALLS_TOTAL).toBe("coder.tool.calls.total");
    expect(METRIC_NAMES.TOOL_DURATION_MS).toBe("coder.tool.duration_ms");
    expect(METRIC_NAMES.TOOL_ERRORS_TOTAL).toBe("coder.tool.errors.total");
  });

  it("should have cache metric names", () => {
    expect(METRIC_NAMES.CACHE_HIT_RATE).toBe("coder.cache.hit_rate");
  });

  it("should have session metric names", () => {
    expect(METRIC_NAMES.SESSION_COST_TOTAL).toBe("coder.session.cost_total");
  });
});
