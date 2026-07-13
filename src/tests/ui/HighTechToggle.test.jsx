import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import HighTechToggle from "../../components/ui/HighTechToggle";

describe("HighTechToggle", () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly with default overview mode", () => {
    render(<HighTechToggle isPerformance={false} onToggle={mockOnToggle} />);

    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analytics" })).toBeInTheDocument();
  });

  it("renders correctly with performance mode active", () => {
    render(<HighTechToggle isPerformance={true} onToggle={mockOnToggle} />);

    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analytics" })).toBeInTheDocument();
  });

  it("calls onToggle with 'operator' when Overview is clicked", async () => {
    const user = userEvent.setup();
    render(<HighTechToggle isPerformance={true} onToggle={mockOnToggle} />);

    const overviewButton = screen.getByRole("button", { name: "Overview" });
    await user.click(overviewButton);

    expect(mockOnToggle).toHaveBeenCalledWith("operator");
  });

  it("calls onToggle with 'performance' when Analytics is clicked", async () => {
    const user = userEvent.setup();
    render(<HighTechToggle isPerformance={false} onToggle={mockOnToggle} />);

    const analyticsButton = screen.getByRole("button", { name: "Analytics" });
    await user.click(analyticsButton);

    expect(mockOnToggle).toHaveBeenCalledWith("performance");
  });

  it("calls onToggle with fireEvent", () => {
    render(<HighTechToggle isPerformance={false} onToggle={mockOnToggle} />);

    const analyticsButton = screen.getByRole("button", { name: "Analytics" });
    fireEvent.click(analyticsButton);

    expect(mockOnToggle).toHaveBeenCalledWith("performance");
  });

  it("applies the custom className when provided", () => {
    const { container } = render(
      <HighTechToggle 
        isPerformance={false} 
        onToggle={mockOnToggle} 
        className="custom-class-123" 
      />
    );

    expect(container.firstChild).toHaveClass("custom-class-123");
  });

  it("renders without className prop", () => {
    const { container } = render(
      <HighTechToggle isPerformance={false} onToggle={mockOnToggle} />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it("has the correct styling when Overview is active", () => {
    render(<HighTechToggle isPerformance={false} onToggle={mockOnToggle} />);

    const overviewButton = screen.getByRole("button", { name: "Overview" });
    const analyticsButton = screen.getByRole("button", { name: "Analytics" });

    // Overview should be active (darker text)
    expect(overviewButton).toHaveClass("text-gray-900", "dark:text-gray-100");
    expect(analyticsButton).toHaveClass("text-gray-500", "dark:text-gray-400");
  });

  it("has the correct styling when Analytics is active", () => {
    render(<HighTechToggle isPerformance={true} onToggle={mockOnToggle} />);

    const overviewButton = screen.getByRole("button", { name: "Overview" });
    const analyticsButton = screen.getByRole("button", { name: "Analytics" });

    // Analytics should be active
    expect(analyticsButton).toHaveClass("text-gray-900", "dark:text-gray-100");
    expect(overviewButton).toHaveClass("text-gray-500", "dark:text-gray-400");
  });

  it("has sliding indicator positioned correctly for Overview mode", () => {
    const { container } = render(
      <HighTechToggle isPerformance={false} onToggle={mockOnToggle} />
    );

    const slider = container.querySelector(".absolute.top-1.bottom-1.w-24");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveClass("left-1");
    expect(slider).not.toHaveClass("left-[calc(50%+0.125rem)]");
  });

  it("has sliding indicator positioned correctly for Analytics mode", () => {
    const { container } = render(
      <HighTechToggle isPerformance={true} onToggle={mockOnToggle} />
    );

    const slider = container.querySelector(".absolute.top-1.bottom-1.w-24");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveClass("left-[calc(50%+0.125rem)]");
    expect(slider).not.toHaveClass("left-1");
  });

  it("has correct dark mode classes on container", () => {
    const { container } = render(
      <HighTechToggle isPerformance={false} onToggle={mockOnToggle} />
    );

    const toggleContainer = container.querySelector(".bg-white.dark\\:bg-gray-900");
    expect(toggleContainer).toBeInTheDocument();
  });

  it("has border styling for toggle container", () => {
    const { container } = render(
      <HighTechToggle isPerformance={false} onToggle={mockOnToggle} />
    );

    const toggleContainer = container.querySelector(".border-2.border-blue-900.dark\\:border-yellow-600");
    expect(toggleContainer).toBeInTheDocument();
  });

  it("has shadow glow effects", () => {
    const { container } = render(
      <HighTechToggle isPerformance={false} onToggle={mockOnToggle} />
    );

    // Check for shadow classes using classList instead of selector
    const toggleContainer = container.querySelector(".relative.bg-white.dark\\:bg-gray-900");
    expect(toggleContainer).toBeInTheDocument();
    
    // Check that it has shadow classes - use a more reliable approach
    const hasShadowClass = toggleContainer.className.includes("shadow-[0_0_20px_rgba(30,58,138,0.8)]") ||
                          toggleContainer.className.includes("shadow-\\[0_0_20px_rgba(30,58,138,0.8)\\]");
    expect(hasShadowClass).toBe(true);
  });

  it("renders with correct button text", () => {
    render(<HighTechToggle isPerformance={false} onToggle={mockOnToggle} />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("has hover states on buttons", () => {
    render(<HighTechToggle isPerformance={false} onToggle={mockOnToggle} />);

    const analyticsButton = screen.getByRole("button", { name: "Analytics" });
    expect(analyticsButton).toHaveClass("hover:text-gray-700", "dark:hover:text-gray-300");
  });

  it("renders accent line at bottom", () => {
    const { container } = render(
      <HighTechToggle isPerformance={false} onToggle={mockOnToggle} />
    );

    const accentLine = container.querySelector(".absolute.bottom-0.left-1\\/2");
    expect(accentLine).toBeInTheDocument();
    expect(accentLine).toHaveClass("bg-gradient-to-r", "from-transparent", "via-blue-400", "to-transparent");
  });
});
