/**
 * Test Utilities for SCADA Component Testing
 *
 * Provides helper functions for:
 * - Rendering components with required providers
 * - Performance testing and benchmarking
 * - Async operations and timing
 * - Custom matchers and assertions
 */

import { render } from "@testing-library/react";
import { vi } from "vitest";

/**
 * Create a test wrapper with all necessary providers
 */
export function createTestWrapper(options = {}) {
  const {
    authValue = {
      user: { id: "1", username: "testuser", role: "admin" },
      isAuthenticated: true,
    },
    tenantValue = { currentTenant: { id: "tenant-1", name: "Test Tenant" } },
  } = options;

  return function TestWrapper({ children }) {
    // Import providers dynamically to avoid circular dependencies
    let wrappedChildren = children;

    // Wrap with mock providers if needed
    if (options.mockAuth !== false) {
      const AuthContext = require("@/context/AuthContext").AuthContext;
      wrappedChildren = (
        <AuthContext.Provider value={authValue}>
          {wrappedChildren}
        </AuthContext.Provider>
      );
    }

    if (options.mockTenant !== false) {
      const TenantContext = require("@/context/TenantContext").TenantContext;
      wrappedChildren = (
        <TenantContext.Provider value={tenantValue}>
          {wrappedChildren}
        </TenantContext.Provider>
      );
    }

    return wrappedChildren;
  };
}

/**
 * Render component with standard test wrapper
 */
export function renderWithProviders(ui, options = {}) {
  const Wrapper = createTestWrapper(options);
  return render(ui, { wrapper: Wrapper, ...options.renderOptions });
}

/**
 * Performance test harness
 * Measures component render time and update performance
 */
export class PerformanceTestHarness {
  constructor(options = {}) {
    this.options = {
      warmupRuns: options.warmupRuns || 3,
      testRuns: options.testRuns || 10,
      ...options,
    };
    this.results = [];
  }

  /**
   * Measure execution time of a function
   */
  async measure(fn, name = "operation") {
    const start = performance.now();
    await fn();
    const end = performance.now();
    const duration = end - start;

    this.results.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    return duration;
  }

  /**
   * Run benchmark with warmup and multiple iterations
   */
  async benchmark(fn, name = "benchmark") {
    // Warmup runs
    for (let i = 0; i < this.options.warmupRuns; i++) {
      await fn();
    }

    // Clear previous results
    this.results = [];

    // Test runs
    const durations = [];
    for (let i = 0; i < this.options.testRuns; i++) {
      const duration = await this.measure(fn, name);
      durations.push(duration);
    }

    return this.getStatistics(durations);
  }

  /**
   * Calculate statistics from measurements
   */
  getStatistics(durations = null) {
    const values = durations || this.results.map((r) => r.duration);

    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const variance =
      values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev,
    };
  }

  /**
   * Assert performance meets threshold
   */
  assertPerformance(threshold, metric = "mean") {
    const stats = this.getStatistics();
    if (!stats) {
      throw new Error("No performance data available");
    }

    const value = stats[metric];
    if (value > threshold) {
      throw new Error(
        `Performance threshold exceeded: ${value.toFixed(2)}ms > ${threshold}ms (${metric})`,
      );
    }

    return true;
  }

  /**
   * Clear all results
   */
  clear() {
    this.results = [];
  }
}

/**
 * 60fps streaming performance validator
 * Tests if component can handle 60fps updates
 */
export class StreamingPerformanceValidator {
  constructor(options = {}) {
    this.targetFPS = options.targetFPS || 60;
    this.testDuration = options.testDuration || 1000; // ms
    this.frameInterval = 1000 / this.targetFPS;
    this.frames = [];
  }

  /**
   * Start frame recording
   */
  start() {
    this.frames = [];
    // Note: Using Date.now() instead of performance.now() for compatibility with
    // Vitest fake timers. Trade-off: millisecond precision vs microsecond precision,
    // but adequate for 60fps performance testing (16.67ms frame time).
    this.startTime = Date.now();
  }

  /**
   * Record a frame
   */
  recordFrame() {
    if (!this.startTime) {
      throw new Error("Validator not started. Call start() first.");
    }

    const frameTime = Date.now();
    this.frames.push({
      timestamp: frameTime,
      delta:
        this.frames.length > 0
          ? frameTime - this.frames[this.frames.length - 1].timestamp
          : 0,
    });
  }

