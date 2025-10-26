import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UnitDetails from "./UnitDetails";

// Mock the unitService
vi.mock("../services/unitService", () => ({
  getUnitById: vi.fn(),
  getUnitDetails: vi.fn(),
  getUnitAlerts: vi.fn(),
}));

import {
  getUnitAlerts,
  getUnitById,
  getUnitDetails,
} from "../services/unitService";

describe("UnitDetails", () => {
  const mockUnit = {
    id: "1",
    name: "Unit 1",
    status: "Operational",
    location: "Building A",
  };

  const mockDetails = {
    installDate: "2023-01-15",
    lastMaintenance: "2024-10-01",
    alerts: [
      {
        id: 1,
        severity: "Warning",
        description: "Temperature high",
        timestamp: "2024-10-23T10:00:00Z",
      },
      {
        id: 2,
        severity: "Info",
        description: "Routine check",
        timestamp: "2024-10-22T10:00:00Z",
      },
    ],
  };

  const mockAlerts = [
    {
      id: 1,
      severity: "Warning",
      description: "Temperature high",
      timestamp: "2024-10-23T10:00:00Z",
    },
    {
      id: 2,
      severity: "Info",
      description: "Routine check",
      timestamp: "2024-10-22T10:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    getUnitById.mockResolvedValue(mockUnit);
    getUnitDetails.mockResolvedValue(mockDetails);
    getUnitAlerts.mockResolvedValue(mockAlerts);
  });

  const renderUnitDetails = (id = "1", initialEntries = [`/units/${id}`]) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/units/:id" element={<UnitDetails />} />
        </Routes>
      </MemoryRouter>,
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

  it("should render unit not found when unit data is null", async () => {
    getUnitById.mockResolvedValue(null);
    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Unit not found.")).toBeInTheDocument();
    });
  });

  it("should render unit not found when details data is null", async () => {
    getUnitDetails.mockResolvedValue(null);
    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Unit not found.")).toBeInTheDocument();
    });
  });

  it("should render all tab buttons", async () => {
    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText("Manage Remotely")).toBeInTheDocument();
    expect(screen.getByText("Remote Control")).toBeInTheDocument();
  });

  it("should render overview tab by default", async () => {
    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Status:")).toBeInTheDocument();
    });
    expect(screen.getByText("Operational")).toBeInTheDocument();
    expect(screen.getByText("Location:")).toBeInTheDocument();
    expect(screen.getByText("Building A")).toBeInTheDocument();
  });

  it("should render install date and last maintenance", async () => {
    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Install Date:")).toBeInTheDocument();
    });
    expect(screen.getByText("2023-01-15")).toBeInTheDocument();
    expect(screen.getByText("Last Maintenance:")).toBeInTheDocument();
    expect(screen.getByText("2024-10-01")).toBeInTheDocument();
  });

  it("should switch to alerts tab when clicked", async () => {
    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Unit: Unit 1")).toBeInTheDocument();
    });

    const alertsTab = screen.getByText("Alerts");
    fireEvent.click(alertsTab);

    await waitFor(() => {
      expect(screen.getByText("Alert History")).toBeInTheDocument();
    });
  });

  it("should render alerts in alerts tab", async () => {
    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Unit: Unit 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Alerts"));

    await waitFor(() => {
      expect(screen.getByText("Temperature high")).toBeInTheDocument();
    });
    expect(screen.getByText("Routine check")).toBeInTheDocument();
  });

  it("should show current alert on overview when status is not operational", async () => {
    getUnitById.mockResolvedValue({ ...mockUnit, status: "Warning" });
    renderUnitDetails();

    await waitFor(() => {
      expect(screen.getByText("Current Alert:")).toBeInTheDocument();
    });
    expect(screen.getByText("Temperature high")).toBeInTheDocument();
  });

  it("should not show current alert when status is operational", async () => {
    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Unit: Unit 1")).toBeInTheDocument();
    });
    expect(screen.queryByText("Current Alert:")).not.toBeInTheDocument();
  });

  it("should handle alerts tab loading state", async () => {
    let resolveAlerts;
    getUnitAlerts.mockReturnValue(
      new Promise((resolve) => {
        resolveAlerts = resolve;
      }),
    );

    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Unit: Unit 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Alerts"));

    expect(screen.getByText("Loading alerts...")).toBeInTheDocument();

    resolveAlerts(mockAlerts);
    await waitFor(() => {
      expect(screen.getByText("Alert History")).toBeInTheDocument();
    });
  });

  it("should handle alerts tab error state", async () => {
    getUnitAlerts.mockRejectedValue(new Error("Failed to load"));

    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Unit: Unit 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Alerts"));

    await waitFor(() => {
      expect(screen.getByText("No alerts for this unit.")).toBeInTheDocument();
    });
  });

  it("should show no alerts message when alerts array is empty", async () => {
    getUnitAlerts.mockResolvedValue([]);

    renderUnitDetails();
    await waitFor(() => {
      expect(screen.getByText("Unit: Unit 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Alerts"));

    await waitFor(() => {
      expect(screen.getByText("No alerts for this unit.")).toBeInTheDocument();
    });
  });

  it("should respect tab query parameter from URL", async () => {
    renderUnitDetails("1", ["/units/1?tab=alerts"]);

    await waitFor(() => {
      expect(screen.getByText("Alert History")).toBeInTheDocument();
    });
  });

  it("should handle service errors gracefully", async () => {
    getUnitById.mockRejectedValue(new Error("Service error"));
    getUnitDetails.mockRejectedValue(new Error("Service error"));

    renderUnitDetails();

    await waitFor(() => {
      expect(screen.getByText("Unit not found.")).toBeInTheDocument();
    });
  });

  it("should set active tab class correctly", async () => {
    renderUnitDetails();

    await waitFor(() => {
      expect(screen.getByText("Unit: Unit 1")).toBeInTheDocument();
    });

    const overviewTab = screen.getByText("Overview");
    expect(overviewTab).toHaveClass("active");

    const alertsTab = screen.getByText("Alerts");
    fireEvent.click(alertsTab);

    await waitFor(() => {
      expect(alertsTab).toHaveClass("active");
    });
  });
});
