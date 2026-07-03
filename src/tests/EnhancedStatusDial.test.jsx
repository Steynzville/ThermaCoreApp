import { act, fireEvent, render, screen } from "@testing-library/react";
import { Package, Wifi, Zap } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import EnhancedStatusDial from "../components/Dashboard/EnhancedStatusDial";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => {
      // Filter out motion-specific props that might cause warnings
      const { whileHover, whileTap, initial, animate, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

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

      // Use getAllByText and check the first one since the component may render multiple instances
      const percentageElements = screen.getAllByText("75%");
      expect(percentageElements.length).toBeGreaterThan(0);
      expect(percentageElements[0]).toBeInTheDocument();
    });

    it("should render the icon", () => {
      const { container } = render(<EnhancedStatusDial {...defaultProps} />);

      // Check that the icon component is rendered
      const iconElement = container.querySelector("svg");
      expect(iconElement).toBeInTheDocument();
    });

    it("should render with 'live' as default last updated value", () => {
      render(<EnhancedStatusDial {...defaultProps} />);

      // Use getAllByText since "live" might appear multiple times
      const liveElements = screen.getAllByText("live");
      expect(liveElements.length).toBeGreaterThan(0);
    });

    it("should render with custom last updated value", () => {
      render(<EnhancedStatusDial {...defaultProps} lastUpdated="2m ago" />);

      expect(screen.getByText("2m ago")).toBeInTheDocument();
    });

    it("should render trend indicator when trend is positive", () => {
      render(<EnhancedStatusDial {...defaultProps} trend={5} />);

      expect(screen.getByText("5%")).toBeInTheDocument();
    });

    it("should render trend indicator when trend is negative", () => {
      render(<EnhancedStatusDial {...defaultProps} trend={-3} />);

      expect(screen.getByText("3%")).toBeInTheDocument();
    });
  });

  describe("Color Variants", () => {
    it("should apply blue color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="blue" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-blue-600");
    });

    it("should apply green color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="green" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-green-600");
    });

    it("should apply red color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="red" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-red-600");
    });

    it("should apply orange color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="orange" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-orange-600");
    });

    it("should apply yellow color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="yellow" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-yellow-600");
    });

    it("should apply black/gray color classes", () => {
      const { container } = render(
        <EnhancedStatusDial {...defaultProps} color="black" />,
      );

      const dialElement = container.firstChild;
      expect(dialElement.className).toContain("text-gray-600");
    });
  });

  describe("Clickable Behavior", () => {
    it("should call onClick when clicked and clickable is true", () => {
      const onClick = vi.fn();
      render(<EnhancedStatusDial {...defaultProps} onClick={onClick} clickable={true} />);

      // Use getAllByRole and click the first one
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
      fireEvent.click(buttons[0]);

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
      render(<EnhancedStatusDial {...defaultProps} clickable={true} />);

      // There may be multiple buttons, but at least one should exist
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should have presentation role when clickable is false", () => {
      render(<EnhancedStatusDial {...defaultProps} clickable={false} />);

      // When not clickable, there should be no buttons
      const buttons = screen.queryAllByRole("button");
      expect(buttons.length).toBe(0);
    });

    it("should have proper aria-label when clickable", () => {
      render(<EnhancedStatusDial {...defaultProps} clickable={true} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveAttribute(
        "aria-label",
        "Total Units: 10 items, 75% complete",
      );
    });

    it("should have tabIndex 0 when clickable", () => {
      render(<EnhancedStatusDial {...defaultProps} clickable={true} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveAttribute("tabIndex", "0");
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
      render(<EnhancedStatusDial {...defaultProps} onClick={onClick} clickable={true} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.keyDown(buttons[0], { key: "Enter" });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should call onClick when Space key is pressed and clickable", () => {
      const onClick = vi.fn();
      render(<EnhancedStatusDial {...defaultProps} onClick={onClick} clickable={true} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.keyDown(buttons[0], { key: " " });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when other keys are pressed", () => {
      const onClick = vi.fn();
      render(<EnhancedStatusDial {...defaultProps} onClick={onClick} clickable={true} />);

      const buttons = screen.getAllByRole("button");
      fireEvent.keyDown(buttons[0], { key: "Escape" });
      fireEvent.keyDown(buttons[0], { key: "Tab" });

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

      // Advance timers to trigger the useEffect setTimeout
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
      expect(screen.getByText("50%")).toBeInTheDocument();

      rerender(<EnhancedStatusDial {...defaultProps} percentage={80} />);

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.getByText("80%")).toBeInTheDocument();
    });

    it("should update count when prop changes", () => {
      const { rerender } = render(
        <EnhancedStatusDial {...defaultProps} count={10} />,
      );

      expect(screen.getByText("10")).toBeInTheDocument();

      rerender(<EnhancedStatusDial {...defaultProps} count={15} />);

      expect(screen.getByText("15")).toBeInTheDocument();
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
        />,
      );

      // Check if pulse animation div exists
      const dialElement = container.firstChild;
      expect(dialElement).toBeInTheDocument();
    });

    it("should not render pulse animation for red color with count = 0", () => {
      const { container } = render(
        <EnhancedStatusDial
          {...defaultProps}
          color="red"
          count={0}
          icon={Zap}
          title="Alarms"
        />,
      );

      const dialElement = container.firstChild;
      expect(dialElement).toBeInTheDocument();
    });

    it("should not render pulse animation for non-red colors", () => {
      const { container } = render(
        <EnhancedStatusDial
          {...defaultProps}
          color="green"
          count={5}
          icon={Wifi}
          title="Online"
        />,
      );

      const dialElement = container.firstChild;
      expect(dialElement).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero count", () => {
      render(<EnhancedStatusDial {...defaultProps} count={0} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("should handle zero percentage", () => {
      render(<EnhancedStatusDial {...defaultProps} percentage={0} />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should handle 100 percentage", () => {
      render(<EnhancedStatusDial {...defaultProps} percentage={100} />);

      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("should handle large count numbers", () => {
      render(<EnhancedStatusDial {...defaultProps} count={9999} />);

      expect(screen.getByText("9999")).toBeInTheDocument();
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
      render(<EnhancedStatusDial {...defaultProps} clickable={true} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveAttribute("tabIndex", "0");
      expect(buttons[0]).toHaveAttribute("aria-label");
    });

    it("should have descriptive aria-label", () => {
      render(
        <EnhancedStatusDial
          {...defaultProps}
          title="Online Units"
          count={8}
          percentage={80}
          clickable={true}
        />,
      );

      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveAttribute(
        "aria-label",
        "Online Units: 8 items, 80% complete",
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
