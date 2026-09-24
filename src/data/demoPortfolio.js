import { units as fixtures } from "./mockUnits";
import { normalizeUnit } from "../utils/portfolio";

// Fictional ownership is explicit and separate from database tenant identifiers.
// Live API ownership always takes precedence when the same unit exists there.
export const demoTenants = fixtures.map((unit) => ({
  id: `demo-${unit.id.toLowerCase()}`,
  client_id: `demo-client-${unit.id.toLowerCase()}`,
  name: unit.client.name,
  slug: `demo-${unit.id.toLowerCase()}`,
  unitCount: 1,
  source: "demo",
}));

export const demoUnits = fixtures.map((unit, i) =>
  normalizeUnit({
    ...unit,
    batteryVoltage:
      unit.hasAlert && !unit.hasAlarm && unit.status === "online"
        ? 21.8
        : unit.batteryVoltage,
    supports_heat: i % 3 === 0,
    supports_chill: i % 3 === 1,
    supports_water: i % 3 !== 1 && (unit.watergeneration || i === 3),
    watergeneration: i % 3 !== 1 && (unit.watergeneration || i === 3),
    usefulHeat: unit.status === "online" && i % 3 === 0 ? 4.5 + i : 0,
    usefulChill: unit.status === "online" && i % 3 === 1 ? 2.5 + i : 0,
    waterRate:
      unit.status === "online" &&
      i % 3 !== 1 &&
      (unit.watergeneration || i === 3)
        ? 1.9
        : 0,
    waterProductionOn:
      unit.status === "online" &&
      i % 3 !== 1 &&
      (unit.watergeneration || i === 3),
    tenantId: demoTenants[i].id,
    clientId: demoTenants[i].client_id,
    tenantName: demoTenants[i].name,
    source: "demo",
    demoNominalPower: unit.currentPower || 3 + i,
    capitalCost: { "Power-Box": 45000, "Power-Plus": 585384, Titan: 1463460 }[
      unit.productLine
    ],
    alerts:
      unit.hasAlert || unit.hasAlarm
        ? [
            {
              id: `demo-${unit.id}-condition`,
              type: unit.hasAlarm ? "critical" : "warning",
              severity: unit.hasAlarm ? "critical" : "warning",
              title: unit.hasAlarm
                ? "NH3 LEAK DETECTED"
                : unit.status === "offline"
                  ? "Unit Offline"
                  : "Low Battery Voltage",
              category: unit.hasAlarm ? "alarm" : "alert",
              message: unit.hasAlarm
                ? "Critical ammonia detector alarm: NH3 concentration exceeds the configured safety threshold. Immediate attention required."
                : unit.status === "offline"
                  ? "The unit is offline; no current telemetry is being received."
                  : "Backup battery voltage is 21.8 V, below the configured 22 V minimum; inspect the battery and charging circuit.",
              timestamp: "2026-08-21T08:00:00Z",
              acknowledged: false,
            },
          ]
        : [],
  }),
);

export function demoHistory(units, now = new Date()) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return units.flatMap((unit) =>
    Array.from({ length: 90 }, (_, index) => {
      const day = new Date(today.getTime() - (89 - index) * 86400000);
      if (unit.installDate && day < new Date(unit.installDate)) return null;
      const hours = index === 89 ? Math.max(0, (now - today) / 3600000) : 24;
      const seed = [...unit.id].reduce((n, c) => n + c.charCodeAt(0), 0);
      const uptime = 0.9 + ((seed + index) % 9) / 100;
      const gross =
        Math.max(0, Number(unit.demoNominalPower ?? unit.currentPower ?? 0)) *
        hours *
        uptime;
      const parasitic = gross * 0.04;
      const self = (gross - parasitic) * (0.7 + (seed % 20) / 100);
      return {
        unitId: unit.id,
        date: day.toISOString().slice(0, 10),
        source: "demo",
        grossKWh: gross,
        parasiticKWh: parasitic,
        selfConsumedKWh: self,
        exportedKWh: gross - parasitic - self,
        waterLitres: unit.watergeneration
          ? hours * (0.5 + (seed % 10) / 10) * uptime
          : 0,
        observedHours: hours,
        operatingHours: hours * uptime,
        repairHours: 0,
        failures: 0,
      };
    }).filter(Boolean),
  );
}
