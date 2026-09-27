import { describe, it, expect } from "vitest";
import { scadaAnalytics, thresholdProjections } from "./scadaAnalytics";
describe("advanced SCADA calculations", () => {
  it("uses only the selected unit and selected dates, with observed coverage rather than fabricated uptime", () => {
    const rows = [
      {
        unitId: "A",
        date: "2026-09-01",
        grossKWh: 24,
        observedHours: 12,
        operatingHours: 6,
      },
      {
        unitId: "A",
        date: "2026-09-02",
        grossKWh: 36,
        observedHours: 12,
        operatingHours: 12,
      },
      {
        unitId: "B",
        date: "2026-09-01",
        grossKWh: 9999,
        observedHours: 24,
        operatingHours: 24,
      },
      {
        unitId: "A",
        date: "2026-08-01",
        grossKWh: 9999,
        observedHours: 24,
        operatingHours: 24,
      },
    ];
    const result = scadaAnalytics(
      { id: "A", name: "Unit A" },
      rows,
      [],
      "2026-09-01",
      "2026-09-02",
    );
    expect(result.performanceMetrics.overall).toEqual({
      uptime: 75,
      availability: 50,
      quality: null,
      efficiency: null,
    });
    expect(result.energyData.total).toBe(60);
    expect(result.energyData.average).toBe(30);
    expect(result.energyData.peak).toBe(36);
    expect(
      result.equipmentHealth.devices[0].predictions.remainingLifetime,
    ).toBeNull();
    expect(result.energyData.byDevice.map((row) => row.id)).toEqual(["A"]);
  });
  it("does not turn missing data into zero production or good equipment health", () => {
    const result = scadaAnalytics(
      { id: "A" },
      [],
      [],
      "2026-09-01",
      "2026-09-02",
    );
    expect(result.energyData.total).toBe("Unavailable");
    expect(result.performanceMetrics.overall.uptime).toBeNull();
    expect(result.equipmentHealth.overall.score).toBeNull();
  });
  it("extrapolates only supported configured thresholds with sufficient coherent measurements", () => {
    const unit = {
      id: "A",
      sensors: [
        {
          name: "Inlet",
          sensor_type: "temp_in",
          unit_of_measurement: "°C",
          max_value: 30,
        },
      ],
    };
    const start = +new Date("2026-09-01T00:00:00Z");
    const rows = Array.from({ length: 24 }, (_, index) => ({
      unitId: "A",
      timestamp: new Date(start + index * 3600000).toISOString(),
      tempIn: 20 + index / 24,
    }));
    const projections = thresholdProjections(unit, rows);
    expect(projections).toHaveLength(1);
    expect(projections[0].days).toBeCloseTo(9, 0);
    expect(projections[0].r2).toBe(1);
    expect(thresholdProjections(unit, rows.slice(0, 3))).toEqual([]);
    expect(thresholdProjections({ ...unit, id: "B" }, rows)).toEqual([]);
    expect(
      thresholdProjections(
        {
          ...unit,
          sensors: [{ ...unit.sensors[0], unit_of_measurement: "F" }],
        },
        rows,
      ),
    ).toEqual([]);
  });
});
