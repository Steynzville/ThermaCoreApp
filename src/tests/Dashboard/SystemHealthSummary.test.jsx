import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SystemHealthSummary from "../../components/Dashboard/SystemHealthSummary";

describe("SystemHealthSummary", () => {
  it("renders system health title", () => {
    render(<SystemHealthSummary />);
    expect(screen.getByText("System Health")).toBeInTheDocument();
  });

  it("displays health score percentage", () => {
    render(<SystemHealthSummary />);
    const healthScore = screen.getByText(/\d+%/);
    expect(healthScore).toBeInTheDocument();
  });

  it("shows online units count", () => {
    render(<SystemHealthSummary />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("shows alerts count", () => {
    render(<SystemHealthSummary />);
    expect(screen.getByText("Alerts")).toBeInTheDocument();
  });

  it("shows offline units count", () => {
    render(<SystemHealthSummary />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });
});
