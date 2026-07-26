import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TenantProvider, useTenant } from "../context/TenantContext";
import { AuthContext } from "../context/AuthContext";

// Mock apiFetch
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: vi.fn(),
}));

import { apiGetJson } from "../utils/apiFetch";

const TestComponent = () => {
  const {
    currentTenant,
    availableTenants,
    isAdmin,
    isClientAdmin,
    canSwitchTenants,
    switchTenant,
    getTenantQueryParam,
  } = useTenant();

  return (
    <div>
      <div data-testid="is-admin">{isAdmin ? "yes" : "no"}</div>
      <div data-testid="is-client-admin">{isClientAdmin ? "yes" : "no"}</div>
      <div data-testid="can-switch">{canSwitchTenants ? "yes" : "no"}</div>
      <div data-testid="current-tenant">
        {currentTenant ? currentTenant.name : "All Tenants"}
      </div>
      <div data-testid="tenants-count">{availableTenants.length}</div>
      <div data-testid="query-param">{getTenantQueryParam()}</div>
      <button onClick={() => switchTenant("tenant-1")}>Select Tenant 1</button>
      <button onClick={() => switchTenant(null)}>Select All</button>
    </div>
  );
};

const renderWithAuth = (ui, authValue) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <TenantProvider>{ui}</TenantProvider>
    </AuthContext.Provider>
  );
};

describe("TenantContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides correct context values for System Admin", async () => {
    apiGetJson.mockResolvedValueOnce({ success: true, data: null, message: "Cross-tenant access" });
    apiGetJson.mockResolvedValueOnce({
      success: true,
      data: [
        { id: "tenant-1", name: "Facility Alpha", client_id: 1 },
        { id: "tenant-2", name: "Facility Beta", client_id: 2 },
      ],
    });

    const authValue = {
      user: { id: 1, email: "admin@thermacore.com" },
      backendRole: "admin",
    };

    await act(async () => {
      renderWithAuth(<TestComponent />, authValue);
    });

    expect(screen.getByTestId("is-admin").textContent).toBe("yes");
    expect(screen.getByTestId("is-client-admin").textContent).toBe("no");
    expect(screen.getByTestId("can-switch").textContent).toBe("yes");
  });

  it("filters tenants by client_id for Client Admin", async () => {
    apiGetJson.mockResolvedValueOnce({ success: true, data: null, message: "Cross-tenant access" });
    apiGetJson.mockResolvedValueOnce({
      success: true,
      data: [
        { id: "tenant-1", name: "Facility Alpha", client_id: 1 },
        { id: "tenant-2", name: "Facility Beta", client_id: 2 },
      ],
    });

    const authValue = {
      user: { id: 2, email: "clientadmin@client.com", client_id: 1 },
      backendRole: "client_admin",
    };

    await act(async () => {
      renderWithAuth(<TestComponent />, authValue);
    });

    expect(screen.getByTestId("is-admin").textContent).toBe("no");
    expect(screen.getByTestId("is-client-admin").textContent).toBe("yes");
    expect(screen.getByTestId("can-switch").textContent).toBe("yes");
    expect(screen.getByTestId("tenants-count").textContent).toBe("1");
  });

  it("prevents tenant switching for Operators/Viewers", async () => {
    apiGetJson.mockResolvedValueOnce({
      success: true,
      data: { id: "tenant-1", name: "Facility Alpha", client_id: 1 },
    });

    const authValue = {
      user: { id: 3, email: "operator@client.com", client_id: 1, tenant: { id: "tenant-1", name: "Facility Alpha" } },
      backendRole: "operator",
    };

    await act(async () => {
      renderWithAuth(<TestComponent />, authValue);
    });

    expect(screen.getByTestId("is-admin").textContent).toBe("no");
    expect(screen.getByTestId("is-client-admin").textContent).toBe("no");
    expect(screen.getByTestId("can-switch").textContent).toBe("no");
  });
});
