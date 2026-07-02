/**
 * Tests for UserUnitDetails Component
 *
 * Fully isolated test to prevent UnitProvider async initialization issues.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import UserUnitDetails from "../components/UserUnitDetails";

/* -------------------------------------------------------
   ROUTER MOCK
------------------------------------------------------- */
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");

  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      state: {
        unit: {
          id: 1,
          name: "Test Unit",
          location: "Test Location",
          status: "running",
          temperature: 25,
          pressure: 100,
          flowRate: 50,
        },
      },
    }),
    useSearchParams: () => [new URLSearchParams()],
  };
});

/* -------------------------------------------------------
   SETTINGS CONTEXT MOCK
------------------------------------------------------- */
vi.mock("../context/SettingsContext", () => ({
  SettingsProvider: ({ children }) => children,
  useSettings: () => ({
    formatTemperature: (v) => `${v}°C`,
  }),
}));

/* -------------------------------------------------------
   AUTH CONTEXT MOCK
------------------------------------------------------- */
vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { id: 1, username: "test", role: "viewer" },
    userRole: "viewer",
  }),
}));

/* -------------------------------------------------------
   UNIT CONTEXT MOCK (IMPORTANT FIX)
   - prevents async getAllUnits() from running
------------------------------------------------------- */
vi.mock("../context/UnitContext", () => ({
  UnitProvider: ({ children }) => children,
  useUnits: () => ({
    units: [],
    loading: false,
    error: null,
    updateUnitName: vi.fn(),
    updateUnitLocation: vi.fn(),
    updateUnitGPS: vi.fn(),
    getUnit: vi.fn(),
    refreshUnits: vi.fn(),
  }),
}));

/* -------------------------------------------------------
   CHILD COMPONENT MOCKS
------------------------------------------------------- */
vi.mock("../components/VitalSignGraph", () => ({
  default: () => <div data-testid="vital-sign-graph">Graph</div>,
}));

vi.mock("../components/unit-details/UnitAlertsTab", () => ({
  default: () => <div data-testid="unit-alerts-tab">Alerts</div>,
}));

/* -------------------------------------------------------
   TESTS
------------------------------------------------------- */
describe("UserUnitDetails Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <UserUnitDetails />
      </MemoryRouter>,
    );

  it("should render unit details with unit information", () => {
    renderComponent();
    expect(screen.getByText("Test Unit")).toBeInTheDocument();
  });

  it("should render unit location", () => {
    renderComponent();
    expect(screen.getByText("Test Location")).toBeInTheDocument();
  });

  it("should display unit status", () => {
    renderComponent();
    expect(screen.getByText(/running/i)).toBeInTheDocument();
  });
});
