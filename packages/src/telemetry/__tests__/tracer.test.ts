/**
 * Tracer Tests
 *
 * Tests for span creation, context propagation, and trace management.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  SpanBuilder,
  createSpan,
  startSpan,
  withSpan,
  withSpanSync,
  getActiveSpan,
  getActiveContext,
  generateTraceId,
  generateSpanId,
  extractTraceContext,
  injectTraceContext,
} from "../tracer.js";
import { resetMetricsRegistry } from "../metrics.js";

describe("Tracer", () => {
  beforeEach(() => {
    resetMetricsRegistry();
  });

  describe("ID Generation", () => {
    it("should generate valid trace IDs", () => {
      const traceId = generateTraceId();

      expect(traceId).toBeDefined();
      expect(traceId.length).toBe(32); // 16 bytes = 32 hex chars
      expect(/^[0-9a-f]+$/.test(traceId)).toBe(true);
    });

    it("should generate unique trace IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTraceId());
      }
      expect(ids.size).toBe(100);
    });

    it("should generate valid span IDs", () => {
      const spanId = generateSpanId();

      expect(spanId).toBeDefined();
      expect(spanId.length).toBe(16); // 8 bytes = 16 hex chars
      expect(/^[0-9a-f]+$/.test(spanId)).toBe(true);
    });

    it("should generate unique span IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSpanId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("SpanBuilder", () => {
    it("should create a span with default values", () => {
      const span = new SpanBuilder("test-span");

      const result = span.getSpan();

      expect(result.name).toBe("test-span");
      expect(result.kind).toBe("internal");
      expect(result.status).toBe("unset");
      expect(result.traceId).toBeDefined();
      expect(result.spanId).toBeDefined();
    });

    it("should create a span with specified kind", () => {
      const span = new SpanBuilder("client-span", "client");
      const result = span.getSpan();

      expect(result.kind).toBe("client");
    });

    it("should support all span kinds", () => {
      const kinds = ["internal", "client", "server", "producer", "consumer"] as const;

      for (const kind of kinds) {
        const span = new SpanBuilder(`span-${kind}`, kind);
        expect(span.getSpan().kind).toBe(kind);
      }
    });

    it("should set attributes", () => {
      const span = new SpanBuilder("test-span");

      span.setAttribute("key1", "value1");
      span.setAttributes({
        key2: "value2",
        key3: 123,
      });

      const result = span.getSpan();
      expect(result.attributes.key1).toBe("value1");
      expect(result.attributes.key2).toBe("value2");
      expect(result.attributes.key3).toBe(123);
    });

    it("should add events", () => {
      const span = new SpanBuilder("test-span");

      span.addEvent("event1");
      span.addEvent("event2", { detail: "test" });

      const result = span.getSpan();
      expect(result.events.length).toBe(2);
      expect(result.events[0]?.name).toBe("event1");
      expect(result.events[1]?.attributes?.detail).toBe("test");
    });

    it("should set status", () => {
      const span = new SpanBuilder("test-span");

      span.setStatus("ok");
      expect(span.getSpan().status).toBe("ok");

      span.setStatus("error", "Something went wrong");
      expect(span.getSpan().status).toBe("error");
      expect(span.getSpan().statusMessage).toBe("Something went wrong");
    });

    it("should record errors", () => {
      const span = new SpanBuilder("test-span");
      const error = new Error("Test error");

      span.recordError(error);

      const result = span.getSpan();
      expect(result.status).toBe("error");
      expect(result.statusMessage).toBe("Test error");
      expect(result.events.length).toBe(1);
      expect(result.events[0]?.name).toBe("exception");
    });

    it("should record non-Error errors", () => {
      const span = new SpanBuilder("test-span");

      span.recordError("string error");

      const result = span.getSpan();
      expect(result.status).toBe("error");
      expect(result.statusMessage).toBe("string error");
    });

    it("should end span and return it", () => {
      const span = new SpanBuilder("test-span");

      const result = span.end();

      expect(result.name).toBe("test-span");
      expect(result.endTime).toBeDefined();
    });

    it("should return context", () => {
      const span = new SpanBuilder("test-span");

      const context = span.getContext();

      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
    });
  });

  describe("createSpan", () => {
    it("should create a span builder", () => {
      const span = createSpan("test-span");

      expect(span).toBeInstanceOf(SpanBuilder);
      expect(span.getSpan().name).toBe("test-span");
    });
  });

  describe("startSpan", () => {
    it("should create and start a span", () => {
      const span = startSpan("test-span");

      expect(span).toBeInstanceOf(SpanBuilder);

      const active = getActiveSpan();
      expect(active?.name).toBe("test-span");

      span.end();
    });

    it("should push to active span stack", () => {
      const span1 = startSpan("span-1");
      expect(getActiveSpan()?.name).toBe("span-1");

      const span2 = startSpan("span-2");
      expect(getActiveSpan()?.name).toBe("span-2");

      span2.end();
      expect(getActiveSpan()?.name).toBe("span-1");

      span1.end();
      expect(getActiveSpan()).toBeUndefined();
    });
  });

  describe("getActiveSpan", () => {
    it("should return undefined when no active span", () => {
      expect(getActiveSpan()).toBeUndefined();
    });

    it("should return current active span", () => {
      const span = startSpan("test");
      expect(getActiveSpan()?.name).toBe("test");
      span.end();
    });
  });

  describe("getActiveContext", () => {
    it("should return undefined when no active span", () => {
      expect(getActiveContext()).toBeUndefined();
    });

    it("should return context when span is active", () => {
      const span = startSpan("test");
      const context = getActiveContext();

      expect(context).toBeDefined();
      expect(context?.traceId).toBe(span.getSpan().traceId);
      expect(context?.spanId).toBe(span.getSpan().spanId);

      span.end();
    });
  });

  describe("withSpan", () => {
    it("should execute function within span", async () => {
      const result = await withSpan("test-span", async () => {
        expect(getActiveSpan()?.name).toBe("test-span");
        return "success";
      });

      expect(result).toBe("success");
      expect(getActiveSpan()).toBeUndefined();
    });

    it("should set status to ok on success", async () => {
      await withSpan("test-span", async () => {
        return "done";
      });

      // Span should be ended, no active span
      expect(getActiveSpan()).toBeUndefined();
    });

    it("should record error on failure", async () => {
      try {
        await withSpan("test-span", async () => {
          throw new Error("Test error");
        });
        expect(true).toBe(false); // Should not reach
      } catch (error) {
        expect((error as Error).message).toBe("Test error");
      }

      expect(getActiveSpan()).toBeUndefined();
    });

    it("should support span kind parameter", async () => {
      const result = await withSpan(
        "client-span",
        async () => "done",
        "client"
      );

      expect(result).toBe("done");
    });

    it("should pass span to function", async () => {
      await withSpan("test-span", async (span) => {
        span.setAttribute("test", "value");
        expect(span.getSpan().attributes.test).toBe("value");
      });
    });
  });

  describe("withSpanSync", () => {
    it("should execute function within span synchronously", () => {
      const result = withSpanSync("test-span", () => {
        expect(getActiveSpan()?.name).toBe("test-span");
        return "success";
      });

      expect(result).toBe("success");
      expect(getActiveSpan()).toBeUndefined();
    });

    it("should record error on failure", () => {
      try {
        withSpanSync("test-span", () => {
          throw new Error("Sync error");
        });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe("Sync error");
      }

      expect(getActiveSpan()).toBeUndefined();
    });
  });

  describe("Trace Context Propagation", () => {
    it("should extract trace context from headers", () => {
      const headers = {
        traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      };

      const context = extractTraceContext(headers);

      expect(context).toBeDefined();
      expect(context?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
      expect(context?.spanId).toBe("00f067aa0ba902b7");
      expect(context?.traceFlags).toBe(1);
    });

    it("should return undefined for missing traceparent", () => {
      const context = extractTraceContext({});
      expect(context).toBeUndefined();
    });

    it("should return undefined for invalid traceparent format", () => {
      const context = extractTraceContext({
        traceparent: "invalid",
      });
      expect(context).toBeUndefined();
    });

    it("should inject trace context into headers", () => {
      const headers: Record<string, string> = {};
      const context = {
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
        traceFlags: 1,
      };

      injectTraceContext(context, headers);

      expect(headers.traceparent).toBe("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    });

    it("should default traceFlags to 1 when not specified", () => {
      const headers: Record<string, string> = {};
      const context = {
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
      };

      injectTraceContext(context, headers);

      expect(headers.traceparent).toContain("-01");
    });

    it("should preserve existing headers", () => {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      const context = {
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
      };

      injectTraceContext(context, headers);

      expect(headers["content-type"]).toBe("application/json");
      expect(headers.traceparent).toBeDefined();
    });
  });

  describe("Parent-Child Spans", () => {
    it("should create child span with parent context", () => {
      const parent = createSpan("parent");
      const parentContext = parent.getContext();

      const child = new SpanBuilder("child", "internal", parentContext);
      const childSpan = child.getSpan();

      expect(childSpan.parentSpanId).toBe(parentContext.spanId);
      expect(childSpan.traceId).toBe(parentContext.traceId);
      expect(childSpan.spanId).not.toBe(parentContext.spanId);
    });

    it("should automatically link parent when using startSpan", () => {
      const parent = startSpan("parent");
      const parentContext = parent.getContext();

      const child = startSpan("child");
      const childSpan = child.getSpan();

      expect(childSpan.parentSpanId).toBe(parentContext.spanId);
      expect(childSpan.traceId).toBe(parentContext.traceId);

      child.end();
      parent.end();
    });
  });
});
