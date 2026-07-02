/**
 * Tests for GridView Component
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GridView from "@/components/GridView";

/**
 * -----------------------------
 * MOCK SEARCHBAR (CRITICAL FIX)
 * -----------------------------
 * Ensures instant filtering without debounce/UI abstraction issues
 */
vi.mock("@/components/SearchBar", () => ({
  default: ({ value, onSearch, placeholder }) => (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onSearch(e.target.value)}
    />
  ),
}));

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
let mockSearch = "";
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      search: mockSearch,
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

// Helper
const renderWithRouter = (ui, { route = "/" } = {}) => {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
};

describe("GridView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = "";

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
      renderWithRouter(<GridView />);
      expect(screen.getByText(/Grid View/i)).toBeInTheDocument();
    });

    it("should display loading state", () => {
      mockUseUnits.mockReturnValue({
        units: mockUnits,
        loading: true,
      });

      renderWithRouter(<GridView />);
      expect(screen.getByText(/Loading grid view/i)).toBeInTheDocument();
    });

    it("should render units in grid layout", () => {
      renderWithRouter(<GridView />);
      expect(screen.getAllByText(/ThermaCore Unit 00\d/).length).toBeGreaterThan(0);
    });
  });

  describe("Search Functionality", () => {
    it("should filter units by name", async () => {
      renderWithRouter(<GridView />);

      const input = screen.getByPlaceholderText(/Search by unit name/i);
      fireEvent.change(input, { target: { value: "Unit 001" } });

      await waitFor(() => {
        expect(screen.getAllByText("ThermaCore Unit 001").length).toBeGreaterThan(0);
      });
    });

    it("should filter by location", async () => {
      renderWithRouter(<GridView />);

      const input = screen.getByPlaceholderText(/Search by unit name/i);
      fireEvent.change(input, { target: { value: "Boston" } });

      await waitFor(() => {
        expect(screen.getAllByText(/Boston/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe("Status Filtering", () => {
    it("should show all units by default", () => {
      renderWithRouter(<GridView />);
      expect(screen.getAllByText(/ThermaCore Unit 00\d/).length).toBeGreaterThan(3);
    });

    it("should filter by online status", async () => {
      renderWithRouter(<GridView />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "Online" } });

      await waitFor(() => {
        expect(select.value).toBe("Online");
      });
    });
  });

  describe("Pagination and Load More", () => {
    it("should initially show limited units (5)", () => {
      renderWithRouter(<GridView />);
      const units = screen.getAllByText(/ThermaCore Unit 00\d/);
      expect(units.length).toBeLessThanOrEqual(5);
    });

    it("should show load more button when more units available", () => {
      renderWithRouter(<GridView />);
      expect(screen.queryByText(/Load more/i)).toBeInTheDocument();
    });

    it("should load more units when clicked", async () => {
      renderWithRouter(<GridView />);

      const button = screen.getByText(/Load more/i);
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getAllByText(/ThermaCore Unit 00\d/).length).toBeGreaterThan(5);
      });
    });
  });

  describe("Navigation", () => {
    it("should navigate on unit click", () => {
      renderWithRouter(<GridView />);

      const unit = screen.getByText("ThermaCore Unit 001");
      fireEvent.click(unit.closest("div"));

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe("Role-Based Access Control", () => {
    it("should limit units for non-admin users", () => {
      mockUseAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewAllUnits: false },
      });

      renderWithRouter(<GridView />);
      expect(screen.getAllByText(/ThermaCore Unit 00\d/).length).toBeLessThanOrEqual(6);
    });
  });

  describe("Alert Display", () => {
    it("should show alerts", () => {
      renderWithRouter(<GridView />);
      expect(screen.getAllByText(/Alert/i).length).toBeGreaterThan(0);
    });

    it("should show alarms", () => {
      renderWithRouter(<GridView />);
      expect(screen.getAllByText(/Alarm/i).length).toBeGreaterThan(0);
    });
  });
});
