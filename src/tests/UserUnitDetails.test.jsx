/**
 * Tests for UserUnitDetails Component
 *
 * Tests basic rendering with mocked providers to isolate
 * provider initialization issues.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import UserUnitDetails from "../components/UserUnitDetails";

// Mock react-router-dom
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

// Mock AuthContext
vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: {
      id: 1,
      username: "test",
      role: "viewer",
    },
    isAuthenticated: true,
  }),
}));

// Mock SettingsContext
vi.mock("../context/SettingsContext", () => ({
  SettingsProvider: ({ children }) => children,
  useSettings: () => ({
    temperatureUnit: "C",
    pressureUnit: "kPa",
  }),
}));

// Mock UnitContext
vi.mock("../context/UnitContext", () => ({
  UnitProvider: ({ children }) => children,
  useUnit: () => ({
    selectedUnit: {
      id: 1,
      name: "Test Unit",
    },
  }),
}));

// Mock VitalSignGraph
vi.mock("../components/VitalSignGraph", () => ({
  default: () => <div data-testid="vital-sign-graph">Graph</div>,
}));

// Mock UnitAlertsTab
vi.mock("../components/unit-details/UnitAlertsTab", () => ({
  default: () => <div data-testid="unit-alerts-tab">Alerts</div>,
}));

describe("UserUnitDetails Component", () => {
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
