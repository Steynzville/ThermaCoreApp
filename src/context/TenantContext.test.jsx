import { render, waitFor, act } from "@testing-library/react";
import { it, expect, vi, beforeEach } from "vitest";
import { TenantProvider, useTenant } from "./TenantContext";
import { apiGetJson } from "../utils/apiFetch";
const { auth } = vi.hoisted(() => ({
  auth: { user: { id: 1, client_id: 10 }, backendRole: "client_admin" },
}));
vi.mock("./AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../utils/apiFetch", () => ({ apiGetJson: vi.fn() }));
let state;
function Probe() {
  state = useTenant();
  return null;
}
beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 1, client_id: 10 };
  auth.backendRole = "client_admin";
  apiGetJson.mockResolvedValue({
    data: [
      { id: 1, client_id: 10 },
      { id: 2, client_id: 20 },
    ],
  });
});
it("loads client tenants without requiring an assigned facility", async () => {
  render(
    <TenantProvider>
      <Probe />
    </TenantProvider>,
  );
  await waitFor(() => expect(state.isLoading).toBe(false));
  expect(apiGetJson).toHaveBeenCalledWith("/api/v1/tenants?active_only=true");
  expect(state.availableTenants.map((t) => t.id)).toEqual([1]);
  act(() => state.switchTenant(2));
  expect(state.currentTenant).toBeNull();
  act(() => state.switchTenant(1));
  expect(state.currentTenant.id).toBe(1);
});
it("does not fall back to all tenants when client ownership is missing", async () => {
  auth.user.client_id = null;
  render(
    <TenantProvider>
      <Probe />
    </TenantProvider>,
  );
  await waitFor(() => expect(state.isLoading).toBe(false));
  expect(state.availableTenants).toEqual([]);
});
it("clears a previous admin's tenant selection for another login", async () => {
  auth.backendRole = "admin";
  const { rerender } = render(
    <TenantProvider>
      <Probe />
    </TenantProvider>,
  );
  await waitFor(() => expect(state.isLoading).toBe(false));
  act(() => state.switchTenant(2));
  expect(state.currentTenant.id).toBe(2);
  auth.user = { id: 2, client_id: 10 };
  auth.backendRole = "client_admin";
  rerender(
    <TenantProvider>
      <Probe />
    </TenantProvider>,
  );
  expect(state.currentTenant).toBeNull();
  await waitFor(() => expect(state.isLoading).toBe(false));
  expect(state.availableTenants.map((t) => t.id)).toEqual([1]);
});
