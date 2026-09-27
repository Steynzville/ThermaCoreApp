const available = (value) =>
  typeof value === "number" && Number.isFinite(value);
const display = (value) =>
  available(value) ? Number(value.toFixed(1)) : "Unavailable";
export function scadaAnalytics(unit, records, schedules, from, to) {
  const selected = records.filter(
    (row) =>
      String(row.unitId) === String(unit?.id) &&
      row.date >= from &&
      row.date <= to,
  );
  const measured = selected.filter((row) => available(row.grossKWh));
  const days = (new Date(to) - new Date(from)) / 86400000 + 1;
  const observed = selected.reduce(
    (sum, row) => sum + (row.observedHours || 0),
    0,
  );
  const operating = selected.reduce(
    (sum, row) => sum + (row.operatingHours || 0),
    0,
  );
  const uptime =
    observed > 0 ? Math.min(100, (operating / observed) * 100) : null;
  const availability =
    days > 0 && observed > 0
      ? Math.min(100, (observed / (days * 24)) * 100)
      : null;
  const total = measured.length
    ? measured.reduce((sum, row) => sum + row.grossKWh, 0)
    : null;
  const next = schedules
    .filter(
      (row) =>
        String(row.unitId) === String(unit?.id) &&
        row.status !== "cancelled" &&
        row.status !== "completed" &&
        new Date(row.scheduledAt) >= new Date(),
    )
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
  const due = next
    ? Math.ceil((new Date(next.scheduledAt) - new Date()) / 86400000)
    : null;
  const device = {
    id: unit?.id,
    name: unit?.name,
    status: unit?.status || "Unknown",
    efficiency: null,
    uptime,
  };
  return {
    performanceMetrics: {
      overall: { efficiency: null, uptime, availability, quality: null },
      trends: {
        efficiency: selected
          .filter((row) => row.observedHours > 0)
          .map((row) => ({
            hour: row.date,
            value: Math.min(
              100,
              (row.operatingHours / row.observedHours) * 100,
            ),
          })),
      },
      byDevice: unit ? [device] : [],
    },
    equipmentHealth: {
      overall: {
        score: null,
        status: unit?.healthStatus || "Unknown",
        lastMaintenance: unit?.lastMaintenance,
        nextMaintenance: next?.scheduledAt,
      },
      devices: unit
        ? [
            {
              ...device,
              status: unit.healthStatus || "Unknown",
              healthScore: "Unavailable",
              sensors: {
                temperature: available(unit.tempIn)
                  ? `${unit.tempIn} °C`
                  : "Unavailable",
                pressure: available(unit.differentialPressure)
                  ? `${unit.differentialPressure} bar`
                  : "Unavailable",
                flow: available(unit.flowRateInlet)
                  ? `${unit.flowRateInlet} L/min`
                  : "Unavailable",
              },
              predictions: { remainingLifetime: null, maintenanceDue: due },
            },
          ]
        : [],
    },
    energyData: {
      total: display(total),
      average: display(total == null ? null : total / measured.length),
      peak: display(
        measured.length
          ? Math.max(...measured.map((row) => row.grossKWh))
          : null,
      ),
      savings: null,
      timeline: measured.map((row) => ({
        date: row.date,
        consumption: row.grossKWh,
      })),
      byDevice:
        total > 0
          ? [{ ...device, consumption: display(total), percentage: 100 }]
          : [],
    },
  };
}
export function thresholdProjections(unit, history) {
  const mapping = {
    temp_in: ["tempIn", "°c"],
    temp_out_hot: ["tempOutHot", "°c"],
    temp_out: ["tempOutChill", "°c"],
    battery_voltage: ["batteryVoltage", "v"],
    differential_pressure_bar: ["differentialPressure", "bar"],
  };
  return (unit?.sensors || []).flatMap((sensor) => {
    const channel = mapping[sensor.sensor_type];
    if (
      !channel ||
      sensor.is_active === false ||
      (sensor.unit_of_measurement || "").toLowerCase() !== channel[1]
    )
      return [];
    const values = history
      .filter(
        (row) =>
          String(row.unitId) === String(unit.id) && available(row[channel[0]]),
      )
      .map((row) => ({
        x: +new Date(row.timestamp || row.date) / 86400000,
        y: row[channel[0]],
      }))
      .sort((a, b) => a.x - b.x);
    if (values.length < 12 || values.at(-1).x - values[0].x < 0.25) return [];
    const xMean = values.reduce((s, v) => s + v.x, 0) / values.length,
      yMean = values.reduce((s, v) => s + v.y, 0) / values.length;
    const xx = values.reduce((s, v) => s + (v.x - xMean) ** 2, 0),
      yy = values.reduce((s, v) => s + (v.y - yMean) ** 2, 0),
      xy = values.reduce((s, v) => s + (v.x - xMean) * (v.y - yMean), 0);
    const slope = xy / xx,
      r2 = xy ** 2 / (xx * yy);
    const threshold = slope > 0 ? sensor.max_value : sensor.min_value;
    if (
      !available(threshold) ||
      !available(r2) ||
      r2 < 0.8 ||
      Math.abs(slope) < 1e-8
    )
      return [];
    const fittedLatest = yMean + slope * (values.at(-1).x - xMean);
    const days = (threshold - fittedLatest) / slope;
    if (days <= 0 || days > 30) return [];
    return [
      {
        sensor: sensor.name,
        days: Number(days.toFixed(1)),
        threshold,
        unit: sensor.unit_of_measurement,
        r2: Number(r2.toFixed(2)),
      },
    ];
  });
}
export const scadaPercent = (value) =>
  available(value) ? `${value.toFixed(1)}%` : "Unavailable";
export const scadaDate = (value) =>
  value && Number.isFinite(+new Date(value))
    ? new Date(value).toLocaleDateString()
    : "Not recorded";
