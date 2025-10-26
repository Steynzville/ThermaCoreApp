/**
 * Tests for UnitVitals Component
 *
 * Tests basic rendering and unit vital information display.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnitVitals from "../components/unit-details/UnitVitals";
import { SettingsProvider } from "../context/SettingsContext";
import { UnitProvider } from "../context/UnitContext";

const mockUnit = {
  id: 1,
  name: "Test Unit",
  location: "Test Location",
  status: "running",
  temperature: 25,
  pressure: 100,
  flowRate: 50,
  batteryLife: 85,
  gpsCoordinates: "40.7128° N, 74.0060° W",
};

describe("UnitVitals Component", () => {
  const renderComponent = (unit = mockUnit) => {
    return render(
      <SettingsProvider>
        <UnitProvider>
          <UnitVitals unit={unit} />
        </UnitProvider>
      </SettingsProvider>,
    );
  };

  it("should render without crashing", () => {
    const { container } = renderComponent();
    expect(container).toBeTruthy();
  });

  it("should display unit name", () => {
    renderComponent();
    expect(screen.getByText("Test Unit")).toBeInTheDocument();
  });

  it("should display unit location", () => {
    renderComponent();
    expect(screen.getByText("Test Location")).toBeInTheDocument();
  });
});
