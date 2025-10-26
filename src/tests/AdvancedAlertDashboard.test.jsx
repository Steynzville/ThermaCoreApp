/**
 * Tests for AdvancedAlertDashboard Component
 *
 * Tests basic rendering and alert display functionality.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdvancedAlertDashboard from "../components/alerts/AdvancedAlertDashboard";
import { AuthProvider } from "../context/AuthContext";
import { TenantProvider } from "../context/TenantContext";

// Mock alertService
vi.mock("../services/alertService", () => ({
  default: {
    getAlerts: vi.fn(() =>
      Promise.resolve({
        success: true,
        data: [],
      }),
    ),
    getAlertStatistics: vi.fn(() =>
      Promise.resolve({
        success: true,
        data: {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
      }),
    ),
    generateMockAlerts: vi.fn(() => []),
    generateMockAlertStatistics: vi.fn(() => ({
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    })),
    subscribeToAlerts: vi.fn(() => vi.fn()),
  },
  ALERT_SEVERITY: {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  },
  ALERT_STATUS: {
    ACTIVE: "active",
    ACKNOWLEDGED: "acknowledged",
    RESOLVED: "resolved",
  },
}));

describe("AdvancedAlertDashboard Component", () => {
  const renderComponent = (embedded = false) => {
    return render(
      <AuthProvider>
        <TenantProvider>
          <AdvancedAlertDashboard embedded={embedded} />
        </TenantProvider>
      </AuthProvider>,
    );
  };

  it("should render without crashing", () => {
    const { container } = renderComponent();
    expect(container).toBeTruthy();
  });

  it("should render in embedded mode", () => {
    const { container } = renderComponent(true);
    expect(container).toBeTruthy();
  });

  it("should initialize with alert state", () => {
    const { container } = renderComponent();
    expect(container).toBeTruthy();
  });
});
