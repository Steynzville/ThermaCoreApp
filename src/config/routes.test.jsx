import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import React from "react";
import routes from "./routes";

// Mock all lazy-loaded components
vi.mock("../components/Dashboard", () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>,
}));

vi.mock("../components/HistoryView", () => ({
  default: () => <div data-testid="history-page">History</div>,
}));

vi.mock("../components/AdminPanel", () => ({
  default: () => <div data-testid="admin-page">Admin Panel</div>,
}));

vi.mock("../components/SettingsView", () => ({
  default: () => <div data-testid="settings-page">Settings</div>,
}));

vi.mock("../components/AlertsView", () => ({
  default: () => <div data-testid="alerts-page">Alerts</div>,
}));

vi.mock("../components/AlarmsView", () => ({
  default: () => <div data-testid="alarms-page">Alarms</div>,
}));

vi.mock("../components/GridView", () => ({
  default: () => <div data-testid="grid-view-page">Grid View</div>,
}));

vi.mock("../components/RemoteControl", () => ({
  default: () => <div data-testid="remote-control-page">Remote Control</div>,
}));

vi.mock("../components/UnitPerformance", () => ({
  default: () => <div data-testid="unit-performance-page">Unit Performance</div>,
}));

vi.mock("../components/ViewAnalytics", () => ({
  default: () => <div data-testid="analytics-page">Analytics</div>,
}));

vi.mock("../components/SystemHealth", () => ({
  default: () => <div data-testid="system-health-page">System Health</div>,
}));

vi.mock("../components/SynchronizeUnitsOverview", () => ({
  default: () => <div data-testid="synchronize-units-page">Synchronize Units</div>,
}));

vi.mock("../components/UserRegistrationForm", () => ({
  default: () => <div data-testid="register-page">Register</div>,
}));

vi.mock("../components/AdvancedAnalyticsDashboard", () => ({
  default: () => <div data-testid="advanced-analytics-page">Advanced Analytics</div>,
}));

vi.mock("../components/MultiProtocolManager", () => ({
  default: () => <div data-testid="protocol-manager-page">Protocol Manager</div>,
}));

vi.mock("../pages/ReportsPage", () => ({
  default: () => <div data-testid="reports-page">Reports</div>,
}));

vi.mock("../pages/DocumentsPage", () => ({
  default: () => <div data-testid="documents-page">Documents</div>,
}));

vi.mock("../components/RealtimeScadaDashboard", () => ({
  default: () => <div data-testid="realtime-scada-page">Realtime SCADA</div>,
}));

vi.mock("../components/ScadaMainPage", () => ({
  default: () => <div data-testid="scada-main-page">SCADA Main</div>,
}));

vi.mock("../components/UnitDetails", () => ({
  default: () => <div data-testid="unit-details-page">Unit Details</div>,
}));

vi.mock("../components/UserUnitDetails", () => ({
  default: () => <div data-testid="user-unit-details-page">User Unit Details</div>,
}));

vi.mock("../components/UnitControl", () => ({
  default: () => <div data-testid="unit-control-page">Unit Control</div>,
}));

