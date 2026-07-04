import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import EnhancedMetricCard from "../components/EnhancedMetricCard";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  TrendingUp: ({ className }) => <svg data-testid="trending-up" className={className} />,
  TrendingDown: ({ className }) => <svg data-testid="trending-down" className={className} />,
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className, onClick }) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }) => <div data-testid="tooltip-provider">{children}</div>,
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children, asChild }) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children, side, className }) => (
    <div data-testid="tooltip-content" data-side={side} className={className}>
      {children}
    </div>
  ),
}));

import { useNavigate } from "react-router-dom";

describe("EnhancedMetricCard", () => {
  const mockNavigate = vi.fn();
  const mockIcon = () => <svg data-testid="mock-icon" />;

  beforeEach(() => {
    vi.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
  });

  const renderWithRouter = (component) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
  };

  describe("basic rendering", () => {
    it("renders the card with title and value", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Total Units" 
          icon={mockIcon} 
          value="42" 
        />
      );

      expect(screen.getByText("Total Units")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
    });

    it("renders with subValue", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Total Units" 
          icon={mockIcon} 
          value="42" 
          subValue="+12% from last month"
        />
      );

      expect(screen.getByText("+12% from last month")).toBeInTheDocument();
    });

    it("renders with loading state", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Total Units" 
          icon={mockIcon} 
          value="42" 
          loading={true}
        />
      );

      // Should show loading skeleton
      const loadingContainer = document.querySelector('.animate-pulse');
      expect(loadingContainer).toBeInTheDocument();
      
      // Should have the value skeleton (h-8)
      const valueSkeleton = loadingContainer?.querySelector('.h-8');
      expect(valueSkeleton).toBeInTheDocument();
      
      // Should have the subValue skeleton (h-4)
      const subValueSkeleton = loadingContainer?.querySelector('.h-4');
      expect(subValueSkeleton).toBeInTheDocument();
      
      // Should not show the actual value
      expect(screen.queryByText("42")).not.toBeInTheDocument();
    });
  });

  describe("trend indicators", () => {
    it("shows trending up icon when trend is 'up'", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Revenue" 
          icon={mockIcon} 
          value="$1.2M" 
          trend="up"
        />
      );

      const trendIcon = screen.getByTestId("trending-up");
      expect(trendIcon).toBeInTheDocument();
      expect(trendIcon).toHaveClass("text-green-600");
    });

    it("shows trending down icon when trend is 'down'", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Costs" 
          icon={mockIcon} 
          value="$800K" 
          trend="down"
        />
      );

      const trendIcon = screen.getByTestId("trending-down");
      expect(trendIcon).toBeInTheDocument();
      expect(trendIcon).toHaveClass("text-destructive");
    });

    it("does not show trend icon when trend is not provided", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Units" 
          icon={mockIcon} 
          value="42" 
        />
      );

      expect(screen.queryByTestId("trending-up")).not.toBeInTheDocument();
      expect(screen.queryByTestId("trending-down")).not.toBeInTheDocument();
    });
  });

  describe("variant styles", () => {
    it("applies success variant styles", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Success" 
          icon={mockIcon} 
          value="100" 
          variant="success"
        />
      );

      const card = screen.getByTestId("card");
      expect(card).toHaveClass("border-green-500");
    });

    it("applies warning variant styles", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Warning" 
          icon={mockIcon} 
          value="50" 
          variant="warning"
        />
      );

      const card = screen.getByTestId("card");
      expect(card).toHaveClass("border-yellow-500");
    });

    it("applies error variant styles", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Error" 
          icon={mockIcon} 
          value="10" 
          variant="error"
        />
      );

      const card = screen.getByTestId("card");
      expect(card).toHaveClass("border-destructive");
    });

    it("applies default variant when not specified", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Default" 
          icon={mockIcon} 
          value="75" 
        />
      );

      const card = screen.getByTestId("card");
      // Should not have specific variant classes
      expect(card).not.toHaveClass("border-green-500");
      expect(card).not.toHaveClass("border-yellow-500");
      expect(card).not.toHaveClass("border-destructive");
    });
  });

  describe("clickable behavior", () => {
    it("makes card clickable when clickable prop is true", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Clickable" 
          icon={mockIcon} 
          value="42" 
          clickable={true}
        />
      );

      const card = screen.getByTestId("card");
      expect(card).toHaveClass("cursor-pointer");
      expect(card).toHaveClass("hover:shadow-lg");
      expect(card).toHaveClass("hover:scale-[1.02]");
      expect(card).toHaveClass("hover:border-primary");
      
      // Should show "Click for details" text
      expect(screen.getByText("Click for details →")).toBeInTheDocument();
    });

    it("navigates to drillDownPath when clicked", async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <EnhancedMetricCard 
          title="Navigate" 
          icon={mockIcon} 
          value="42" 
          clickable={true}
          drillDownPath="/details"
        />
      );

      const card = screen.getByTestId("card");
      await user.click(card);

      expect(mockNavigate).toHaveBeenCalledWith("/details");
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it("calls onClick handler when provided", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      renderWithRouter(
        <EnhancedMetricCard 
          title="Click Handler" 
          icon={mockIcon} 
          value="42" 
          clickable={true}
          onClick={handleClick}
          drillDownPath="/details" // Should be ignored when onClick is provided
        />
      );

      const card = screen.getByTestId("card");
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("does not navigate when clickable is false", async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <EnhancedMetricCard 
          title="Not Clickable" 
          icon={mockIcon} 
          value="42" 
          clickable={false}
          drillDownPath="/details"
        />
      );

      const card = screen.getByTestId("card");
      await user.click(card);

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(screen.queryByText("Click for details →")).not.toBeInTheDocument();
    });
  });

  describe("tooltip functionality", () => {
    it("wraps card in tooltip when tooltipContent is provided", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="With Tooltip" 
          icon={mockIcon} 
          value="42" 
          tooltipContent="This is a tooltip"
        />
      );

      expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument();
      expect(screen.getByTestId("tooltip-content")).toBeInTheDocument();
      expect(screen.getByText("This is a tooltip")).toBeInTheDocument();
    });

    it("does not wrap card in tooltip when tooltipContent is not provided", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="No Tooltip" 
          icon={mockIcon} 
          value="42" 
        />
      );

      expect(screen.queryByTestId("tooltip-provider")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tooltip")).not.toBeInTheDocument();
    });

    it("applies correct tooltip classes and side", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Tooltip Props" 
          icon={mockIcon} 
          value="42" 
          tooltipContent="Tooltip content"
        />
      );

      const tooltipContent = screen.getByTestId("tooltip-content");
      expect(tooltipContent).toHaveAttribute("data-side", "top");
      expect(tooltipContent).toHaveClass("max-w-xs");
    });
  });

  describe("accessibility", () => {
    it("truncates long titles", () => {
      const longTitle = "This is a very long title that should be truncated";
      
      renderWithRouter(
        <EnhancedMetricCard 
          title={longTitle} 
          icon={mockIcon} 
          value="42" 
        />
      );

      const title = screen.getByTestId("card-title");
      expect(title).toHaveClass("truncate");
    });

    it("renders with proper heading level for title", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Accessible Title" 
          icon={mockIcon} 
          value="42" 
        />
      );

      const title = screen.getByTestId("card-title");
      expect(title.tagName).toBe("H3");
    });
  });

  describe("edge cases", () => {
    it("handles undefined value gracefully", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="No Value" 
          icon={mockIcon} 
          value={undefined} 
        />
      );

      // Should render empty value
      expect(screen.getByTestId("card-content")).toBeInTheDocument();
    });

    it("handles null trend gracefully", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Null Trend" 
          icon={mockIcon} 
          value="42" 
          trend={null}
        />
      );

      expect(screen.queryByTestId("trending-up")).not.toBeInTheDocument();
      expect(screen.queryByTestId("trending-down")).not.toBeInTheDocument();
    });

    it("handles empty subValue gracefully", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Empty SubValue" 
          icon={mockIcon} 
          value="42" 
          subValue=""
        />
      );

      // Should not render subValue paragraph
      const content = screen.getByTestId("card-content");
      expect(content).toBeInTheDocument();
    });

    it("prioritizes onClick over drillDownPath", async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      renderWithRouter(
        <EnhancedMetricCard 
          title="Priority Test" 
          icon={mockIcon} 
          value="42" 
          clickable={true}
          onClick={handleClick}
          drillDownPath="/details"
        />
      );

      const card = screen.getByTestId("card");
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("handles click when clickable is true but no onClick or drillDownPath", async () => {
      const user = userEvent.setup();
      
      renderWithRouter(
        <EnhancedMetricCard 
          title="Clickable No Action" 
          icon={mockIcon} 
          value="42" 
          clickable={true}
        />
      );

      const card = screen.getByTestId("card");
      await user.click(card);

      // Should not navigate or call onClick, but should not error
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("shows loading skeletons with correct structure", () => {
      renderWithRouter(
        <EnhancedMetricCard 
          title="Loading" 
          icon={mockIcon} 
          value="42" 
          loading={true}
        />
      );

      // Should show one loading container with animate-pulse
      const loadingContainer = document.querySelector('.animate-pulse');
      expect(loadingContainer).toBeInTheDocument();
      
      // Should have the value skeleton (h-8)
      const valueSkeleton = loadingContainer?.querySelector('.h-8');
      expect(valueSkeleton).toBeInTheDocument();
      
      // Should have the subValue skeleton (h-4)
      const subValueSkeleton = loadingContainer?.querySelector('.h-4');
      expect(subValueSkeleton).toBeInTheDocument();
      
      // Both skeletons should be inside the same container
      expect(loadingContainer?.children.length).toBe(2);
    });
  });
});
