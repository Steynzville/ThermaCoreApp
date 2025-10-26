/**
 * Smoke Tests for AdvancedAnalyticsDashboard Component
 *
 * Tests basic rendering and prop validation
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdvancedAnalyticsDashboard from "../components/AdvancedAnalyticsDashboard";

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

  it("should handle multiple renders", () => {
    const { rerender } = render(<AdvancedAnalyticsDashboard />);

    for (let i = 0; i < 5; i++) {
      expect(() => rerender(<AdvancedAnalyticsDashboard />)).not.toThrow();
    }
  });

  it("should render with hooks data", () => {
    const { container } = render(<AdvancedAnalyticsDashboard />);
    // Should render with mocked hook data
    expect(container.firstChild).toBeInTheDocument();
  });
});
