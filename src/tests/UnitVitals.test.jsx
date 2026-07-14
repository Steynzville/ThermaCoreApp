/**
 * Tests for UnitVitals Component
 *
 * Tests basic rendering and unit vital information display.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnitVitals from "../components/unit-details/UnitVitals";
import { SettingsProvider } from "../context/SettingsContext";
import { UnitProvider } from "../context/UnitContext";
import { AuthProvider } from "../context/AuthContext";
import { TenantProvider } from "../context/TenantContext";
import { BrowserRouter } from "react-router-dom";

// Mock the useRealtimeMetrics hook to prevent it from calling useTenant
vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: vi.fn(() => ({
    metrics: null,
    loading: false,
    error: null,
    connectionStatus: "disconnected",
    isConnected: false,
  })),
}));

// Mock useSettings
vi.mock("../context/SettingsContext", async () => {
  const actual = await vi.importActual("../context/SettingsContext");
  return {
    ...actual,
    useSettings: vi.fn(() => ({
      formatTemperature: vi.fn((temp) => `${temp}°F`),
      settings: { temperatureUnit: "F" },
    })),
  };
});

// Mock useUnits
vi.mock("../context/UnitContext", async () => {
  const actual = await vi.importActual("../context/UnitContext");
  return {
    ...actual,
    useUnits: vi.fn(() => ({
      updateUnitName: vi.fn().mockResolvedValue({ success: true }),
      updateUnitLocation: vi.fn().mockResolvedValue({ success: true }),
      updateUnitGPS: vi.fn().mockResolvedValue({ success: true }),
    })),
  };
});

// Mock useAuth
vi.mock("../context/AuthContext", async () => {
  const actual = await vi.importActual("../context/AuthContext");
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: { id: 1, username: "testuser" },
      backendRole: "user",
      isAuthenticated: true,
    })),
  };
});

const mockUnit = {
  id: 1,
  name: "Test Unit",
  location: "Test Location",
  status: "online",
  currentPower: 75.5,
  water_level: 150,
  watergeneration: true,
  temp_outside: 68,
  temp_in: 72,
  temp_out: 70,
  humidity: 45,
  pressure: 101.3,
  battery_level: 85,
  flowRate: 45.5,
  installDate: "2024-01-15",
  lastMaintenance: "2024-06-01",
  gpsCoordinates: "40.7128° N, 74.0060° W",
};

describe("UnitVitals Component", () => {
  const renderComponent = (unit = mockUnit) => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <SettingsProvider>
              <UnitProvider>
                <UnitVitals unit={unit} />
              </UnitProvider>
            </SettingsProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>,
    );
  };

  it("should render without crashing", () => {
    const { container } = renderComponent();
    expect(container).toBeTruthy();
  });

  it("should display unit name", () => {
    renderComponent();
    expect(screen.getByText("Test Unit")).toBeInTheDocument();
  });

  it("should display unit location", () => {
    renderComponent();
    expect(screen.getByText("Test Location")).toBeInTheDocument();
  });
});
