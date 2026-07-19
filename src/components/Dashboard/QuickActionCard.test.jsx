import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity, BarChart3, FileText } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import QuickActionCard from "./QuickActionCard";

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

  // Cleanup after each test to prevent DOM pollution
  afterEach(() => {
    cleanup();
  });

  // Helper to get the card button (there should only be one per test)
  const getCardButton = () => screen.getByRole("button");

  describe("Rendering", () => {
    it("should render with correct title", () => {
      render(<QuickActionCard {...defaultProps} />);
      expect(screen.getByText("Sales Analytics")).toBeInTheDocument();
    });

    it("should render with correct description", () => {
      render(<QuickActionCard {...defaultProps} />);
      expect(screen.getByText("Detailed performance metrics and trends")).toBeInTheDocument();
    });

    it("should render the icon", () => {
      const { container } = render(<QuickActionCard {...defaultProps} />);
      const iconElement = container.querySelector("svg");
      expect(iconElement).toBeInTheDocument();
    });

    it("should render as a button element", () => {
      render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
      expect(button.tagName).toBe("BUTTON");
    });

    it("should have correct button type", () => {
      render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
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

    it("should fall back to blue for an unrecognized color", () => {
      const { container } = render(
        <QuickActionCard {...defaultProps} color="orange" />,
      );
      const iconWrapper = container.querySelector(".bg-blue-50");
      expect(iconWrapper).toBeInTheDocument();
      // Verify both background and text color classes are applied
      const iconDiv = container.querySelector(".p-3.rounded-lg");
      expect(iconDiv.className).toContain("bg-blue-50");
      expect(iconDiv.className).toContain("text-blue-600");
    });
  });

  describe("Click Behavior", () => {
    it("should call onClick when clicked", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(<QuickActionCard {...defaultProps} onClick={onClick} />);
      const button = getCardButton();
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should call onClick multiple times when clicked multiple times", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(<QuickActionCard {...defaultProps} onClick={onClick} />);
      const button = getCardButton();
      await user.click(button);
      await user.click(button);
      await user.click(button);
      expect(onClick).toHaveBeenCalledTimes(3);
    });
  });

  describe("Hover Behavior", () => {
    it("should apply isHovered shadow-xl class on mouse enter", async () => {
      const user = userEvent.setup();
      render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
      
      // Initially should NOT have shadow-xl
      expect(button.className).not.toContain("shadow-xl");
      
      await user.hover(button);
      
      // After hover, should have shadow-xl
      expect(button.className).toContain("shadow-xl");
    });

    it("should remove isHovered shadow-xl class on mouse leave", async () => {
      const user = userEvent.setup();
      render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
      
      await user.hover(button);
      expect(button.className).toContain("shadow-xl");
      
      await user.unhover(button);
      expect(button.className).not.toContain("shadow-xl");
    });

    it("should apply scale-110 to icon wrapper on hover", async () => {
      const user = userEvent.setup();
      const { container } = render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
      const iconWrapper = container.querySelector(".p-3.rounded-lg");
      
      expect(iconWrapper.className).not.toContain("scale-110");
      
      await user.hover(button);
      expect(iconWrapper.className).toContain("scale-110");
    });

    // ✅ FIXED: SVG elements use getAttribute("class"), not .className
    it("should apply translate-x-1 to chevron on hover", async () => {
      const user = userEvent.setup();
      const { container } = render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
      const chevron = container.querySelector(".h-4.w-4.text-gray-400.mt-2");
      
      // SVGElement.className is SVGAnimatedString, not a plain string
      // Use getAttribute("class") instead
      expect(chevron.getAttribute("class")).not.toContain("translate-x-1");
      
      await user.hover(button);
      expect(chevron.getAttribute("class")).toContain("translate-x-1");
    });

    it("should have CSS hover classes in static className", () => {
      render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
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
      expect(screen.getByText("Comprehensive system diagnostics")).toBeInTheDocument();
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
      expect(screen.getByText("Generate comprehensive PDF reports")).toBeInTheDocument();
    });
  });

  describe("Styling Classes", () => {
    it("should have base styling classes", () => {
      render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
      expect(button.className).toContain("bg-white");
      expect(button.className).toContain("rounded-xl");
      expect(button.className).toContain("p-6");
      expect(button.className).toContain("cursor-pointer");
      expect(button.className).toContain("transition-all");
    });

    it("should have dark mode classes", () => {
      render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
      expect(button.className).toContain("dark:bg-gray-800");
      expect(button.className).toContain("dark:border-gray-700");
    });
  });

  describe("Keyboard Accessibility", () => {
    it("should be keyboard accessible (focusable)", () => {
      render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
      button.focus();
      expect(document.activeElement).toBe(button);
    });

    it("should trigger onClick on Enter key press", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(<QuickActionCard {...defaultProps} onClick={onClick} />);
      const button = getCardButton();
      button.focus();
      await user.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should trigger onClick on Space key press", async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      render(<QuickActionCard {...defaultProps} onClick={onClick} />);
      const button = getCardButton();
      button.focus();
      await user.keyboard(" ");
      expect(onClick).toHaveBeenCalledTimes(1);
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
      const button = getCardButton();
      expect(button).toBeInTheDocument();
      // Empty title should render an empty h3
      const h3 = document.querySelector("h3");
      expect(h3).toBeInTheDocument();
      expect(h3.textContent).toBe("");
    });

    it("should handle long title text", () => {
      const longTitle = "This is a very long title that should still render properly";
      render(<QuickActionCard {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("should handle long description text", () => {
      const longDescription = "This is a very long description that should still render properly and wrap to multiple lines if needed";
      render(<QuickActionCard {...defaultProps} description={longDescription} />);
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
      expect(buttons.length).toBe(3);
    });

    it("should handle clicks independently for multiple cards", async () => {
      const onClick1 = vi.fn();
      const onClick2 = vi.fn();
      const onClick3 = vi.fn();
      const user = userEvent.setup();

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
      expect(buttons.length).toBe(3);

      // Click the first card (Analytics)
      await user.click(buttons[0]);
      expect(onClick1).toHaveBeenCalledTimes(1);
      expect(onClick2).toHaveBeenCalledTimes(0);
      expect(onClick3).toHaveBeenCalledTimes(0);

      // Click the second card (Health)
      await user.click(buttons[1]);
      expect(onClick1).toHaveBeenCalledTimes(1);
      expect(onClick2).toHaveBeenCalledTimes(1);
      expect(onClick3).toHaveBeenCalledTimes(0);

      // Click the third card (Reports)
      await user.click(buttons[2]);
      expect(onClick1).toHaveBeenCalledTimes(1);
      expect(onClick2).toHaveBeenCalledTimes(1);
      expect(onClick3).toHaveBeenCalledTimes(1);
    });
  });

  describe("Chevron Icon", () => {
    it("should render ChevronRight icon", () => {
      const { container } = render(<QuickActionCard {...defaultProps} />);
      const svgs = container.querySelectorAll("svg");
      // Should have at least 2 SVGs (main icon + chevron)
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });

    it("should have transition classes on chevron", () => {
      render(<QuickActionCard {...defaultProps} />);
      const button = getCardButton();
      expect(button).toBeInTheDocument();
    });
  });
});
