import { beforeEach, expect, it, vi } from "vitest";
import { apiGetJson } from "../utils/apiFetch";
import { DEFAULT_ASSUMPTIONS } from "../utils/portfolioAnalytics";
import {
  generatePortfolioReport,
  selectedReportUnits,
} from "./portfolioReportService";
import { generateReportFile } from "./reportExportService";
import { getSales } from "./salesService";
import { getUnitHistory } from "./unitHistoryService";
import { getPortfolioEvents, getPortfolioHistory } from "./unitService";

vi.mock("./unitService", () => ({
  getPortfolioHistory: vi.fn(),
  getPortfolioEvents: vi.fn(),
}));
vi.mock("./unitHistoryService", () => ({ getUnitHistory: vi.fn() }));
vi.mock("../utils/apiFetch", () => ({ apiGetJson: vi.fn() }));
vi.mock("./salesService", () => ({ getSales: vi.fn() }));
vi.mock("./reportExportService", () => ({
  generateReportFile: vi.fn(async (report) => report),
}));
const units = [
  { id: "A", name: "Alpha", clientId: 1, tenantId: 1 },
  { id: "B", name: "Beta", clientId: 1, tenantId: 1 },
  { id: "C", name: "Foreign", clientId: 2, tenantId: 2 },
];
const records = units.map((u, i) => ({
  unitId: u.id,
  date: "2026-01-01",
  grossKWh: (i + 1) * 100,
  parasiticKWh: 10,
  selfConsumedKWh: 50,
  exportedKWh: 40,
  waterLitres: 10,
  observedHours: 24,
  operatingHours: 12,
}));
const config = {
  scope: "single",
  selectedUnits: ["A"],
  dateRange: { startDate: "2026-01-01", endDate: "2026-01-01" },
  outputFormat: "pdf",
  reportSections: {
    vitalStatistics: true,
    alertsAlarms: true,
    maintenance: true,
    salesRevenue: true,
    compliance: true,
  },
};
beforeEach(() => {
  getPortfolioHistory.mockResolvedValue(records);
  getPortfolioEvents.mockResolvedValue(
    units.map((u) => ({
      unitId: u.id,
      timestamp: "2026-01-01T12:00:00Z",
      description: u.name,
    })),
  );
  getUnitHistory.mockImplementation(async (unit) => [
    { unitId: unit.id, date: "2026-01-01", power: 10 },
  ]);
  apiGetJson.mockImplementation(async (url) => ({
    data: [
      {
        unitId: url.split("/")[4],
        scheduledAt: "2026-01-01T12:00:00Z",
        description: "Inspect",
      },
    ],
  }));
  getSales.mockResolvedValue(
    units.map((u) => ({
      unitId: u.id,
      date: "2026-01-01",
      revenue: 100,
      productLine: "Core",
    })),
  );
  localStorage.clear();
});
it.each(["xlsx", "docx", "pdf"])(
  "queries and builds exact single/multiple unit scopes for %s before serialization",
  async (format) => {
    for (const ids of [["A"], ["A", "B"]]) {
      const report = await generatePortfolioReport(
        {
          units,
          isDemoMode: false,
          alerts: units.map((u) => ({ unitId: u.id, title: u.name })),
        },
        DEFAULT_ASSUMPTIONS,
        {
          ...config,
          scope: ids.length === 1 ? "single" : "multiple",
          selectedUnits: ids,
          outputFormat: format,
        },
        7,
      );
      expect(getPortfolioHistory).toHaveBeenLastCalledWith(
        units.filter((u) => ids.includes(u.id)),
        { from: "2026-01-01", to: "2026-01-01" },
      );
      expect(getPortfolioEvents).toHaveBeenLastCalledWith({
        from: "2026-01-01",
        to: "2026-01-01",
        unit_ids: ids.join(","),
      });
      expect(report.units.map((u) => u.id)).toEqual(ids);
      for (const field of [
        "records",
        "events",
        "histories",
        "maintenance",
        "sales",
        "alerts",
      ])
        expect(report[field].every((row) => ids.includes(row.unitId))).toBe(
          true,
        );
      expect(report.summary.grossKWh).toBe(ids.length === 1 ? 100 : 300);
      expect(JSON.stringify(report)).not.toContain("Foreign");
      expect(generateReportFile).toHaveBeenLastCalledWith(report);
    }
  },
);
it("rejects foreign scopes/invalid dates before queries and resolves client/master selection explicitly", async () => {
  expect(
    selectedReportUnits(units, { scope: "client", selectedClients: ["1"] }),
  ).toEqual(units.slice(0, 2));
  expect(selectedReportUnits(units, { scope: "master" })).toEqual(units);
  for (const selectedUnits of [[], ["missing"], ["A", "B"]])
    await expect(
      generatePortfolioReport(
        { units },
        DEFAULT_ASSUMPTIONS,
        { ...config, selectedUnits },
        7,
      ),
    ).rejects.toThrow("permitted units");
  await expect(
    generatePortfolioReport(
      { units },
      DEFAULT_ASSUMPTIONS,
      { ...config, dateRange: { startDate: "bad", endDate: "2026-01-01" } },
      7,
    ),
  ).rejects.toThrow("date range");
  expect(getPortfolioHistory).not.toHaveBeenCalled();
  expect(generateReportFile).not.toHaveBeenCalled();
});
it("loads only selected account/unit demo maintenance and avoids unnecessary optional queries", async () => {
  localStorage.setItem(
    "thermacore:demo:maintenance:7:1:A",
    JSON.stringify([
      {
        unitId: "A",
        scheduledAt: "2026-01-01T00:00:00Z",
        description: "Local demo inspection",
      },
    ]),
  );
  localStorage.setItem(
    "thermacore:demo:maintenance:8:1:A",
    JSON.stringify([{ unitId: "A", description: "Other account" }]),
  );
  const report = await generatePortfolioReport(
    { units, isDemoMode: true },
    DEFAULT_ASSUMPTIONS,
    { ...config, reportSections: { maintenance: true } },
    7,
  );
  expect(report.maintenance).toHaveLength(1);
  expect(report.maintenance[0].description).toBe("Local demo inspection");
  expect(apiGetJson).not.toHaveBeenCalled();
  expect(getUnitHistory).not.toHaveBeenCalled();
  expect(getSales).not.toHaveBeenCalled();
});
it("propagates live query failure without serializing a fictional report", async () => {
  getPortfolioHistory.mockRejectedValueOnce(new Error("History unavailable"));
  await expect(
    generatePortfolioReport({ units }, DEFAULT_ASSUMPTIONS, config, 7),
  ).rejects.toThrow("History unavailable");
  expect(generateReportFile).not.toHaveBeenCalled();
});