  /**
   * Stop recording and get results
   */
  stop() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    const actualFPS = (this.frames.length / duration) * 1000;
    const deltas = this.frames.slice(1).map((f) => f.delta);
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    return {
      targetFPS: this.targetFPS,
      actualFPS,
      frames: this.frames.length,
      duration,
      avgFrameDelta: avgDelta,
      droppedFrames: this.calculateDroppedFrames(),
      meetsTarget: actualFPS >= this.targetFPS * 0.95, // 95% of target
    };
  }

  /**
   * Calculate number of dropped frames
   */
  calculateDroppedFrames() {
    let dropped = 0;
    const threshold = this.frameInterval * 1.5; // 50% tolerance

    for (let i = 1; i < this.frames.length; i++) {
      if (this.frames[i].delta > threshold) {
        dropped++;
      }
    }

    return dropped;
  }
}

/**
 * Wait for condition with timeout
 */
export function waitForCondition(condition, options = {}) {
  const {
    timeout = 5000,
    interval = 50,
    timeoutMessage = "Condition not met within timeout",
  } = options;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(timeoutMessage));
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

/**
 * Advance timers and flush promises
 */
export async function advanceTimersAndFlush(ms) {
  vi.advanceTimersByTime(ms);
  await flushPromises();
}

/**
 * Flush all pending promises
 */
export function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Create a deferred promise for manual resolution
 */
export function createDeferred() {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Mock API response helper
 */
export function mockApiResponse(data, options = {}) {
  const { delay = 0, success = true, status = 200, error = null } = options;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (success) {
        resolve({
          data,
          status,
          ok: true,
        });
      } else {
        reject(error || new Error("API request failed"));
      }
    }, delay);
  });
}

/**
 * Create a spy that tracks call order
 */
export function createOrderedSpy() {
  const calls = [];
  const spy = vi.fn((...args) => {
    calls.push({ args, timestamp: Date.now() });
  });

  spy.getCalls = () => calls;
  spy.getCallOrder = () => calls.map((_c, i) => i);
  spy.clear = () => {
    calls.length = 0;
  };

  return spy;
}

/**
 * Simulate user interaction delay
 */
export function simulateUserDelay(min = 100, max = 300) {
  const delay = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Assert no console errors
 */
export function assertNoConsoleErrors() {
  const errors = [];
  let consoleErrorSpy;

  // Use Vitest spy to avoid direct console manipulation
  if (typeof globalThis !== "undefined" && globalThis.console) {
    consoleErrorSpy = vi
      .spyOn(globalThis.console, "error")
      .mockImplementation((...args) => {
        errors.push(args);
        // Don't call original to avoid noisy logs in test output
      });
  }

  return {
    restore: () => {
      if (consoleErrorSpy) {
        consoleErrorSpy.mockRestore();
      }
    },
    getErrors: () => errors,
    assertNone: () => {
      if (errors.length > 0) {
        throw new Error(`Console errors detected: ${JSON.stringify(errors)}`);
      }
    },
  };
}

/**
 * Create a mock canvas context for canvas-based components
 */
export function createMockCanvasContext() {
  // Track style changes for testing
  const styleHistory = {
    strokeStyle: [],
    fillStyle: [],
  };

  const context = {
    _styleHistory: styleHistory,
    _strokeStyle: "",
    _fillStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  };

  // Use getters/setters to track style changes
  Object.defineProperty(context, "strokeStyle", {
    get() {
      return this._strokeStyle;
    },
    set(value) {
      this._strokeStyle = value;
      this._styleHistory.strokeStyle.push(value);
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(context, "fillStyle", {
    get() {
      return this._fillStyle;
    },
    set(value) {
      this._fillStyle = value;
      this._styleHistory.fillStyle.push(value);
    },
    enumerable: true,
    configurable: true,
  });

  return context;
}

/**
 * Setup mock canvas for testing
 */
export function setupMockCanvas() {
  const mockContext = createMockCanvasContext();

  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext);

  return mockContext;
}

export default {
  createTestWrapper,
  renderWithProviders,
  PerformanceTestHarness,
  StreamingPerformanceValidator,
  waitForCondition,
  advanceTimersAndFlush,
  flushPromises,
  createDeferred,
  mockApiResponse,
  createOrderedSpy,
  simulateUserDelay,
  assertNoConsoleErrors,
  createMockCanvasContext,
  setupMockCanvas,
};
