import { isDemoMode } from "../config/runtime";
import { apiGetJson, apiPostJson, apiFetch } from "../utils/apiFetch";
const path = "/api/v1/portfolio/report-schedules";
const key = (account) => `thermacore:demo:report-schedules:${account}`;
export async function listSchedules(account) {
  return isDemoMode
    ? JSON.parse(localStorage.getItem(key(account)) || "[]")
    : (await apiGetJson(path)).data;
}
export async function addSchedule(account, config, date) {
  const scheduledAt = date.toISOString();
  if (date <= new Date()) throw new Error("Choose a future schedule date.");
  if (!isDemoMode) return apiPostJson(path, { config, scheduledAt });
  const row = {
    id: crypto.randomUUID(),
    config,
    scheduledAt,
    status: "scheduled",
  };
  localStorage.setItem(
    key(account),
    JSON.stringify([row, ...(await listSchedules(account))]),
  );
  return row;
}
export async function updateSchedule(account, id, status) {
  if (!isDemoMode)
    return (
      await apiFetch(`${path}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
    ).json();
  const rows = await listSchedules(account),
    row = rows.find((row) => row.id === id);
  if (!row) throw new Error("Schedule not found.");
  row.status = status;
  localStorage.setItem(key(account), JSON.stringify(rows));
  return row;
}
