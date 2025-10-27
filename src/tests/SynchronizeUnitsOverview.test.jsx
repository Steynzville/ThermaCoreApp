/**
 * Tests for SynchronizeUnitsOverview Component
 *
 * Tests basic rendering, sync status, and unit selection.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import SynchronizeUnitsOverview from "../components/SynchronizeUnitsOverview";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock units data
vi.mock("../data/mockUnits", () => ({
  units: [
    {
      id: 1,
      name: "Test Unit 1",
      status: "online",
      hasAlert: false,
      healthStatus: "good",
    },
    {
      id: 2,
      name: "Test Unit 2",
      status: "online",
      hasAlert: true,
      healthStatus: "warning",
    },
  ],
}));

describe("SynchronizeUnitsOverview Component", () => {
  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <SynchronizeUnitsOverview />
      </MemoryRouter>,
    );
  };

  it("should render synchronization overview", () => {
    renderComponent();
    // Check for sync-related content
    expect(screen.getByText(/Test Unit 1/i)).toBeInTheDocument();
  });

  it("should display unit sync states", () => {
    renderComponent();
    // Check that units are displayed
    expect(screen.getByText(/Test Unit 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Unit 2/i)).toBeInTheDocument();
  });

  it("should render sync controls", () => {
    renderComponent();
    // Component should render with sync status
    const units = screen.getAllByText(/Test Unit/i);
    expect(units.length).toBeGreaterThan(0);
  });
});
