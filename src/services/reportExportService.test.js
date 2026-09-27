import { Blob as NodeBlob } from "node:buffer";
import { beforeAll, afterAll, vi, describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { inflateRawSync } from "node:zlib";
import { createReport } from "../utils/reportModel";
import { DEFAULT_ASSUMPTIONS } from "../utils/portfolioAnalytics";
import { generateReportFile } from "./reportExportService";
vi.mock("./reportFonts", () => ({
  loadReportFonts: async () => {
    const { readFileSync } = await import("node:fs");
    return ["ReportSans.ttf", "ReportSans-Bold.ttf"].map((name) =>
      readFileSync(`src/assets/report-fonts/${name}`).toString("base64"),
    );
  },
}));
const originalBlob = globalThis.Blob;
beforeAll(() => {
  globalThis.Blob = NodeBlob;
});
afterAll(() => {
  globalThis.Blob = originalBlob;
});
const unit = {
  id: "A-001",
  name: "Alpha Unit",
  tenantName: "Alpha Tenant",
  location: "Perth",
  status: "online",
  currentPower: 10,
  installDate: "2025-01-01",
};
const input = {
  units: [unit, { ...unit, id: "B-999", name: "Foreign Unit" }],
  records: [
    {
      unitId: "A-001",
      date: "2026-09-20",
      grossKWh: 100,
      parasiticKWh: 10,
      selfConsumedKWh: 60,
      exportedKWh: 30,
      waterLitres: 50,
      observedHours: 24,
      operatingHours: 20,
    },
    { unitId: "B-999", date: "2026-09-20", grossKWh: 9999 },
  ],
  scopeLabel: "Alpha Tenant",
  selectedIds: ["A-001"],
  from: "2026-09-20",
  to: "2026-09-20",
  now: new Date("2026-09-21T12:00:00Z"),
  assumptions: DEFAULT_ASSUMPTIONS,
  isDemoMode: true,
};
// Read an OOXML member through its central directory, independent of ZIP data descriptors.
function zipMember(buffer, name) {
  for (let offset = 0; offset + 46 < buffer.length; offset++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const size = buffer.readUInt32LE(offset + 20),
      length = buffer.readUInt16LE(offset + 28);
    if (buffer.subarray(offset + 46, offset + 46 + length).toString() !== name)
      continue;
    const local = buffer.readUInt32LE(offset + 42);
    const start =
      local +
      30 +
      buffer.readUInt16LE(local + 26) +
      buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    return (
      buffer.readUInt16LE(offset + 10) === 8 ? inflateRawSync(data) : data
    ).toString();
  }
  throw new Error(`Missing ZIP member: ${name}`);
}
describe("Report contract and actual files", () => {
  it("rejects missing formats, invalid dates and units outside the current portfolio", () => {
    expect(() => createReport({ ...input, format: "" })).toThrow(
      "Select Excel",
    );
    expect(() =>
      createReport({ ...input, format: "pdf", from: "2026-02-31" }),
    ).toThrow("date range");
    expect(() =>
      createReport({ ...input, format: "pdf", selectedIds: ["unassigned"] }),
    ).toThrow("current portfolio");
  });
  it("filters period and sections while retaining calculation notes", () => {
    const r = createReport({ ...input, format: "pdf", sections: ["units"] });
    expect(r.records).toHaveLength(1);
    expect(r.summary.grossKWh).toBe(100);
    expect(r.summary.netBenefit).toBeCloseTo(26.4);
    expect(r.sections).toEqual(["units"]);
    expect(r.notes.length).toBeGreaterThan(3);
  });
  it("creates a readable Excel workbook with numeric scoped totals", async () => {
    const file = await generateReportFile(
      createReport({ ...input, format: "xlsx" }),
    );
    const buffer = Buffer.from(await file.blob.arrayBuffer());
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(buffer);
    expect(file.filename).toMatch(/\.xlsx$/);
    const sheet = book.getWorksheet("Period summary");
    expect(sheet.getRow(4).getCell(2).value).toBe(100);
    const daily = book.getWorksheet("Daily production");
    expect(daily.rowCount).toBe(2);
    expect(daily.getRow(2).getCell(2).value).toBe("A-001");
    expect(book.getWorksheet("Calculation assumptions")).toBeDefined();
  });
  it("creates a DOCX with selected unit, totals, notes and repeated table headers", async () => {
    const file = await generateReportFile(
      createReport({ ...input, format: "docx" }),
    );
    const xml = zipMember(
      Buffer.from(await file.blob.arrayBuffer()),
      "word/document.xml",
    );
    expect(xml).toContain("Alpha Unit");
    expect(xml).toContain("26.4");
    expect(xml).toContain("Method and coverage");
    expect(xml).toContain("tblHeader");
    expect(xml).not.toContain("Foreign Unit");
    expect(xml).not.toContain("B-999");
  });
  it("creates a real paginated PDF containing only selected portfolio data", async () => {
    const file = await generateReportFile(
      createReport({ ...input, format: "pdf" }),
    );
    const text = Buffer.from(await file.blob.arrayBuffer()).toString("latin1");
    expect(text).toMatch(/^%PDF-/);
    expect(text).toContain("/FontFile2");
    expect(text).not.toContain("B-999");
    expect(text).toContain("/Type /Page");
  });
  it("handles an empty period explicitly in every format", async () => {
    const r = createReport({ ...input, records: [], format: "pdf" });
    expect(r.summary.netBenefit).toBeNull();
    const f = await generateReportFile(r);
    expect(
      Buffer.from(await f.blob.arrayBuffer()).toString("latin1"),
    ).toContain("/FontFile2");
  });
});

it.each(["xlsx", "docx", "pdf"])(
  "isolates one-unit and multi-unit sections in real %s output",
  async (format) => {
    const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import(
      "node:fs"
    );
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { execFileSync } = await import("node:child_process");
    const allUnits = [
      ...input.units,
      { ...unit, id: "C-002", name: "Charlie Selected" },
    ];
    for (const selectedIds of [["A-001"], ["A-001", "C-002"]]) {
      const report = createReport({
        ...input,
        units: allUnits,
        selectedIds,
        format,
        records: [
          ...input.records,
          { ...input.records[0], unitId: "C-002", grossKWh: 200 },
        ],
        events: allUnits.map((u) => ({
          id: u.id,
          unitId: u.id,
          unitName: u.name,
          description: `Event ${u.id}`,
          timestamp: "2026-09-20T10:00:00Z",
        })),
        alerts: allUnits.map((u) => ({
          id: u.id,
          unitId: u.id,
          unitName: u.name,
          message: `Alert ${u.id}`,
        })),
        histories: allUnits.map((u) => ({
          unitId: u.id,
          date: "2026-09-20",
          power: 5,
        })),
        maintenance: allUnits.map((u) => ({
          unitId: u.id,
          scheduledAt: "2026-09-20T10:00:00Z",
          description: `Maintenance ${u.id}`,
        })),
        sales: allUnits.map((u) => ({
          unitId: u.id,
          date: "2026-09-20",
          revenue: 500,
        })),
      });
      expect(report.summary.grossKWh).toBe(
        selectedIds.length === 1 ? 100 : 300,
      );
      const file = await generateReportFile(report),
        buffer = Buffer.from(await file.blob.arrayBuffer());
      let content;
      if (format === "xlsx") {
        const book = new ExcelJS.Workbook();
        await book.xlsx.load(buffer);
        content = JSON.stringify(
          book.worksheets.map((sheet) => sheet.getSheetValues()),
        );
      } else if (format === "docx")
        content = zipMember(buffer, "word/document.xml");
      else {
        const dir = mkdtempSync(join(tmpdir(), "thermacore-report-"));
        try {
          writeFileSync(join(dir, "report.pdf"), buffer);
          execFileSync("pdftotext", [
            "-layout",
            join(dir, "report.pdf"),
            join(dir, "report.txt"),
          ]);
          content = readFileSync(join(dir, "report.txt"), "utf8");
        } finally {
          rmSync(dir, { recursive: true, force: true });
        }
      }
      expect(content).toContain("A-001");
      expect(content).not.toContain("B-999");
      expect(content).not.toContain("Foreign Unit");
      if (selectedIds.length === 2) expect(content).toContain("C-002");
      else expect(content).not.toContain("C-002");
    }
  },
);
