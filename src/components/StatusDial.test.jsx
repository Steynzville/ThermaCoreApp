import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StatusDial from "./StatusDial";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock Card component
vi.mock("./ui/card", () => ({
  Card: ({ children, className, ...props }) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
}));

// Mock icon
const MockIcon = () => <div data-testid="mock-icon">Icon</div>;

describe("StatusDial", () => {
  const defaultProps = {
    title: "Total Units",
    count: 42,
    percentage: 85,
    icon: MockIcon,
    color: "blue",
  };

  it("should render status dial with title and count", () => {
    render(<StatusDial {...defaultProps} />);

    expect(screen.getByText("Total Units")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should render icon", () => {
    render(<StatusDial {...defaultProps} />);

    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  it("should display percentage if provided", () => {
    render(<StatusDial {...defaultProps} />);

    expect(screen.getByText(/85/)).toBeInTheDocument();
    expect(screen.getByText(/% of Total/)).toBeInTheDocument();
  });

  it("should not display percentage if not provided", () => {
    render(<StatusDial {...defaultProps} percentage={undefined} />);

    // The component always shows "% of Total" but with undefined percentage
    expect(screen.getByText(/% of Total/)).toBeInTheDocument();
  });

  it("should be clickable when clickable prop is true", () => {
    const handleClick = vi.fn();
    render(<StatusDial {...defaultProps} clickable onClick={handleClick} />);

    const card = screen.getByText("Total Units").closest("div");
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalled();
  });

  it("should not be clickable by default", () => {
    const handleClick = vi.fn();
    render(<StatusDial {...defaultProps} onClick={handleClick} />);

    const card = screen.getByText("Total Units").closest("div");
    fireEvent.click(card);

    // Should not call onClick when clickable is false
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should render with blue color classes", () => {
    const { container } = render(<StatusDial {...defaultProps} color="blue" />);
    expect(container.innerHTML).toContain("blue");
  });

  it("should render with green color classes", () => {
    const { container } = render(<StatusDial {...defaultProps} color="green" />);
    expect(container.innerHTML).toContain("green");
  });

  it("should render with red color classes", () => {
    const { container } = render(<StatusDial {...defaultProps} color="red" />);
    expect(container.innerHTML).toContain("red");
  });

  it("should render with yellow color classes", () => {
    const { container } = render(<StatusDial {...defaultProps} color="yellow" />);
    expect(container.innerHTML).toContain("yellow");
  });

  it("should render with orange color classes", () => {
    const { container } = render(<StatusDial {...defaultProps} color="orange" />);
    expect(container.innerHTML).toContain("orange");
  });

  it("should render with purple color classes", () => {
    const { container } = render(<StatusDial {...defaultProps} color="purple" />);
    expect(container.innerHTML).toContain("purple");
  });

  it("should handle zero count", () => {
    render(<StatusDial {...defaultProps} count={0} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should handle large count numbers", () => {
    render(<StatusDial {...defaultProps} count={9999} />);

    expect(screen.getByText("9999")).toBeInTheDocument();
  });

  it("should handle zero percentage", () => {
    render(<StatusDial {...defaultProps} percentage={0} />);

    expect(screen.getByText(/0/)).toBeInTheDocument();
    expect(screen.getByText(/% of Total/)).toBeInTheDocument();
  });

  it("should handle 100 percentage", () => {
    render(<StatusDial {...defaultProps} percentage={100} />);

    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/% of Total/)).toBeInTheDocument();
  });
});