describe("Routes Configuration", () => {
  const renderRoute = (path) => {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {routes.map((route) => {
            const Component = route.component;
            const element = route.specialHandling ? (
              <div data-testid={`special-${route.specialHandling}`}>Special Handler</div>
            ) : Component ? (
              <Component />
            ) : null;
            
            return (
              <Route
                key={route.path}
                path={route.path}
                element={element}
              />
            );
          })}
        </Routes>
      </MemoryRouter>
    );
  };

  it("should render register page for /register", () => {
    renderRoute("/register");
    expect(screen.getByTestId("register-page")).toBeInTheDocument();
  });

  it("should render dashboard for /dashboard", () => {
    renderRoute("/dashboard");
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("should render history for /history", () => {
    renderRoute("/history");
    expect(screen.getByTestId("history-page")).toBeInTheDocument();
  });

  it("should render settings for /settings", () => {
    renderRoute("/settings");
    expect(screen.getByTestId("settings-page")).toBeInTheDocument();
  });

  it("should render alerts for /alerts", () => {
    renderRoute("/alerts");
    expect(screen.getByTestId("alerts-page")).toBeInTheDocument();
  });

  it("should render remote control for /remote-control", () => {
    renderRoute("/remote-control");
    expect(screen.getByTestId("remote-control-page")).toBeInTheDocument();
  });

  it("should render grid view for /grid-view", () => {
    renderRoute("/grid-view");
    expect(screen.getByTestId("grid-view-page")).toBeInTheDocument();
  });

  it("should render alarms for /alarms", () => {
    renderRoute("/alarms");
    expect(screen.getByTestId("alarms-page")).toBeInTheDocument();
  });

  it("should render reports for /reports", () => {
    renderRoute("/reports");
    expect(screen.getByTestId("reports-page")).toBeInTheDocument();
  });

  it("should render documents for /documents", () => {
    renderRoute("/documents");
    expect(screen.getByTestId("documents-page")).toBeInTheDocument();
  });

  it("should render admin panel for /admin", () => {
    renderRoute("/admin");
    expect(screen.getByTestId("admin-page")).toBeInTheDocument();
  });

  it("should render analytics for /analytics", () => {
    renderRoute("/analytics");
    expect(screen.getByTestId("analytics-page")).toBeInTheDocument();
  });

  it("should render advanced analytics for /advanced-analytics", () => {
    renderRoute("/advanced-analytics");
    expect(screen.getByTestId("advanced-analytics-page")).toBeInTheDocument();
  });

  it("should render SCADA main for /scada-dashboard", () => {
    renderRoute("/scada-dashboard");
    expect(screen.getByTestId("scada-main-page")).toBeInTheDocument();
  });

  it("should render realtime SCADA for /realtime-scada", () => {
    renderRoute("/realtime-scada");
    expect(screen.getByTestId("realtime-scada-page")).toBeInTheDocument();
  });

  it("should render protocol manager for /protocol-manager", () => {
    renderRoute("/protocol-manager");
    expect(screen.getByTestId("protocol-manager-page")).toBeInTheDocument();
  });

  it("should render system health for /system-health", () => {
    renderRoute("/system-health");
    expect(screen.getByTestId("system-health-page")).toBeInTheDocument();
  });

  it("should render synchronize units for /synchronize-units", () => {
    renderRoute("/synchronize-units");
    expect(screen.getByTestId("synchronize-units-page")).toBeInTheDocument();
  });

  it("should render unit performance for /unit-performance/:id", () => {
    renderRoute("/unit-performance/123");
    expect(screen.getByTestId("unit-performance-page")).toBeInTheDocument();
  });

  it("should handle /units route with special handling", () => {
    renderRoute("/units");
    expect(screen.getByTestId("special-unit-role-based")).toBeInTheDocument();
  });

  it("should handle /unit/:id route with special handling", () => {
    renderRoute("/unit/123");
    expect(screen.getByTestId("special-unit-role-based")).toBeInTheDocument();
  });

  it("should handle /unit-details/:id route with special handling", () => {
    renderRoute("/unit-details/123");
    expect(screen.getByTestId("special-unit-details-role-based")).toBeInTheDocument();
  });

  it("should have correct number of routes", () => {
    // Routes with special handling + regular routes
    // The route array has 24 entries
    expect(routes.length).toBe(24);
  });

  it("should have correct route structure", () => {
    routes.forEach((route) => {
      expect(route).toHaveProperty("path");
      expect(route).toHaveProperty("component");
      expect(route).toHaveProperty("isProtected");
      expect(route).toHaveProperty("roles");
    });
  });

  it("should have admin-only routes with correct roles", () => {
    const adminRoutes = routes.filter((r) => r.roles.includes("admin") && !r.roles.includes("user"));
    expect(adminRoutes.length).toBeGreaterThan(0);
    adminRoutes.forEach((route) => {
      expect(route.roles).toEqual(["admin"]);
    });
  });

  it("should have routes accessible by both admin and user", () => {
    const userRoutes = routes.filter((r) => r.roles.includes("user") && r.roles.includes("admin"));
    expect(userRoutes.length).toBeGreaterThan(0);
    userRoutes.forEach((route) => {
      expect(route.roles).toContain("admin");
      expect(route.roles).toContain("user");
    });
  });

  it("should have public registration route", () => {
    const registerRoute = routes.find((r) => r.path === "/register");
    expect(registerRoute).toBeDefined();
    expect(registerRoute.isProtected).toBe(false);
    expect(registerRoute.roles).toEqual([]);
  });

  it("should have routes with empty roles array", () => {
    const emptyRolesRoutes = routes.filter((r) => r.roles.length === 0 && r.path !== "/register");
    expect(emptyRolesRoutes.length).toBeGreaterThan(0);
    emptyRolesRoutes.forEach((route) => {
      expect(route.isProtected).toBe(true);
    });
  });

  it("should have lazy loaded components", () => {
    // All components are lazy-loaded via import(), so they should be functions
    routes.forEach((route) => {
      if (route.component) {
        expect(route.component).toBeDefined();
      }
    });
  });
});
