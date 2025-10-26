/**
 * Tests for GridView Component
 *
 * Coverage includes:
 * - Data grid rendering with units
 * - Filtering by status (online, offline, maintenance, alerts, alarms)
 * - Search functionality (by name, serial number, location, client)
 * - Pagination with load more functionality
 * - Navigation to unit details
 * - Role-based access control
 * - URL parameter handling
 * - Performance with large datasets
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GridView from "@/components/GridView";

// Mock useAuth and useUnits hooks
const mockUseAuth = vi.fn();
const mockUseUnits = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/context/UnitContext", () => ({
  useUnits: () => mockUseUnits(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock units data
const mockUnits = [
  {
    id: "TC001",
    name: "ThermaCore Unit 001",
    serialNumber: "TC-2024-001",
    location: "New York",
    status: "online",
    currentPower: 250,
    hasAlert: true,
    hasAlarm: false,
    watergeneration: true,
    water_level: 85,
    client: { name: "Client A", contact: "contact@clienta.com" },
  },
  {
    id: "TC002",
    name: "ThermaCore Unit 002",
    serialNumber: "TC-2024-002",
    location: "Boston",
    status: "offline",
    currentPower: 0,
    hasAlert: false,
    hasAlarm: true,
    watergeneration: false,
    water_level: 0,
    client: { name: "Client B", contact: "contact@clientb.com" },
  },
  {
    id: "TC003",
    name: "ThermaCore Unit 003",
    serialNumber: "TC-2024-003",
    location: "Chicago",
    status: "maintenance",
    currentPower: 100,
    hasAlert: false,
    hasAlarm: false,
    watergeneration: true,
    water_level: 50,
    client: { name: "Client C", contact: "contact@clientc.com" },
  },
  {
    id: "TC004",
    name: "ThermaCore Unit 004",
    serialNumber: "TC-2024-004",
    location: "Seattle",
    status: "online",
    currentPower: 300,
    hasAlert: false,
    hasAlarm: false,
    watergeneration: true,
    water_level: 90,
    client: { name: "Client A", contact: "contact@clienta.com" },
  },
  {
    id: "TC005",
    name: "ThermaCore Unit 005",
    serialNumber: "TC-2024-005",
    location: "Denver",
    status: "online",
    currentPower: 280,
    hasAlert: true,
    hasAlarm: false,
    watergeneration: false,
    water_level: 0,
    client: { name: "Client D", contact: "contact@clientd.com" },
  },
  {
    id: "TC006",
    name: "ThermaCore Unit 006",
    serialNumber: "TC-2024-006",
    location: "Miami",
    status: "online",
    currentPower: 260,
    hasAlert: false,
    hasAlarm: true,
    watergeneration: true,
    water_level: 75,
    client: { name: "Client B", contact: "contact@clientb.com" },
  },
];

// Create large dataset for performance testing
const createLargeDataset = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `TC${String(i + 1).padStart(3, "0")}`,
    name: `ThermaCore Unit ${String(i + 1).padStart(3, "0")}`,
    serialNumber: `TC-2024-${String(i + 1).padStart(3, "0")}`,
    location: ["New York", "Boston", "Chicago", "Seattle", "Denver", "Miami"][
      i % 6
    ],
    status: ["online", "offline", "maintenance"][i % 3],
    currentPower: Math.floor(Math.random() * 300),
    hasAlert: i % 3 === 0,
    hasAlarm: i % 5 === 0,
    watergeneration: i % 2 === 0,
    water_level: Math.floor(Math.random() * 100),
    client: {
      name: `Client ${String.fromCharCode(65 + (i % 5))}`,
      contact: `contact@client${String.fromCharCode(97 + (i % 5))}.com`,
    },
  }));
};

const TestWrapper = ({ children, initialRoute = "/" }) => {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
  );
};

describe("GridView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock return values
    mockUseAuth.mockReturnValue({
      userRole: "admin",
      permissions: { canViewAllUnits: true },
    });
    mockUseUnits.mockReturnValue({
      units: mockUnits,
      loading: false,
    });
  });

  describe("Component Rendering", () => {
    it("should render grid view component", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      expect(screen.getByText(/Grid View/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Complete overview of all ThermaCore units/i),
      ).toBeInTheDocument();
    });

    it("should display loading state", () => {
      mockUseUnits.mockReturnValue({
        units: mockUnits,
        loading: true,
      });

      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      expect(screen.getByText(/Loading grid view/i)).toBeInTheDocument();
    });

    it("should render units in grid layout", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
      expect(screen.getByText("ThermaCore Unit 002")).toBeInTheDocument();
      expect(screen.getByText("ThermaCore Unit 003")).toBeInTheDocument();
    });

    it("should show unit details including serial number and location", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      expect(screen.getByText(/S\/N: TC-2024-001/i)).toBeInTheDocument();
      expect(screen.getByText(/📍 New York/i)).toBeInTheDocument();
    });

    it("should display client information", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const clientNames = screen.getAllByText("Client A");
      expect(clientNames.length).toBeGreaterThan(0);
      const clientContacts = screen.getAllByText("contact@clienta.com");
      expect(clientContacts.length).toBeGreaterThan(0);
    });
  });

  describe("Search Functionality", () => {
    it("should filter units by name", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      fireEvent.change(searchInput, { target: { value: "Unit 001" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
        expect(
          screen.queryByText("ThermaCore Unit 002"),
        ).not.toBeInTheDocument();
      });
    });

    it("should filter units by serial number", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      fireEvent.change(searchInput, { target: { value: "TC-2024-003" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 003")).toBeInTheDocument();
        expect(
          screen.queryByText("ThermaCore Unit 001"),
        ).not.toBeInTheDocument();
      });
    });

    it("should filter units by location", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      fireEvent.change(searchInput, { target: { value: "Boston" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 002")).toBeInTheDocument();
        expect(screen.getByText(/📍 Boston/i)).toBeInTheDocument();
      });
    });

    it("should filter units by client name", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      fireEvent.change(searchInput, { target: { value: "Client A" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
        expect(screen.getByText("ThermaCore Unit 004")).toBeInTheDocument();
      });
    });

    it("should handle case-insensitive search", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      fireEvent.change(searchInput, { target: { value: "CHICAGO" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 003")).toBeInTheDocument();
      });
    });
  });

  describe("Status Filtering", () => {
    it("should show all units by default", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
      expect(screen.getByText("ThermaCore Unit 002")).toBeInTheDocument();
      expect(screen.getByText("ThermaCore Unit 003")).toBeInTheDocument();
    });

    it("should filter by online status", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilter = screen.getByRole("combobox");
      fireEvent.change(statusFilter, { target: { value: "Online" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
        expect(screen.getByText("ThermaCore Unit 004")).toBeInTheDocument();
        expect(
          screen.queryByText("ThermaCore Unit 002"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText("ThermaCore Unit 003"),
        ).not.toBeInTheDocument();
      });
    });

    it("should filter by offline status", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilter = screen.getByRole("combobox");
      fireEvent.change(statusFilter, { target: { value: "Offline" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 002")).toBeInTheDocument();
        expect(
          screen.queryByText("ThermaCore Unit 001"),
        ).not.toBeInTheDocument();
      });
    });

    it("should filter by maintenance status", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilter = screen.getByRole("combobox");
      fireEvent.change(statusFilter, { target: { value: "Maintenance" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 003")).toBeInTheDocument();
        expect(
          screen.queryByText("ThermaCore Unit 001"),
        ).not.toBeInTheDocument();
      });
    });

    it("should filter by alerts", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilter = screen.getByRole("combobox");
      fireEvent.change(statusFilter, { target: { value: "Alerts" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
        expect(screen.getByText("ThermaCore Unit 005")).toBeInTheDocument();
      });
    });

    it("should filter by alarms", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilter = screen.getByRole("combobox");
      fireEvent.change(statusFilter, { target: { value: "Alarms" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 002")).toBeInTheDocument();
        expect(screen.getByText("ThermaCore Unit 006")).toBeInTheDocument();
      });
    });
  });

  describe("URL Parameter Handling", () => {
    it("should apply status filter from URL parameter", async () => {
      render(
        <TestWrapper initialRoute="/?status=online">
          <GridView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const statusFilter = screen.getByRole("combobox");
        expect(statusFilter.value).toBe("Online");
      });
    });

    it("should apply alerts filter from URL parameter", async () => {
      render(
        <TestWrapper initialRoute="/?alerts=true">
          <GridView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const statusFilter = screen.getByRole("combobox");
        expect(statusFilter.value).toBe("Alerts");
      });
    });

    it("should apply search term from URL parameter", async () => {
      render(
        <TestWrapper initialRoute="/?search=Unit%20001">
          <GridView />
        </TestWrapper>,
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          /Search by unit name, serial number, client, or location/i,
        );
        expect(searchInput.value).toBe("Unit 001");
      });
    });
  });

  describe("Pagination and Load More", () => {
    it("should initially show limited units (5)", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const units = screen.getAllByText(/ThermaCore Unit/);
      expect(units.length).toBeLessThanOrEqual(5);
    });

    it("should show load more button when more units available", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      expect(screen.getByText(/Load more Units/i)).toBeInTheDocument();
    });

    it("should load more units when button clicked", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const loadMoreButton = screen.getByText(/Load more Units/i);
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 006")).toBeInTheDocument();
      });
    });

    it("should hide load more button when all units shown", async () => {
      mockUseUnits.mockReturnValue({
        units: mockUnits.slice(0, 3),
        loading: false,
      });

      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(screen.queryByText(/Load more Units/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    it("should navigate to admin unit details when admin clicks unit", () => {
      mockUseAuth.mockReturnValue({
        userRole: "admin",
        permissions: { canViewAllUnits: true },
      });

      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const unitCard = screen.getByText("ThermaCore Unit 001").closest("div");
      fireEvent.click(unitCard);

      expect(mockNavigate).toHaveBeenCalledWith(
        "/unit-details/TC001",
        expect.objectContaining({
          state: expect.objectContaining({ unit: expect.any(Object) }),
        }),
      );
    });

    it("should navigate to user unit details when user clicks unit", () => {
      mockUseAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewAllUnits: false },
      });

      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const unitCard = screen.getByText("ThermaCore Unit 001").closest("div");
      fireEvent.click(unitCard);

      expect(mockNavigate).toHaveBeenCalledWith(
        "/unit/TC001",
        expect.objectContaining({
          state: expect.objectContaining({ unit: expect.any(Object) }),
        }),
      );
    });
  });

  describe("Role-Based Access Control", () => {
    it("should show all units for admin with canViewAllUnits permission", () => {
      mockUseAuth.mockReturnValue({
        userRole: "admin",
        permissions: { canViewAllUnits: true },
      });

      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const unitNames = screen.getAllByText(/ThermaCore Unit/);
      expect(unitNames.length).toBeGreaterThan(0);
      expect(screen.getAllByText("ThermaCore Unit 001").length).toBeGreaterThan(
        0,
      );
    });

    it("should limit units for users without canViewAllUnits permission", () => {
      mockUseAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewAllUnits: false },
      });

      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      // Should only show first 6 units
      const displayedUnits = screen.getAllByText(/ThermaCore Unit/);
      expect(displayedUnits.length).toBeLessThanOrEqual(6);
    });
  });

  describe("Performance with Large Datasets", () => {
    it("should handle rendering 100 units efficiently", () => {
      const largeDataset = createLargeDataset(100);
      mockUseUnits.mockReturnValue({
        units: largeDataset,
        loading: false,
      });

      const startTime = performance.now();
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );
      const endTime = performance.now();

      // Should render within reasonable time (< 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);

      // Should still show pagination controls
      expect(screen.getByText(/Load more Units/i)).toBeInTheDocument();
    });

    it("should filter large datasets efficiently", async () => {
      const largeDataset = createLargeDataset(100);
      mockUseUnits.mockReturnValue({
        units: largeDataset,
        loading: false,
      });

      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );

      const startTime = performance.now();
      fireEvent.change(searchInput, { target: { value: "Unit 010" } });
      const endTime = performance.now();

      // Filtering should be fast
      expect(endTime - startTime).toBeLessThan(100);

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 010")).toBeInTheDocument();
      });
    });
  });

  describe("Alert and Alarm Display", () => {
    it("should display alert indicator for units with alerts", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const alertTexts = screen.getAllByText(/Alert/i);
      expect(alertTexts.length).toBeGreaterThan(0);
    });

    it("should display alarm indicator for units with alarms", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const alarmTexts = screen.getAllByText(/Alarm!/i);
      expect(alarmTexts.length).toBeGreaterThan(0);
    });

    it("should show correct status indicators", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      expect(screen.getAllByText("ONLINE").length).toBeGreaterThan(0);
      expect(screen.getByText("OFFLINE")).toBeInTheDocument();
      expect(screen.getByText("MAINTENANCE")).toBeInTheDocument();
    });
  });

  describe("Combined Filtering", () => {
    it("should combine search and status filters", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      fireEvent.change(searchInput, { target: { value: "Client A" } });

      const statusFilter = screen.getByRole("combobox");
      fireEvent.change(statusFilter, { target: { value: "Online" } });

      await waitFor(() => {
        expect(screen.getByText("ThermaCore Unit 001")).toBeInTheDocument();
        expect(screen.getByText("ThermaCore Unit 004")).toBeInTheDocument();
        // TC002 is offline, so shouldn't appear
        expect(
          screen.queryByText("ThermaCore Unit 002"),
        ).not.toBeInTheDocument();
      });
    });
  });
});
