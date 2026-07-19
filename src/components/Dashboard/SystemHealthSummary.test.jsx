import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SystemHealthSummary, { calculateHealthMetrics } from "./SystemHealthSummary";
import { units } from "../../data/mockUnits";

describe("calculateHealthMetrics - Pure Function Tests", () => {
  it("calculates health score correctly for a mix of online/offline units", () => {
    const mockUnits = [
      { status: "online", hasAlert: false },
      { status: "online", hasAlert: true },
      { status: "offline", hasAlert: false },
      { status: "online", hasAlert: false },
      { status: "offline", hasAlert: true },
    ];

    const result = calculateHealthMetrics(mockUnits);
    
    expect(result.totalUnits).toBe(5);
    expect(result.onlineUnits).toBe(3);
    expect(result.offlineUnits).toBe(2);
    expect(result.unitsWithAlerts).toBe(2);
    expect(result.healthScore).toBe(60); // (3/5) * 100 = 60
  });

  it("returns 0 health score for empty units array", () => {
    const result = calculateHealthMetrics([]);
    
    expect(result.totalUnits).toBe(0);
    expect(result.onlineUnits).toBe(0);
    expect(result.offlineUnits).toBe(0);
    expect(result.unitsWithAlerts).toBe(0);
    expect(result.healthScore).toBe(0); // Guard prevents division by zero
  });

  it("returns 100 health score when all units are online", () => {
    const mockUnits = [
      { status: "online", hasAlert: false },
      { status: "online", hasAlert: true },
      { status: "online", hasAlert: false },
    ];

    const result = calculateHealthMetrics(mockUnits);
    
    expect(result.totalUnits).toBe(3);
    expect(result.onlineUnits).toBe(3);
    expect(result.offlineUnits).toBe(0);
    expect(result.healthScore).toBe(100);
  });

  it("returns 0 health score when all units are offline", () => {
    const mockUnits = [
      { status: "offline", hasAlert: false },
      { status: "offline", hasAlert: true },
      { status: "offline", hasAlert: false },
    ];

    const result = calculateHealthMetrics(mockUnits);
    
    expect(result.totalUnits).toBe(3);
    expect(result.onlineUnits).toBe(0);
    expect(result.offlineUnits).toBe(3);
    expect(result.healthScore).toBe(0);
  });

  it("correctly counts units with alerts regardless of status", () => {
    const mockUnits = [
      { status: "online", hasAlert: true },
      { status: "online", hasAlert: false },
      { status: "offline", hasAlert: true },
      { status: "offline", hasAlert: false },
    ];

    const result = calculateHealthMetrics(mockUnits);
    
    expect(result.totalUnits).toBe(4);
    expect(result.onlineUnits).toBe(2);
    expect(result.offlineUnits).toBe(2);
    expect(result.unitsWithAlerts).toBe(2);
    expect(result.healthScore).toBe(50);
  });

  it("handles units with missing properties gracefully", () => {
    const mockUnits = [
      { status: "online" }, // No hasAlert property
      { status: "offline", hasAlert: true },
      {}, // Missing both status and hasAlert
      { status: "online", hasAlert: false },
    ];

    const result = calculateHealthMetrics(mockUnits);
    
    expect(result.totalUnits).toBe(4);
    expect(result.onlineUnits).toBe(2); // First and last
    expect(result.offlineUnits).toBe(1); // Second one
    expect(result.unitsWithAlerts).toBe(1); // Only second has hasAlert: true
    // Third one has no status, so it's neither online nor offline
    expect(result.healthScore).toBe(50); // (2/4) * 100 = 50
  });

  it("rounds health score correctly", () => {
    const mockUnits = [
      { status: "online", hasAlert: false },
      { status: "online", hasAlert: false },
      { status: "offline", hasAlert: false },
    ];

    const result = calculateHealthMetrics(mockUnits);
    
    expect(result.totalUnits).toBe(3);
    expect(result.onlineUnits).toBe(2);
    expect(result.healthScore).toBe(67); // (2/3) * 100 = 66.66... rounded to 67
  });
});

