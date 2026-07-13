import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import AdvancedAlertDashboard from "./AdvancedAlertDashboard";

// Mock services and contexts
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../context/TenantContext", () => ({
  useTenant: vi.fn(),
}));

vi.mock("../../services/alertService", () => ({
  default: {
    generateMockAlerts: vi.fn(),
    generateMockAlertStatistics: vi.fn(),
    subscribeToAlerts: vi.fn(),
    acknowledgeAlert: vi.fn(),
  },
  ALERT_SEVERITY: {
    CRITICAL: "critical",
    HIGH: "high",
    WARNING: "warning",
    INFO: "info",
  },
  ALERT_STATUS: {
    OPEN: "open",
    ACKNOWLEDGED: "acknowledged",
    RESOLVED: "resolved",
    ESCALATED: "escalated",
  },
}));

// Mock UI components
vi.mock("../ui/badge", () => ({
  Badge: ({ children, variant }) => <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

vi.mock("../ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className }) => (
    <button
      data-testid="button"
      data-variant={variant}
      data-size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("../ui/card", () => ({
  Card: ({ children, className }) => <div data-testid="card" className={className}>{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>,
  CardTitle: ({ children }) => <div data-testid="card-title">{children}</div>,
}));

vi.mock("../ui/dialog", () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }) => <div data-testid="dialog-footer">{children}</div>,
}));

vi.mock("../ui/input", () => ({
  Input: ({ id, placeholder, value, onChange, className }) => (
    <input
      id={id}
      data-testid="input"
      placeholder={placeholder}
      value={value || ""}
      onChange={onChange}
      className={className}
    />
  ),
}));

vi.mock("../ui/select", () => ({
  Select: ({ children, value, onValueChange }) => (
    <div data-testid="select" data-value={value}>
      <select
        data-testid="select-native"
        value={value}
        onChange={(e) => onValueChange && onValueChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  ),
  SelectTrigger: ({ children, className }) => <div data-testid="select-trigger" className={className}>{children}</div>,
  SelectValue: () => <span data-testid="select-value">Select value</span>,
  SelectContent: ({ children }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }) => <option data-testid="select-item" value={value}>{children}</option>,
}));

vi.mock("../ui/textarea", () => ({
  Textarea: ({ id, placeholder, value, onChange, rows, className }) => (
    <textarea
      id={id}
      data-testid="textarea"
      placeholder={placeholder}
      value={value || ""}
      onChange={onChange}
      rows={rows}
      className={className}
    />
  ),
}));

// Mock icons
vi.mock("lucide-react", () => ({
  AlertCircle: () => <span data-testid="alert-icon">AlertCircle</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">AlertTriangle</span>,
  Bell: () => <span data-testid="bell-icon">Bell</span>,
  CheckCircle: () => <span data-testid="check-icon">CheckCircle</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  Info: () => <span data-testid="info-icon">Info</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  XCircle: () => <span data-testid="xcircle-icon">XCircle</span>,
}));

// Import mocked modules
import { useAuth } from "../../context/AuthContext";
import { useTenant } from "../../context/TenantContext";
import alertService, { ALERT_SEVERITY, ALERT_STATUS } from "../../services/alertService";

const mockAlerts = [
  {
    id: "1",
    type: "Temperature High",
    severity: "critical",
    status: "open",
    device: "TC001",
    message: "TC001 temperature critical",
    timestamp: new Date().toISOString(),
    value: 95,
    threshold: 80,
    acknowledged: false,
  },
  {
    id: "2",
    type: "Vibration Warning",
    severity: "warning",
    status: "open",
    device: "TC002",
    message: "TC002 vibration",
    timestamp: new Date().toISOString(),
    value: 12,
    threshold: 10,
    acknowledged: false,
  },
  {
    id: "3",
    type: "Pressure High",
    severity: "high",
    status: "acknowledged",
    device: "TC003",
    message: "TC003 pressure high",
    timestamp: new Date().toISOString(),
    value: 85,
    threshold: 70,
    acknowledged: true,
    acknowledgedBy: "user@example.com",
  },
  {
    id: "4",
    type: "Network Error",
    severity: "info",
    status: "resolved",
    device: "TC004",
    message: "Network connection lost",
    timestamp: new Date().toISOString(),
    acknowledged: true,
  },
];

const mockStatistics = {
  bySeverity: {
    critical: 1,
    high: 1,
    warning: 1,
    info: 0,
    resolved: 0,
  },
  byStatus: {
    resolved: 1,
  },
  avgResolutionTime: 15,
};

describe("AdvancedAlertDashboard", () => {
  const mockUser = { id: "user-1", email: "user@example.com" };
  const mockTenant = { id: "tenant-1", name: "Tenant 1" };
  const mockAcknowledge = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
    useTenant.mockReturnValue({ currentTenant: mockTenant });
    alertService.generateMockAlerts.mockReturnValue(mockAlerts);
    alertService.generateMockAlertStatistics.mockReturnValue(mockStatistics);
    alertService.subscribeToAlerts.mockReturnValue(vi.fn());
    alertService.acknowledgeAlert.mockResolvedValue({ success: true });
  });

  it("should render full dashboard when not embedded", async () => {
    render(<AdvancedAlertDashboard embedded={false} />);

    await waitFor(() => {
      expect(screen.getByText("Alert Management")).toBeInTheDocument();
      expect(screen.getByText("Real-time monitoring and alert management system")).toBeInTheDocument();
    });
  });

  it("should render embedded dashboard without header", async () => {
    render(<AdvancedAlertDashboard embedded={true} />);

    await waitFor(() => {
      expect(screen.queryByText("Alert Management")).not.toBeInTheDocument();
    });
  });

  it("should display statistics cards", async () => {
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      // Use getAllByText for "Critical" since it appears in both the card and the select options
      const criticalElements = screen.getAllByText("Critical");
      expect(criticalElements.length).toBeGreaterThan(0);
      expect(screen.getByText("Warning")).toBeInTheDocument();
      expect(screen.getByText("Resolved")).toBeInTheDocument();
      expect(screen.getByText("Avg. Resolution")).toBeInTheDocument();
      expect(screen.getByText("15m")).toBeInTheDocument();
    });
  });

  it("should display alerts list", async () => {
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Temperature High")).toBeInTheDocument();
      expect(screen.getByText("Vibration Warning")).toBeInTheDocument();
      expect(screen.getByText("Pressure High")).toBeInTheDocument();
      expect(screen.getByText("Network Error")).toBeInTheDocument();
    });
  });

  it("should display alert count", async () => {
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      // The title might be "Active Alerts" with the count in a separate element
      const titleElement = screen.getByTestId("card-title");
      expect(titleElement).toHaveTextContent("Active Alerts");
      expect(titleElement).toHaveTextContent("4");
    });
  });

  it("should filter alerts by severity", async () => {
    const user = userEvent.setup();
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Temperature High")).toBeInTheDocument();
    });

    const select = screen.getAllByTestId("select-native")[0];
    await user.selectOptions(select, "critical");

    expect(screen.getByText("Temperature High")).toBeInTheDocument();
    expect(screen.queryByText("Vibration Warning")).not.toBeInTheDocument();
  });

  it("should filter alerts by status", async () => {
    const user = userEvent.setup();
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Temperature High")).toBeInTheDocument();
    });

    const selects = screen.getAllByTestId("select-native");
    const statusSelect = selects[1];
    await user.selectOptions(statusSelect, "acknowledged");

    expect(screen.getByText("Pressure High")).toBeInTheDocument();
    expect(screen.queryByText("Temperature High")).not.toBeInTheDocument();
  });

  it("should search alerts by keyword", async () => {
    const user = userEvent.setup();
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Temperature High")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search alerts...");
    await user.type(searchInput, "Temperature");

    expect(screen.getByText("Temperature High")).toBeInTheDocument();
    expect(screen.queryByText("Vibration Warning")).not.toBeInTheDocument();
  });

  it("should open acknowledge dialog when Acknowledge button is clicked", async () => {
    const user = userEvent.setup();
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Temperature High")).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId("button");
    const acknowledgeButton = buttons.find(btn => btn.textContent.includes("Acknowledge"));
    await user.click(acknowledgeButton);

    expect(screen.getByText("Acknowledge Alert")).toBeInTheDocument();
    expect(screen.getByText("Add notes about this alert acknowledgment (optional)")).toBeInTheDocument();
  });

  it("should acknowledge an alert successfully", async () => {
    const user = userEvent.setup();
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Temperature High")).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId("button");
    const acknowledgeButton = buttons.find(btn => btn.textContent.includes("Acknowledge"));
    await user.click(acknowledgeButton);

    const textarea = screen.getByTestId("textarea");
    await user.type(textarea, "Test acknowledgment notes");

    const dialogButtons = screen.getAllByTestId("button");
    const confirmButton = dialogButtons.find(btn => btn.textContent.includes("Acknowledge"));
    await user.click(confirmButton);

    await waitFor(() => {
      expect(alertService.acknowledgeAlert).toHaveBeenCalledWith({
        alertId: "1",
        userId: mockUser.id,
        notes: "Test acknowledgment notes",
      });
    });
  });

  it("should cancel acknowledgment dialog", async () => {
    const user = userEvent.setup();
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Temperature High")).toBeInTheDocument();
    });

    const buttons = screen.getAllByTestId("button");
    const acknowledgeButton = buttons.find(btn => btn.textContent.includes("Acknowledge"));
    await user.click(acknowledgeButton);

    const dialogButtons = screen.getAllByTestId("button");
    const cancelButton = dialogButtons.find(btn => btn.textContent.includes("Cancel"));
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Acknowledge Alert")).not.toBeInTheDocument();
    });
  });

  it("should display loading state", async () => {
    // Clear the mock so loading state is shown
    alertService.generateMockAlerts.mockReturnValue([]);
    // Delay the response to show loading
    alertService.generateMockAlerts.mockImplementationOnce(() => {
      return [];
    });

    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Loading alerts...")).toBeInTheDocument();
    });
  });

  it("should display empty state when no alerts", async () => {
    alertService.generateMockAlerts.mockReturnValue([]);

    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("No alerts found")).toBeInTheDocument();
    });
  });

  it("should display severity colors correctly", async () => {
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      const criticalAlert = screen.getByText("Temperature High").closest(".border-l-4");
      expect(criticalAlert).toHaveClass("border-l-red-500", "bg-red-50");

      const warningAlert = screen.getByText("Vibration Warning").closest(".border-l-4");
      expect(warningAlert).toHaveClass("border-l-yellow-500", "bg-yellow-50");
    });
  });

  it("should display status badges correctly", async () => {
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      expect(badges.some(b => b.textContent.includes("Open"))).toBe(true);
      expect(badges.some(b => b.textContent.includes("Acknowledged"))).toBe(true);
      expect(badges.some(b => b.textContent.includes("Resolved"))).toBe(true);
    });
  });

  it("should display acknowledgment info for acknowledged alerts", async () => {
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Acknowledged by user@example.com")).toBeInTheDocument();
    });
  });

  it("should format timestamps correctly", async () => {
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });
  });

  it("should display device and value info for alerts", async () => {
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Device: TC001")).toBeInTheDocument();
      expect(screen.getByText("Value: 95 (Threshold: 80)")).toBeInTheDocument();
    });
  });

  it("should apply custom className", () => {
    const { container } = render(
      <AdvancedAlertDashboard embedded={false} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should subscribe to real-time alerts", async () => {
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(alertService.subscribeToAlerts).toHaveBeenCalled();
    });
  });

  it("should refresh data periodically", async () => {
    vi.useFakeTimers();
    render(<AdvancedAlertDashboard />);

    await waitFor(() => {
      expect(alertService.generateMockAlerts).toHaveBeenCalledTimes(1);
    });

    vi.advanceTimersByTime(600000);

    await waitFor(() => {
      expect(alertService.generateMockAlerts).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });
});
