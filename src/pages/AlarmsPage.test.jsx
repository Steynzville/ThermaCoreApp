import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import AlarmsPage from "./AlarmsPage";

// Mock the AlarmsView component using a standard React factory
vi.mock("../components/AlarmsView", () => ({
  default: () => React.createElement("div", { "data-testid": "alarms-view" }, "Alarms View"),
}));

describe("AlarmsPage", () => {
  it("should render AlarmsView component", () => {
    render(React.createElement(AlarmsPage));
    expect(screen.getByTestId("alarms-view")).toBeInTheDocument();
  });

  it("should render without crashing", () => {
    const { container } = render(React.createElement(AlarmsPage));
    expect(container).toBeTruthy();
  });
});
