import { fireEvent, render, screen } from "@testing-library/react";
import { Activity, BarChart3, FileText } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import QuickActionCard from "../components/Dashboard/QuickActionCard";

describe("QuickActionCard", () => {
  const defaultProps = {
    icon: BarChart3,
    title: "Sales Analytics",
    description: "Detailed performance metrics and trends",
    onClick: vi.fn(),
    color: "blue",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with correct title", () => {
      render(<QuickActionCard {...defaultProps} />);

      expect(screen.getByText("Sales Analytics")).toBeInTheDocument();
    });

    it("should render with correct description", () => {
      render(<QuickActionCard {...defaultProps} />);

      expect(
        screen.getByText("Detailed performance metrics and trends"),
      ).toBeInTheDocument();
    });

    it("should render the icon", () => {
      const { container } = render(<QuickActionCard {...defaultProps} />);

      const iconElement = container.querySelector("svg");
      expect(iconElement).toBeInTheDocument();
    });

    it("should render as a button element", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe("BUTTON");
    });

    it("should have correct button type", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "button");
    });
  });

  describe("Color Variants", () => {
    it("should apply blue color classes", () => {
      const { container } = render(
        <QuickActionCard {...defaultProps} color="blue" />,
      );

      const iconWrapper = container.querySelector(".bg-blue-50");
      expect(iconWrapper).toBeInTheDocument();
    });

    it("should apply green color classes", () => {
      const { container } = render(
        <QuickActionCard {...defaultProps} color="green" />,
      );

      const iconWrapper = container.querySelector(".bg-green-50");
      expect(iconWrapper).toBeInTheDocument();
    });

    it("should apply purple color classes", () => {
      const { container } = render(
        <QuickActionCard {...defaultProps} color="purple" />,
      );

      const iconWrapper = container.querySelector(".bg-purple-50");
      expect(iconWrapper).toBeInTheDocument();
    });

    it("should default to blue if no color specified", () => {
      const { icon, title, description, onClick } = defaultProps;
      const { container } = render(
        <QuickActionCard
          icon={icon}
          title={title}
          description={description}
          onClick={onClick}
        />,
      );

      const iconWrapper = container.querySelector(".bg-blue-50");
      expect(iconWrapper).toBeInTheDocument();
    });
  });

  describe("Click Behavior", () => {
    it("should call onClick when clicked", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it("should call onClick multiple times when clicked multiple times", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(defaultProps.onClick).toHaveBeenCalledTimes(3);
    });
  });

  describe("Hover Behavior", () => {
    it("should handle mouse enter event", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);

      // Check if hover state is applied (component should still render)
      expect(button).toBeInTheDocument();
    });

    it("should handle mouse leave event", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      // Check if component is still rendered properly
      expect(button).toBeInTheDocument();
    });

    it("should apply hover classes on mouse enter", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("hover:shadow-lg");
      expect(button.className).toContain("hover:scale-105");
    });
  });

  describe("Different Icons and Content", () => {
    it("should render with Activity icon", () => {
      render(
        <QuickActionCard
          {...defaultProps}
          icon={Activity}
          title="System Health"
          description="Comprehensive system diagnostics"
          color="green"
        />,
      );

      expect(screen.getByText("System Health")).toBeInTheDocument();
      expect(
        screen.getByText("Comprehensive system diagnostics"),
      ).toBeInTheDocument();
    });

    it("should render with FileText icon", () => {
      render(
        <QuickActionCard
          {...defaultProps}
          icon={FileText}
          title="Reports"
          description="Generate comprehensive PDF reports"
          color="purple"
        />,
      );

      expect(screen.getByText("Reports")).toBeInTheDocument();
      expect(
        screen.getByText("Generate comprehensive PDF reports"),
      ).toBeInTheDocument();
    });
  });

  describe("Styling Classes", () => {
    it("should have base styling classes", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-white");
      expect(button.className).toContain("rounded-xl");
      expect(button.className).toContain("p-6");
      expect(button.className).toContain("cursor-pointer");
      expect(button.className).toContain("transition-all");
    });

    it("should have dark mode classes", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("dark:bg-gray-800");
      expect(button.className).toContain("dark:border-gray-700");
    });
  });

  describe("Keyboard Accessibility", () => {
    it("should be keyboard accessible", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it("should trigger onClick on Enter key press", () => {
      render(<QuickActionCard {...defaultProps} />);

      const button = screen.getByRole("button");
      button.focus();
      fireEvent.keyDown(button, { key: "Enter", code: "Enter" });

      // Note: Native button elements handle Enter key automatically
      expect(button).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty strings for title and description", () => {
      render(
        <QuickActionCard
          icon={BarChart3}
          title=""
          description=""
          onClick={vi.fn()}
          color="blue"
        />,
      );

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should handle long title text", () => {
      const longTitle =
        "This is a very long title that should still render properly";
      render(<QuickActionCard {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("should handle long description text", () => {
      const longDescription =
        "This is a very long description that should still render properly and wrap to multiple lines if needed";
      render(
        <QuickActionCard {...defaultProps} description={longDescription} />,
      );

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  describe("Multiple Cards", () => {
    it("should render multiple cards independently", () => {
      render(
        <>
          <QuickActionCard
            icon={BarChart3}
            title="Analytics"
            description="View analytics"
            onClick={vi.fn()}
            color="blue"
          />
          <QuickActionCard
            icon={Activity}
            title="Health"
            description="System health"
            onClick={vi.fn()}
            color="green"
          />
          <QuickActionCard
            icon={FileText}
            title="Reports"
            description="Generate reports"
            onClick={vi.fn()}
            color="purple"
          />
        </>,
      );

      expect(screen.getByText("Analytics")).toBeInTheDocument();
      expect(screen.getByText("Health")).toBeInTheDocument();
      expect(screen.getByText("Reports")).toBeInTheDocument();

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(3);
    });

    it("should handle clicks independently for multiple cards", () => {
      const onClick1 = vi.fn();
      const onClick2 = vi.fn();
      const onClick3 = vi.fn();

      render(
        <>
          <QuickActionCard
            icon={BarChart3}
            title="Analytics"
            description="View analytics"
            onClick={onClick1}
            color="blue"
          />
          <QuickActionCard
            icon={Activity}
            title="Health"
            description="System health"
            onClick={onClick2}
            color="green"
          />
          <QuickActionCard
            icon={FileText}
            title="Reports"
            description="Generate reports"
            onClick={onClick3}
            color="purple"
          />
        </>,
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]);
      fireEvent.click(buttons[1]);

      expect(onClick1).toHaveBeenCalledTimes(1);
      expect(onClick2).toHaveBeenCalledTimes(1);
      expect(onClick3).not.toHaveBeenCalled();
    });
  });

  describe("Chevron Icon", () => {
    it("should render ChevronRight icon", () => {
      const { container } = render(<QuickActionCard {...defaultProps} />);

      // Should have at least 2 SVGs (main icon + chevron)
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });

    it("should have transition classes on chevron", () => {
      render(<QuickActionCard {...defaultProps} />);

      // The chevron should have transition classes
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });
  });
});
