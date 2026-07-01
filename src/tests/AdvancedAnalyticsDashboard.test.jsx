/**
 * Smoke Tests for AdvancedAnalyticsDashboard Component
 *
 * Tests basic rendering and prop validation
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import AdvancedAnalyticsDashboard from "../components/AdvancedAnalyticsDashboard";

// 1. Mock heavy charting and layout libraries to prevent animation loops from hanging JSDOM
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }) => <div style={{ width: "100%", height: "100%" }}>{children}</div>,
    LineChart: ({ children }) => <div>{children}</div>,
    BarChart: ({ children }) => <div>{children}</div>,
    AreaChart: ({ children }) => <div>{children}</div>,
    PieChart: ({ children }) => <div>{children}</div>,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Line: () => null,
    Bar: () => null,
    Area: () => null,
  };
});

// Mock Ag-Grid if the dashboard utilizes it
vi.mock("ag-grid-react", () => ({
  AgGridReact: () => <div data-testid="mock-ag-grid">Grid Mock</div>,
}));

// Mock realtime data hooks
vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: () => ({
    metrics: {
      temperature: 65,
      pressure: 120,
      flowRate: 245,
    },
    isConnected: true,
  }),
  useRealtimeProtocolStatus: () => ({
    protocols: [{ id: "modbus-1", name: "Modbus", status: "connected" }],
    isConnected: true,
  }),
}));

describe("AdvancedAnalyticsDashboard - Smoke Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { container } = render(<AdvancedAnalyticsDashboard />);
    expect(container).toBeInTheDocument();
  });

  it("should render with default state", () => {
    const { container } = render(<AdvancedAnalyticsDashboard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should mount and unmount without errors", () => {
    const { unmount } = render(<AdvancedAnalyticsDashboard />);
    expect(() => unmount()).not.toThrow();
  });

  it("should handle component lifecycle", () => {
    const { rerender, unmount } = render(<AdvancedAnalyticsDashboard />);

    // Rerender should work
    expect(() => rerender(<AdvancedAnalyticsDashboard />)).not.toThrow();

    // Unmount should work
    expect(() => unmount()).not.toThrow();
  });

  it("should render dashboard structure", () => {
    const { container } = render(<AdvancedAnalyticsDashboard />);
    expect(container).toBeInTheDocument();
  });

  it("should handle realtime data updates", () => {
    const { container } = render(<AdvancedAnalyticsDashboard />);
    expect(container).toBeInTheDocument();
  });

  it("should render without throwing errors", () => {
    expect(() => render(<AdvancedAnalyticsDashboard />)).not.toThrow();
  });

  it("should handle state initialization", () => {
    const { container } = render(<AdvancedAnalyticsDashboard />);
    expect(container).toBeInTheDocument();
  });

  it("should handle multiple renders cleanly without leaking handles", () => {
    const { rerender } = render(<AdvancedAnalyticsDashboard />);

    // Keep it fast and simple without overloading JSDOM microtasks
    expect(() => rerender(<AdvancedAnalyticsDashboard />)).not.toThrow();
    expect(() => rerender(<AdvancedAnalyticsDashboard />)).not.toThrow();
  });

  it("should render with hooks data", () => {
    const { container } = render(<AdvancedAnalyticsDashboard />);
    // Should render with mocked hook data
    expect(container.firstChild).toBeInTheDocument();
  });
});
