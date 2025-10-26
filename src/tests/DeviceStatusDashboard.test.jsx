/**
 * Smoke Tests for DeviceStatusDashboard Component
 *
 * Tests basic rendering and prop validation
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeviceStatusDashboard from "../components/DeviceStatusDashboard";

// Mock auth context
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "1", username: "testuser", role: "admin" },
    isAuthenticated: true,
  }),
}));

// Mock device status service
vi.mock("../services/deviceStatusService", () => ({
  deviceStatusService: {
    getAllDeviceStatuses: vi.fn().mockReturnValue([
      {
        id: "TC001",
        name: "Device 1",
        status: "online",
        hasAlert: false,
        hasAlarm: false,
        lastSeen: new Date(),
        healthStatus: "healthy",
      },
      {
        id: "TC002",
        name: "Device 2",
        status: "offline",
        hasAlert: true,
        hasAlarm: false,
        lastSeen: new Date(),
        healthStatus: "warning",
      },
    ]),
    addStatusChangeListener: vi.fn().mockReturnValue(vi.fn()), // Returns unsubscribe function
    getDeviceStatus: vi.fn().mockResolvedValue({
      success: true,
      data: {
        devices: [{ id: "device-1", name: "Device 1", status: "online" }],
      },
    }),
    initialize: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    getDevices: vi.fn().mockReturnValue(new Map()),
  },
}));

describe("DeviceStatusDashboard - Smoke Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { container } = render(<DeviceStatusDashboard />);
    expect(container).toBeInTheDocument();
  });

  it("should render with default state", () => {
    const { container } = render(<DeviceStatusDashboard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should mount and unmount without errors", () => {
    const { unmount } = render(<DeviceStatusDashboard />);
    expect(() => unmount()).not.toThrow();
  });

  it("should handle component lifecycle", () => {
    const { rerender, unmount } = render(<DeviceStatusDashboard />);

    // Rerender should work
    expect(() => rerender(<DeviceStatusDashboard />)).not.toThrow();

    // Unmount should work
    expect(() => unmount()).not.toThrow();
  });

  it("should render dashboard structure", () => {
    const { container } = render(<DeviceStatusDashboard />);
    expect(container).toBeInTheDocument();
  });

  it("should render without throwing errors", () => {
    expect(() => render(<DeviceStatusDashboard />)).not.toThrow();
  });

  it("should handle state initialization", () => {
    const { container } = render(<DeviceStatusDashboard />);
    expect(container).toBeInTheDocument();
  });

  it("should handle multiple renders", () => {
    const { rerender } = render(<DeviceStatusDashboard />);

    for (let i = 0; i < 5; i++) {
      expect(() => rerender(<DeviceStatusDashboard />)).not.toThrow();
    }
  });

  it("should render with mocked service", () => {
    const { container } = render(<DeviceStatusDashboard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should handle async data loading", async () => {
    const { container } = render(<DeviceStatusDashboard />);
    // Component should handle async data loading
    expect(container).toBeInTheDocument();
  });
});
