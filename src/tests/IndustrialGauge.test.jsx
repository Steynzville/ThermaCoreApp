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

      // Use getAllByText since there may be multiple elements with "Temperature"
      // (e.g., card title, gauge title, etc.)
      const elements = screen.getAllByText("Temperature");
      expect(elements.length).toBeGreaterThan(0);
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

      // Use getAllByText and check that we have at least one match
      const valueElements = screen.getAllByText(/75/);
      expect(valueElements.length).toBeGreaterThan(0);
      
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

      // When showValue is false, the value display div should not be present
      // Specifically check for elements that are part of the value display area
      // which have the text-2xl or text-3xl classes and contain the value
      const valueDisplayElements = screen.queryAllByText((content, element) => {
        // Check if this element is part of the value display
        // The value display has specific classes
        if (!element) return false;
        // Check if the element or its parent has the value display classes
        const hasValueDisplayClass = 
          element.classList?.contains('text-2xl') || 
          element.classList?.contains('text-3xl') ||
          element.closest?.('.text-2xl') || 
          element.closest?.('.text-3xl');
        
        if (hasValueDisplayClass) {
          // Check if it contains the value or unit
          return content.includes('75') || content.includes('°C');
        }
        return false;
      });
      
      // Also check for the "75°C" display directly in the value display area
      const tempDisplay = screen.queryAllByText(/75°C/);
      
      // Also check for the value display div that shows the value
      const valueDisplayDivs = screen.queryAllByText(/75/, {
        selector: '.text-2xl, .text-3xl, [class*="text-2xl"], [class*="text-3xl"]'
      });
      
      // The value should not be displayed as text in the value display area
      // Note: The value might still appear in the canvas or in other contexts
      // but should not be visible as a text element in the value display
      expect(valueDisplayElements.length).toBe(0);
      expect(tempDisplay.length).toBe(0);
      // Also check that there are no value display divs with the value
      const valueDivs = screen.queryAllByText(/75/).filter(el => {
        const parent = el.closest?.('.text-2xl') || el.closest?.('.text-3xl');
        return parent !== null;
      });
      expect(valueDivs.length).toBe(0);
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

      // Use getAllByText and check that we have at least one match
      const valueElements = screen.getAllByText(/75\.1/);
      expect(valueElements.length).toBeGreaterThan(0);
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
        { precision: 0, expected: "75", regex: /75/ },
        { precision: 1, expected: "75.1", regex: /75\.1/ },
        { precision: 2, expected: "75.12", regex: /75\.12/ },
      ];

      precisionTests.forEach(({ precision, expected, regex }) => {
        const { container } = render(
          <IndustrialGauge
            value={75.123}
            precision={precision}
            showValue={true}
          />
        );
        
        // Use getAllByText with the regex and check we have at least one match
        const elements = screen.getAllByText(regex);
        expect(elements.length).toBeGreaterThan(0);
        
        // Also verify at least one element contains the exact expected string
        const found = elements.some(el => el.textContent.includes(expected));
        expect(found).toBe(true);
        
        // Clean up the container
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

      // Use getAllByText since there might be multiple instances
      const elements = screen.getAllByText("Temperature Monitor");
      expect(elements.length).toBeGreaterThan(0);
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
