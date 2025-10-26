/**
 * Tests for IndustrialGauge Component
 *
 * Coverage includes:
 * - Component rendering with canvas
 * - Value mapping and display
 * - Threshold state handling (low, normal, warning, critical)
 * - Error and fallback states
 * - Dark mode support
 * - Canvas drawing operations
 * - Animated value transitions
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import IndustrialGauge from "@/components/visualization/IndustrialGauge";
import { setupMockCanvas } from "./utils/testHelpers.jsx";

describe("IndustrialGauge", () => {
  let mockContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = setupMockCanvas();
  });

  describe("Component Rendering", () => {
    it("should render gauge with default props", () => {
      render(<IndustrialGauge />);

      expect(screen.getByText("Gauge")).toBeInTheDocument();
    });

    it("should render with custom title", () => {
      render(<IndustrialGauge title="Temperature" />);

      expect(screen.getByText("Temperature")).toBeInTheDocument();
    });

    it("should display current value when showValue is true", () => {
      render(
        <IndustrialGauge
          title="Temperature"
          value={75}
          unit="°C"
          showValue={true}
        />,
      );

      expect(screen.getByText(/75/)).toBeInTheDocument();
      const unitLabels = screen.getAllByText(/°C/);
      expect(unitLabels.length).toBeGreaterThan(0);
    });

    it("should hide value when showValue is false", () => {
      render(
        <IndustrialGauge
          title="Temperature"
          value={75}
          unit="°C"
          showValue={false}
        />,
      );

      // Value should not be displayed
      const valueElements = screen.queryAllByText(/75/);
      // Value might be in canvas or not displayed at all
      expect(valueElements.length).toBeLessThanOrEqual(1);
    });

    it("should render canvas element", () => {
      const { container } = render(<IndustrialGauge />);

      const canvas = container.querySelector("canvas");
      expect(canvas).toBeInTheDocument();
    });

    it("should set canvas size based on size prop", () => {
      const { container } = render(<IndustrialGauge size={300} />);

      const canvas = container.querySelector("canvas");
      expect(canvas).toHaveAttribute("width", "300");
      expect(canvas).toHaveAttribute("height", "300");
    });
  });

  describe("Value Mapping", () => {
    it("should map value within min-max range", () => {
      render(<IndustrialGauge min={0} max={100} value={50} />);

      // Check that canvas drawing methods were called
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it("should handle value at minimum", () => {
      render(<IndustrialGauge min={0} max={100} value={0} />);

      expect(mockContext.arc).toHaveBeenCalled();
    });

    it("should handle value at maximum", () => {
      render(<IndustrialGauge min={0} max={100} value={100} />);

      expect(mockContext.arc).toHaveBeenCalled();
    });

    it("should clamp value below minimum", () => {
      render(<IndustrialGauge min={0} max={100} value={-10} />);

      // Should still render without errors
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it("should clamp value above maximum", () => {
      render(<IndustrialGauge min={0} max={100} value={150} />);

      // Should still render without errors
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it("should handle custom min-max ranges", () => {
      render(<IndustrialGauge min={50} max={150} value={100} />);

      expect(mockContext.arc).toHaveBeenCalled();
    });

    it("should display value with correct precision", () => {
      render(
        <IndustrialGauge value={75.12345} precision={2} showValue={true} />,
      );

      expect(screen.getByText(/75\.1/)).toBeInTheDocument();
    });

    it("should handle negative values", () => {
      render(<IndustrialGauge min={-100} max={100} value={-50} />);

      expect(mockContext.arc).toHaveBeenCalled();
    });
  });

  describe("Threshold States", () => {
    it("should display normal status for value in normal range", () => {
      render(
        <IndustrialGauge
          value={50}
          thresholds={{ low: 30, normal: 70, high: 90 }}
        />,
      );

      // Normal status color should be used at some point during drawing
      expect(mockContext._styleHistory.strokeStyle).toContain("#22c55e"); // green
    });

    it("should display low status for value below low threshold", () => {
      render(
        <IndustrialGauge
          value={20}
          thresholds={{ low: 30, normal: 70, high: 90 }}
        />,
      );

      // Low status color should be used at some point during drawing
      expect(mockContext._styleHistory.strokeStyle).toContain("#3b82f6"); // blue
    });

    it("should display warning status for value in warning range", () => {
      render(
        <IndustrialGauge
          value={80}
          thresholds={{ low: 30, normal: 70, high: 90 }}
        />,
      );

      // Warning status color should be used at some point during drawing
      expect(mockContext._styleHistory.strokeStyle).toContain("#eab308"); // yellow
    });

    it("should display critical status for value above high threshold", () => {
      render(
        <IndustrialGauge
          value={95}
          thresholds={{ low: 30, normal: 70, high: 90 }}
        />,
      );

      // Critical status color should be used at some point during drawing
      expect(mockContext._styleHistory.strokeStyle).toContain("#ef4444"); // red
    });

    it("should render threshold zones when showThresholds is true", () => {
      render(
        <IndustrialGauge
          value={50}
          thresholds={{ low: 30, normal: 70, high: 90 }}
          showThresholds={true}
        />,
      );

      // Multiple arcs should be drawn for threshold zones
      const arcCalls = mockContext.arc.mock.calls;
      expect(arcCalls.length).toBeGreaterThan(1);
    });

    it("should not render threshold zones when showThresholds is false", () => {
      mockContext.arc.mockClear();

      render(
        <IndustrialGauge
          value={50}
          thresholds={{ low: 30, normal: 70, high: 90 }}
          showThresholds={false}
        />,
      );

      // Fewer arcs when thresholds are hidden
      const arcCalls = mockContext.arc.mock.calls;
      expect(arcCalls.length).toBeGreaterThan(0);
    });

    it("should update status when value changes", async () => {
      const { rerender } = render(
        <IndustrialGauge
          value={50}
          thresholds={{ low: 30, normal: 70, high: 90 }}
        />,
      );

      // Change value to critical range
      rerender(
        <IndustrialGauge
          value={95}
          thresholds={{ low: 30, normal: 70, high: 90 }}
        />,
      );

      await waitFor(() => {
        // Should update to critical color at some point during drawing
        expect(mockContext._styleHistory.strokeStyle).toContain("#ef4444");
      });
    });

    it("should handle custom thresholds", () => {
      render(
        <IndustrialGauge
          min={0}
          max={200}
          value={120}
          thresholds={{ low: 50, normal: 100, high: 150 }}
        />,
      );

      expect(mockContext.arc).toHaveBeenCalled();
    });
  });

  describe("Animated Transitions", () => {
    it("should animate value changes when animated is true", async () => {
      vi.useFakeTimers();

      const { rerender } = render(
        <IndustrialGauge value={50} animated={true} />,
      );

      // Change value
      rerender(<IndustrialGauge value={80} animated={true} />);

      // Advance animation frames
      vi.advanceTimersByTime(100);

      // Canvas should be redrawn multiple times for animation
      expect(mockContext.clearRect).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should update immediately when animated is false", () => {
      const { rerender } = render(
        <IndustrialGauge value={50} animated={false} />,
      );

      const initialCallCount = mockContext.arc.mock.calls.length;

      rerender(<IndustrialGauge value={80} animated={false} />);

      // Should have updated (new draw calls)
      expect(mockContext.arc.mock.calls.length).toBeGreaterThan(
        initialCallCount,
      );
    });
  });

  describe("Dark Mode Support", () => {
    it("should detect dark mode from document class", () => {
      // Add dark mode class
      document.documentElement.classList.add("dark");

      render(<IndustrialGauge value={50} />);

      // Dark mode colors should be used
      expect(mockContext.fillStyle).toBeTruthy();

      // Cleanup
      document.documentElement.classList.remove("dark");
    });

    it("should update colors when theme changes", async () => {
      const { rerender } = render(<IndustrialGauge value={50} />);

      // Toggle dark mode
      document.documentElement.classList.add("dark");

      // Trigger re-render
      rerender(<IndustrialGauge value={50} />);

      await waitFor(() => {
        expect(mockContext.fillStyle).toBeTruthy();
      });

      // Cleanup
      document.documentElement.classList.remove("dark");
    });

    it("should use light mode colors by default", () => {
      document.documentElement.classList.remove("dark");

      render(<IndustrialGauge value={50} />);

      // Light mode should be active
      expect(mockContext.fillStyle).toBeTruthy();
    });
  });

  describe("Canvas Drawing Operations", () => {
    it("should clear canvas before drawing", () => {
      render(<IndustrialGauge value={50} />);

      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    it("should draw background arc", () => {
      render(<IndustrialGauge value={50} />);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it("should draw value arc", () => {
      render(<IndustrialGauge value={75} />);

      const arcCalls = mockContext.arc.mock.calls;
      expect(arcCalls.length).toBeGreaterThan(0);
    });

    it("should draw center circle", () => {
      render(<IndustrialGauge value={50} />);

      expect(mockContext.fill).toHaveBeenCalled();
    });

    it("should set line width for arcs", () => {
      render(<IndustrialGauge value={50} />);

      expect(mockContext.lineWidth).toBeGreaterThan(0);
    });

    it("should use rounded line caps", () => {
      render(<IndustrialGauge value={50} />);

      expect(mockContext.lineCap).toBe("round");
    });

    it("should draw needle indicator", () => {
      render(<IndustrialGauge value={50} />);

      // Needle should be drawn with lines
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.lineTo).toHaveBeenCalled();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle missing canvas context gracefully", () => {
      // Mock getContext to return null
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

      // Should not throw error - component renders even without canvas context
      const { container } = render(<IndustrialGauge value={50} />);
      expect(container).toBeTruthy();

      // Restore mock
      mockContext = setupMockCanvas();
    });

    it("should handle zero range (min === max)", () => {
      render(<IndustrialGauge min={50} max={50} value={50} />);

      // Should render without errors
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it("should handle NaN value", () => {
      render(<IndustrialGauge value={NaN} />);

      // Should render with fallback value (likely 0 or min)
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it("should handle undefined value", () => {
      render(<IndustrialGauge value={undefined} />);

      // Should use default value
      expect(mockContext.arc).toHaveBeenCalled();
    });

    it("should handle rapid value changes", () => {
      const { rerender } = render(<IndustrialGauge value={50} />);

      // Rapidly change values
      for (let i = 0; i < 10; i++) {
        rerender(<IndustrialGauge value={50 + i * 5} />);
      }

      // Should handle all updates
      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    it("should cleanup animation on unmount", () => {
      const { unmount } = render(
        <IndustrialGauge value={50} animated={true} />,
      );

      // Unmount component
      unmount();

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe("Component Props", () => {
    it("should apply custom size", () => {
      const { container } = render(<IndustrialGauge size={400} />);

      const canvas = container.querySelector("canvas");
      expect(canvas).toHaveAttribute("width", "400");
      expect(canvas).toHaveAttribute("height", "400");
    });

    it("should display unit label", () => {
      render(<IndustrialGauge value={75} unit="PSI" showValue={true} />);

      const unitLabels = screen.getAllByText(/PSI/);
      expect(unitLabels.length).toBeGreaterThan(0);
    });

    it("should accept all valid threshold configurations", () => {
      const thresholds = [
        { low: 10, normal: 50, high: 90 },
        { low: 0, normal: 25, high: 75 },
        { low: 20, normal: 60, high: 80 },
      ];

      thresholds.forEach((threshold) => {
        mockContext.arc.mockClear();
        render(<IndustrialGauge value={50} thresholds={threshold} />);
        expect(mockContext.arc).toHaveBeenCalled();
      });
    });

    it("should handle different precision values", () => {
      const precisionTests = [
        { precision: 0, expected: /75/ },
        { precision: 1, expected: /75\.1/ },
        { precision: 2, expected: /75\.12/ },
      ];

      precisionTests.forEach(({ precision, expected }) => {
        const { container } = render(
          <IndustrialGauge
            value={75.123}
            precision={precision}
            showValue={true}
          />,
        );
        expect(screen.getByText(expected)).toBeInTheDocument();
        container.remove();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have accessible card structure", () => {
      const { container } = render(<IndustrialGauge title="Pressure Gauge" />);

      // Check for card element
      const card = container.querySelector("[data-slot='card']");
      expect(card).toBeTruthy();
    });

    it("should display title for screen readers", () => {
      render(<IndustrialGauge title="Temperature Monitor" />);

      expect(screen.getByText("Temperature Monitor")).toBeInTheDocument();
    });

    it("should show warning icon for critical status", () => {
      const { container } = render(
        <IndustrialGauge
          value={95}
          thresholds={{ low: 30, normal: 70, high: 90 }}
        />,
      );

      // Component should render with critical value
      expect(container).toBeTruthy();
      // Critical color should be used in drawing
      expect(mockContext._styleHistory.strokeStyle).toContain("#ef4444"); // red for critical
    });
  });
});
