import { describe, expect, it } from "vitest";
import routes from "../config/routes";

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
});
