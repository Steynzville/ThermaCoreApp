import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

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

// Dynamic mock for TenantContext
let mockTenantValue = {
  currentTenant: { id: "1", name: "Tenant One" },
  availableTenants: [
    { id: "1", name: "Tenant One" },
    { id: "2", name: "Tenant Two" },
  ],
  isAdmin: true,
  switchTenant: vi.fn(),
};

vi.mock("../context/TenantContext", () => ({
  useTenant: () => mockTenantValue,
}));

vi.mock("../components/admin/TenantSwitcher", () => ({
  default: () => <div data-testid="tenant-switcher">Tenant Switcher</div>,
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

// ✅ FIX: Proper AuthProvider mock
const mockAuthValue = {
  user: { id: 1, username: "testuser", role: "admin" },
  userRole: "admin",
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
};

// ✅ FIX: Test wrapper with proper provider structure
const TestWrapper = ({ children, userRole = "admin" }) => {
  const authValue = {
    ...mockAuthValue,
    userRole: userRole,
    user: { ...mockAuthValue.user, role: userRole },
  };

  return (
    <ThemeProvider>
      <AuthProvider value={authValue}>{children}</AuthProvider>
    </ThemeProvider>
  );
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mockTenantValue = {
      currentTenant: { id: "1", name: "Tenant One" },
      availableTenants: [
        { id: "1", name: "Tenant One" },
        { id: "2", name: "Tenant Two" },
      ],
      isAdmin: true,
      switchTenant: vi.fn(),
    };

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

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ✅ FIX: Wrap render in act()
  const renderComponent = (userRole = "admin") => {
    let result;
    act(() => {
      result = render(
        <TestWrapper userRole={userRole}>
          <Dashboard />
        </TestWrapper>
      );
    });
    return result;
  };

  describe("Rendering - Operator View", () => {
    it("should render dashboard header with title", () => {
      renderComponent();
      const titles = screen.getAllByText("Dashboard Overview");
      expect(titles.length).toBeGreaterThan(0);
    });

    it("should render dashboard description", () => {
      renderComponent();
      const descriptions = screen.getAllByText(
        "Monitor your ThermaCore units in real-time",
      );
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it("should render breadcrumb navigation", () => {
      renderComponent();
      expect(screen.getAllByText("Home").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    });

    it("should render notification bell", () => {
      renderComponent();
      expect(screen.getAllByTestId("notification-bell").length).toBeGreaterThan(0);
    });

    it("should render view toggle", () => {
      renderComponent();
      expect(screen.getAllByTestId("view-toggle").length).toBeGreaterThan(0);
    });
  });

  describe("Status Dials", () => {
    it("should render all 6 status dials", () => {
      renderComponent();
      expect(screen.getAllByTestId("status-dial-total-units").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-online").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-offline").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-maintenance").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-alerts").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("status-dial-alarms").length).toBeGreaterThan(0);
    });

    // ✅ FIX: Wrap interaction in act()
    it("should navigate when Total Units dial is clicked", () => {
      renderComponent();
      act(() => {
        fireEvent.click(screen.getAllByTestId("status-dial-total-units")[0]);
      });
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
    });

    // ✅ FIX: Wrap interaction in act()
    it("should navigate when Online dial is clicked", () => {
      renderComponent();
      act(() => {
        fireEvent.click(screen.getAllByTestId("status-dial-online")[0]);
      });
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=online");
    });
  });

  describe("Quick Actions - Admin Only", () => {
    it("should not render quick actions for regular users", () => {
      const { container } = renderComponent("user");

      // Search within the container for quick action testids
      const quickActionElements = container.querySelectorAll('[data-testid^="quick-action-"]');
      expect(quickActionElements.length).toBe(0);
    });

    it("should render quick actions for admin users", () => {
      const { container } = renderComponent("admin");

      // Search within the container for quick action testids
      const quickActionElements = container.querySelectorAll('[data-testid^="quick-action-"]');
      expect(quickActionElements.length).toBeGreaterThan(0);
    });
  });

  describe("View Switching", () => {
    it("should start in operator view by default", () => {
      renderComponent();
      expect(screen.queryAllByTestId("performance-dashboard").length).toBe(0);
    });

    // ✅ FIX: Wrap interactions in act()
    it("should handle rapid toggle clicks", () => {
      renderComponent();
      const toggle = screen.getAllByTestId("view-toggle")[0];

      act(() => {
        fireEvent.click(toggle);
        fireEvent.click(toggle);
        fireEvent.click(toggle);
      });

      expect(toggle).toBeInTheDocument();
    });
  });

  describe("Layout and Styling", () => {
    it("should have proper container structure", () => {
      const { container } = renderComponent();
      expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
      expect(container.querySelector(".max-w-7xl")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined user role", () => {
      Storage.prototype.getItem = vi.fn(() => null);
      renderComponent(null);
      expect(screen.getAllByText("Dashboard Overview").length).toBeGreaterThan(0);
    });

    // ✅ FIX: Wrap interactions in act()
    it("should handle multiple quick action clicks", () => {
      renderComponent("admin");
      const btn = screen.getAllByTestId("quick-action-sales-analytics")[0];

      act(() => {
        fireEvent.click(btn);
        fireEvent.click(btn);
      });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe("Accessibility", () => {
    it("should render main heading", () => {
      renderComponent();
      expect(screen.getAllByText("Dashboard Overview")[0].tagName).toBe("H1");
    });
  });

  describe("Admin Tenant Behavior", () => {
    it("should redirect admin to /admin if no tenant selected", () => {
      mockTenantValue.currentTenant = null;
      renderComponent("admin");
      expect(mockNavigate).toHaveBeenCalledWith("/admin", { replace: true });
    });

    it("should show tenant switcher for admin with tenant selected", () => {
      renderComponent("admin");
      expect(screen.getAllByTestId("tenant-switcher").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Managing: Tenant One").length).toBeGreaterThan(0);
    });

    it("should NOT show tenant switcher for regular user", () => {
      mockTenantValue.isAdmin = false;
      renderComponent("user");
      expect(screen.queryAllByTestId("tenant-switcher").length).toBe(0);
    });
  });
});
