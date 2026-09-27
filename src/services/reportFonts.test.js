import { readFileSync } from "node:fs";
import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
it("loads actual font bytes once and reuses the encoded PDF fonts", async () => {
  const bytes = readFileSync("src/assets/report-fonts/ReportSans.ttf");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
    })),
  );
  const { loadReportFonts } = await import("./reportFonts");
  const values = await loadReportFonts();
  expect(values).toHaveLength(2);
  expect(Buffer.from(values[0], "base64")).toEqual(bytes);
  expect(await loadReportFonts()).toBe(values);
  expect(fetch).toHaveBeenCalledTimes(2);
  vi.unstubAllGlobals();
});
it("rejects unavailable font assets and permits a genuine retry", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: false })),
  );
  const { loadReportFonts } = await import("./reportFonts");
  await expect(loadReportFonts()).rejects.toThrow("Could not load PDF fonts");
  const bytes = readFileSync("src/assets/report-fonts/ReportSans-Bold.ttf");
  fetch.mockResolvedValue({
    ok: true,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  });
  expect(Buffer.from((await loadReportFonts())[1], "base64")).toEqual(bytes);
  vi.unstubAllGlobals();
});
