import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import ProtocolStatusDashboard from "./ProtocolStatusDashboard";

// Mock hooks and utilities
vi.mock("@/utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant }) => <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className, onClick }) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardTitle: ({ children }) => <div data-testid="card-title">{children}</div>,
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value, className }) => <div data-testid="progress" data-value={value} className={className} />,
}));

// Mock icons
vi.mock("lucide-react", () => ({
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  AlertCircle: () => <span data-testid="alert-icon">AlertCircle</span>,
  BarChart3: () => <span data-testid="barchart-icon">BarChart3</span>,
  CheckCircle: () => <span data-testid="check-icon">CheckCircle</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  Database: () => <span data-testid="database-icon">Database</span>,
  TrendingUp: () => <span data-testid="trending-icon">TrendingUp</span>,
  Zap: () => <span data-testid="zap-icon">Zap</span>,
}));

// Import mocked modules
import { apiGetJson } from "@/utils/apiFetch";

const mockConnectedStatus = {
  summary: {
    total_protocols: 3,
    active_protocols: 3,
    health_score: 95,
    availability_summary: {
      fully_available: 3,
      degraded: 0,
      unavailable: 0,
    },
  },
  protocols: {
    mqtt: {
      name: "mqtt",
      connected: true,
      status: "ready",
      last_heartbeat: new Date().toISOString(),
      is_heartbeat_stale: false,
      metrics: {
        messages_sent: 1500,
        messages_received: 1450,
      },
    },
    modbus: {
      name: "modbus",
      connected: true,
      status: "ready",
      last_heartbeat: new Date().toISOString(),
      is_heartbeat_stale: false,
      metrics: {
        polls_successful: 300,
        polls_failed: 2,
      },
    },
    opcua: {
      name: "opcua",
      connected: true,
      status: "ready",
      last_heartbeat: new Date().toISOString(),
      is_heartbeat_stale: false,
      metrics: {
        nodes_subscribed: 150,
        data_updates: 1200,
      },
    },
  },
};

const mockDegradedStatus = {
  summary: {
    total_protocols: 3,
    active_protocols: 2,
    health_score: 67,
    availability_summary: {
      fully_available: 2,
      degraded: 1,
      unavailable: 0,
    },
  },
  protocols: {
    mqtt: {
      name: "mqtt",
      connected: true,
      status: "ready",
      last_heartbeat: new Date().toISOString(),
      is_heartbeat_stale: false,
    },
    modbus: {
      name: "modbus",
      connected: true,
      status: "degraded",
      last_heartbeat: new Date(Date.now() - 300000).toISOString(),
      is_heartbeat_stale: false,
    },
    opcua: {
      name: "opcua",
      connected: true,
      status: "ready",
      last_heartbeat: new Date().toISOString(),
      is_heartbeat_stale: false,
    },
  },
};

const mockDisconnectedStatus = {
  summary: {
    total_protocols: 3,
    active_protocols: 1,
    health_score: 33,
    availability_summary: {
      fully_available: 1,
      degraded: 0,
      unavailable: 2,
    },
  },
  protocols: {
    mqtt: {
      name: "mqtt",
      connected: true,
      status: "ready",
      last_heartbeat: new Date().toISOString(),
      is_heartbeat_stale: false,
    },
    modbus: {
      name: "modbus",
      connected: false,
      status: "disconnected",
      last_heartbeat: new Date(Date.now() - 600000).toISOString(),
      is_heartbeat_stale: true,
    },
    opcua: {
      name: "opcua",
      connected: false,
      status: "disconnected",
      last_heartbeat: new Date(Date.now() - 1200000).toISOString(),
      is_heartbeat_stale: true,
    },
  },
};

