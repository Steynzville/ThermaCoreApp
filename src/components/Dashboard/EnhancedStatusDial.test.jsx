import { act, fireEvent, render, screen } from "@testing-library/react";
import { Package, Wifi, Zap } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ✅ Updated import for co-located test file
import EnhancedStatusDial from "./EnhancedStatusDial";

// Mock framer-motion to forward animate.width as inline style
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, animate, ...props }) => {
      // Filter out motion-specific props that might cause warnings
      const { whileHover, whileTap, initial, transition, ...rest } = props;
      
      // Forward animate.width as inline style for testing
      const style = {
        ...(rest.style || {}),
        ...(animate?.width ? { width: animate.width } : {}),
      };
      
      return <div {...rest} style={style}>{children}</div>;
    },
    span: ({ children, animate, ...props }) => {
      const { whileHover, whileTap, initial, transition, ...rest } = props;
      
      const style = {
        ...(rest.style || {}),
        ...(animate?.width ? { width: animate.width } : {}),
      };
      
      return <span {...rest} style={style}>{children}</span>;
    },
  },
}));

// Mock lucide-react to add test IDs for trend icons
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  return {
    ...actual,
    TrendingUp: ({ className, ...props }) => (
      <svg data-testid="trending-up" className={className} {...props} />
    ),
    TrendingDown: ({ className, ...props }) => (
      <svg data-testid="trending-down" className={className} {...props} />
    ),
  };
});

