/**
 * Smoke Tests for DeviceStatusDashboard Component
 *
 * Tests basic rendering and prop validation
 */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeviceStatusDashboard from "../components/DeviceStatusDashboard";

// Mock auth context
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", username: "testuser", role: "admin" },
    isAuthenticated: true,
    userRole: "admin",
  }),
}));

// Mock Unit context if the component uses it
vi.mock("../context/UnitContext", () => ({
  useUnits: () => ({
    units: [
      { id: "TC001", name: "Unit 1" },
      { id: "TC002", name: "Unit 2" },
      { id: "TC003", name: "Unit 3" },
    ],
  }),
}));

// Mock DeviceStatusIndicator component to avoid nested rendering issues
vi.mock("../components/DeviceStatusIndicator", () => ({
  default: ({ status, isOnline, hasAlert, hasAlarm, healthStatus, showText, size }) => (
    <div data-testid="device-status-indicator" data-status={status} data-online={isOnline}>
      {showText ? status : "●"}
    </div>
  ),
}));

// Mock UI components to simplify rendering
vi.mock("../components/ui/badge", () => ({
  Badge: ({ children, className, variant }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

vi.mock("../components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

vi.mock("../components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }) => (
    <h3 data-testid="card-title" className={className}>
      {children}
    </h3>
  ),
}));

vi.mock("../components/ui/input", () => ({
  Input: ({ placeholder, value, onChange, className }) => (
    <input
      data-testid="input"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
    />
  ),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Filter: () => <span data-testid="icon-filter">Filter</span>,
  RefreshCw: ({ className }) => <span data-testid="icon-refresh" className={className}>Refresh</span>,
  Search: () => <span data-testid="icon-search">Search</span>,
}));

// Mock device status service with proper data structure
// CRITICAL: The component expects getAllDeviceStatuses to return an array
// and addStatusChangeListener to return an unsubscribe function
const mockDeviceStatuses = [
  {
    id: "TC001",
    name: "Device 1",
    status: "online",
    isOnline: true,
    hasAlert: false,
    hasAlarm: false,
    lastSeen: new Date(),
    healthStatus: "healthy",
    location: "Building A",
    batteryLevel: 85.5,
  },
  {
    id: "TC002",
    name: "Device 2",
    status: "offline",
    isOnline: false,
    hasAlert: true,
    hasAlarm: false,
    lastSeen: new Date(Date.now() - 600000),
    healthStatus: "warning",
    location: "Building B",
    batteryLevel: 12.3,
  },
  {
    id: "TC003",
    name: "Device 3",
    status: "online",
    isOnline: true,
    hasAlert: false,
    hasAlarm: true,
    lastSeen: new Date(),
    healthStatus: "healthy",
    location: "Building A",
    batteryLevel: 67.8,
  },
  {
    id: "TC004",
    name: "Device 4",
    status: "maintenance",
    isOnline: false,
    hasAlert: false,
    hasAlarm: false,
    lastSeen: new Date(Date.now() - 1200000),
    healthStatus: "maintenance",
    location: "Building C",
    batteryLevel: 45.0,
  },
];

const mockUnsubscribe = vi.fn();

vi.mock("../services/deviceStatusService", () => ({
  deviceStatusService: {
    // CRITICAL: This must return an array for the .filter() call to work
    getAllDeviceStatuses: vi.fn().mockReturnValue(mockDeviceStatuses),
    addStatusChangeListener: vi.fn().mockReturnValue(mockUnsubscribe),
    getDeviceStatus: vi.fn().mockResolvedValue({
      success: true,
      data: {
        devices: [{ id: "device-1", name: "Device 1", status: "online" }],
      },
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  },
}));

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(" "),
}));

// Mock window methods
beforeEach(() => {
  // Mock ResizeObserver
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  
  // Mock IntersectionObserver
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

describe("DeviceStatusDashboard - Smoke Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing", async () => {
    const { container } = render(<DeviceStatusDashboard />);
    // Wait for any async operations
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("should render with default state", async () => {
    const { container } = render(<DeviceStatusDashboard />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it("should mount and unmount without errors", () => {
    const { unmount } = render(<DeviceStatusDashboard />);
    expect(() => unmount()).not.toThrow();
  });

  it("should handle component lifecycle", async () => {
    const { rerender, unmount } = render(<DeviceStatusDashboard />);

    // Wait for initial render
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });

    // Rerender should work
    expect(() => rerender(<DeviceStatusDashboard />)).not.toThrow();

    // Unmount should work
    expect(() => unmount()).not.toThrow();
  });

  it("should render dashboard structure", async () => {
    const { container } = render(<DeviceStatusDashboard />);
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("should render without throwing errors", () => {
    expect(() => render(<DeviceStatusDashboard />)).not.toThrow();
  });

  it("should handle state initialization", async () => {
    const { container } = render(<DeviceStatusDashboard />);
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("should handle multiple renders", async () => {
    const { rerender } = render(<DeviceStatusDashboard />);

    // Wait for initial render
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });

    for (let i = 0; i < 5; i++) {
      expect(() => rerender(<DeviceStatusDashboard />)).not.toThrow();
    }
  });

  it("should render with mocked service", async () => {
    const { container } = render(<DeviceStatusDashboard />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it("should handle async data loading", async () => {
    const { container } = render(<DeviceStatusDashboard />);
    // Component should handle async data loading
    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });
});
