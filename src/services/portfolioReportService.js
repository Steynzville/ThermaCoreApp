import { getSales } from "./salesService";
import { createReport } from "../utils/reportModel";
import { getPortfolioHistory, getPortfolioEvents } from "./unitService";
import { getUnitHistory } from "./unitHistoryService";
import { apiGetJson } from "../utils/apiFetch";
import { generateReportFile } from "./reportExportService";
export function selectedReportUnits(units, config) {
  const requested =
    config.scope === "master"
      ? units.map((unit) => unit.id)
      : config.scope === "client"
        ? units
            .filter((unit) =>
              (config.selectedClients || [])
                .map(String)
                .includes(String(unit.clientId)),
            )
            .map((unit) => unit.id)
        : config.selectedUnits || [];
  if (
    !requested.length ||
    requested.some(
      (id) => !units.some((unit) => String(unit.id) === String(id)),
    ) ||
    (config.scope === "single" && requested.length !== 1)
  )
    throw new Error("Select permitted units for this report scope.");
  return units.filter((unit) =>
    requested.map(String).includes(String(unit.id)),
  );
}
export async function generatePortfolioReport(
  portfolio,
  assumptions,
  config,
  accountId,
) {
  const units = selectedReportUnits(portfolio.units, config);
  const today = new Date().toISOString().slice(0, 10);
  const from = config.dateRange.startDate || `${today.slice(0, 7)}-01`,
    to = config.dateRange.endDate || today;
  const mapping = {
    vitalStatistics: ["units", "daily", "history"],
    energyProduction: ["daily"],
    waterProduction: ["daily"],
    temperaturePressure: ["units", "history"],
    alertsAlarms: ["alerts", "events"],
    maintenance: ["maintenance"],
    performance: ["units", "daily", "events"],
    compliance: ["compliance"],
    salesRevenue: ["sales"],
  };
  const sections = [
    ...new Set(
      Object.entries(config.reportSections)
        .filter(([, on]) => on)
        .flatMap(([key]) => mapping[key] || []),
    ),
  ];
  const ids = units.map((unit) => unit.id);
  const reportInput = {
    ...portfolio,
    assumptions,
    selectedIds: ids,
    from,
    to,
    format: config.outputFormat,
    sections,
  };
  createReport({ ...reportInput, records: [] }); // Fail invalid dates/scope before any queries.
  const [records, events, histories, maintenance] = await Promise.all([
    getPortfolioHistory(units, { from, to }),
    getPortfolioEvents({ from, to, unit_ids: ids.join(",") }),
    sections.includes("history")
      ? Promise.all(units.map((unit) => getUnitHistory(unit, { from, to })))
      : [],
    sections.includes("maintenance")
      ? Promise.all(
          units.map(async (unit) =>
            portfolio.isDemoMode
              ? JSON.parse(
                  localStorage.getItem(
                    `thermacore:demo:maintenance:${accountId}:${unit.tenantId}:${unit.id}`,
                  ) || "[]",
                )
              : (
                  await apiGetJson(
                    `/api/v1/units/${encodeURIComponent(unit.id)}/maintenance`,
                  )
                ).data,
          ),
        )
      : [],
  ]);
  const sales = sections.includes("sales") ? await getSales(units) : [];
  const report = createReport({
    ...reportInput,
    records,
    events,
    sales,
    histories: histories.flat(),
    maintenance: maintenance.flat(),
  });
  return generateReportFile(report);
}
