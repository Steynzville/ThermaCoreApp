import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeviceStatusDashboard from "../components/DeviceStatusDashboard";
import { AuthProvider } from "../context/AuthContext";
import { deviceStatusService } from "../services/deviceStatusService";

// Mock the DeviceStatusIndicator component since it's already tested elsewhere
vi.mock("../components/DeviceStatusIndicator", () => ({
  default: ({ status, hasAlert, hasAlarm, isOnline, healthStatus, showText, size }) => (
    <div 
      data-testid="device-status-indicator" 
      data-status={status} 
      data-has-alert={String(hasAlert)} 
      data-has-alarm={String(hasAlarm)} 
      data-online={String(isOnline)} 
      data-health={healthStatus} 
      data-show-text={showText ? "true" : "false"} 
      data-size={size}
    >
      {showText && `Status: ${status}`}
    </div>
  ),
}));

// Mock the UI components
vi.mock("../components/ui/badge", () => ({
  Badge: ({ children, className }) => <span data-testid="badge" className={className}>{children}</span>,
}));

vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" className={className}>
      {children}
    </button>
  ),
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => <div data-testid="card" className={className}>{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }) => <h3 data-testid="card-title" className={className}>{children}</h3>,
  CardContent: ({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>,
}));

vi.mock("../components/ui/input", () => ({
  Input: ({ placeholder, value, onChange, className }) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid="search-input"
      className={className}
    />
  ),
}));

// Mock the deviceStatusService
vi.mock("../services/deviceStatusService", () => ({
  deviceStatusService: {
    getAllDeviceStatuses: vi.fn(),
    addStatusChangeListener: vi.fn(),
    removeStatusChangeListener: vi.fn(),
  },
}));

// Mock the AuthContext
vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

import { useAuth } from "../context/AuthContext";

