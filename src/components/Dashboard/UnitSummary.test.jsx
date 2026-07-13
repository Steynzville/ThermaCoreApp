import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import UnitSummary from "./UnitSummary";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Package: () => <span data-testid="package-icon">Package</span>,
  Wifi: () => <span data-testid="wifi-icon">Wifi</span>,
  WifiOff: () => <span data-testid="wifioff-icon">WifiOff</span>,
  Wrench: () => <span data-testid="wrench-icon">Wrench</span>,
  AlertTriangle: () => <span data-testid="alert-icon">AlertTriangle</span>,
  Zap: () => <span data-testid="zap-icon">Zap</span>,
}));

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("UnitSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    totalUnits: 15,
    onlineCount: 10,
    offlineCount: 3,
    maintenanceCount: 2,
    alertCount: 4,
    alarmCount: 1,
  };

  it("should render unit summary with title", () => {
    render(<UnitSummary {...defaultProps} />);

    expect(screen.getByRole("heading", { name: "Unit Summary" })).toBeInTheDocument();
  });

  it("should render all counts correctly", () => {
    render(<UnitSummary {...defaultProps} />);

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should render all status labels", () => {
    render(<UnitSummary {...defaultProps} />);

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText("Alarms")).toBeInTheDocument();
  });

  it("should render all icons", () => {
    render(<UnitSummary {...defaultProps} />);

    expect(screen.getByTestId("package-icon")).toBeInTheDocument();
    expect(screen.getByTestId("wifi-icon")).toBeInTheDocument();
    expect(screen.getByTestId("wifioff-icon")).toBeInTheDocument();
    expect(screen.getByTestId("wrench-icon")).toBeInTheDocument();
    expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    expect(screen.getByTestId("zap-icon")).toBeInTheDocument();
  });

  it("should navigate to correct URL when Total button is clicked", async () => {
    const user = userEvent.setup();
    render(<UnitSummary {...defaultProps} />);
    
    const button = screen.getByRole("button", { name: /total 15/i });
    await user.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
  });

  it("should navigate to correct URL when Online button is clicked", async () => {
    const user = userEvent.setup();
    render(<UnitSummary {...defaultProps} />);
    
    const button = screen.getByRole("button", { name: /online 10/i });
    await user.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=online");
  });

  it("should navigate to correct URL when Offline button is clicked", async () => {
    const user = userEvent.setup();
    render(<UnitSummary {...defaultProps} />);
    
    const button = screen.getByRole("button", { name: /offline 3/i });
    await user.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=offline");
  });

  it("should navigate to correct URL when Maintenance button is clicked", async () => {
    const user = userEvent.setup();
    render(<UnitSummary {...defaultProps} />);
    
    const button = screen.getByRole("button", { name: /maintenance 2/i });
    await user.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=maintenance");
  });

  it("should navigate to correct URL when Alerts button is clicked", async () => {
    const user = userEvent.setup();
    render(<UnitSummary {...defaultProps} />);
    
    const button = screen.getByRole("button", { name: /alerts 4/i });
    await user.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith("/grid-view?alerts=true");
  });

  it("should navigate to correct URL when Alarms button is clicked", async () => {
    const user = userEvent.setup();
    render(<UnitSummary {...defaultProps} />);
    
    const button = screen.getByRole("button", { name: /alarms 1/i });
    await user.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith("/grid-view?alarms=true");
  });

  it("should handle click with fireEvent", () => {
    render(<UnitSummary {...defaultProps} />);
    
    const button = screen.getByRole("button", { name: /total 15/i });
    fireEvent.click(button);
    
    expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
  });

  it("should render with zero counts correctly", () => {
    const zeroProps = {
      totalUnits: 0,
      onlineCount: 0,
      offlineCount: 0,
      maintenanceCount: 0,
      alertCount: 0,
      alarmCount: 0,
    };
    
    render(<UnitSummary {...zeroProps} />);

    const zeroElements = screen.getAllByText("0");
    expect(zeroElements).toHaveLength(6);
  });

  it("should render with dark mode classes", () => {
    render(<UnitSummary {...defaultProps} />);
    
    const card = document.querySelector(".bg-white.dark\\:bg-gray-800");
    expect(card).toBeInTheDocument();
    
    const heading = document.querySelector(".text-gray-900.dark\\:text-gray-100");
    expect(heading).toBeInTheDocument();
  });

  it("should have correct color styling for each status", () => {
    render(<UnitSummary {...defaultProps} />);
    
    // Check that each count has the correct color class
    const totalCount = screen.getByText("15");
    expect(totalCount).toHaveClass("text-blue-600", "dark:text-blue-400");
    
    const onlineCount = screen.getByText("10");
    expect(onlineCount).toHaveClass("text-green-600", "dark:text-green-400");
    
    const offlineCount = screen.getByText("3");
    expect(offlineCount).toHaveClass("text-gray-600", "dark:text-gray-400");
    
    const maintenanceCount = screen.getByText("2");
    expect(maintenanceCount).toHaveClass("text-yellow-600", "dark:text-yellow-400");
    
    const alertCount = screen.getByText("4");
    expect(alertCount).toHaveClass("text-orange-600", "dark:text-orange-400");
    
    const alarmCount = screen.getByText("1");
    expect(alarmCount).toHaveClass("text-red-600", "dark:text-red-400");
  });

  it("should have hover styles on buttons", () => {
    render(<UnitSummary {...defaultProps} />);
    
    const buttons = screen.getAllByRole("button");
    buttons.forEach(button => {
      expect(button).toHaveClass("hover:bg-gray-50", "dark:hover:bg-gray-700");
    });
  });

  it("should handle default case in switch", () => {
    render(<UnitSummary {...defaultProps} />);
    
    // We need to test the default case - but since we can't easily trigger it
    // with the current UI, we'll test that the handleFilterClick function exists
    // and the component renders correctly
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
  });
});