describe("SystemHealthSummary Component", () => {
  it("renders system health title", () => {
    render(<SystemHealthSummary />);
    expect(screen.getByText("System Health")).toBeInTheDocument();
  });

  it("displays health score based on actual mock data", () => {
    const { container } = render(<SystemHealthSummary />);
    const card = container.firstChild;
    
    const totalUnits = units.length;
    const onlineUnits = units.filter((unit) => unit.status === "online").length;
    const expectedScore = totalUnits > 0 
      ? Math.round((onlineUnits / totalUnits) * 100) 
      : 0;
    
    // Scope query to the card to avoid conflicts if same number appears elsewhere
    expect(within(card).getByText(`${expectedScore}%`)).toBeInTheDocument();
  });

  it("displays online units count based on actual mock data", () => {
    const { container } = render(<SystemHealthSummary />);
    const card = container.firstChild;
    const onlineCount = units.filter((unit) => unit.status === "online").length;
    
    // Scope to the card and find the number within the Online section
    // Use a more specific query by looking for the label first, then finding the sibling number
    expect(within(card).getByText(String(onlineCount))).toBeInTheDocument();
  });

  it("displays alerts count based on actual mock data", () => {
    const { container } = render(<SystemHealthSummary />);
    const card = container.firstChild;
    const alertsCount = units.filter((unit) => unit.hasAlert).length;
    
    expect(within(card).getByText(String(alertsCount))).toBeInTheDocument();
  });

  it("displays offline units count based on actual mock data", () => {
    const { container } = render(<SystemHealthSummary />);
    const card = container.firstChild;
    const offlineCount = units.filter((unit) => unit.status === "offline").length;
    
    expect(within(card).getByText(String(offlineCount))).toBeInTheDocument();
  });

  it("displays the weekly trend indicator", () => {
    render(<SystemHealthSummary />);
    expect(screen.getByText("+2.3% this week")).toBeInTheDocument();
    const trendIcon = document.querySelector(".h-3.w-3.mr-1");
    expect(trendIcon).toBeInTheDocument();
  });

  it("shows all three metric labels", () => {
    const { container } = render(<SystemHealthSummary />);
    const card = container.firstChild;
    
    expect(within(card).getByText("Online")).toBeInTheDocument();
    expect(within(card).getByText("Alerts")).toBeInTheDocument();
    expect(within(card).getByText("Offline")).toBeInTheDocument();
  });

  it("renders the summary card with correct styling classes", () => {
    const { container } = render(<SystemHealthSummary />);
    const card = container.firstChild;
    expect(card.className).toContain("bg-gradient-to-br");
    expect(card.className).toContain("rounded-xl");
    expect(card.className).toContain("p-6");
  });

  it("displays the correct health score for the actual mock data", () => {
    const { container } = render(<SystemHealthSummary />);
    const card = container.firstChild;
    
    const totalUnits = units.length;
    const onlineUnits = units.filter((unit) => unit.status === "online").length;
    const expectedScore = totalUnits > 0 
      ? Math.round((onlineUnits / totalUnits) * 100) 
      : 0;
    
    // Scope query to the card to avoid conflicts
    expect(within(card).getByText(`${expectedScore}%`)).toBeInTheDocument();
  });

  it("calculates all metrics consistently with the actual mock data", () => {
    const { container } = render(<SystemHealthSummary />);
    const card = container.firstChild;
    
    const totalUnits = units.length;
    const onlineUnits = units.filter((unit) => unit.status === "online").length;
    const offlineUnits = units.filter((unit) => unit.status === "offline").length;
    const unitsWithAlerts = units.filter((unit) => unit.hasAlert).length;
    const expectedScore = totalUnits > 0 
      ? Math.round((onlineUnits / totalUnits) * 100) 
      : 0;
    
    // All queries scoped to the card to avoid conflicts if numbers match
    expect(within(card).getByText(String(onlineUnits))).toBeInTheDocument();
    expect(within(card).getByText(String(offlineUnits))).toBeInTheDocument();
    expect(within(card).getByText(String(unitsWithAlerts))).toBeInTheDocument();
    expect(within(card).getByText(`${expectedScore}%`)).toBeInTheDocument();
  });
});
