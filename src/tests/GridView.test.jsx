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

const createLargeDataset = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: `TC${String(i + 1).padStart(3, "0")}`,
    name: `ThermaCore Unit ${String(i + 1).padStart(3, "0")}`,
    serialNumber: `TC-2024-${String(i + 1).padStart(3, "0")}`,
    location: ["New York", "Boston", "Chicago", "Seattle", "Denver", "Miami"][i % 6],
    status: ["online", "offline", "maintenance"][i % 3],
    currentPower: 100,
    hasAlert: i % 3 === 0,
    hasAlarm: i % 5 === 0,
    watergeneration: true,
    water_level: 50,
    client: {
      name: `Client ${String.fromCharCode(65 + (i % 5))}`,
      contact: `contact@client.com`,
    },
  }));

const renderWithRouter = (ui, { route = "/" } = {}) =>
  render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);

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
    it("renders grid view", () => {
      renderWithRouter(<GridView />);
      const elements = screen.getAllByText(/Grid View/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("shows loading state", () => {
      mockUseUnits.mockReturnValue({ units: mockUnits, loading: true });
      renderWithRouter(<GridView />);
      const elements = screen.getAllByText(/Loading grid view/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("renders units", () => {
      renderWithRouter(<GridView />);
      const elements = screen.getAllByText(/ThermaCore Unit/);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("shows client info", () => {
      renderWithRouter(<GridView />);
      const elements = screen.getAllByText(/Client A|Client B|Client C/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe("Search", () => {
    it("filters by name", async () => {
      renderWithRouter(<GridView />);
      const textboxes = screen.getAllByRole("textbox");
      expect(textboxes.length).toBeGreaterThan(0);
      
      fireEvent.change(textboxes[0], {
        target: { value: "Unit 001" },
      });

      await waitFor(() => {
        const elements = screen.getAllByText("ThermaCore Unit 001");
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Status Filtering", () => {
    it("filters online", async () => {
      renderWithRouter(<GridView />);
      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes.length).toBeGreaterThan(0);
      
      fireEvent.change(comboboxes[0], {
        target: { value: "Online" },
      });

      await waitFor(() => {
        const elements = screen.getAllByText(/ONLINE/);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("filters offline", async () => {
      renderWithRouter(<GridView />);
      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes.length).toBeGreaterThan(0);
      
      fireEvent.change(comboboxes[0], {
        target: { value: "Offline" },
      });

      await waitFor(() => {
        const elements = screen.getAllByText(/OFFLINE/);
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Pagination", () => {
    it("shows load more button when needed", () => {
      renderWithRouter(<GridView />);
      const elements = screen.getAllByText(/Load more Units/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("loads more units", async () => {
      renderWithRouter(<GridView />);
      const loadMoreElements = screen.getAllByText(/Load more Units/i);
      expect(loadMoreElements.length).toBeGreaterThan(0);
      
      fireEvent.click(loadMoreElements[0]);

      await waitFor(() => {
        const elements = screen.getAllByText(/ThermaCore Unit/);
        expect(elements.length).toBeGreaterThan(5);
      });
    });

    it("hides load more when no extra units", () => {
      mockUseUnits.mockReturnValue({
        units: mockUnits.slice(0, 3),
        loading: false,
      });

      renderWithRouter(<GridView />);
      const elements = screen.queryAllByText(/Load more Units/i);
      expect(elements.length).toBe(0);
    });
  });

  describe("Navigation", () => {
    it("navigates admin", () => {
      renderWithRouter(<GridView />);
      const unitElements = screen.getAllByText("ThermaCore Unit 001");
      expect(unitElements.length).toBeGreaterThan(0);
      
      fireEvent.click(unitElements[0]);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining("/unit-details/TC001"),
        expect.any(Object),
      );
    });

    it("navigates user", () => {
      mockUseAuth.mockReturnValue({
        userRole: "user",
        permissions: { canViewAllUnits: false },
      });

      renderWithRouter(<GridView />);
      const unitElements = screen.getAllByText("ThermaCore Unit 001");
      expect(unitElements.length).toBeGreaterThan(0);
      
      fireEvent.click(unitElements[0]);

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining("/unit/TC001"),
        expect.any(Object),
      );
    });
  });

  describe("Alerts", () => {
    it("shows alerts", () => {
      renderWithRouter(<GridView />);
      const elements = screen.getAllByText(/Alert/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it("shows alarms", () => {
      renderWithRouter(<GridView />);
      const elements = screen.getAllByText(/Alarm!/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe("Large dataset", () => {
    it("renders efficiently", () => {
      mockUseUnits.mockReturnValue({
        units: createLargeDataset(100),
        loading: false,
      });

      renderWithRouter(<GridView />);
      const elements = screen.getAllByText(/ThermaCore Unit/);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
