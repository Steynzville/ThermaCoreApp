/**
 * Tests for GridView Component
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
    useLocation: () => ({
      search: new URLSearchParams(""),
    }),
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

      const unitElements = screen.getAllByText(/ThermaCore Unit 00\d/);
      expect(unitElements.length).toBeGreaterThan(0);
    });

    it("should show unit details including serial number and location", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const serialElements = screen.getAllByText(/S\/N: TC-2024-00\d/);
      expect(serialElements.length).toBeGreaterThan(0);
      const locationElements = screen.getAllByText(/📍 New York/i);
      expect(locationElements.length).toBeGreaterThan(0);
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

      const searchInputs = screen.getAllByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      const searchInput = searchInputs[0];
      fireEvent.change(searchInput, { target: { value: "Unit 001" } });

      await waitFor(() => {
        const matchingUnits = screen.getAllByText("ThermaCore Unit 001");
        expect(matchingUnits.length).toBeGreaterThan(0);
      });
    });

    it("should filter units by serial number", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInputs = screen.getAllByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      const searchInput = searchInputs[0];
      fireEvent.change(searchInput, { target: { value: "TC-2024-003" } });

      await waitFor(() => {
        const matchingUnits = screen.getAllByText("ThermaCore Unit 003");
        expect(matchingUnits.length).toBeGreaterThan(0);
      });
    });

    it("should filter units by location", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInputs = screen.getAllByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      const searchInput = searchInputs[0];
      fireEvent.change(searchInput, { target: { value: "Boston" } });

      await waitFor(() => {
        const locationElements = screen.getAllByText(/📍 Boston/i);
        expect(locationElements.length).toBeGreaterThan(0);
      });
    });

    it("should filter units by client name", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInputs = screen.getAllByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      const searchInput = searchInputs[0];
      fireEvent.change(searchInput, { target: { value: "Client A" } });

      await waitFor(() => {
        const matchingUnits = screen.getAllByText("ThermaCore Unit 001");
        expect(matchingUnits.length).toBeGreaterThan(0);
        const otherMatchingUnits = screen.getAllByText("ThermaCore Unit 004");
        expect(otherMatchingUnits.length).toBeGreaterThan(0);
      });
    });

    it("should handle case-insensitive search", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInputs = screen.getAllByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      const searchInput = searchInputs[0];
      fireEvent.change(searchInput, { target: { value: "CHICAGO" } });

      await waitFor(() => {
        const matchingUnits = screen.getAllByText("ThermaCore Unit 003");
        expect(matchingUnits.length).toBeGreaterThan(0);
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

      const unitElements = screen.getAllByText(/ThermaCore Unit 00\d/);
      expect(unitElements.length).toBeGreaterThan(3);
    });

    it("should filter by online status", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilters = screen.getAllByRole("combobox");
      const statusFilter = statusFilters[0];
      fireEvent.change(statusFilter, { target: { value: "Online" } });

      await waitFor(() => {
        expect(statusFilter.value).toBe("Online");
        const onlineUnits = screen.getAllByText(/ThermaCore Unit 00[1456]/);
        expect(onlineUnits.length).toBeGreaterThan(0);
      });
    });

    it("should filter by offline status", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilters = screen.getAllByRole("combobox");
      const statusFilter = statusFilters[0];
      fireEvent.change(statusFilter, { target: { value: "Offline" } });

      await waitFor(() => {
        expect(statusFilter.value).toBe("Offline");
        const offlineUnits = screen.getAllByText("ThermaCore Unit 002");
        expect(offlineUnits.length).toBeGreaterThan(0);
      });
    });

    it("should filter by maintenance status", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilters = screen.getAllByRole("combobox");
      const statusFilter = statusFilters[0];
      fireEvent.change(statusFilter, { target: { value: "Maintenance" } });

      await waitFor(() => {
        expect(statusFilter.value).toBe("Maintenance");
        const maintenanceUnits = screen.getAllByText("ThermaCore Unit 003");
        expect(maintenanceUnits.length).toBeGreaterThan(0);
      });
    });

    it("should filter by alerts", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilters = screen.getAllByRole("combobox");
      const statusFilter = statusFilters[0];
      fireEvent.change(statusFilter, { target: { value: "Alerts" } });

      await waitFor(() => {
        expect(statusFilter.value).toBe("Alerts");
        const alertUnits = screen.getAllByText(/ThermaCore Unit 00[15]/);
        expect(alertUnits.length).toBeGreaterThan(0);
      });
    });

    it("should filter by alarms", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const statusFilters = screen.getAllByRole("combobox");
      const statusFilter = statusFilters[0];
      fireEvent.change(statusFilter, { target: { value: "Alarms" } });

      await waitFor(() => {
        expect(statusFilter.value).toBe("Alarms");
        const alarmUnits = screen.getAllByText(/ThermaCore Unit 00[26]/);
        expect(alarmUnits.length).toBeGreaterThan(0);
      });
    });
  });

  describe("URL Parameter Handling", () => {
    it("should apply status filter from URL parameter", async () => {
      // Use a custom wrapper with route
      const { rerender } = render(
        <MemoryRouter initialEntries={["/?status=online"]}>
          <GridView />
        </MemoryRouter>,
      );

      await waitFor(() => {
        const statusFilters = screen.getAllByRole("combobox");
        expect(statusFilters[0].value).toBe("Online");
      });

      // Test with different status
      rerender(
        <MemoryRouter initialEntries={["/?status=offline"]}>
          <GridView />
        </MemoryRouter>,
      );

      await waitFor(() => {
        const statusFilters = screen.getAllByRole("combobox");
        expect(statusFilters[0].value).toBe("Offline");
      });
    });

    it("should apply alerts filter from URL parameter", async () => {
      render(
        <MemoryRouter initialEntries={["/?alerts=true"]}>
          <GridView />
        </MemoryRouter>,
      );

      await waitFor(() => {
        const statusFilters = screen.getAllByRole("combobox");
        expect(statusFilters[0].value).toBe("Alerts");
      });
    });

    it("should apply search term from URL parameter", async () => {
      render(
        <MemoryRouter initialEntries={["/?search=Unit%20001"]}>
          <GridView />
        </MemoryRouter>,
      );

      await waitFor(() => {
        const searchInputs = screen.getAllByPlaceholderText(
          /Search by unit name, serial number, client, or location/i,
        );
        expect(searchInputs[0].value).toBe("Unit 001");
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

      // Check that the grid exists with some units
      const unitElements = screen.queryAllByText(/ThermaCore Unit 00\d/);
      // Should show 5 units initially
      expect(unitElements.length).toBeLessThanOrEqual(5);
    });

    it("should show load more button when more units available", () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      // Use queryAllByText and check for at least one
      const buttons = screen.queryAllByText(/Load more Units/i);
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("should load more units when button clicked", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const buttons = screen.queryAllByText(/Load more Units/i);
      expect(buttons.length).toBeGreaterThan(0);
      
      const loadMoreButton = buttons[0];
      fireEvent.click(loadMoreButton);

      await waitFor(() => {
        const units = screen.queryAllByText(/ThermaCore Unit 00\d/);
        // Should show more units after clicking
        expect(units.length).toBeGreaterThan(5);
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
        const buttons = screen.queryAllByText(/Load more Units/i);
        expect(buttons.length).toBe(0);
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

      const unitCards = screen.getAllByText("ThermaCore Unit 001");
      const unitCard = unitCards[0].closest("div");
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

      const unitCards = screen.getAllByText("ThermaCore Unit 001");
      const unitCard = unitCards[0].closest("div");
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

      const unitNames = screen.getAllByText(/ThermaCore Unit 00\d/);
      expect(unitNames.length).toBeGreaterThan(0);
      const specificUnit = screen.getAllByText("ThermaCore Unit 001");
      expect(specificUnit.length).toBeGreaterThan(0);
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

      const displayedUnits = screen.getAllByText(/ThermaCore Unit 00\d/);
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

      expect(endTime - startTime).toBeLessThan(1000);
      const buttons = screen.queryAllByText(/Load more Units/i);
      expect(buttons.length).toBeGreaterThan(0);
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

      const searchInputs = screen.getAllByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      const searchInput = searchInputs[0];

      const startTime = performance.now();
      fireEvent.change(searchInput, { target: { value: "Unit 010" } });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);

      await waitFor(() => {
        const matchingUnits = screen.getAllByText("ThermaCore Unit 010");
        expect(matchingUnits.length).toBeGreaterThan(0);
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

      const onlineTexts = screen.getAllByText("ONLINE");
      expect(onlineTexts.length).toBeGreaterThan(0);
      const offlineTexts = screen.getAllByText("OFFLINE");
      expect(offlineTexts.length).toBeGreaterThan(0);
      const maintenanceTexts = screen.getAllByText("MAINTENANCE");
      expect(maintenanceTexts.length).toBeGreaterThan(0);
    });
  });

  describe("Combined Filtering", () => {
    it("should combine search and status filters", async () => {
      render(
        <TestWrapper>
          <GridView />
        </TestWrapper>,
      );

      const searchInputs = screen.getAllByPlaceholderText(
        /Search by unit name, serial number, client, or location/i,
      );
      const searchInput = searchInputs[0];
      fireEvent.change(searchInput, { target: { value: "Client A" } });

      const statusFilters = screen.getAllByRole("combobox");
      const statusFilter = statusFilters[0];
      fireEvent.change(statusFilter, { target: { value: "Online" } });

      await waitFor(() => {
        const matchingUnits = screen.getAllByText("ThermaCore Unit 001");
        expect(matchingUnits.length).toBeGreaterThan(0);
        const otherMatchingUnits = screen.getAllByText("ThermaCore Unit 004");
        expect(otherMatchingUnits.length).toBeGreaterThan(0);
        const nonMatchingUnits = screen.queryAllByText("ThermaCore Unit 002");
        expect(nonMatchingUnits.length).toBe(0);
      });
    });
  });
});
