import { createContext, useContext, useMemo, useState } from "react";
import { useUnits } from "./UnitContext";
import {
  DEFAULT_ASSUMPTIONS,
  portfolioAnalytics,
  validateAssumptions,
} from "../utils/portfolioAnalytics";
const AnalyticsContext = createContext();
export function AnalyticsProvider({ children }) {
  const { units, records, scopeKey } = useUnits();
  const [overrides, setOverrides] = useState({});
  const defaults = useMemo(
    () => ({
      ...DEFAULT_ASSUMPTIONS,
      initialInvestment:
        units.length && units.every((u) => Number(u.capitalCost) > 0)
          ? units.reduce((sum, u) => sum + Number(u.capitalCost), 0)
          : 0,
    }),
    [units],
  );
  const assumptions = useMemo(
    () => ({ ...defaults, ...overrides[scopeKey] }),
    [defaults, overrides, scopeKey],
  );
  const analytics = useMemo(
    () => portfolioAnalytics(units, records, assumptions),
    [units, records, assumptions],
  );
  const setAssumptions = (changes) => {
    const next = validateAssumptions({ ...assumptions, ...changes });
    setOverrides((values) => ({ ...values, [scopeKey]: next }));
  };
  const forUnit = (unitId) => {
    const selected = units.filter((unit) => String(unit.id) === String(unitId));
    // Portfolio fixed costs cannot be assigned in full to every unit.
    const key = `${scopeKey}:unit:${unitId}`;
    const unitAssumptions = {
      ...assumptions,
      operatingCostMonthly:
        units.length === 1 ? assumptions.operatingCostMonthly : 0,
      initialInvestment:
        units.length === 1
          ? assumptions.initialInvestment
          : selected[0]?.capitalCost || 0,
      ...overrides[key],
    };
    return {
      assumptions: unitAssumptions,
      analytics: portfolioAnalytics(selected, records, unitAssumptions),
      setAssumptions: (changes) => {
        const next = validateAssumptions({ ...unitAssumptions, ...changes });
        setOverrides((values) => ({ ...values, [key]: next }));
      },
    };
  };
  return (
    <AnalyticsContext.Provider
      value={{ assumptions, setAssumptions, analytics, forUnit }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}
export function useAnalytics(unitId = null) {
  const value = useContext(AnalyticsContext);
  if (!value)
    throw new Error("useAnalytics must be used within AnalyticsProvider");
  return unitId == null ? value : value.forUnit(unitId);
}