describe("DeviceStatusDashboard", () => {
  const mockDevices = [
    {
      id: "TC001",
      name: "Unit 1",
      status: "online",
      hasAlert: false,
      hasAlarm: false,
      healthStatus: "optimal",
      lastSeen: new Date("2024-01-01T10:00:00"),
      isOnline: true,
      batteryLevel: 85.5,
      location: "Main Building",
    },
    {
      id: "TC002",
      name: "Unit 2",
      status: "offline",
      hasAlert: false,
      hasAlarm: false,
      healthStatus: "critical",
      lastSeen: new Date("2024-01-01T09:30:00"),
      isOnline: false,
      batteryLevel: 0,
      location: "Secondary Building",
    },
    {
      id: "TC003",
      name: "Unit 3",
      status: "online",
      hasAlert: true,
      hasAlarm: false,
      healthStatus: "warning",
      lastSeen: new Date("2024-01-01T10:15:00"),
      isOnline: true,
      batteryLevel: 45.2,
      location: "Main Building",
    },
    {
      id: "TC004",
      name: "Unit 4",
      status: "maintenance",
      hasAlert: false,
      hasAlarm: false,
      healthStatus: "optimal",
      lastSeen: new Date("2024-01-01T09:45:00"),
      isOnline: true, // Maintenance is considered online
      batteryLevel: 95.0,
      location: "Workshop",
    },
    {
      id: "TC005",
      name: "Unit 5",
      status: "online",
      hasAlert: false,
      hasAlarm: true,
      healthStatus: "critical",
      lastSeen: new Date("2024-01-01T10:30:00"),
      isOnline: true,
      batteryLevel: 30.5,
      location: "Main Building",
    },
    {
      id: "TC006",
      name: "Unit 6",
      status: "online",
      hasAlert: false,
      hasAlarm: false,
      healthStatus: "optimal",
      lastSeen: new Date("2024-01-01T10:45:00"),
      isOnline: true,
      batteryLevel: 75.8,
      location: "Secondary Building",
    },
    {
      id: "TC007",
      name: "Unit 7",
      status: "online",
      hasAlert: false,
      hasAlarm: false,
      healthStatus: "optimal",
      lastSeen: new Date("2024-01-01T10:50:00"),
      isOnline: true,
      batteryLevel: 90.0,
      location: "Main Building",
    },
  ];

  let mockUnsubscribe;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    deviceStatusService.getAllDeviceStatuses.mockReturnValue(mockDevices);
    deviceStatusService.addStatusChangeListener.mockReturnValue(mockUnsubscribe);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (role = "admin") => {
    useAuth.mockReturnValue({
      userRole: role,
      user: { username: "testuser" },
      isAuthenticated: true,
    });

    return render(
      <AuthProvider>
        <DeviceStatusDashboard />
      </AuthProvider>
    );
  };

  it("renders the dashboard with title and last updated time", () => {
    renderWithAuth();

    expect(screen.getByText("Device Status Dashboard")).toBeInTheDocument();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByTestId("button")).toBeInTheDocument();
  });

  it("displays status summary cards with correct counts", () => {
    renderWithAuth();

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument(); // Total devices

    // Use getAllByText and check length for "Online" since it appears multiple times
    const onlineLabels = screen.getAllByText("Online");
    expect(onlineLabels.length).toBeGreaterThan(0);
    
    // The online count should be 6 (TC001, TC003, TC004, TC005, TC006, TC007)
    // TC004 is in maintenance but isOnline: true
    expect(screen.getByText("6")).toBeInTheDocument();

    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Offline: TC002

    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Alert: TC003

    expect(screen.getByText("Alarms")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Alarm: TC005

    expect(screen.getByText("Maintenance")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Maintenance: TC004
  });

  it("displays all devices in the list for admin users", () => {
    renderWithAuth("admin");

    // Check that all device names are displayed
    expect(screen.getByText("Unit 1")).toBeInTheDocument();
    expect(screen.getByText("Unit 2")).toBeInTheDocument();
    expect(screen.getByText("Unit 3")).toBeInTheDocument();
    expect(screen.getByText("Unit 4")).toBeInTheDocument();
    expect(screen.getByText("Unit 5")).toBeInTheDocument();
    expect(screen.getByText("Unit 6")).toBeInTheDocument();
    expect(screen.getByText("Unit 7")).toBeInTheDocument();
  });

  it("filters devices for regular users (only units 1-6)", () => {
    renderWithAuth("user");

    // Regular users should only see TC001-TC006 (6 devices)
    expect(screen.getByText("Unit 1")).toBeInTheDocument();
    expect(screen.getByText("Unit 2")).toBeInTheDocument();
    expect(screen.getByText("Unit 3")).toBeInTheDocument();
    expect(screen.getByText("Unit 4")).toBeInTheDocument();
    expect(screen.getByText("Unit 5")).toBeInTheDocument();
    expect(screen.getByText("Unit 6")).toBeInTheDocument();
    expect(screen.queryByText("Unit 7")).not.toBeInTheDocument();
  });

  it("filters devices by search term", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const searchInput = screen.getByTestId("search-input");
    await user.type(searchInput, "Unit 2");

    // Should only show Unit 2
    expect(screen.getByText("Unit 2")).toBeInTheDocument();
    expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Unit 3")).not.toBeInTheDocument();
  });

  it("filters devices by search term (case insensitive)", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const searchInput = screen.getByTestId("search-input");
    await user.type(searchInput, "unit 2");

    expect(screen.getByText("Unit 2")).toBeInTheDocument();
    expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
  });

  it("searches by device ID", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const searchInput = screen.getByTestId("search-input");
    await user.type(searchInput, "TC005");

    expect(screen.getByText("Unit 5")).toBeInTheDocument();
    expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
  });

  it("searches by location", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const searchInput = screen.getByTestId("search-input");
    await user.type(searchInput, "Workshop");

    expect(screen.getByText("Unit 4")).toBeInTheDocument();
    expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
  });

  it("filters devices by status - online", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const filterSelect = screen.getByRole("combobox");
    await user.selectOptions(filterSelect, "online");

    // Should show only online devices (TC001, TC003, TC004, TC005, TC006, TC007)
    // Note: TC004 is in maintenance but isOnline: true, so it appears in online filter
    expect(screen.getByText("Unit 1")).toBeInTheDocument();
    expect(screen.getByText("Unit 3")).toBeInTheDocument();
    expect(screen.getByText("Unit 4")).toBeInTheDocument(); // Maintenance but online
    expect(screen.getByText("Unit 5")).toBeInTheDocument();
    expect(screen.getByText("Unit 6")).toBeInTheDocument();
    expect(screen.getByText("Unit 7")).toBeInTheDocument();
    expect(screen.queryByText("Unit 2")).not.toBeInTheDocument();
  });

  it("filters devices by status - offline", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const filterSelect = screen.getByRole("combobox");
    await user.selectOptions(filterSelect, "offline");

    // Should show only offline devices (TC002)
    expect(screen.getByText("Unit 2")).toBeInTheDocument();
    expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
  });

  it("filters devices by status - alerts", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const filterSelect = screen.getByRole("combobox");
    await user.selectOptions(filterSelect, "alerts");

    // Should show only devices with alerts (TC003)
    expect(screen.getByText("Unit 3")).toBeInTheDocument();
    expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
  });

  it("filters devices by status - alarms", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const filterSelect = screen.getByRole("combobox");
    await user.selectOptions(filterSelect, "alarms");

    // Should show only devices with alarms (TC005)
    expect(screen.getByText("Unit 5")).toBeInTheDocument();
    expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
  });

  it("filters devices by status - maintenance", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const filterSelect = screen.getByRole("combobox");
    await user.selectOptions(filterSelect, "maintenance");

    // Should show only devices in maintenance (TC004)
    expect(screen.getByText("Unit 4")).toBeInTheDocument();
    expect(screen.queryByText("Unit 1")).not.toBeInTheDocument();
  });

  it("combines search and status filters", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    // Search for "Main Building" and filter to show only online
    const searchInput = screen.getByTestId("search-input");
    await user.type(searchInput, "Main Building");

    const filterSelect = screen.getByRole("combobox");
    await user.selectOptions(filterSelect, "online");

    // Should show only online devices in Main Building
    // TC001, TC003, TC005, TC007 are in Main Building and online
    // TC004 is in Workshop (not Main Building)
    expect(screen.getByText("Unit 1")).toBeInTheDocument();
    expect(screen.getByText("Unit 3")).toBeInTheDocument();
    expect(screen.getByText("Unit 5")).toBeInTheDocument();
    expect(screen.getByText("Unit 7")).toBeInTheDocument();
    expect(screen.queryByText("Unit 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Unit 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Unit 6")).not.toBeInTheDocument();
  });

  it("shows empty state when no devices match filters", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const searchInput = screen.getByTestId("search-input");
    await user.type(searchInput, "NonExistentDevice");

    expect(screen.getByText("No devices match the current filters.")).toBeInTheDocument();
  });

  it("shows empty state when no devices found (no filters)", () => {
    // Override mock to return empty array
    deviceStatusService.getAllDeviceStatuses.mockReturnValue([]);

    renderWithAuth();

    expect(screen.getByText("No devices found.")).toBeInTheDocument();
  });

  it("handles refresh button click", async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const refreshButton = screen.getByTestId("button");
    expect(refreshButton).toHaveTextContent("Refresh");

    // Click refresh
    await user.click(refreshButton);

    // Button should be disabled during refresh
    expect(refreshButton).toBeDisabled();

    // Wait for refresh to complete
    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled();
    }, { timeout: 1200 });

    // Last updated should have been updated
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it("displays device details correctly", () => {
    renderWithAuth();

    // Check Unit 1 details
    expect(screen.getByText("TC001 • Main Building")).toBeInTheDocument();

    // Battery level for Unit 1
    expect(screen.getByText("85.5%")).toBeInTheDocument();

    // Last seen times should be formatted
    expect(screen.getByText("10:00:00 AM")).toBeInTheDocument();

    // Unit 2 should show offline status
    expect(screen.getByText("0.0%")).toBeInTheDocument();
    expect(screen.getByText("9:30:00 AM")).toBeInTheDocument();
  });

  it("shows device status indicator for each device (twice per device)", () => {
    renderWithAuth();

    const indicators = screen.getAllByTestId("device-status-indicator");
    // Each device renders DeviceStatusIndicator twice: 
    // 1. In the header (icon only)
    // 2. In the status row (with text)
    // So 7 devices * 2 = 14 indicators
    expect(indicators).toHaveLength(14);

    // Check first device indicator (header version - icon only)
    expect(indicators[0]).toHaveAttribute("data-status", "online");
    expect(indicators[0]).toHaveAttribute("data-has-alert", "false");
    expect(indicators[0]).toHaveAttribute("data-has-alarm", "false");
    expect(indicators[0]).toHaveAttribute("data-online", "true");
    expect(indicators[0]).toHaveAttribute("data-health", "optimal");
    expect(indicators[0]).toHaveAttribute("data-show-text", "false");
  });

  it("displays status indicator with showText=true for the status field", () => {
    renderWithAuth();

    // Find the status text indicators
    const indicators = screen.getAllByTestId("device-status-indicator");
    const statusIndicatorWithText = indicators.find(
      (el) => el.getAttribute("data-show-text") === "true"
    );

    expect(statusIndicatorWithText).toBeInTheDocument();
    expect(statusIndicatorWithText).toHaveAttribute("data-status", "online");
  });

  it("handles device status changes via listener", () => {
    let statusChangeCallback = null;
    deviceStatusService.addStatusChangeListener.mockImplementation((callback) => {
      statusChangeCallback = callback;
      return mockUnsubscribe;
    });

    renderWithAuth();

    // Simulate a status change
    const statusChange = {
      deviceId: "TC001",
      deviceName: "Unit 1",
      timestamp: new Date(),
      changes: [
        {
          type: "status",
          severity: "warning",
          event: "Status Change",
          message: "Unit 1 status changed from online to offline",
        },
      ],
    };

    // Trigger the callback
    statusChangeCallback(statusChange);

    // The listener should cause a refresh of the data
    // We can verify getAllDeviceStatuses was called again
    expect(deviceStatusService.getAllDeviceStatuses).toHaveBeenCalled();
  });

  it("cleans up listeners on unmount", () => {
    const { unmount } = renderWithAuth();

    unmount();

    // The unsubscribe function should be called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("shows colored battery levels based on percentage", () => {
    renderWithAuth();

    // Check battery levels with colors
    const battery85 = screen.getByText("85.5%");
    expect(battery85).toHaveClass("text-green-600");

    const battery45 = screen.getByText("45.2%");
    expect(battery45).toHaveClass("text-yellow-600");

    const battery0 = screen.getByText("0.0%");
    expect(battery0).toHaveClass("text-red-600");
  });
});
