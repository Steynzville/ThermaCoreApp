import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { apiGetJson } from "../utils/apiFetch";
import { isDemoMode } from "../config/runtime";
import { demoTenants } from "../data/demoPortfolio";
import { sameId, tenantIdOf, clientIdOf } from "../utils/portfolio";

const TenantContext = createContext();
export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context)
    throw new Error("useTenant must be used within a TenantProvider");
  return context;
};

export function TenantProvider({ children }) {
  const { user, backendRole } = useAuth();
  const [state, setState] = useState({
    owner: null,
    tenants: [],
    assigned: null,
    loading: true,
    error: null,
  });
  const [selection, setSelection] = useState({ owner: null, id: null });
  const owner = user
    ? `${user.id}:${backendRole}:${tenantIdOf(user) ?? ""}:${clientIdOf(user) ?? ""}`
    : null;
  const isAdmin = backendRole === "admin";
  const isClientAdmin = backendRole === "client_admin";
  const canSwitchTenants = isAdmin || isClientAdmin;
  useEffect(() => {
    let cancelled = false;
    setState({
      owner,
      tenants: [],
      assigned: null,
      loading: !!user,
      error: null,
    });
    if (!user) return;
    (async () => {
      let tenants = [],
        assigned = null,
        error = null;
      try {
        if (canSwitchTenants) {
          const response = await apiGetJson("/api/v1/tenants?active_only=true");
          tenants = response.data || [];
          assigned =
            tenants.find((t) => sameId(t.id, tenantIdOf(user))) || null;
        } else {
          const current = await apiGetJson("/api/v1/tenants/current");
          assigned = current.data || null;
          if (assigned) tenants = [assigned];
        }
      } catch (err) {
        error = err.message;
      }
      if (isDemoMode && error !== "Unauthorized") {
        const merged = new Map(demoTenants.map((t) => [String(t.id), t]));
        tenants.forEach((t) => merged.set(String(t.id), t));
        tenants = [...merged.values()];
      }
      // No fallback to everybody's tenants if a client's filter is empty.
      tenants = tenants.filter(
        (t) =>
          isAdmin ||
          (isClientAdmin
            ? sameId(clientIdOf(t), clientIdOf(user))
            : sameId(t.id, assigned?.id ?? tenantIdOf(user))),
      );
      if (!canSwitchTenants)
        assigned =
          tenants.find((t) => sameId(t.id, assigned?.id ?? tenantIdOf(user))) ||
          null;
      if (!cancelled)
        setState({ owner, tenants, assigned, loading: false, error });
    })();
    return () => {
      cancelled = true;
    };
  }, [owner]);
  const ready = state.owner === owner;
  const availableTenants = ready ? state.tenants : [];
  const currentTenant = canSwitchTenants
    ? availableTenants.find(
        (t) => selection.owner === owner && sameId(t.id, selection.id),
      ) || null
    : ready
      ? state.assigned
      : null;
  const switchTenant = useCallback(
    (id) => {
      if (
        canSwitchTenants &&
        (id == null || availableTenants.some((t) => sameId(t.id, id)))
      ) {
        setSelection({ owner, id });
      }
    },
    [owner, canSwitchTenants, availableTenants],
  );
  const value = useMemo(
    () => ({
      currentTenant,
      availableTenants,
      isLoading: !ready || state.loading,
      isLoadingTenants: !ready || state.loading,
      error: state.error,
      isAdmin,
      isClientAdmin,
      canSwitchTenants,
      switchTenant,
      assignedTenantId: state.assigned?.id ?? tenantIdOf(user),
      getTenantQueryParam: () =>
        currentTenant
          ? `?tenant_id=${encodeURIComponent(currentTenant.id)}`
          : "",
    }),
    [
      currentTenant,
      availableTenants,
      ready,
      state,
      isAdmin,
      isClientAdmin,
      canSwitchTenants,
      switchTenant,
      user,
    ],
  );
  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}
