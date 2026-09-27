import { isDemoMode } from "../config/runtime";
import { apiGetJson } from "../utils/apiFetch";
export async function getSales(units) {
  if (isDemoMode)
    return units
      .filter((unit) => unit.capitalCost != null)
      .map((unit) => ({
        id: `demo-sale-${unit.id}`,
        unitId: unit.id,
        date: unit.installDate?.slice(0, 10),
        revenue: unit.capitalCost,
        productLine: unit.productLine,
        source: "demo",
      }));
  if (!units.length) return [];
  const ids = new Set(units.map((unit) => unit.id));
  return (
    (
      await apiGetJson(
        `/api/v1/portfolio/sales?${new URLSearchParams({ unit_ids: [...ids].join(",") })}`,
      )
    ).data || []
  ).filter((row) => ids.has(row.unitId));
}
export function salesAnalytics(units, records) {
  const ids = new Set(units.map((unit) => unit.id));
  const rows = records.filter((row) => ids.has(row.unitId));
  const groups = new Map(),
    months = new Map();
  for (const row of rows) {
    const group = groups.get(row.productLine) || {
      name: row.productLine,
      sales: 0,
      revenue: 0,
    };
    group.sales++;
    group.revenue += Number(row.revenue) || 0;
    groups.set(row.productLine, group);
    const month = row.date.slice(0, 7);
    const entry = months.get(month) || { month, units: 0, revenue: 0 };
    entry.units++;
    entry.revenue += Number(row.revenue) || 0;
    months.set(month, entry);
  }
  const colours = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];
  const analyticsData = [...groups.values()].map((group, index) => ({
    ...group,
    avgPrice: group.revenue / group.sales,
    fill: colours[index % colours.length],
  }));
  const monthly = [...months.values()].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  let count = 0,
    revenue = 0;
  const monthlyTrend = monthly.map((row) => ({
    month: row.month,
    units: (count += row.units),
    revenue: (revenue += row.revenue),
  }));
  const last = monthly.at(-1),
    prev = monthly.at(-2);
  const consecutive =
    last &&
    prev &&
    Number(last.month.slice(0, 4)) * 12 +
      Number(last.month.slice(5)) -
      (Number(prev.month.slice(0, 4)) * 12 + Number(prev.month.slice(5))) ===
      1;
  const growth =
    consecutive && prev.revenue > 0
      ? `${(((last.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1)}%`
      : "Not available";
  return {
    analyticsData,
    categoryData: analyticsData.map((row) => ({
      name: row.name,
      value: row.sales,
    })),
    monthlyTrend,
    summaryData: {
      totalSales: rows.length,
      totalRevenue: revenue,
      activeUnits: units.filter((unit) => unit.status === "online").length,
      avgGrowth: growth,
    },
  };
}