describe("ProtocolStatusDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProps = (props = {}) => {
    return render(
      <ProtocolStatusDashboard 
        tenantId="tenant-1" 
        onProtocolClick={vi.fn()}
        {...props} 
      />
    );
  };

  it("should render loading skeletons initially", () => {
    apiGetJson.mockImplementation(() => new Promise(() => {}));

    renderWithProps();

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(4);
  });

  it("should fetch and display protocol status on mount", async () => {
    apiGetJson.mockResolvedValue(mockConnectedStatus);

    renderWithProps();

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith(
        "/api/v1/protocols/status?tenant_id=tenant-1"
      );
    });

    await waitFor(() => {
      expect(screen.getByText("System Health Overview")).toBeInTheDocument();
      expect(screen.getByText("95% Healthy")).toBeInTheDocument();
      expect(screen.getByText("MQTT")).toBeInTheDocument();
      expect(screen.getByText("MODBUS")).toBeInTheDocument();
      expect(screen.getByText("OPCUA")).toBeInTheDocument();
    });
  });

  it("should display connected status for all protocols", async () => {
    apiGetJson.mockResolvedValue(mockConnectedStatus);

    renderWithProps();

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      const readyBadges = badges.filter(b => b.textContent.includes("ready"));
      expect(readyBadges.length).toBe(3);
    });
  });

  it("should display warning for degraded protocol", async () => {
    apiGetJson.mockResolvedValue(mockDegradedStatus);

    renderWithProps();

    await waitFor(() => {
      expect(screen.getByText("67% Healthy")).toBeInTheDocument();
      const badges = screen.getAllByTestId("badge");
      expect(badges.some(b => b.textContent.includes("degraded"))).toBe(true);
    });
  });

  it("should display disconnected status with alert", async () => {
    apiGetJson.mockResolvedValue(mockDisconnectedStatus);

    renderWithProps();

    await waitFor(() => {
      expect(screen.getByText("33% Healthy")).toBeInTheDocument();
      const badges = screen.getAllByTestId("badge");
      expect(badges.some(b => b.textContent.includes("disconnected"))).toBe(true);
    });
  });

  it("should display health score with correct badge variant", async () => {
    apiGetJson.mockResolvedValue(mockConnectedStatus);

    renderWithProps();

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      const healthBadge = badges.find(b => b.textContent.includes("Healthy"));
      expect(healthBadge).toHaveAttribute("data-variant", "default");
    });
  });

  it("should display degraded health badge variant", async () => {
    apiGetJson.mockResolvedValue(mockDegradedStatus);

    renderWithProps();

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      const healthBadge = badges.find(b => b.textContent.includes("Healthy"));
      expect(healthBadge).toHaveAttribute("data-variant", "secondary");
    });
  });

  it("should display disconnected health badge variant", async () => {
    apiGetJson.mockResolvedValue(mockDisconnectedStatus);

    renderWithProps();

    await waitFor(() => {
      const badges = screen.getAllByTestId("badge");
      const healthBadge = badges.find(b => b.textContent.includes("Healthy"));
      expect(healthBadge).toHaveAttribute("data-variant", "destructive");
    });
  });

  it("should display availability summary", async () => {
    apiGetJson.mockResolvedValue(mockConnectedStatus);

    renderWithProps();

    await waitFor(() => {
      expect(screen.getByText("Fully Available")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("Degraded")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("Unavailable")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  it("should call onProtocolClick when protocol card is clicked", async () => {
    const onProtocolClick = vi.fn();
    apiGetJson.mockResolvedValue(mockConnectedStatus);
    const user = userEvent.setup();

    render(<ProtocolStatusDashboard tenantId="tenant-1" onProtocolClick={onProtocolClick} />);

    await waitFor(() => {
      expect(screen.getByText("MQTT")).toBeInTheDocument();
    });

    const cards = screen.getAllByTestId("card");
    const mqttCard = cards.find(card => card.textContent.includes("MQTT"));
    await user.click(mqttCard);

    expect(onProtocolClick).toHaveBeenCalledWith("mqtt");
  });

  it("should display protocol metrics when available", async () => {
    apiGetJson.mockResolvedValue(mockConnectedStatus);

    renderWithProps();

    await waitFor(() => {
      expect(screen.getByText("messages sent")).toBeInTheDocument();
      expect(screen.getByText("1500")).toBeInTheDocument();
      expect(screen.getByText("messages received")).toBeInTheDocument();
      expect(screen.getByText("1450")).toBeInTheDocument();
      expect(screen.getByText("polls successful")).toBeInTheDocument();
      expect(screen.getByText("300")).toBeInTheDocument();
    });
  });

  it("should display heartbeat timestamp", async () => {
    apiGetJson.mockResolvedValue(mockConnectedStatus);

    renderWithProps();

    await waitFor(() => {
      const clockIcons = screen.getAllByTestId("clock-icon");
      expect(clockIcons.length).toBeGreaterThan(0);
    });
  });

  it("should handle empty protocol list", async () => {
    apiGetJson.mockResolvedValue({
      summary: {
        total_protocols: 0,
        active_protocols: 0,
        health_score: 0,
        availability_summary: {
          fully_available: 0,
          degraded: 0,
          unavailable: 0,
        },
      },
      protocols: {},
    });

    renderWithProps();

    await waitFor(() => {
      expect(screen.getByText("0% Healthy")).toBeInTheDocument();
    });

    const protocolNames = screen.queryByText("MQTT");
    expect(protocolNames).not.toBeInTheDocument();
  });

  it("should handle API error gracefully", async () => {
    apiGetJson.mockRejectedValue(new Error("Network error"));

    renderWithProps();

    await waitFor(() => {
      expect(screen.queryByText("System Health Overview")).not.toBeInTheDocument();
    });
  });

  it("should auto-refresh data periodically", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    apiGetJson.mockResolvedValue(mockConnectedStatus);

    renderWithProps();

    await vi.waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledTimes(1);
    });

    await vi.advanceTimersByTimeAsync(600000);

    await vi.waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it("should handle tenantId without query param", async () => {
    apiGetJson.mockResolvedValue(mockConnectedStatus);

    render(<ProtocolStatusDashboard tenantId={null} onProtocolClick={vi.fn()} />);

    await waitFor(() => {
      expect(apiGetJson).toHaveBeenCalledWith("/api/v1/protocols/status");
    });

    await waitFor(() => {
      expect(screen.getByText("System Health Overview")).toBeInTheDocument();
    });
  });

  it("should display quick stats cards", async () => {
    apiGetJson.mockResolvedValue(mockConnectedStatus);

    renderWithProps();

    await waitFor(() => {
      expect(screen.getByText("Total Protocols")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("Uptime Rate")).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("Health Score")).toBeInTheDocument();
      expect(screen.getByText("95%")).toBeInTheDocument();
    });
  });

  it("should calculate uptime rate correctly", async () => {
    apiGetJson.mockResolvedValue({
      summary: {
        total_protocols: 4,
        active_protocols: 2,
        health_score: 50,
        availability_summary: {
          fully_available: 2,
          degraded: 0,
          unavailable: 2,
        },
      },
      protocols: {},
    });

    renderWithProps();

    await waitFor(() => {
      expect(screen.getByText("50%")).toBeInTheDocument();
    });
  });
});
