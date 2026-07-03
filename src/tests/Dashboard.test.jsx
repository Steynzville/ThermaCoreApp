import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Dashboard from "../components/Dashboard";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: "/",
    search: "",
  }),
}));

// Mock framer-motion to avoid animation issues
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock child components to isolate testing
vi.mock("../components/Dashboard/EnhancedStatusDial", () => ({
  default: ({ title, count, onClick, clickable }) => {
    if (clickable) {
      return (
        <button
          type="button"
          data-testid={`status-dial-${title.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={onClick}
        >
          <span>{title}</span>
          <span>{count}</span>
        </button>
      );
    }

    return (
      <div
        data-testid={`status-dial-${title.toLowerCase().replace(/\s+/g, "-")}`}
        role="presentation"
      >
        <span>{title}</span>
        <span>{count}</span>
      </div>
    );
  },
}));

vi.mock("../components/Dashboard/QuickActionCard", () => ({
  default: ({ title, onClick }) => (
    <button
      type="button"
      data-testid={`quick-action-${title.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={onClick}
    >
      {title}
    </button>
  ),
}));

vi.mock("../components/Dashboard/UnitSummary", () => ({
  default: ({ totalUnits, onlineCount }) => (
    <div data-testid="unit-summary">
      <span>Total: {totalUnits}</span>
      <span>Online: {onlineCount}</span>
    </div>
  ),
}));

vi.mock("../components/NotificationBell", () => ({
  default: () => <div data-testid="notification-bell">Notifications</div>,
}));

vi.mock("../components/PerformanceDashboard", () => ({
  default: ({ hideHeader }) => (
    <div data-testid="performance-dashboard">
      Performance Dashboard
      {!hideHeader && <div>Header</div>}
    </div>
  ),
}));

vi.mock("../components/ui/HighTechToggle", () => ({
  default: ({ isPerformance, onToggle }) => (
    <button
      type="button"
      data-testid="view-toggle"
      onClick={() => onToggle(isPerformance ? "operator" : "performance")}
    >
      Toggle View: {isPerformance ? "Performance" : "Operator"}
    </button>
  ),
}));

// Test wrapper with providers
const TestWrapper = ({ children, userRole = "admin" }) => {
  const authContextValue = {
    user: { id: 1, username: "testuser", role: userRole },
    userRole: userRole,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  };

  return (
    <ThemeProvider>
      <AuthProvider value={authContextValue}>{children}</AuthProvider>
    </ThemeProvider>
  );
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Storage.prototype.getItem = vi.fn((key) => {
      if (key === "thermacore_user") {
        return JSON.stringify({ id: 1, username: "testuser" });
      }
      if (key === "thermacore_role") return "admin";
      if (key === "thermacore_backend_role") return "admin";
      if (key === "thermacore_token") return "mock-jwt-token";
      return null;
    });
  });

  describe("Rendering - Operator View", () => {
    it("should render dashboard header with title", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const titles = screen.getAllByText("Dashboard Overview");
      expect(titles.length).toBeGreaterThan(0);
    });

    it("should render dashboard description", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const descriptions = screen.getAllByText(
        "Monitor your ThermaCore units in real-time",
      );
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it("should render breadcrumb navigation", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    });

    it("should render notification bell", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getAllByTestId("notification-bell").length).toBeGreaterThan(0);
    });

    it("should render view toggle", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getAllByTestId("view-toggle").length).toBeGreaterThan(0);
    });
  });

  describe("Status Dials", () => {
    it("should render all 6 status dials", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getAllByTestId("status-dial-total-units").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-online").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-offline").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-maintenance").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-alerts").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-alarms").length).toBeGreaterThan(0);
    });

    it("should navigate when Total Units dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      fireEvent.click(screen.getAllByTestId("status-dial-total-units")[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
    });

    it("should navigate when Online dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      fireEvent.click(screen.getAllByTestId("status-dial-online")[0]);
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=online");
    });
  });

  describe("Quick Actions - Admin Only", () => {
    it("should not render quick actions for regular users", () => {
      const { container } = render(
        <TestWrapper userRole="user">
          <Dashboard />
        </TestWrapper>,
      );

      // Search within the container for quick action testids
      const quickActionElements = container.querySelectorAll('[data-testid^="quick-action-"]');
      expect(quickActionElements.length).toBe(0);
    });

    it("should render quick actions for admin users", () => {
      const { container } = render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      // Search within the container for quick action testids
      const quickActionElements = container.querySelectorAll('[data-testid^="quick-action-"]');
      expect(quickActionElements.length).toBeGreaterThan(0);
    });
  });

  describe("View Switching", () => {
    it("should start in operator view by default", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.queryAllByTestId("performance-dashboard").length).toBe(0);
    });

    it("should handle rapid toggle clicks", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggle = screen.getAllByTestId("view-toggle")[0];

      fireEvent.click(toggle);
      fireEvent.click(toggle);
      fireEvent.click(toggle);

      expect(toggle).toBeInTheDocument();
    });
  });

  describe("Layout and Styling", () => {
    it("should have proper container structure", () => {
      const { container } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
      expect(container.querySelector(".max-w-7xl")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined user role", () => {
      Storage.prototype.getItem = vi.fn(() => null);

      render(
        <TestWrapper userRole={null}>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getAllByText("Dashboard Overview").length).toBeGreaterThan(0);
    });

    it("should handle multiple quick action clicks", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const btn = screen.getAllByTestId("quick-action-sales-analytics")[0];

      fireEvent.click(btn);
      fireEvent.click(btn);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe("Accessibility", () => {
    it("should render main heading", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getAllByText("Dashboard Overview")[0].tagName).toBe("H1");
    });
  });
});
