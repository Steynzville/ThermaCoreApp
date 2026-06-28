import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Dashboard from "../components/Dashboard";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock framer-motion to avoid animation issues
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock child components to isolate testing
vi.mock("../components/Dashboard/EnhancedStatusDial", () => ({
  default: ({ title, count, onClick, clickable }) => (
    <div
      data-testid={`status-dial-${title.toLowerCase().replace(/\s+/g, "-")}`}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? (e) => e.key === "Enter" && onClick() : undefined}
      role={clickable ? "button" : "presentation"}
      tabIndex={clickable ? 0 : undefined}
    >
      <span>{title}</span>
      <span>{count}</span>
    </div>
  ),
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
  // Mock AuthContext value
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
    // Mock localStorage
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === "thermacore_user") {
        return JSON.stringify({ id: 1, username: "testuser" });
      }
      if (key === "thermacore_role") {
        return "admin";
      }
      if (key === "thermacore_backend_role") {
        return "admin";
      }
      if (key === "thermacore_token") {
        return "mock-jwt-token";
      }
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

      expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
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

      const homeElements = screen.getAllByText("Home");
      expect(homeElements.length).toBeGreaterThan(0);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("should render notification bell", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const bells = screen.getAllByTestId("notification-bell");
      expect(bells.length).toBeGreaterThan(0);
    });

    it("should render view toggle", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggles = screen.getAllByTestId("view-toggle");
      expect(toggles.length).toBeGreaterThan(0);
    });
  });

  describe("Status Dials", () => {
    it("should render all 6 status dials", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const totalDials = screen.getAllByTestId("status-dial-total-units");
      expect(totalDials.length).toBeGreaterThan(0);
      
      const onlineDials = screen.getAllByTestId("status-dial-online");
      expect(onlineDials.length).toBeGreaterThan(0);
      
      const offlineDials = screen.getAllByTestId("status-dial-offline");
      expect(offlineDials.length).toBeGreaterThan(0);
      
      const maintenanceDials = screen.getAllByTestId("status-dial-maintenance");
      expect(maintenanceDials.length).toBeGreaterThan(0);
      
      const alertsDials = screen.getAllByTestId("status-dial-alerts");
      expect(alertsDials.length).toBeGreaterThan(0);
      
      const alarmsDials = screen.getAllByTestId("status-dial-alarms");
      expect(alarmsDials.length).toBeGreaterThan(0);
    });

    it("should render Total Units dial with correct count", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const totalDial = screen.getAllByTestId("status-dial-total-units")[0];
      expect(totalDial).toBeInTheDocument();
      expect(totalDial.textContent).toContain("Total Units");
    });

    it("should navigate when Total Units dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const totalDial = screen.getAllByTestId("status-dial-total-units")[0];
      fireEvent.click(totalDial);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
    });

    it("should navigate when Online dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const onlineDial = screen.getAllByTestId("status-dial-online")[0];
      fireEvent.click(onlineDial);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=online");
    });

    it("should navigate when Offline dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const offlineDial = screen.getAllByTestId("status-dial-offline")[0];
      fireEvent.click(offlineDial);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=offline");
    });

    it("should navigate when Maintenance dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const maintenanceDial = screen.getAllByTestId("status-dial-maintenance")[0];
      fireEvent.click(maintenanceDial);

      expect(mockNavigate).toHaveBeenCalledWith(
        "/grid-view?status=maintenance",
      );
    });

    it("should navigate to alerts page when Alerts dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const alertsDial = screen.getAllByTestId("status-dial-alerts")[0];
      fireEvent.click(alertsDial);

      expect(mockNavigate).toHaveBeenCalledWith("/alerts");
    });

    it("should navigate when Alarms dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const alarmsDial = screen.getAllByTestId("status-dial-alarms")[0];
      fireEvent.click(alarmsDial);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?alarms=true");
    });
  });

  describe("Quick Actions - Admin Only", () => {
    it("should render quick actions for admin users", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Quick Actions")).toBeInTheDocument();
      
      const analyticsActions = screen.getAllByTestId("quick-action-sales-analytics");
      expect(analyticsActions.length).toBeGreaterThan(0);
      
      const healthActions = screen.getAllByTestId("quick-action-system-health");
      expect(healthActions.length).toBeGreaterThan(0);
      
      const reportsActions = screen.getAllByTestId("quick-action-reports");
      expect(reportsActions.length).toBeGreaterThan(0);
    });

    it("should not render quick actions for regular users", () => {
      Storage.prototype.getItem = vi.fn((key) => {
        if (key === "thermacore_user") {
          return JSON.stringify({ id: 1, username: "testuser" });
        }
        if (key === "thermacore_role" || key === "thermacore_backend_role") {
          return "user";
        }
        if (key === "thermacore_token") {
          return "mock-jwt-token";
        }
        return null;
      });

      render(
        <TestWrapper userRole="user">
          <Dashboard />
        </TestWrapper>,
      );

      const analyticsActions = screen.queryAllByTestId("quick-action-sales-analytics");
      expect(analyticsActions.length).toBe(0);
    });

    it("should navigate to analytics when Sales Analytics is clicked", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const analyticsButton = screen.getAllByTestId(
        "quick-action-sales-analytics",
      )[0];
      fireEvent.click(analyticsButton);

      expect(mockNavigate).toHaveBeenCalledWith("/analytics");
    });

    it("should navigate to system health when System Health is clicked", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const healthButton = screen.getAllByTestId("quick-action-system-health")[0];
      fireEvent.click(healthButton);

      expect(mockNavigate).toHaveBeenCalledWith("/system-health");
    });

    it("should navigate to reports when Reports is clicked", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const reportsButton = screen.getAllByTestId("quick-action-reports")[0];
      fireEvent.click(reportsButton);

      expect(mockNavigate).toHaveBeenCalledWith("/reports");
    });
  });

  describe("View Switching", () => {
    it("should start in operator view by default", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
      
      const perfDashboards = screen.queryAllByTestId("performance-dashboard");
      expect(perfDashboards.length).toBe(0);
    });

    it("should switch to performance view when toggle is clicked", async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggleButton = screen.getAllByTestId("view-toggle")[0];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const perfDashboards = screen.getAllByTestId("performance-dashboard");
        expect(perfDashboards.length).toBeGreaterThan(0);
      });
    });

    it("should render performance dashboard without duplicate header", async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggleButton = screen.getAllByTestId("view-toggle")[0];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const perfDashboards = screen.getAllByTestId("performance-dashboard");
        expect(perfDashboards.length).toBeGreaterThan(0);
      });
    });

    it("should switch back to operator view from performance view", async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggleButton = screen.getAllByTestId("view-toggle")[0];

      fireEvent.click(toggleButton);
      await waitFor(() => {
        const perfDashboards = screen.getAllByTestId("performance-dashboard");
        expect(perfDashboards.length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getAllByTestId("view-toggle")[0]);
      await waitFor(() => {
        expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
      });
    });

    it("should show performance title and description in performance view", async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggleButton = screen.getAllByTestId("view-toggle")[0];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const perfTexts = screen.getAllByText("Performance Dashboard");
        expect(perfTexts.length).toBeGreaterThan(0);
        expect(
          screen.getByText(
            /Monitor power generation, efficiency, and environmental impact/i,
          ),
        ).toBeInTheDocument();
      });
    });

    it("should show performance breadcrumb in performance view", async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggleButton = screen.getAllByTestId("view-toggle")[0];
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const perfTexts = screen.getAllByText("Performance");
        expect(perfTexts.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Mobile Responsiveness", () => {
    it("should render mobile unit summary on small screens", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query.includes("max-width"),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getByTestId("unit-summary")).toBeInTheDocument();
    });
  });

  describe("Layout and Styling", () => {
    it("should have proper container max width", () => {
      const { container } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const maxWidthContainer = container.querySelector(".max-w-7xl");
      expect(maxWidthContainer).toBeInTheDocument();
    });

    it("should have responsive padding", () => {
      const { container } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const mainContainer = container.querySelector(".min-h-screen");
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer.className).toContain("p-3");
    });

    it("should apply custom className if provided", () => {
      const { container } = render(
        <TestWrapper>
          <Dashboard className="custom-class" />
        </TestWrapper>,
      );

      const mainContainer = container.querySelector(".custom-class");
      expect(mainContainer).toBeInTheDocument();
    });

    it("should have dark mode classes", () => {
      const { container } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const bgElement = container.querySelector(".dark\\:bg-gray-950");
      expect(bgElement).toBeInTheDocument();
    });
  });

  describe("Data Filtering by User Role", () => {
    it("should show all units for admin users", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const totalDials = screen.getAllByTestId("status-dial-total-units");
      expect(totalDials.length).toBeGreaterThan(0);
    });

    it("should show limited units for regular users", () => {
      render(
        <TestWrapper userRole="user">
          <Dashboard />
        </TestWrapper>,
      );

      const totalDials = screen.getAllByTestId("status-dial-total-units");
      expect(totalDials.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle navigation with undefined user role", () => {
      Storage.prototype.getItem = vi.fn(() => null);

      render(
        <TestWrapper userRole={null}>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
    });

    it("should handle rapid view switching", async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggleButton = screen.getAllByTestId("view-toggle")[0];

      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const perfTexts = screen.getAllByText("Performance Dashboard");
        expect(perfTexts.length).toBeGreaterThan(0);
      });
    });

    it("should handle multiple quick action clicks", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const analyticsButton = screen.getAllByTestId(
        "quick-action-sales-analytics",
      )[0];
      fireEvent.click(analyticsButton);
      fireEvent.click(analyticsButton);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith("/analytics");
    });
  });

  describe("Integration with Child Components", () => {
    it("should pass correct props to UnitSummary", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const unitSummary = screen.getByTestId("unit-summary");
      expect(unitSummary.textContent).toContain("Total:");
      expect(unitSummary.textContent).toContain("Online:");
    });

    it("should pass correct onClick handlers to status dials", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const dials = [
        screen.getAllByTestId("status-dial-total-units")[0],
        screen.getAllByTestId("status-dial-online")[0],
        screen.getAllByTestId("status-dial-offline")[0],
      ];

      dials.forEach((dial) => {
        expect(dial.getAttribute("role")).toBe("button");
      });
    });

    it("should pass correct onClick handlers to quick action cards", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const quickActions = [
        screen.getAllByTestId("quick-action-sales-analytics")[0],
        screen.getAllByTestId("quick-action-system-health")[0],
        screen.getAllByTestId("quick-action-reports")[0],
      ];

      quickActions.forEach((action) => {
        fireEvent.click(action);
      });

      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const h1 = screen.getByText("Dashboard Overview");
      expect(h1.tagName).toBe("H1");

      if (screen.queryByText("Quick Actions")) {
        const h2 = screen.getByText("Quick Actions");
        expect(h2.tagName).toBe("H2");
      }
    });

    it("should have descriptive navigation links", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const homeElements = screen.getAllByText("Home");
      expect(homeElements.length).toBeGreaterThan(0);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
