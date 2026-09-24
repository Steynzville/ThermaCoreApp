import { isDemoMode } from "../config/runtime";
import { apiGetJson } from "../utils/apiFetch";
export const historyMetrics = [
  ["Ambient Temperature History", "ambientTemp", "°C", "#3b82f6"],
  ["Ambient Humidity History", "ambientHumidity", "%", "#06b6d4"],
  ["Temperature In History", "tempIn", "°C", "#82ca9d"],
  ["Temperature Out - Chill History", "tempOutChill", "°C", "#60a5fa"],
  ["Temperature Out - Hot History", "tempOutHot", "°C", "#f87171"],
  ["Power Output History", "power", "kW", "#8884d8"],
  ["AWG Water Level History", "awgWaterLevel", "L", "#0088FE"],
  ["Differential Pressure History", "differentialPressure", "bar", "#ff7300"],
  ["Battery Voltage History", "batteryVoltage", "V", "#22c55e"],
  ["Flow Rate Out - Chill History", "flowRateOutChill", "L/min", "#0284c7"],
  ["Flow Rate Out - Hot History", "flowRateOutHot", "L/min", "#e11d48"],
  ["Useful Heating History", "usefulHeat", "kWth", "#ef4444"],
  ["Useful Chilling History", "usefulChill", "kWth", "#06b6d4"],
  ["Water Production History", "waterRate", "L/h", "#3b82f6"],
];
export async function getUnitHistory(unit, range) {
  const start = new Date(`${range.from}T00:00:00Z`),
    end = new Date(`${range.to}T00:00:00Z`);
  const days = Math.round((end - start) / 86400000) + 1;
  if (!Number.isFinite(days) || days < 1 || days > 3660)
    throw new Error("Choose valid dates spanning at most ten years per query.");
  if (!isDemoMode)
    return (
      (
        await apiGetJson(
          `/api/v1/units/${encodeURIComponent(unit.id)}/history?${new URLSearchParams(range)}`,
        )
      ).data || []
    );
  const seed = [...unit.id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return Array.from({ length: days }, (_, index) => {
    const time = +start + index * 86400000;
    const factor = 0.95 + ((Math.floor(time / 86400000) + seed) % 11) / 100;
    const row = {
      unitId: unit.id,
      date: new Date(time).toISOString().slice(0, 10),
      source: "demo",
    };
    for (const [, key] of historyMetrics) {
      const value = key === "power" ? unit.demoNominalPower : unit[key];
      row[key] = value == null ? null : Number(value) * factor;
    }
    return row;
  }).filter(
    (row) => !unit.installDate || row.date >= unit.installDate.slice(0, 10),
  );
}
