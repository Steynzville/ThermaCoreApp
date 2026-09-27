import { createContext, useContext, useEffect, useState } from "react";
import { useUnits } from "./UnitContext";
import { getScadaHistory } from "../services/scadaHistoryService";
const ScadaContext = createContext(null);
export const useScada = () => useContext(ScadaContext);
export function ScadaProvider({ children }) {
  const {
    units,
    scopeKey,
    loading: portfolioLoading,
    error: portfolioError,
  } = useUnits();
  const [selection, setSelection] = useState({ scope: scopeKey, id: "" });
  const unit =
    (selection.scope === scopeKey &&
      units.find((item) => item.id === selection.id)) ||
    units[0] ||
    null;
  const [period, setPeriod] = useState("24h");
  const [result, setResult] = useState({
    key: "",
    data: [],
    loading: false,
    error: null,
  });
  const key = `${scopeKey}:${unit?.id}:${period}`;
  useEffect(() => {
    let alive = true;
    setResult({ key, data: [], loading: Boolean(unit), error: null });
    if (unit)
      getScadaHistory(unit, period)
        .then((data) => {
          if (alive) setResult({ key, data, loading: false, error: null });
        })
        .catch((error) => {
          if (alive)
            setResult({ key, data: [], loading: false, error: error.message });
        });
    return () => {
      alive = false;
    };
  }, [key]);
  const data = result.key === key ? result.data : [];
  return (
    <ScadaContext.Provider
      value={{
        unit,
        units,
        period,
        setPeriod,
        data,
        loading: portfolioLoading || result.key !== key || result.loading,
        error: portfolioError || (result.key === key && result.error),
      }}
    >
      <div className="px-6 pt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="scada-unit" className="text-sm font-medium">
          SCADA unit
        </label>
        <select
          id="scada-unit"
          className="border rounded-md p-2 bg-background"
          value={unit?.id || ""}
          onChange={(event) =>
            setSelection({ scope: scopeKey, id: event.target.value })
          }
        >
          {!units.length && <option value="">No permitted units</option>}
          {units.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.id}
            </option>
          ))}
        </select>
        {portfolioError || result.error ? (
          <p role="alert">{portfolioError || result.error}</p>
        ) : null}
      </div>
      {children}
    </ScadaContext.Provider>
  );
}