describe("EnhancedStatusDial", () => {
  const defaultProps = {
    icon: Package,
    title: "Total Units",
    count: 10,
    percentage: 75,
    color: "blue",
    onClick: vi.fn(),
    clickable: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Rendering", () => {
    it("should render with correct title and count", () => {
      render(<EnhancedStatusDial {...defaultProps} />);

      expect(screen.getByText("Total Units")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("should render with correct percentage", () => {
      render(<EnhancedStatusDial {...defaultProps} />);

      const percentageElements = screen.getAllByText("75%");
      expect(percentageElements.length).toBeGreaterThan(0);
      expect(percentageElements[0]).toBeInTheDocument();
    });

    it("should render the icon", () => {
      const { container } = render(<EnhancedStatusDial {...defaultProps} />);

      const iconElement = container.querySelector("svg");
      expect(iconElement).toBeInTheDocument();
    });

    it("should render with a dynamic timestamp when lastUpdated is not provided", () => {
      render(<EnhancedStatusDial {...defaultProps} />);

      // Should show something like "3m ago"
      const timestampRegex = /^\d+m ago$/;
      const elements = screen.getAllByText(timestampRegex);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("should render with custom last updated value", () => {
      render(<EnhancedStatusDial {...defaultProps} lastUpdated="2m ago" />);

      expect(screen.getByText("2m ago")).toBeInTheDocument();
    });

    it("should render trend indicator when trend is positive", () => {
      render(<EnhancedStatusDial {...defaultProps} trend={5} />);

      expect(screen.getByText("5%")).toBeInTheDocument();
      expect(screen.getByTestId("trending-up")).toBeInTheDocument();
    });

    it("should render trend indicator when trend is negative", () => {
      render(<EnhancedStatusDial {...defaultProps} trend={-3} />);

      expect(screen.getByText("3%")).toBeInTheDocument();
      expect(screen.getByTestId("trending-down")).toBeInTheDocument();
    });

    it("should render trend indicator when trend is zero", () => {
      render(<EnhancedStatusDial {...defaultProps} trend={0} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      // Should show a neutral indicator (—)
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });

  describe("Color Variants", () => {
    it("should apply blue color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="blue" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-blue-600");
      expect(dialElement.className).toContain("bg-blue-50");
    });

    it("should apply green color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="green" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-green-600");
      expect(dialElement.className).toContain("bg-green-50");
    });

    it("should apply red color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="red" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-red-600");
      expect(dialElement.className).toContain("bg-red-50");
    });

    it("should apply orange color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="orange" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-orange-600");
      expect(dialElement.className).toContain("bg-orange-50");
    });

    it("should apply yellow color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="yellow" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-yellow-600");
      expect(dialElement.className).toContain("bg-yellow-50");
    });

    it("should apply black/gray color classes with correct background", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="black" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-gray-600");
      expect(dialElement.className).toContain("bg-gray-50");
      expect(dialElement.className).not.toContain("bg-blue-50");
    });

    it("should fall back to blue theme for unrecognized colors", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="unknown" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-blue-600");
      expect(dialElement.className).toContain("bg-blue-50");
    });
  });

  describe("Clickable Behavior", () => {
    it("should call onClick when clicked and clickable is true", () => {
      const onClick = vi.fn();
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} onClick={onClick} clickable={true} />
      );

      const dialElement = container.querySelector('[role="button"]');
      expect(dialElement).toBeInTheDocument();
      fireEvent.click(dialElement);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when clickable is false", () => {
      const onClick = vi.fn();
      const { container } = render(
        <EnhancedStatusDial
          {...defaultProps}
          onClick={onClick}
          clickable={false}
        />,
      );

      const dialElement = container.firstChild;
      fireEvent.click(dialElement);

      expect(onClick).not.toHaveBeenCalled();
    });

    it("should have cursor-pointer class when clickable is true", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} clickable={true} />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("cursor-pointer");
    });

    it("should have cursor-default class when clickable is false", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} clickable={false} />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("cursor-default");
    });

    it("should have button role when clickable is true", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} clickable={true} />
      );

      const elements = container.querySelectorAll('[role="button"]');
      expect(elements.length).toBe(1);
    });

    it("should have presentation role when clickable is false", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} clickable={false} />
      );

      const elements = container.querySelectorAll('[role="presentation"]');
      expect(elements.length).toBe(1);
    });

    it("should have proper aria-label when clickable", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} clickable={true} />
      );

      const dialElement = container.querySelector('[role="button"]');
      expect(dialElement).toHaveAttribute(
        "aria-label",
        "Total Units: 10 items, 75% complete",
      );
    });

    it("should have tabIndex 0 when clickable", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} clickable={true} />
      );

      const dialElement = container.querySelector('[role="button"]');
      expect(dialElement).toHaveAttribute("tabIndex", "0");
    });

    it("should have tabIndex -1 when not clickable", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} clickable={false} />,
      );

      const dialElement = container.firstChild;
      expect(dialElement).toHaveAttribute("tabIndex", "-1");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should call onClick when Enter key is pressed and clickable", () => {
      const onClick = vi.fn();
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} onClick={onClick} clickable={true} />
      );

      const dialElement = container.querySelector('[role="button"]');
      fireEvent.keyDown(dialElement, { key: "Enter" });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should call onClick when Space key is pressed and clickable", () => {
      const onClick = vi.fn();
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} onClick={onClick} clickable={true} />
      );

      const dialElement = container.querySelector('[role="button"]');
      fireEvent.keyDown(dialElement, { key: " " });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when other keys are pressed", () => {
      const onClick = vi.fn();
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} onClick={onClick} clickable={true} />
      );

      const dialElement = container.querySelector('[role="button"]');
      fireEvent.keyDown(dialElement, { key: "Escape" });
      fireEvent.keyDown(dialElement, { key: "Tab" });

      expect(onClick).not.toHaveBeenCalled();
    });

    it("should not call onClick on keyboard events when not clickable", () => {
      const onClick = vi.fn();
      const { container } = render(
        <EnhancedStatusDial
          {...defaultProps}
          onClick={onClick}
          clickable={false}
        />,
      );

      const dialElement = container.firstChild;
      fireEvent.keyDown(dialElement, { key: "Enter" });
      fireEvent.keyDown(dialElement, { key: " " });

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("Animation and Interaction", () => {
    it("should animate percentage on mount", async () => {
      vi.useFakeTimers();
      render(<EnhancedStatusDial {...defaultProps} percentage={50} />);

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("should update percentage when prop changes", async () => {
      vi.useFakeTimers();
      const { rerender } = render(
        <EnhancedStatusDial {...defaultProps} percentage={50} />,
      );

      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const percentageElements50 = screen.getAllByText("50%");
      expect(percentageElements50.length).toBeGreaterThan(0);

      rerender(<EnhancedStatusDial {...defaultProps} percentage={80} />);

      act(() => {
        vi.advanceTimersByTime(300);
      });
      
      const percentageElements80 = screen.getAllByText("80%");
      expect(percentageElements80.length).toBeGreaterThan(0);
    });

    it("should update count when prop changes", () => {
      const { rerender } = render(
        <EnhancedStatusDial {...defaultProps} count={10} />,
      );

      const countElements10 = screen.getAllByText("10");
      expect(countElements10.length).toBeGreaterThan(0);

      rerender(<EnhancedStatusDial {...defaultProps} count={15} />);

      const countElements15 = screen.getAllByText("15");
      expect(countElements15.length).toBeGreaterThan(0);
    });

    it("should clamp percentage in progress bar animation", async () => {
      vi.useFakeTimers();
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} percentage={150} />
      );

      act(() => {
        vi.advanceTimersByTime(300);
        vi.advanceTimersByTime(1000);
      });

      const progressBar = container.querySelector(".rounded-full > div");
      expect(progressBar).toHaveStyle("width: 100%");
    });
  });

  describe("Critical State Indicators", () => {
    it("should render pulse animation for red color with count > 0", () => {
      const { container } = render(
        <EnhancedStatusDial
          {...defaultProps}
          color="red"
          count={5}
          icon={Zap}
          title="Alarms"
        />
      );

      const pulseElement = container.querySelector(".border-red-400");
      expect(pulseElement).toBeInTheDocument();
    });

    it("should not render pulse animation for red color with count = 0", () => {
      const { container } = render(
        <EnhancedStatusDial
          {...defaultProps}
          color="red"
          count={0}
          icon={Zap}
          title="Alarms"
        />
      );

      const pulseElement = container.querySelector(".border-red-400");
      expect(pulseElement).not.toBeInTheDocument();
    });

    it("should not render pulse animation for non-red colors", () => {
      const { container } = render(
        <EnhancedStatusDial
          {...defaultProps}
          color="green"
          count={5}
          icon={Wifi}
          title="Online"
        />
      );

      const pulseElement = container.querySelector(".border-red-400");
      expect(pulseElement).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero count", () => {
      render(<EnhancedStatusDial {...defaultProps} count={0} />);

      const countElements = screen.getAllByText("0");
      expect(countElements.length).toBeGreaterThan(0);
    });

    it("should handle zero percentage", () => {
      render(<EnhancedStatusDial {...defaultProps} percentage={0} />);

      const percentageElements = screen.getAllByText("0%");
      expect(percentageElements.length).toBeGreaterThan(0);
    });

    it("should handle 100 percentage", () => {
      render(<EnhancedStatusDial {...defaultProps} percentage={100} />);

      const percentageElements = screen.getAllByText("100%");
      expect(percentageElements.length).toBeGreaterThan(0);
    });

    it("should clamp percentage below 0 in both label and progress bar", () => {
      vi.useFakeTimers();
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} percentage={-10} />
      );

      expect(screen.queryByText("-10%")).not.toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(300);
        vi.advanceTimersByTime(1000);
      });

      const progressBar = container.querySelector(".rounded-full > div");
      expect(progressBar).toHaveStyle("width: 0%");
    });

    it("should clamp percentage above 100 in both label and progress bar", () => {
      vi.useFakeTimers();
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} percentage={150} />
      );

      expect(screen.queryByText("150%")).not.toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(300);
        vi.advanceTimersByTime(1000);
      });

      const progressBar = container.querySelector(".rounded-full > div");
      expect(progressBar).toHaveStyle("width: 100%");
    });

    it("should clamp negative count to 0", () => {
      render(<EnhancedStatusDial {...defaultProps} count={-5} />);

      expect(screen.queryByText("-5")).not.toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle large count numbers", () => {
      render(<EnhancedStatusDial {...defaultProps} count={9999} />);

      const countElements = screen.getAllByText("9999");
      expect(countElements.length).toBeGreaterThan(0);
    });

    it("should handle undefined onClick gracefully", () => {
      const { container } = render(
        <EnhancedStatusDial
          icon={Package}
          title="Test"
          count={5}
          percentage={50}
          color="blue"
          clickable={false}
        />,
      );

      const dialElement = container.firstChild;
      expect(() => fireEvent.click(dialElement)).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible when clickable", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} clickable={true} />
      );

      const dialElement = container.querySelector('[role="button"]');
      expect(dialElement).toHaveAttribute("tabIndex", "0");
      expect(dialElement).toHaveAttribute("aria-label");
    });

    it("should have descriptive aria-label using clamped values", () => {
      const { container } = render(
        <EnhancedStatusDial
          {...defaultProps}
          title="Online Units"
          count={-5}
          percentage={150}
          clickable={true}
        />,
      );

      const dialElement = container.querySelector('[role="button"]');
      expect(dialElement).toHaveAttribute(
        "aria-label",
        "Online Units: 0 items, 100% complete",
      );
    });

    it("should not have aria-label when not clickable", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} clickable={false} />,
      );

      const dialElement = container.firstChild;
      expect(dialElement).not.toHaveAttribute("aria-label");
    });
  });
});
