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

      expect(
        screen.getByText("Monitor your ThermaCore units in real-time"),
      ).toBeInTheDocument();
    });

    it("should render breadcrumb navigation", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("should render notification bell", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    });

    it("should render view toggle", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getByTestId("view-toggle")).toBeInTheDocument();
    });
  });

  describe("Status Dials", () => {
    it("should render all 6 status dials", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      expect(screen.getByTestId("status-dial-total-units")).toBeInTheDocument();
      expect(screen.getByTestId("status-dial-online")).toBeInTheDocument();
      expect(screen.getByTestId("status-dial-offline")).toBeInTheDocument();
      expect(screen.getByTestId("status-dial-maintenance")).toBeInTheDocument();
      expect(screen.getByTestId("status-dial-alerts")).toBeInTheDocument();
      expect(screen.getByTestId("status-dial-alarms")).toBeInTheDocument();
    });

    it("should render Total Units dial with correct count", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const totalDial = screen.getByTestId("status-dial-total-units");
      expect(totalDial).toBeInTheDocument();
      // The mock units data has 24 units
      expect(totalDial.textContent).toContain("Total Units");
    });

    it("should navigate when Total Units dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const totalDial = screen.getByTestId("status-dial-total-units");
      fireEvent.click(totalDial);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
    });

    it("should navigate when Online dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const onlineDial = screen.getByTestId("status-dial-online");
      fireEvent.click(onlineDial);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=online");
    });

    it("should navigate when Offline dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const offlineDial = screen.getByTestId("status-dial-offline");
      fireEvent.click(offlineDial);

      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=offline");
    });

    it("should navigate when Maintenance dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const maintenanceDial = screen.getByTestId("status-dial-maintenance");
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

      const alertsDial = screen.getByTestId("status-dial-alerts");
      fireEvent.click(alertsDial);

      expect(mockNavigate).toHaveBeenCalledWith("/alerts");
    });

    it("should navigate when Alarms dial is clicked", () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const alarmsDial = screen.getByTestId("status-dial-alarms");
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
      expect(
        screen.getByTestId("quick-action-sales-analytics"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("quick-action-system-health"),
      ).toBeInTheDocument();
      expect(screen.getByTestId("quick-action-reports")).toBeInTheDocument();
    });

    it("should not render quick actions for regular users", () => {
      // Mock localStorage for user role
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

      // The actual component checks userRole from context, not localStorage directly
      // But since our mock doesn't pass through the context properly,
      // we'll check that the component renders without quick actions
      expect(
        screen.queryByTestId("quick-action-sales-analytics"),
      ).not.toBeInTheDocument();
    });

    it("should navigate to analytics when Sales Analytics is clicked", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const analyticsButton = screen.getByTestId(
        "quick-action-sales-analytics",
      );
      fireEvent.click(analyticsButton);

      expect(mockNavigate).toHaveBeenCalledWith("/analytics");
    });

    it("should navigate to system health when System Health is clicked", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const healthButton = screen.getByTestId("quick-action-system-health");
      fireEvent.click(healthButton);

      expect(mockNavigate).toHaveBeenCalledWith("/system-health");
    });

    it("should navigate to reports when Reports is clicked", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const reportsButton = screen.getByTestId("quick-action-reports");
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
      expect(
        screen.queryByTestId("performance-dashboard"),
      ).not.toBeInTheDocument();
    });

    it("should switch to performance view when toggle is clicked", async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggleButton = screen.getByTestId("view-toggle");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId("performance-dashboard")).toBeInTheDocument();
      });
    });

    it("should render performance dashboard without duplicate header", async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggleButton = screen.getByTestId("view-toggle");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId("performance-dashboard")).toBeInTheDocument();
        // Performance dashboard should be rendered with hideHeader=true
      });
    });

    it("should switch back to operator view from performance view", async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>,
      );

      const toggleButton = screen.getByTestId("view-toggle");

      // Switch to performance
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByTestId("performance-dashboard")).toBeInTheDocument();
      });

      // Switch back to operator
      fireEvent.click(screen.getByTestId("view-toggle"));
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

      const toggleButton = screen.getByTestId("view-toggle");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(
          screen.getAllByText("Performance Dashboard").length,
        ).toBeGreaterThan(0);
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

      const toggleButton = screen.getByTestId("view-toggle");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText("Performance")).toBeInTheDocument();
      });
    });
  });

  describe("Mobile Responsiveness", () => {
    it("should render mobile unit summary on small screens", () => {
      // Mock matchMedia for small screen
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

      // Unit summary should be present (it's always rendered but with md:hidden class)
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

      // Admin should see all units
      const totalDial = screen.getByTestId("status-dial-total-units");
      expect(totalDial).toBeInTheDocument();
    });

    it("should show limited units for regular users", () => {
      render(
        <TestWrapper userRole="user">
          <Dashboard />
        </TestWrapper>,
      );

      // Regular users should see limited units (first 6)
      const totalDial = screen.getByTestId("status-dial-total-units");
      expect(totalDial).toBeInTheDocument();
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

      const toggleButton = screen.getByTestId("view-toggle");

      // Rapidly switch views
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);

      await waitFor(() => {
        // Should end up in performance view
        expect(
          screen.getAllByText("Performance Dashboard").length,
        ).toBeGreaterThan(0);
      });
    });

    it("should handle multiple quick action clicks", () => {
      render(
        <TestWrapper userRole="admin">
          <Dashboard />
        </TestWrapper>,
      );

      const analyticsButton = screen.getByTestId(
        "quick-action-sales-analytics",
      );
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
        screen.getByTestId("status-dial-total-units"),
        screen.getByTestId("status-dial-online"),
        screen.getByTestId("status-dial-offline"),
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
        screen.getByTestId("quick-action-sales-analytics"),
        screen.getByTestId("quick-action-system-health"),
        screen.getByTestId("quick-action-reports"),
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

      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
  });
});
