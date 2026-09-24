// Values are useful delivered output rates, never installed capacity or tank level.
export function unitOutputs(unit) {
  const online = ["online", "operational"].includes(unit.status);
  const definitions = {
    power: [true, unit.currentPower ?? unit.current_power, "kW"],
    heat: [unit.supports_heat, unit.usefulHeat ?? unit.useful_heat_kw, "kWth"],
    chill: [
      unit.supports_chill,
      unit.usefulChill ?? unit.useful_chill_kw,
      "kWth",
    ],
    water: [
      unit.supports_water ?? unit.watergeneration,
      unit.waterRate ?? unit.water_rate_lph,
      "L/h",
    ],
  };
  return Object.fromEntries(
    Object.entries(definitions).map(([key, [capability, reading, units]]) => {
      const source = unit.outputs?.[key];
      const value = source?.value ?? reading;
      const valid = value != null && Number.isFinite(Number(value));
      const capable = source?.capable ?? Boolean(capability);
      const stale = source?.stale ?? unit.source !== "demo";
      const quality =
        source?.quality ?? (unit.source === "demo" ? "GOOD" : "UNKNOWN");
      return [
        key,
        {
          capable,
          value: valid ? Number(value) : null,
          unit: units,
          measuredAt: source?.measuredAt ?? null,
          quality,
          stale,
          active:
            online &&
            capable &&
            valid &&
            Number(value) > 0 &&
            !stale &&
            quality === "GOOD",
        },
      ];
    }),
  );
}
