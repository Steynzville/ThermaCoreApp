// Ownership is based on identifiers, never a display name or array position.
export const sameId = (a, b) =>
  a != null && b != null && String(a) === String(b);
export const tenantIdOf = (item) =>
  item?.tenantId ?? item?.tenant_id ?? item?.tenant?.id;
export const clientIdOf = (item) =>
  item?.clientId ?? item?.client_id ?? item?.client?.id;

export function scopeUnits(units, { user, role, tenant = null, tenants = [] }) {
  if (!user) return [];
  const assignedTenant = tenantIdOf(user);
  const assignedClient = clientIdOf(user);
  return units.filter((unit) => {
    const owner = tenantIdOf(unit);
    const client =
      clientIdOf(unit) ?? clientIdOf(tenants.find((t) => sameId(t.id, owner)));
    const permitted =
      role === "admin" ||
      (role === "client_admin"
        ? sameId(client, assignedClient)
        : ["viewer", "operator", "user"].includes(role) &&
          sameId(owner, assignedTenant));
    return permitted && (!tenant || sameId(owner, tenant.id));
  });
}

export function normalizeUnit(raw) {
  raw = { ...raw, ...raw.controls };
  const status = String(
    raw.status?.value ?? raw.status ?? "offline",
  ).toLowerCase();
  const value = (camel, snake, fallback = null) =>
    raw[camel] ?? raw[snake] ?? fallback;
  return {
    ...raw,
    id: String(raw.id),
    tenantId: tenantIdOf(raw) ?? null,
    clientId: clientIdOf(raw) ?? null,
    tenantName:
      raw.tenantName ?? raw.tenant_name ?? raw.tenant?.name ?? "Unassigned",
    status: status === "operational" ? "online" : status,
    name: raw.name || String(raw.id),
    location: raw.location || "Unspecified",
    serialNumber: value("serialNumber", "serial_number", String(raw.id)),
    installDate: value("installDate", "install_date"),
    lastMaintenance: value("lastMaintenance", "last_maintenance"),
    healthStatus: value("healthStatus", "health_status", "Unknown"),
    watergeneration:
      raw.supports_water ??
      raw.watergeneration ??
      Boolean(
        raw.water_generation ||
          raw.sensors?.some(
            (sensor) =>
              sensor.is_active !== false &&
              ["water_flow", "water_level"].includes(sensor.sensor_type),
          ),
      ),
    waterProductionOn: value("waterProductionOn", "water_generation", false),
    hasAlert: value("hasAlert", "has_alert", false),
    hasAlarm: value("hasAlarm", "has_alarm", false),
    currentPower: value("currentPower", "current_power", 0),
    parasiticLoad: value("parasiticLoad", "parasitic_load", 0),
    userLoad: value("userLoad", "user_load", 0),
    tempIn: value("tempIn", "temp_in"),
    tempOutChill: value("tempOutChill", "temp_out"),
    ambientTemp: value("ambientTemp", "temp_outside"),
    ambientHumidity: value("ambientHumidity", "humidity"),
    differentialPressure:
      raw.differentialPressure ??
      (raw.pressure == null ? null : Number(raw.pressure) / 1000),
    awgWaterLevel: value("awgWaterLevel", "water_level"),
    batteryLife: value("batteryLife", "battery_level"),
    client: {
      id: clientIdOf(raw) ?? null,
      name:
        raw.client?.name || raw.client_name || raw.tenantName || "Unassigned",
      contact: raw.client?.contact || raw.client_contact || "",
      email: raw.client?.email || raw.client_email || "",
      phone: raw.client?.phone || raw.client_phone || "",
    },
  };
}

export function unitAlerts(units) {
  return units.flatMap((unit) =>
    (
      unit.alerts ||
      (unit.hasAlarm || unit.hasAlert
        ? [
            {
              id: `condition-${unit.id}`,
              severity: unit.hasAlarm ? "critical" : "warning",
              type: unit.hasAlarm ? "critical" : "warning",
              title: unit.hasAlarm ? "Unit alarm" : "Unit alert",
              message: `${unit.name}: ${unit.healthStatus} condition`,
              timestamp: unit.updated_at || null,
            },
          ]
        : [])
    ).map((alert) => ({
      ...alert,
      unitId: unit.id,
      unitName: unit.name,
      tenantId: unit.tenantId,
    })),
  );
}
