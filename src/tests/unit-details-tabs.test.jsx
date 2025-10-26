/**
 * Tests for Unit Details Tab Components
 *
 * Tests rendering and basic functionality of unit detail tab components.
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import UnitHistoryTab from "../components/unit-details/UnitHistoryTab";
import UnitStatusHeader from "../components/unit-details/UnitStatusHeader";

// Mock VitalSignGraph component
vi.mock("../components/VitalSignGraph", () => ({
  default: () => <div data-testid="vital-sign-graph">Graph</div>,
}));

describe("UnitHistoryTab Component", () => {
  const mockUnit = {
    id: 1,
    name: "Test Unit",
    history: [],
  };

  it("should render without crashing", () => {
    const { container } = render(<UnitHistoryTab unit={mockUnit} />);
    expect(container).toBeTruthy();
  });
});

describe("UnitStatusHeader Component", () => {
  const mockUnit = {
    id: 1,
    name: "Test Unit",
    status: "running",
    serialNumber: "SN-12345",
    location: "Test Location",
  };

  const mockGetStatusColor = vi.fn((status) => {
    const colors = {
      online: "bg-green-100 text-green-800",
      running: "bg-green-100 text-green-800",
      offline: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  });

  it("should render without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <UnitStatusHeader unit={mockUnit} getStatusColor={mockGetStatusColor} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
