import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AlertsPage from "./AlertsPage";

// Mock the AlertsView component
vi.mock("../components/AlertsView", () => ({
  default: () => <div data-testid="alerts-view">Alerts View</div>,
}));

describe("AlertsPage", () => {
  it("should render AlertsView component", () => {
    render(<AlertsPage />);
    expect(screen.getByTestId("alerts-view")).toBeInTheDocument();
  });

  it("should render without crashing", () => {
    const { container } = render(<AlertsPage />);
    expect(container).toBeTruthy();
  });
});
