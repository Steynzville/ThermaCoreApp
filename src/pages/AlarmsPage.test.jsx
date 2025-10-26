import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AlarmsPage from "./AlarmsPage";

// Mock the AlarmsView component
vi.mock("../components/AlarmsView", () => ({
  default: () => <div data-testid="alarms-view">Alarms View</div>,
}));

describe("AlarmsPage", () => {
  it("should render AlarmsView component", () => {
    render(<AlarmsPage />);
    expect(screen.getByTestId("alarms-view")).toBeInTheDocument();
  });

  it("should render without crashing", () => {
    const { container } = render(<AlarmsPage />);
    expect(container).toBeTruthy();
  });
});
