import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SystemHealthSummary from "../../components/Dashboard/SystemHealthSummary";

describe("SystemHealthSummary", () => {
  it("renders system health title", () => {
    render(<SystemHealthSummary />);
    expect(screen.getByText("System Health")).toBeInTheDocument();
  });

  it("displays health score", () => {
    const { container } = render(<SystemHealthSummary />);
    const healthScore = container.querySelector(".text-3xl");
    expect(healthScore).toBeInTheDocument();
    expect(healthScore.textContent).toMatch(/\d+%/);
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
