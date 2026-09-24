import { demoUnits, demoHistory } from "../data/demoPortfolio";
import { isDemoMode } from "../config/runtime";
import { apiGetJson, apiPostJson, apiFetch } from "../utils/apiFetch";
import { getAuthToken } from "../utils/authToken";
import { normalizeUnit, unitAlerts } from "../utils/portfolio";

let demoOverrides = new Map();
let demoActions = [];
export function resetDemoState() {
  demoOverrides = new Map();
  demoActions = [];
}
const snapshot = (u) => {
  if (!isDemoMode) return normalizeUnit(u);
  const { controls, outputs, ...fields } = u;
  return normalizeUnit({
    ...fields,
    ...demoOverrides.get(String(u.id)),
    outputs: undefined,
  });
};

export async function getAllUnits() {
  let remote = [];
  if (getAuthToken()) {
    try {
      let page = 1,
        more = true;
      while (more) {
        const response = await apiGetJson(
          `/api/v1/units?per_page=100&page=${page++}`,
        );
        remote.push(...(response.data || []));
        more = response.has_next === true || page <= (response.pages || 0);
      }
    } catch (error) {
      if (!isDemoMode || /Unauthorized|permission/i.test(error.message))
        throw error;
    }
  } else if (!isDemoMode) throw new Error("Sign in to load your portfolio.");
  const map = new Map(
    isDemoMode ? demoUnits.map((u) => [u.id, snapshot(u)]) : [],
  );
  for (const raw of remote) {
    const base = isDemoMode
      ? demoUnits.find((u) => u.id === String(raw.id))
      : null;
    // Server ownership, identity and readings win. Fixtures only fill demo-only fields.
    const normalized = normalizeUnit(raw);
    map.set(
      normalized.id,
      snapshot({
        ...base,
        ...normalized,
        alerts: raw.alerts ?? unitAlerts([normalized]),
        source: isDemoMode ? "demo" : "live",
      }),
    );
  }
  return [...map.values()];
}

export async function getPortfolioHistory(units, range = {}) {
  if (isDemoMode) return demoHistory(units, new Date(), range);
  if (!units.length) return [];
  const params = { ...range, unit_ids: units.map((unit) => unit.id).join(",") };
  if (!range.from || !range.to)
    return (
      (
        await apiGetJson(
          `/api/v1/portfolio/history?${new URLSearchParams(params)}`,
        )
      ).data || []
    );
  const start = new Date(`${range.from}T00:00:00Z`),
    end = new Date(`${range.to}T00:00:00Z`);
  if (
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    start > end ||
    end - start > 3659 * 86400000
  )
    throw new Error("Choose valid history dates spanning at most ten years.");
  const rows = [];
  for (let cursor = +start; cursor <= +end; cursor += 365 * 86400000) {
    const stop = Math.min(+end, cursor + 364 * 86400000);
    const chunk = {
      ...params,
      from: new Date(cursor).toISOString().slice(0, 10),
      to: new Date(stop).toISOString().slice(0, 10),
    };
    rows.push(
      ...((
        await apiGetJson(
          `/api/v1/portfolio/history?${new URLSearchParams(chunk)}`,
        )
      ).data || []),
    );
  }
  return rows;
}

export async function updateUnitFields(unit, changes) {
  if (isDemoMode) {
    demoOverrides.set(String(unit.id), {
      ...demoOverrides.get(String(unit.id)),
      ...changes,
    });
    return snapshot({ ...unit, ...changes });
  }
  const body = { ...changes };
  const aliases = {
    serialNumber: "serial_number",
    lastMaintenance: "last_maintenance",
  };
  for (const [key, target] of Object.entries(aliases))
    if (key in body) {
      body[target] = body[key];
      delete body[key];
    }
  const response = await apiFetch(
    `/api/v1/units/${encodeURIComponent(unit.id)}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
  return normalizeUnit(await response.json());
}

export async function controlUnit(unit, changes) {
  if (isDemoMode) {
    const updated = { ...unit, ...changes };
    if (changes.machinePower !== undefined) {
      updated.status = changes.machinePower ? "online" : "offline";
      updated.currentPower = changes.machinePower
        ? unit.demoNominalPower || unit.currentPower || 0
        : 0;
      if (!changes.machinePower) {
        updated.waterProductionOn = false;
        updated.autoSwitchEnabled = false;
        updated.powerSetpoint = 0;
      }
    }
    demoOverrides.set(String(unit.id), updated);
    const action = {
      id: `action-${Date.now()}`,
      unitId: unit.id,
      unitName: unit.name,
      timestamp: new Date().toISOString(),
      description: `Control updated: ${Object.keys(changes).join(", ")}`,
      type: "control",
    };
    demoActions = [action, ...demoActions];
    return { unit: snapshot(updated), action };
  }
  const response = await apiPostJson(
    `/api/v1/remote-control/units/${encodeURIComponent(unit.id)}/controls`,
    changes,
  );
  return { unit: normalizeUnit(response.unit), action: response.action };
}

export const getUnitById = async (id) =>
  (await getAllUnits()).find((u) => u.id === String(id)) || null;
export const getUnitDetails = getUnitById;
export const getUnitAlerts = async (id) =>
  (await getUnitById(id))?.alerts || [];
export const getAllAlerts = async () => unitAlerts(await getAllUnits());
export const searchUnits = async (query) =>
  query
    ? (await getAllUnits()).filter((u) =>
        `${u.name} ${u.location}`.toLowerCase().includes(query.toLowerCase()),
      )
    : [];
export const getEventHistory = async () => [...demoActions];
export const getRecentActions = getEventHistory;
export const getUnitsWithAlarms = async () =>
  (await getAllUnits()).filter((u) => u.hasAlarm);
export const getUnitsWithAlerts = async () =>
  (await getAllUnits()).filter((u) => u.hasAlert);
export const updateUnitName = async (id, name) =>
  updateUnitFields(await getUnitById(id), { name });
export const updateUnitLocation = async (id, location) =>
  updateUnitFields(await getUnitById(id), { location });
export const updateUnitGPS = async (id, gpsCoordinates) => {
  if (!isDemoMode)
    throw new Error("GPS editing is not supported by this unit API.");
  return updateUnitFields(await getUnitById(id), { gpsCoordinates });
};
export const updateUnitControls = async (id, controls) =>
  controlUnit(await getUnitById(id), controls);

export async function getPortfolioEvents(range = {}) {
  if (isDemoMode) return [...demoActions];
  const events = [];
  let page = 1,
    more = true;
  while (more) {
    const result = await apiGetJson(
      `/api/v1/portfolio/events?${new URLSearchParams({ ...range, page: page++ })}`,
    );
    events.push(...(result.data || []));
    more = result.has_next === true;
  }
  return events;
}
