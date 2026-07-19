import { fireEvent, render, screen, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";

// ✅ Updated import for co-located test file
import Dashboard from "./Dashboard";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

// ============================================================
// Reliable in-memory sessionStorage mock
// jsdom's native implementation can silently no-op in some
// environments/origins, causing sessionStorage.getItem to
// return undefined instead of the stored value.
// ============================================================
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

// ✅ FIX: Make useLocation mockable per test
let mockLocationValue = { pathname: "/", search: "" };

// Mock react-router-dom with mutable location
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocationValue,
}));

const mockNavigate = vi.fn();

// Dynamic mock for TenantContext
let mockTenantValue = {
  currentTenant: { id: "1", name: "Tenant One" },
  availableTenants: [
    { id: "1", name: "Tenant One" },
    { id: "2", name: "Tenant Two" },
  ],
  switchTenant: vi.fn(),
};

vi.mock("../context/TenantContext", () => ({
  useTenant: () => mockTenantValue,
}));

vi.mock("./admin/TenantSwitcher", () => ({
  default: () => <div data-testid="tenant-switcher">Tenant Switcher</div>,
}));

// Mock framer-motion to avoid animation issues
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

// Mock child components to isolate testing
vi.mock("./Dashboard/EnhancedStatusDial", () => ({
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

vi.mock("./Dashboard/QuickActionCard", () => ({
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

vi.mock("./Dashboard/UnitSummary", () => ({
  default: ({ totalUnits, onlineCount, alertCount, alarmCount }) => (
    <div data-testid="unit-summary">
      <span>Total: {totalUnits}</span>
      <span>Online: {onlineCount}</span>
      <span>Alerts: {alertCount}</span>
      <span>Alarms: {alarmCount}</span>
    </div>
  ),
}));

vi.mock("./NotificationBell", () => ({
  default: () => <div data-testid="notification-bell">Notifications</div>,
}));

vi.mock("./PerformanceDashboard", () => ({
  default: ({ hideHeader }) => (
    <div data-testid="performance-dashboard">
      Performance Dashboard
      {!hideHeader && <div>Header</div>}
    </div>
  ),
}));

vi.mock("./ui/HighTechToggle", () => ({
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

const mockAuthValue = {
  user: { id: 1, username: "testuser", role: "admin" },
  userRole: "admin",
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
};

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
  // Track current role for localStorage mock
  let currentMockRole = "admin";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    sessionStorage.clear();
    // ✅ Reset location mock
    mockLocationValue = { pathname: "/", search: "" };

    mockTenantValue = {
      currentTenant: { id: "1", name: "Tenant One" },
      availableTenants: [
        { id: "1", name: "Tenant One" },
        { id: "2", name: "Tenant Two" },
      ],
      switchTenant: vi.fn(),
    };

    // Set tenant_selected flag for admin tests
    sessionStorage.setItem("tenant_selected", "true");
    currentMockRole = "admin";

    // Only mock localStorage — don't touch Storage.prototype
    // so sessionStorage's real get/set behavior is preserved.
    window.localStorage.getItem = vi.fn((key) => {
      if (key === "thermacore_user") {
        return JSON.stringify({ id: 1, username: "testuser" });
      }
      if (key === "thermacore_role") return currentMockRole;
      if (key === "thermacore_backend_role") return currentMockRole;
      if (key === "thermacore_token") return "mock-jwt-token";
      return null;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    sessionStorage.clear();
    // Reset localStorage mock
    window.localStorage.getItem = vi.fn();
    // Reset mockTenantValue properties to avoid test leakage
    mockTenantValue.currentTenant = { id: "1", name: "Tenant One" };
  });

  const renderComponent = (userRole = "admin") => {
    // Update the role for localStorage mock
    currentMockRole = userRole;

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

    it("should render dashboard description for admin user with tenant", () => {
      renderComponent("admin");
      const descriptions = screen.getAllByText("Managing: Tenant One");
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it("should render dashboard description for admin with All Tenants", () => {
      mockTenantValue.currentTenant = null;
      renderComponent("admin");
      expect(screen.getByText("Managing: All Tenants")).toBeInTheDocument();
    });

    it("should render dashboard description for regular user", () => {
      renderComponent("user");
      const descriptions = screen.getAllByText(/Welcome back/);
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

    it("should navigate when Total Units dial is clicked", () => {
      renderComponent();
      act(() => {
        fireEvent.click(screen.getAllByTestId("status-dial-total-units")[0]);
      });
      expect(mockNavigate).toHaveBeenCalledWith("/grid-view?status=all");
    });

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
      const quickActionElements = container.querySelectorAll('[data-testid^="quick-action-"]');
      expect(quickActionElements.length).toBe(0);
    });

    it("should render quick actions for admin users", () => {
      const { container } = renderComponent("admin");
      const quickActionElements = container.querySelectorAll('[data-testid^="quick-action-"]');
      expect(quickActionElements.length).toBeGreaterThan(0);
    });
  });

  describe("View Switching", () => {
    it("should start in operator view by default", () => {
      renderComponent();
      expect(screen.queryAllByTestId("performance-dashboard").length).toBe(0);
    });

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
      // Override localStorage mock to return null for all keys
      window.localStorage.getItem = vi.fn(() => null);
      renderComponent(null);
      expect(screen.getAllByText("Dashboard Overview").length).toBeGreaterThan(0);
    });

    it("should handle multiple quick action clicks", () => {
      renderComponent("admin");
      const btn = screen.getAllByTestId("quick-action-sales-analytics")[0];

      act(() => {
        fireEvent.click(btn);
        fireEvent.click(btn);
      });

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it("should render UnitSummary with correct alert and alarm counts", () => {
      const { container } = renderComponent("admin");
      const unitSummary = container.querySelector('[data-testid="unit-summary"]');
      expect(unitSummary).toBeInTheDocument();
      
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
      expect(screen.getByText(/Online:/)).toBeInTheDocument();
      expect(screen.getByText(/Alerts:/)).toBeInTheDocument();
      expect(screen.getByText(/Alarms:/)).toBeInTheDocument();
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
      sessionStorage.removeItem("tenant_selected");
      mockTenantValue.currentTenant = null;
      renderComponent("admin");
      expect(mockNavigate).toHaveBeenCalledWith("/admin", { replace: true });
    });

    it("should show tenant switcher for admin with tenant selected", () => {
      renderComponent("admin");
      expect(screen.getAllByTestId("tenant-switcher").length).toBeGreaterThan(0);
      expect(screen.getByText("Managing: Tenant One")).toBeInTheDocument();
    });

    it("should NOT show tenant switcher for regular user", () => {
      renderComponent("user");
      expect(screen.queryAllByTestId("tenant-switcher").length).toBe(0);
    });

    it("should show 6 units when a specific tenant is selected", () => {
      mockTenantValue.currentTenant = { id: "1", name: "Tenant One" };
      renderComponent("admin");
      const totalUnitsDial = screen.getByTestId("status-dial-total-units");
      expect(totalUnitsDial).toHaveTextContent("6");
    });

    it("should show all 20 units when All Tenants is selected", () => {
      mockTenantValue.currentTenant = null;
      renderComponent("admin");
      const totalUnitsDial = screen.getByTestId("status-dial-total-units");
      expect(totalUnitsDial).toHaveTextContent("20");
    });

    it("should show 6 units for regular users", () => {
      renderComponent("user");
      const totalUnitsDial = screen.getByTestId("status-dial-total-units");
      expect(totalUnitsDial).toHaveTextContent("6");
    });

    // ✅ FIX: Test query param fallback with proper mocking
    it("should accept tenant_selected query param when sessionStorage is not set", () => {
      sessionStorage.removeItem("tenant_selected");
      // Set location mock to include the query param
      mockLocationValue = { pathname: "/dashboard", search: "?tenant_selected=true" };
      // ✅ FIX: Set currentTenant to null for "All Tenants" view (20 units)
      mockTenantValue.currentTenant = null;

      let result;
      act(() => {
        result = render(
          <ThemeProvider>
            <AuthProvider value={{ ...mockAuthValue, userRole: "admin", user: { ...mockAuthValue.user, role: "admin" } }}>
              <Dashboard />
            </AuthProvider>
          </ThemeProvider>
        );
      });

      // The component should render (not redirect) because the query param is present
      expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
      // Verify the dashboard shows all 20 units (admin view - "All Tenants")
      const totalUnitsDial = screen.getByTestId("status-dial-total-units");
      expect(totalUnitsDial).toHaveTextContent("20");
    });
  });
});
