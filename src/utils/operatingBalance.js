import { unitOutputs } from "./unitOutputs";

export const balances = [
  {
    output: "heat",
    field: "powerHeatBalance",
    label: "Heat",
    description: "heating output",
  },
  {
    output: "water",
    field: "powerWaterBalance",
    label: "AWG Water",
    description: "AWG water production",
  },
  {
    output: "chill",
    field: "powerChillBalance",
    label: "Chill",
    description: "chilling output",
  },
];

export function applicableBalances(unit) {
  const outputs = unitOutputs(unit);
  return outputs.power.capable
    ? balances.filter(({ output }) => outputs[output].capable)
    : [];
}

// Production quantities cannot establish an operating bias. Unknown live state
// remains unknown until the gateway supplies an acknowledged balance.
export function appliedBalance(unit, field) {
  const value = unit[field] ?? unit.controls?.[field];
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : null;
}

export function balanceLabel(value, label) {
  return value === 0
    ? "Max Power"
    : value === 50
      ? "Balanced"
      : value === 100
        ? `Max ${label}`
        : value == null
          ? "Not reported"
          : "Custom balance";
}
