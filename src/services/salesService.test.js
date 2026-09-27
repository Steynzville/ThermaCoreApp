import { expect, it } from "vitest";
import { salesAnalytics } from "./salesService";
it("calculates commercial sales separately from operational telemetry and filters ownership", () => {
  const units = [
    { id: "A", status: "online", currentPower: 9999 },
    { id: "B", status: "offline" },
  ];
  const result = salesAnalytics(units, [
    { unitId: "A", productLine: "Power-Box", date: "2026-01-01", revenue: 100 },
    { unitId: "B", productLine: "Titan", date: "2026-02-01", revenue: 200 },
    {
      unitId: "foreign",
      productLine: "Secret",
      date: "2026-02-01",
      revenue: 999999,
    },
  ]);
  expect(result.summaryData).toEqual({
    totalSales: 2,
    totalRevenue: 300,
    activeUnits: 1,
    avgGrowth: "100.0%",
  });
  expect(result.monthlyTrend).toEqual([
    { month: "2026-01", units: 1, revenue: 100 },
    { month: "2026-02", units: 2, revenue: 300 },
  ]);
  expect(result.analyticsData).toHaveLength(2);
});
it("does not invent growth when consecutive commercial months are unavailable", () => {
  expect(salesAnalytics([], []).summaryData.avgGrowth).toBe("Not available");
});
