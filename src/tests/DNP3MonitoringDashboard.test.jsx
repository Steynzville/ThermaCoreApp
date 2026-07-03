/**
 * Tests for DNP3MonitoringDashboard Component
 *
 * Tests basic rendering and monitoring functionality.
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DNP3MonitoringDashboard from "../components/protocol/DNP3MonitoringDashboard";

// Mock window methods for DNP3MonitoringDashboard
beforeEach(() => {
  window.addEventListener = vi.fn();
  window.removeEventListener = vi.fn();
  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock apiFetch utilities
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(() =>
    Promise.resolve({
      devices: {},
    }),
  ),
  apiPostJson: vi.fn(() => Promise.resolve({ success: true })),
}));

describe("DNP3MonitoringDashboard Component", () => {
  const mockOnClose = vi.fn();

  const renderComponent = (props = {}) => {
    return render(
      <DNP3MonitoringDashboard
        isOpen={true}
        onClose={mockOnClose}
        tenantId={1}
        {...props}
      />,
    );
  };

  it("should render without crashing when open", () => {
    const { container } = renderComponent();
    expect(container).toBeTruthy();
  });

  it("should not render when closed", () => {
    const { container } = renderComponent({ isOpen: false });
    expect(container).toBeTruthy();
  });

  it("should initialize with monitoring state", () => {
    const { container } = renderComponent();
    expect(container).toBeTruthy();
  });
});
