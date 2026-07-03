/**
 * Tests for MultiTimeframeTrendChart Component
 *
 * Coverage includes:
 * - Component rendering with multiple chart types
 * - Timeframe selection and data formatting
 * - Chart type switching (line, area, bar, composed)
 * - Data export functionality
 * - Statistics calculation
 * - Dark mode support
 * - Interactive controls
 * - Multiple metrics rendering
 * - Accessibility
 */

import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import MultiTimeframeTrendChart from "@/components/visualization/MultiTimeframeTrendChart";

// Mock browser APIs that may not be available in JSDOM
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => "blob:test");
  global.URL.revokeObjectURL = vi.fn();
  
  // Mock window.open for potential export functionality
  global.window.open = vi.fn();
  
  // Mock navigator.msSaveBlob for IE support
  global.navigator.msSaveBlob = vi.fn();
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Create spies for Recharts components - but keep them simple to avoid recursion
const chartSpy = vi.fn();

// Mock Recharts components - simplified to avoid circular dependencies
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: (props) => {
    // Just spy, don't return anything that could cause recursion
    chartSpy({ type: 'line', ...props });
    return (
      <div data-testid="line-chart">
        {props.children}
      </div>
    );
  },
  AreaChart: (props) => {
    chartSpy({ type: 'area', ...props });
    return (
      <div data-testid="area-chart">
        {props.children}
      </div>
    );
  },
  BarChart: (props) => {
    chartSpy({ type: 'bar', ...props });
    return (
      <div data-testid="bar-chart">
        {props.children}
      </div>
    );
  },
  ComposedChart: (props) => {
    chartSpy({ type: 'composed', ...props });
    return (
      <div data-testid="composed-chart">
        {props.children}
      </div>
    );
  },
  Line: ({ dataKey, stroke }) => (
    <div data-testid={`
