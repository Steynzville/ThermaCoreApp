import { afterEach, expect, it, vi } from "vitest";
import deployment from "./deployment.json";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("uses the explicit branch deployment mode when no override is supplied", async () => {
  vi.stubEnv("VITE_DATA_MODE", "");
  vi.resetModules();
  expect((await import("./runtime")).DATA_MODE).toBe(deployment.dataMode);
});
it.each(["demo", "live"])(
  "honors an explicit %s deployment override",
  async (mode) => {
    vi.stubEnv("VITE_DATA_MODE", mode);
    vi.resetModules();
    const runtime = await import("./runtime");
    expect(runtime.DATA_MODE).toBe(mode);
    expect(runtime.isDemoMode).toBe(mode === "demo");
  },
);
it("rejects misspelled modes instead of falling back to demonstrations", async () => {
  vi.stubEnv("VITE_DATA_MODE", "development");
  vi.resetModules();
  await expect(import("./runtime")).rejects.toThrow("must be demo or live");
});
