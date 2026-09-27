import { isDemoMode } from "../config/runtime";
import { apiPostJson } from "../utils/apiFetch";
import { updateUnitFields } from "./unitService";
export async function acknowledgeCondition(unit, event, notes, user) {
  if (!unit || String(event.unitId) !== String(unit.id))
    throw new Error("Condition is outside this unit.");
  if (notes.length > 2000)
    throw new Error("Notes must be at most 2000 characters.");
  if (!isDemoMode) {
    if (!event.conditionId)
      throw new Error(
        "The gateway has not supplied an acknowledgeable condition record.",
      );
    return apiPostJson(
      `/api/v1/units/${encodeURIComponent(unit.id)}/conditions/${event.conditionId}/acknowledge`,
      { notes },
    );
  }
  const updated = {
    ...event,
    status: "acknowledged",
    acknowledged: true,
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: user?.id,
    notes,
    source: "demo",
  };
  await updateUnitFields(unit, {
    alerts: (unit.alerts || []).map((item) =>
      item.id === event.id ? updated : item,
    ),
  });
  return updated;
}
export function conditionStatistics(alerts) {
  const resolved = alerts.filter(
    (event) => event.resolved_at && event.timestamp,
  );
  const durations = resolved
    .map(
      (event) =>
        (new Date(event.resolved_at) - new Date(event.timestamp)) / 60000,
    )
    .filter((value) => Number.isFinite(value) && value >= 0);
  return {
    bySeverity: {
      critical: alerts.filter(
        (event) => event.severity === "critical" && event.status !== "resolved",
      ).length,
      warning: alerts.filter(
        (event) => event.severity === "warning" && event.status !== "resolved",
      ).length,
    },
    byStatus: { resolved: resolved.length },
    avgResolutionTime: durations.length
      ? Math.round(
          durations.reduce((sum, value) => sum + value, 0) / durations.length,
        )
      : "Unavailable",
  };
}
