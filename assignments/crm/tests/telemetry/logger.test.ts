/**
 * Tests for telemetry modules
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Logger, createLogger } from '../../src/telemetry/logger.js';
import { MetricsRegistry, metrics, initializeCrmMetrics } from '../../src/telemetry/metrics.js';
import { Tracer, tracer, createTracer, withSpan } from '../../src/telemetry/tracer.js';

// ============================================================================
// Logger Tests
// ============================================================================

describe('Logger', () => {
  let logger: Logger;
  let consoleLogs: string[] = [];

  beforeEach(() => {
    logger = createLogger({
      service: 'test-service',
      version: '1.0.0',
      env: 'test',
      level: 'debug',
      prettyPrint: false,
    });
    consoleLogs = [];
  });

  describe('log levels', () => {
    test('should log at debug level', () => {
      let output: string | undefined;
      const originalLog = console.log;
      console.log = (...args) => {
        output = args.join(' ');
      };

      logger.debug('Test debug message');
      console.log = originalLog;

      expect(output).toContain('Test debug message');
      expect(output).toContain('debug');
    });

    test('should log at info level', () => {
      let output: string | undefined;
      const originalLog = console.log;
      console.log = (...args) => {
        output = args.join(' ');
      };

      logger.info('Test info message');
      console.log = originalLog;

      expect(output).toContain('Test info message');
      expect(output).toContain('info');
    });

    test('should log at warn level', () => {
      let output: string | undefined;
      const originalWarn = console.warn;
      console.warn = (...args) => {
        output = args.join(' ');
      };

      logger.warn('Test warning message');
      console.warn = originalWarn;

      expect(output).toContain('Test warning message');
      expect(output).toContain('warn');
    });

    test('should log at error level', () => {
      let output: string | undefined;
      const originalError = console.error;
      console.error = (...args) => {
        output = args.join(' ');
      };

      logger.error('Test error message');
      console.error = originalError;

      expect(output).toContain('Test error message');
      expect(output).toContain('error');
    });
  });

  describe('child logger', () => {
    test('should create child logger with additional context', () => {
      const childLogger = logger.child({ userId: '123' });
      let output: string | undefined;
      const originalLog = console.log;
      console.log = (...args) => {
        output = args.join(' ');
      };

      childLogger.info('Child log message');
      console.log = originalLog;

      expect(output).toContain('Child log message');
      expect(output).toContain('123');
    });
  });

  describe('error handling', () => {
    test('should include error details', () => {
      let output: string | undefined;
      const originalError = console.error;
      console.error = (...args) => {
        output = args.join(' ');
      };

      const error = new Error('Test error');
      logger.error('Error occurred', error);
      console.error = originalError;

      expect(output).toContain('Test error');
    });
  });
});

// ============================================================================
// Metrics Tests
// ============================================================================

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry('test_');
    registry.registerCounter('requests_total', 'Total requests');
    registry.registerGauge('active_connections', 'Active connections');
    registry.registerHistogram('request_duration_seconds', 'Request duration');
  });

  test('should increment counter', () => {
    registry.increment('requests_total');
    const metric = registry.getMetric('requests_total');
    expect(metric).toBeDefined();
    if (metric && metric.type === 'counter') {
      expect(metric.values[0]?.value).toBe(1);
    }
  });

  test('should increment counter by custom value', () => {
    registry.increment('requests_total', 5);
    const metric = registry.getMetric('test_requests_total');
    if (metric && metric.type === 'counter') {
      expect(metric.values[0]?.value).toBe(5);
    }
  });

  test('should set gauge value', () => {
    registry.gauge('active_connections', 10);
    const metric = registry.getMetric('test_active_connections');
    if (metric && metric.type === 'gauge') {
      expect(metric.values[0]?.value).toBe(10);
    }
  });

  test('should update gauge value', () => {
    registry.gauge('active_connections', 10);
    registry.gauge('active_connections', 5);
    const metric = registry.getMetric('test_active_connections');
    if (metric && metric.type === 'gauge') {
      expect(metric.values.length).toBe(1);
      expect(metric.values[0]?.value).toBe(5);
    }
  });

  test('should observe histogram values', () => {
    registry.observe('request_duration_seconds', 0.5);
    registry.observe('request_duration_seconds', 1.0);
    registry.observe('request_duration_seconds', 2.0);

    const metric = registry.getMetric('test_request_duration_seconds');
    if (metric && metric.type === 'histogram') {
      expect(metric.values[0]?.count).toBe(3);
      expect(metric.values[0]?.sum).toBe(3.5);
    }
  });

  test('should export Prometheus format', () => {
    registry.increment('requests_total', 10);
    registry.gauge('active_connections', 5);

    const exported = registry.exportPrometheus();
    expect(exported).toContain('test_requests_total');
    expect(exported).toContain('test_active_connections');
  });

  test('should handle labels', () => {
    registry.increment('requests_total', 1, { method: 'GET' });
    registry.increment('requests_total', 2, { method: 'POST' });

    const metric = registry.getMetric('test_requests_total');
    if (metric && metric.type === 'counter') {
      expect(metric.values.length).toBe(2);
    }
  });

  test('should reset metrics', () => {
    registry.increment('requests_total', 10);
    registry.reset();
    const metric = registry.getMetric('test_requests_total');
    if (metric && metric.type === 'counter') {
      expect(metric.values.length).toBe(0);
    }
  });
});

// ============================================================================
// Tracer Tests
// ============================================================================

describe('Tracer', () => {
  let testTracer: Tracer;

  beforeEach(() => {
    testTracer = createTracer({
      serviceName: 'test-service',
      samplingRate: 1.0,
    });
    testTracer.clear();
  });

  test('should create a span', () => {
    const span = testTracer.startSpan('test-operation');
    expect(span.span.name).toBe('test-operation');
    expect(span.span.traceId).toBeDefined();
    expect(span.span.spanId).toBeDefined();
  });

  test('should end a span', () => {
    const span = testTracer.startSpan('test-operation');
    span.end();

    const spans = testTracer.getSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].duration).toBeDefined();
  });

  test('should set span attributes', () => {
    const span = testTracer.startSpan('test-operation');
    span.setAttribute('key', 'value');
    span.setAttributes({ key2: 'value2', key3: 123 });
    span.end();

    const spans = testTracer.getSpans();
    expect(spans[0].attributes.length).toBe(3);
  });

  test('should add events to span', () => {
    const span = testTracer.startSpan('test-operation');
    span.addEvent('test-event', { detail: 'info' });
    span.end();

    const spans = testTracer.getSpans();
    expect(spans[0].events.length).toBe(1);
    expect(spans[0].events[0].name).toBe('test-event');
  });

  test('should set span status', () => {
    const span = testTracer.startSpan('test-operation');
    span.ok();
    span.end();

    const spans = testTracer.getSpans();
    expect(spans[0].status.code).toBe('ok');
  });

  test('should record exceptions', () => {
    const span = testTracer.startSpan('test-operation');
    span.recordException(new Error('Test error'));
    span.end();

    const spans = testTracer.getSpans();
    expect(spans[0].status.code).toBe('error');
    expect(spans[0].events.some(e => e.name === 'exception')).toBe(true);
  });

  test('should create child spans', () => {
    const parent = testTracer.startSpan('parent-operation');
    const child = testTracer.startChildSpan(parent, 'child-operation');

    expect(child.span.parentSpanId).toBe(parent.span.spanId);
    expect(child.span.traceId).toBe(parent.span.traceId);

    child.end();
    parent.end();

    const spans = testTracer.getSpans();
    expect(spans.length).toBe(2);
  });

  test('should generate traceparent header', () => {
    const span = testTracer.startSpan('test-operation');
    const traceparent = span.toTraceParent();

    expect(traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-[a-f0-9]{2}$/);
    span.end();
  });

  test('withSpan helper should work', async () => {
    // Clear global tracer
    tracer.clear();

    const result = await withSpan('test-op', async (span) => {
      span.setAttribute('custom', 'value');
      return 'success';
    });

    expect(result).toBe('success');
    const spans = tracer.getSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].status.code).toBe('ok');
    tracer.clear();
  });

  test('withSpan should record errors', async () => {
    // Clear global tracer
    tracer.clear();

    try {
      await withSpan('failing-op', async () => {
        throw new Error('Test failure');
      });
    } catch (e) {
      // Expected
    }

    const spans = tracer.getSpans();
    expect(spans.length).toBe(1);
    expect(spans[0].status.code).toBe('error');
    tracer.clear();
  });
});
