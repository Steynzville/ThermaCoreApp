import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import UnitDetails from "./UnitDetails";
import * as unitService from "../services/unitService";

// 1. Explicit service mock using spyOn
vi.mock("../services/unitService", () => ({
  getUnitById: vi.fn(),
  getUnitDetails: vi.fn(),
  getUnitAlerts: vi.fn(),
}));

describe("UnitDetails", () => {
  const mockUnit = { id: "1", name: "Unit 1", status: "Operational", location: "Building A" };
  const mockDetails = {
    installDate: "2023-01-15",
    lastMaintenance: "2024-10-01",
    alerts: [{ id: 1, severity: "Warning", description: "Temperature high", timestamp: "2024-10-23T10:00:00Z" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    unitService.getUnitById.mockResolvedValue(mockUnit);
    unitService.getUnitDetails.mockResolvedValue(mockDetails);
    unitService.getUnitAlerts.mockResolvedValue(mockDetails.alerts);
  });

  // Use explicit React.createElement for stable component mounting
  const renderUnitDetails = (id = "1", initialEntries = [`/units/${id}`]) => {
    return render(
      React.createElement(MemoryRouter, { initialEntries },
        React.createElement(Routes, null,
          React.createElement(Route, { path: "/units/:id", element: React.createElement(UnitDetails) })
        )
      )
    );
  };

  it("should render loading state initially", () => {
    renderUnitDetails();
    expect(screen.getByText("Loading unit details...")).toBeInTheDocument();
  });

  it("should render unit details after loading", async () => {
    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Unit: Unit 1")).toBeInTheDocument();
    });
  });

  // ... (Keep other tests, ensuring all render calls use renderUnitDetails())

  it("should handle alerts tab loading state", async () => {
    let resolveAlerts;
    unitService.getUnitAlerts.mockReturnValue(new Promise((res) => { resolveAlerts = res; }));

    renderUnitDetails();
    await waitFor(() => { expect(screen.getByText("Unit: Unit 1")).toBeInTheDocument(); });

    fireEvent.click(screen.getByText("Alerts"));
    expect(screen.getByText("Loading alerts...")).toBeInTheDocument();

    resolveAlerts(mockDetails.alerts);
    await waitFor(() => { expect(screen.getByText("Alert History")).toBeInTheDocument(); });
  });

  // ... rest of your tests
});
