import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import React, { Suspense } from "react";
import routes from "./routes";

// Mock all lazy-loaded components
vi.mock("../components/Dashboard", () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>,
}));

vi.mock("../components/HistoryView", () => ({
  default: () => <div data-testid="history-page">History</div>,
}));

vi.mock("../pages/AdminLanding", () => ({
  default: () => <div data-testid="admin-landing-page">Admin Landing</div>,
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

// Wrapper with Suspense for lazy components
const renderRoute = (path) => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<div data-testid="loading">Loading...</div>}>
        <Routes>
          {routes.map((route) => {
            // Skip routes with null component (special handling)
            if (!route.component && !route.specialHandling) return null;

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
      </Suspense>
    </MemoryRouter>
  );
};

describe("Routes Configuration", () => {
  it("should render register page for /register", async () => {
    renderRoute("/register");
    expect(await screen.findByTestId("register-page")).toBeInTheDocument();
  });

  it("should render dashboard for /dashboard", async () => {
    renderRoute("/dashboard");
    expect(await screen.findByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("should render history for /history", async () => {
    renderRoute("/history");
    expect(await screen.findByTestId("history-page")).toBeInTheDocument();
  });

  it("should render settings for /settings", async () => {
    renderRoute("/settings");
    expect(await screen.findByTestId("settings-page")).toBeInTheDocument();
  });

  it("should render alerts for /alerts", async () => {
    renderRoute("/alerts");
    expect(await screen.findByTestId("alerts-page")).toBeInTheDocument();
  });

  it("should render remote control for /remote-control", async () => {
    renderRoute("/remote-control");
    expect(await screen.findByTestId("remote-control-page")).toBeInTheDocument();
  });

  it("should render grid view for /grid-view", async () => {
    renderRoute("/grid-view");
    expect(await screen.findByTestId("grid-view-page")).toBeInTheDocument();
  });

  it("should render alarms for /alarms", async () => {
    renderRoute("/alarms");
    expect(await screen.findByTestId("alarms-page")).toBeInTheDocument();
  });

  it("should render reports for /reports", async () => {
    renderRoute("/reports");
    expect(await screen.findByTestId("reports-page")).toBeInTheDocument();
  });

  it("should render documents for /documents", async () => {
    renderRoute("/documents");
    expect(await screen.findByTestId("documents-page")).toBeInTheDocument();
  });

  it("should render admin landing for /admin", async () => {
    renderRoute("/admin");
    expect(await screen.findByTestId("admin-landing-page")).toBeInTheDocument();
  });

  it("should render admin panel for /admin/users", async () => {
    renderRoute("/admin/users");
    expect(await screen.findByTestId("admin-page")).toBeInTheDocument();
  });

  it("should render analytics for /analytics", async () => {
    renderRoute("/analytics");
    expect(await screen.findByTestId("analytics-page")).toBeInTheDocument();
  });

  it("should render advanced analytics for /advanced-analytics", async () => {
    renderRoute("/advanced-analytics");
    expect(await screen.findByTestId("advanced-analytics-page")).toBeInTheDocument();
  });

  it("should render SCADA main for /scada-dashboard", async () => {
    renderRoute("/scada-dashboard");
    expect(await screen.findByTestId("scada-main-page")).toBeInTheDocument();
  });

  it("should render realtime SCADA for /realtime-scada", async () => {
    renderRoute("/realtime-scada");
    expect(await screen.findByTestId("realtime-scada-page")).toBeInTheDocument();
  });

  it("should render protocol manager for /protocol-manager", async () => {
    renderRoute("/protocol-manager");
    expect(await screen.findByTestId("protocol-manager-page")).toBeInTheDocument();
  });

  it("should render system health for /system-health", async () => {
    renderRoute("/system-health");
    expect(await screen.findByTestId("system-health-page")).toBeInTheDocument();
  });

  it("should render synchronize units for /synchronize-units", async () => {
    renderRoute("/synchronize-units");
    expect(await screen.findByTestId("synchronize-units-page")).toBeInTheDocument();
  });

  it("should render unit performance for /unit-performance/:id", async () => {
    renderRoute("/unit-performance/123");
    expect(await screen.findByTestId("unit-performance-page")).toBeInTheDocument();
  });

  it("should handle /units route with special handling", async () => {
    renderRoute("/units");
    expect(await screen.findByTestId("special-unit-role-based")).toBeInTheDocument();
  });

  it("should handle /unit/:id route with special handling", async () => {
    renderRoute("/unit/123");
    expect(await screen.findByTestId("special-unit-role-based")).toBeInTheDocument();
  });

  it("should handle /unit-details/:id route with special handling", async () => {
    renderRoute("/unit-details/123");
    expect(await screen.findByTestId("special-unit-details-role-based")).toBeInTheDocument();
  });

  it("should have correct number of routes", () => {
    const validRoutes = routes.filter(r => r.component || r.specialHandling);
    expect(validRoutes.length).toBe(23);
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

  it("should have routes with empty roles array (open to all authenticated users)", () => {
    const emptyRolesRoutes = routes.filter((r) => r.roles.length === 0 && r.path !== "/register");
    expect(emptyRolesRoutes.length).toBeGreaterThan(0);
    emptyRolesRoutes.forEach((route) => {
      expect(route.isProtected).toBe(true);
      expect(["/advanced-analytics", "/scada-dashboard", "/realtime-scada", "/protocol-manager"]).toContain(route.path);
    });
  });

  // Ensure isAdminRoute documentation matches actual roles
  it("should have isAdminRoute match roles for admin-only routes", () => {
    const adminOnlyRoutes = routes.filter(r => r.isAdminRoute === true);
    expect(adminOnlyRoutes.length).toBeGreaterThan(0);
    adminOnlyRoutes.forEach((route) => {
      expect(route.roles).toEqual(["admin"]);
    });
  });

  it("should have lazy loaded components", () => {
    routes.forEach((route) => {
      if (route.component) {
        expect(route.component).toBeDefined();
      }
    });
  });
});
