// Event category is distinct from severity: an explicit critical alert remains an alert.
export const isAlarm = (event) =>
  event.category === "alarm" ||
  event.type === "alarm" ||
  (!event.category && event.type !== "alert" && event.severity === "critical");
export const notificationDestination = (event) =>
  `/${isAlarm(event) ? "alarms" : "alerts"}?${new URLSearchParams({ unit: String(event.unitId), event: String(event.id) })}`;
export const conditionType = (event) =>
  event.resolved_at || event.status === "resolved"
    ? "success"
    : event.severity || event.type || "info";
