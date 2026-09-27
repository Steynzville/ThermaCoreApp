import { isDemoMode } from "../config/runtime";
import { apiGetJson } from "../utils/apiFetch";
import { historyMetrics } from "./unitHistoryService";

export const scadaPeriods = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };
export async function getScadaHistory(unit, period = "24h", now = new Date()) {
  if (!unit?.id || !Object.hasOwn(scadaPeriods, period))
    throw new Error("Choose a permitted unit and history period.");
  const hours = scadaPeriods[period];
  const start = +now - hours * 3600000;
  const resolution = hours <= 24 ? "minute" : "hour";
  if (!isDemoMode) {
    const params = new URLSearchParams({
      from: new Date(start).toISOString(),
      to: now.toISOString(),
      resolution,
    });
    const response = await apiGetJson(
      `/api/v1/units/${encodeURIComponent(unit.id)}/scada-history?${params}`,
    );
    return (response.data || []).map((row) => ({
      ...row,
      timestamp: row.date,
    }));
  }
  const interval = resolution === "minute" ? 60000 : 3600000;
  const seed = [...unit.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length: (hours * 3600000) / interval }, (_, index) => {
    const timestamp = new Date(start + index * interval).toISOString();
    const factor =
      0.96 +
      ((Math.floor((start + index * interval) / interval) + seed) % 9) / 100;
    const row = { unitId: unit.id, timestamp, source: "demo" };
    for (const [, key] of historyMetrics) {
      const value = key === "power" ? unit.demoNominalPower : unit[key];
      row[key] = value == null ? null : Number(value) * factor;
    }
    return row;
  }).filter((row) => !unit.installDate || row.timestamp >= unit.installDate);
}
