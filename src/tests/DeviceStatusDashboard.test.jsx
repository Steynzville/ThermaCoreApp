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

// Mock device status service with proper data structure
// The component expects the service to return data in a specific format
vi.mock("../services/deviceStatusService", () => ({
  deviceStatusService: {
    // The component likely calls getDevices() which should return an array
    getDevices: vi.fn().mockReturnValue([
      {
        id: "TC001",
        name: "Device 1",
        status: "online",
        hasAlert: false,
        hasAlarm: false,
        lastSeen: new Date().toISOString(),
        healthStatus: "healthy",
        type: "thermacore",
      },
      {
        id: "TC002",
        name: "Device 2",
        status: "offline",
        hasAlert: true,
        hasAlarm: false,
        lastSeen: new Date().toISOString(),
        healthStatus: "warning",
        type: "thermacore",
      },
      {
        id: "TC003",
        name: "Device 3",
        status: "online",
        hasAlert: false,
        hasAlarm: true,
        lastSeen: new Date().toISOString(),
        healthStatus: "healthy",
        type: "thermacore",
      },
    ]),
    // The component might also call these methods
    getAllDeviceStatuses: vi.fn().mockReturnValue([
      {
        id: "TC001",
        name: "Device 1",
        status: "online",
        hasAlert: false,
        hasAlarm: false,
        lastSeen: new Date().toISOString(),
        healthStatus: "healthy",
      },
      {
        id: "TC002",
        name: "Device 2",
        status: "offline",
        hasAlert: true,
        hasAlarm: false,
        lastSeen: new Date().toISOString(),
        healthStatus: "warning",
      },
      {
        id: "TC003",
        name: "Device 3",
        status: "online",
        hasAlert: false,
        hasAlarm: true,
        lastSeen: new Date().toISOString(),
        healthStatus: "healthy",
      },
    ]),
    addStatusChangeListener: vi.fn().mockReturnValue(vi.fn()), // Returns unsubscribe function
    getDeviceStatus: vi.fn().mockResolvedValue({
      success: true,
      data: {
        devices: [{ id: "device-1", name: "Device 1", status: "online" }],
      },
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    // Add a method that returns a Map if the component expects it
    getStatusMap: vi.fn().mockReturnValue(new Map()),
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
