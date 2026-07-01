import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react"; 
import AlertsPage from "./AlertsPage";

// Mock the AlertsView component using plain JS factories to prevent hoisting/runtime compiler locks
vi.mock("../components/AlertsView", () => ({
  default: () => React.createElement("div", { "data-testid": "alerts-view" }, "Alerts View"),
}));

describe("AlertsPage", () => {
  it("should render AlertsView component", () => {
    render(React.createElement(AlertsPage));
    expect(screen.getByTestId("alerts-view")).toBeInTheDocument();
  });

  it("should render without crashing", () => {
    const { container } = render(React.createElement(AlertsPage));
    expect(container).toBeTruthy();
  });
});
