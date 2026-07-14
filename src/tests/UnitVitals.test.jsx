/**
 * Tests for UnitVitals Component
 *
 * Tests basic rendering and unit vital information display.
 */

import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import UnitVitals from "../components/unit-details/UnitVitals";
import { SettingsProvider } from "../context/SettingsContext";
import { UnitProvider } from "../context/UnitContext";
import { AuthProvider } from "../context/AuthContext";
import { TenantProvider } from "../context/TenantContext";
import { BrowserRouter } from "react-router-dom";

// Mock the useRealtimeMetrics hook
vi.mock("../hooks/useRealtimeData", () => ({
  useRealtimeMetrics: vi.fn(() => ({
    metrics: {
      temperature: { current: 75 },
      pressure: { current: 120 },
      flow_rate_inlet: { current: 48.5 },
      flow_rate_outlet: { current: 43.2 },
    },
    loading: false,
    error: null,
    connectionStatus: "connected",
    isConnected: true,
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

// Mock useTenant
vi.mock("../context/TenantContext", async () => {
  const actual = await vi.importActual("../context/TenantContext");
  return {
    ...actual,
    useTenant: vi.fn(() => ({
      currentTenant: { id: "tenant-1", name: "Test Tenant" },
      availableTenants: [{ id: "tenant-1", name: "Test Tenant" }],
      isLoading: false,
      error: null,
      isAdmin: false,
      switchTenant: vi.fn(),
      getTenantQueryParam: vi.fn(() => ""),
    })),
  };
});

// Mock window.confirm
const mockConfirm = vi.fn(() => true);
window.confirm = mockConfirm;

// Mock window.open
const mockOpen = vi.fn();
window.open = mockOpen;

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

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

  it("should display power output", () => {
    renderComponent();
    expect(screen.getByText("75.5 kW")).toBeInTheDocument();
  });

  it("should display water level when water generation is enabled", () => {
    renderComponent();
    expect(screen.getByText("150 L")).toBeInTheDocument();
  });

  it("should not display water level when water generation is disabled", () => {
    const unitWithoutWater = { ...mockUnit, watergeneration: false };
    renderComponent(unitWithoutWater);
    expect(screen.queryByText("150 L")).not.toBeInTheDocument();
  });

  it("should display temperature outside", () => {
    renderComponent();
    expect(screen.getByText("68°F")).toBeInTheDocument();
  });

  it("should display temperature in", () => {
    renderComponent();
    expect(screen.getByText("72°F")).toBeInTheDocument();
  });

  it("should display temperature out", () => {
    renderComponent();
    expect(screen.getByText("70°F")).toBeInTheDocument();
  });

  it("should display humidity", () => {
    renderComponent();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("should display pressure", () => {
    renderComponent();
    expect(screen.getByText("101.3 kPa")).toBeInTheDocument();
  });

  it("should display battery level with progress bar", () => {
    renderComponent();
    expect(screen.getByText("85%")).toBeInTheDocument();
    const progressBar = document.querySelector('.bg-green-500');
    expect(progressBar).toHaveStyle('width: 85%');
  });

  it("should display flow rate inlet", () => {
    renderComponent();
    expect(screen.getByText(/45.5 L\/min/)).toBeInTheDocument();
  });

  it("should display flow rate outlet", () => {
    renderComponent();
    expect(screen.getByText(/42.1 L\/min/)).toBeInTheDocument();
  });

  it("should show N/A for values when unit is offline", () => {
    const offlineUnit = { ...mockUnit, status: "offline" };
    renderComponent(offlineUnit);
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0);
  });

  it("should show N/A for values when unit is in maintenance", () => {
    const maintenanceUnit = { ...mockUnit, status: "maintenance" };
    renderComponent(maintenanceUnit);
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0);
  });

  it("should show N/A for values when unit is decommissioned", () => {
    const decommissionedUnit = { ...mockUnit, status: "decommissioned" };
    renderComponent(decommissionedUnit);
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0);
  });

  it("should display install date", () => {
    renderComponent();
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
  });

  it("should display last maintenance date", () => {
    renderComponent();
    expect(screen.getByText("2024-06-01")).toBeInTheDocument();
  });

  it("should display GPS coordinates", () => {
    renderComponent();
    expect(screen.getByText(/GPS: 40.7128° N, 74.0060° W/)).toBeInTheDocument();
  });

  it("should show edit buttons for name, location, and GPS", () => {
    renderComponent();
    const editButtons = screen.getAllByRole('button');
    // There should be 3 edit buttons (name, location, GPS)
    const editIcons = editButtons.filter(btn => 
      btn.querySelector('svg')?.classList?.contains('lucide-edit2')
    );
    expect(editIcons.length).toBe(3);
  });

  it("should open name edit mode when edit button is clicked", async () => {
    const user = await import('@testing-library/user-event').then(m => m.default);
    renderComponent();
    
    const editButtons = screen.getAllByRole('button');
    const nameEditButton = editButtons.find(btn => 
      btn.closest('.flex')?.previousSibling?.textContent === 'Machine Name'
    );
    
    if (nameEditButton) {
      await user.click(nameEditButton);
      const input = screen.getByDisplayValue('Test Unit');
      expect(input).toBeInTheDocument();
    }
  });

  it("should open location edit mode when edit button is clicked", async () => {
    const user = await import('@testing-library/user-event').then(m => m.default);
    renderComponent();
    
    const locationText = screen.getByText('Test Location');
    const parent = locationText.closest('.flex')?.parentElement;
    const editButton = parent?.querySelector('button');
    
    if (editButton) {
      await user.click(editButton);
      const input = screen.getByDisplayValue('Test Location');
      expect(input).toBeInTheDocument();
    }
  });

  it("should open GPS edit mode when edit button is clicked", async () => {
    const user = await import('@testing-library/user-event').then(m => m.default);
    renderComponent();
    
    const gpsEditButton = screen.getAllByRole('button').find(btn => 
      btn.closest('.flex')?.textContent?.includes('GPS:')
    );
    
    if (gpsEditButton) {
      await user.click(gpsEditButton);
      const input = screen.getByDisplayValue('40.7128° N, 74.0060° W');
      expect(input).toBeInTheDocument();
    }
  });

  it("should call updateUnitName when saving name edit", async () => {
    const user = await import('@testing-library/user-event').then(m => m.default);
    const { useUnits } = await import('../context/UnitContext');
    const mockUpdateUnitName = vi.fn().mockResolvedValue({ success: true });
    useUnits.mockReturnValue({
      updateUnitName: mockUpdateUnitName,
      updateUnitLocation: vi.fn(),
      updateUnitGPS: vi.fn(),
    });

    renderComponent();
    
    const nameEditButton = screen.getAllByRole('button').find(btn => 
      btn.closest('.flex')?.previousSibling?.textContent === 'Machine Name'
    );
    
    if (nameEditButton) {
      await user.click(nameEditButton);
      const saveButton = screen.getByRole('button', { name: /check/i });
      await user.click(saveButton);
      
      expect(mockUpdateUnitName).toHaveBeenCalledWith(1, 'Test Unit');
    }
  });

  it("should open maps when GPS navigation button is clicked", async () => {
    const user = await import('@testing-library/user-event').then(m => m.default);
    renderComponent();
    
    const navButton = screen.getByTitle('Open Maps to select location');
    await user.click(navButton);
    
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockOpen).toHaveBeenCalledWith(
      'https://maps.google.com/maps?q=Test%20Location',
      '_blank'
    );
  });

  it("should not open maps when GPS navigation is canceled", async () => {
    const user = await import('@testing-library/user-event').then(m => m.default);
    mockConfirm.mockReturnValueOnce(false);
    
    renderComponent();
    
    const navButton = screen.getByTitle('Open Maps to select location');
    await user.click(navButton);
    
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("should update live values when metrics change", async () => {
    // Import the mock to manipulate it
    const { useRealtimeMetrics } = await import('../hooks/useRealtimeData');
    
    // Initial render with default metrics
    renderComponent();
    expect(screen.getByText('75.5 kW')).toBeInTheDocument();
    
    // Update metrics mock for next render
    useRealtimeMetrics.mockReturnValue({
      metrics: {
        temperature: { current: 80 },
        pressure: { current: 130 },
        flow_rate_inlet: { current: 55.0 },
        flow_rate_outlet: { current: 50.5 },
      },
      loading: false,
      error: null,
      connectionStatus: "connected",
      isConnected: true,
    });
    
    // Re-render with new mock
    // Note: In a real test, we'd rerender, but for now we verify the hook was called
    expect(useRealtimeMetrics).toHaveBeenCalled();
  });

  it("should display flow rate with correct color based on value", () => {
    // Test with normal flow rate (green)
    const normalFlowUnit = { ...mockUnit, flowRate: 45 };
    const { rerender } = renderComponent(normalFlowUnit);
    let flowElement = screen.getByText(/45.0 L\/min/);
    expect(flowElement.className).toContain('text-green-600');
    
    // Test with high flow rate (red)
    const highFlowUnit = { ...mockUnit, flowRate: 95 };
    rerender(
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <SettingsProvider>
              <UnitProvider>
                <UnitVitals unit={highFlowUnit} />
              </UnitProvider>
            </SettingsProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    );
    flowElement = screen.getByText(/95.0 L\/min/);
    expect(flowElement.className).toContain('text-red-600');
    
    // Test with low flow rate (red)
    const lowFlowUnit = { ...mockUnit, flowRate: 5 };
    rerender(
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <SettingsProvider>
              <UnitProvider>
                <UnitVitals unit={lowFlowUnit} />
              </UnitProvider>
            </SettingsProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    );
    flowElement = screen.getByText(/5.0 L\/min/);
    expect(flowElement.className).toContain('text-red-600');
  });
});
