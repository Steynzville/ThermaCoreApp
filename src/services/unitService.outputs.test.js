import { beforeEach, expect, it, vi } from "vitest";
vi.mock("../config/runtime", () => ({ isDemoMode: true }));
vi.mock("../utils/authToken", () => ({ getAuthToken: () => null }));
import { getAllUnits, controlUnit, resetDemoState } from "./unitService";
beforeEach(resetDemoState);
it("demo controls change actual output state without losing nominal capability", async () => {
  const units = await getAllUnits();
  const water = units.find((u) => u.outputs.water.active);
  const stopped = (await controlUnit(water, { waterProductionOn: false })).unit;
  expect(stopped.outputs.water.active).toBe(false);
  expect(stopped.outputs.water.capable).toBe(true);
  const restored = (await controlUnit(stopped, { waterProductionOn: true }))
    .unit;
  expect(restored.outputs.water.active).toBe(true);
  for (const unit of units.filter((u) => u.status === "online")) {
    const off = (await controlUnit(unit, { machinePower: false })).unit;
    expect(Object.values(off.outputs).every((output) => !output.active)).toBe(
      true,
    );
  }
});
