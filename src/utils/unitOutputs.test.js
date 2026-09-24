import { expect, it } from "vitest";
import { normalizeUnit } from "./portfolio";
import { unitOutputs } from "./unitOutputs";
import { demoUnits } from "../data/demoPortfolio";
it("requires measured, fresh, good output rather than installed capability", () => {
  const base = {
    status: "online",
    supports_heat: true,
    usefulHeat: 8,
    source: "live",
  };
  expect(unitOutputs(base).heat.active).toBe(false);
  for (const change of [
    { value: 0 },
    { quality: "BAD" },
    { stale: true },
    { capable: false },
  ]) {
    expect(
      unitOutputs({
        ...base,
        outputs: {
          heat: {
            value: 8,
            capable: true,
            quality: "GOOD",
            stale: false,
            ...change,
          },
        },
      }).heat.active,
    ).toBe(false);
  }
  const unit = {
    ...base,
    outputs: {
      heat: { value: 8, capable: true, quality: "GOOD", stale: false },
    },
  };
  expect(normalizeUnit(normalizeUnit(unit)).outputs.heat.active).toBe(true);
  expect(unitOutputs({ ...unit, status: "offline" }).heat.active).toBe(false);
});
it("demonstrates all four active outputs and chilling without AWG in the first five units", () => {
  for (const key of ["power", "heat", "chill", "water"])
    expect(demoUnits.slice(0, 5).some((unit) => unit.outputs[key].active)).toBe(
      true,
    );
  expect(demoUnits[1].outputs.chill.active).toBe(true);
  expect(demoUnits[1].outputs.water.capable).toBe(false);
});
it("never treats absolute ambient pressure as machine differential pressure", () => {
  expect(
    normalizeUnit({ id: "A", pressure: 1013 }).differentialPressure,
  ).toBeNull();
});
