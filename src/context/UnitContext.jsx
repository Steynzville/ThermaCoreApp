import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useTenant } from "./TenantContext";
import { isDemoMode } from "../config/runtime";
import * as service from "../services/unitService";
import { sameId, scopeUnits, unitAlerts } from "../utils/portfolio";
import websocketService from "../services/websocketService";

const UnitContext = createContext();
export const useUnits = () => {
  const context = useContext(UnitContext);
  if (!context) throw new Error("useUnits must be used within a UnitProvider");
  return context;
};

export const UnitProvider = ({ children }) => {
  const { user, backendRole, permissions } = useAuth();
  const {
    currentTenant,
    availableTenants,
    assignedTenantId,
    isLoading: tenantLoading,
  } = useTenant();
  const [state, setState] = useState({
    owner: null,
    units: [],
    records: [],
    events: [],
    loading: true,
    error: null,
  });
  const generation = useRef(0);
  const owner = user
    ? `${user.id}:${backendRole}:${user.tenantId ?? user.tenant_id}:${user.clientId ?? user.client_id}`
    : null;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const refreshUnits = useCallback(async () => {
    const request = ++generation.current;
    if (!user) {
      setState({
        owner,
        units: [],
        records: [],
        events: [],
        loading: false,
        error: null,
      });
      return;
    }
    setState((s) => ({
      ...s,
      loading: s.owner !== owner || s.units.length === 0,
      error: null,
    }));
    try {
      const units = await service.getAllUnits();
      const [records, events] = await Promise.all([
        service.getPortfolioHistory(units),
        service.getPortfolioEvents(),
      ]);
      if (request === generation.current)
        setState((s) => ({
          owner,
          units,
          records,
          events,
          loading: false,
          error: null,
        }));
    } catch (error) {
      if (request === generation.current)
        setState({
          owner,
          units: [],
          records: [],
          events: [],
          loading: false,
          error: error.message,
        });
    }
  }, [owner]);
  useEffect(() => {
    service.resetDemoState();
    setState({
      owner,
      units: [],
      records: [],
      events: [],
      loading: !!user,
      error: null,
    });
    refreshUnits();
    return () => {
      generation.current++;
    };
  }, [refreshUnits]);
  const ready = state.owner === owner;
  const scopedUser = user && {
    ...user,
    tenantId: assignedTenantId ?? user.tenantId,
  };
  const accessibleUnits = useMemo(
    () =>
      ready
        ? scopeUnits(state.units, {
            user: scopedUser,
            role: backendRole,
            tenants: availableTenants,
          })
        : [],
    [ready, state.units, user, assignedTenantId, backendRole, availableTenants],
  );
  const units = useMemo(
    () =>
      currentTenant
        ? accessibleUnits.filter((u) => sameId(u.tenantId, currentTenant.id))
        : accessibleUnits,
    [accessibleUnits, currentTenant],
  );
  const ids = useMemo(() => new Set(units.map((u) => u.id)), [units]);
  const records = useMemo(
    () => state.records.filter((r) => ids.has(String(r.unitId))),
    [state.records, ids],
  );
  const events = useMemo(
    () => state.events.filter((r) => ids.has(String(r.unitId))),
    [state.events, ids],
  );
  const updateUnit = useCallback(
    (id, changes) =>
      setState((s) => ({
        ...s,
        units: s.units.map((u) =>
          sameId(u.id, id) ? { ...u, ...changes } : u,
        ),
      })),
    [],
  );
  const getUnit = useCallback(
    (id) => units.find((u) => sameId(u.id, id)),
    [units],
  );
  const saveFields = useCallback(
    async (id, changes) => {
      if (!permissions?.canManageUnits)
        throw new Error("You do not have permission to edit units.");
      const unit = getUnit(id);
      if (!unit) throw new Error("Unit is outside your selected portfolio.");
      const requestOwner = owner;
      const result = await service.updateUnitFields(unit, changes);
      if (requestOwner === ownerRef.current) updateUnit(id, result);
      return result;
    },
    [owner, getUnit, permissions, updateUnit],
  );
  const controlUnit = useCallback(
    async (id, changes) => {
      if (!permissions?.canControlUnits)
        throw new Error("You do not have permission to control units.");
      const unit = getUnit(id);
      if (!unit) throw new Error("Unit is outside your selected portfolio.");
      const requestOwner = owner;
      const result = await service.controlUnit(unit, changes);
      if (requestOwner === ownerRef.current) {
        updateUnit(id, result.unit);
        if (result.action)
          setState((s) => ({ ...s, events: [result.action, ...s.events] }));
      }
      return result.unit;
    },
    [owner, getUnit, permissions, updateUnit],
  );
  useEffect(() => {
    if (isDemoMode || !user || tenantLoading) return;
    let active = true;
    let refreshTimer;
    const scheduleRefresh = () => {
      if (!refreshTimer)
        refreshTimer = setTimeout(() => {
          refreshTimer = null;
          if (active) refreshUnits();
        }, 1500);
    };
    const unsubscribe = websocketService.subscribe("unit_status", (message) => {
      if (active) scheduleRefresh();
    });
    const sensors = websocketService.subscribe("sensor_data", () => {
      if (active) scheduleRefresh();
    });
    websocketService.connect(currentTenant?.id ?? null).catch(() => {});
    const timer = setInterval(refreshUnits, 30000);
    return () => {
      active = false;
      unsubscribe();
      sensors();
      clearInterval(timer);
      clearTimeout(refreshTimer);
      websocketService.disconnect();
    };
  }, [owner, currentTenant?.id, tenantLoading]);
  const value = useMemo(
    () => ({
      units,
      accessibleUnits,
      records,
      events,
      alerts: unitAlerts(units),
      loading: !ready || state.loading || tenantLoading,
      error: state.error,
      isDemoMode,
      updateUnit,
      getUnit,
      refreshUnits,
      controlUnit,
      updateUnitName: (id, name) => saveFields(id, { name }),
      updateUnitLocation: (id, location) => saveFields(id, { location }),
      updateUnitGPS: (id, gpsCoordinates) => saveFields(id, { gpsCoordinates }),
      scopeLabel:
        currentTenant?.name ||
        (backendRole === "admin"
          ? "All tenants"
          : backendRole === "client_admin"
            ? "Client portfolio"
            : "My portfolio"),
      scopeKey: `${owner}:${currentTenant?.id ?? "all"}`,
    }),
    [
      units,
      accessibleUnits,
      records,
      events,
      ready,
      state.loading,
      state.error,
      tenantLoading,
      updateUnit,
      getUnit,
      refreshUnits,
      controlUnit,
      saveFields,
      currentTenant,
      backendRole,
      owner,
    ],
  );
  return <UnitContext.Provider value={value}>{children}</UnitContext.Provider>;
};
export default UnitContext;
