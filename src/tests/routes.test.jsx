import { describe, expect, it } from "vitest";
import routes from "./routes";

describe("Routes Configuration", () => {
  it("includes client_admin in protected routes roles", () => {
    const dashboardRoute = routes.find((r) => r.path === "/dashboard");
    expect(dashboardRoute).toBeDefined();
    expect(dashboardRoute.roles).toContain("client_admin");

    const remoteControlRoute = routes.find((r) => r.path === "/remote-control");
    expect(remoteControlRoute).toBeDefined();
    expect(remoteControlRoute.roles).toContain("client_admin");

    const adminRoute = routes.find((r) => r.path === "/admin");
    expect(adminRoute).toBeDefined();
    expect(adminRoute.roles).toContain("client_admin");

    const adminUsersRoute = routes.find((r) => r.path === "/admin/users");
    expect(adminUsersRoute).toBeDefined();
    expect(adminUsersRoute.roles).toContain("client_admin");
  });

  it("should have isAdminRoute flag for admin-only routes", () => {
    const adminOnlyRoutes = routes.filter(
      (route) =>
        route.isAdminRoute === true &&
        (route.path === "/admin" || route.path === "/admin/users")
    );

    expect(adminOnlyRoutes.length).toBeGreaterThan(0);
    adminOnlyRoutes.forEach((route) => {
      // Admin routes should include both admin and client_admin roles
      expect(route.roles).toEqual(["admin", "client_admin"]);
    });
  });
});
