import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { it, expect, vi, beforeEach } from "vitest";
import ReportConfigurator from "./ReportConfigurator";
import {
  generateReportFile,
  downloadReportFile,
} from "../../services/reportExportService";
const { scope } = vi.hoisted(() => ({
  scope: {
    units: [{ id: "A", name: "Alpha", capitalCost: 100 }],
    records: [],
    events: [],
    alerts: [],
    loading: false,
    scopeLabel: "Alpha Tenant",
    scopeKey: "alpha",
    isDemoMode: true,
  },
}));
vi.mock("../../context/UnitContext", () => ({ useUnits: () => scope }));
vi.mock("../../context/AnalyticsContext", () => ({
  useAnalytics: () => ({ assumptions: {}, setAssumptions: vi.fn() }),
}));
vi.mock("../../services/reportExportService", () => ({
  generateReportFile: vi.fn(),
  downloadReportFile: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  generateReportFile.mockResolvedValue({
    filename: "report.pdf",
    blob: new Blob(),
  });
});
it.each(["xlsx", "docx", "pdf"])(
  "requires and passes the selected %s format",
  async (format) => {
    render(<ReportConfigurator />);
    expect(screen.getByLabelText("Report format")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Report format"), {
      target: { value: format },
    });
    fireEvent.click(screen.getByText("Generate and download report"));
    await waitFor(() => expect(downloadReportFile).toHaveBeenCalledOnce());
    expect(generateReportFile.mock.calls[0][0]).toMatchObject({
      format,
      scopeLabel: "Alpha Tenant",
      units: [{ id: "A" }],
    });
  },
);
it("reports generation errors and allows retry", async () => {
  generateReportFile.mockRejectedValueOnce(new Error("Exporter failed"));
  render(<ReportConfigurator />);
  fireEvent.change(screen.getByLabelText("Report format"), {
    target: { value: "pdf" },
  });
  fireEvent.click(screen.getByText("Generate and download report"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Exporter failed");
  expect(downloadReportFile).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Generate and download report"));
  await waitFor(() => expect(downloadReportFile).toHaveBeenCalledOnce());
});
it("cancels a delayed download after switching portfolio or logging out", async () => {
  let finish;
  generateReportFile.mockImplementation(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const { unmount } = render(<ReportConfigurator />);
  fireEvent.change(screen.getByLabelText("Report format"), {
    target: { value: "xlsx" },
  });
  fireEvent.click(screen.getByText("Generate and download report"));
  await waitFor(() => expect(generateReportFile).toHaveBeenCalled());
  unmount();
  finish({ filename: "old.xlsx", blob: new Blob() });
  await Promise.resolve();
  expect(downloadReportFile).not.toHaveBeenCalled();
});
it("rejects an empty unit selection", async () => {
  render(<ReportConfigurator />);
  fireEvent.click(screen.getByText("Clear"));
  fireEvent.change(screen.getByLabelText("Report format"), {
    target: { value: "pdf" },
  });
  fireEvent.click(screen.getByText("Generate and download report"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Select units");
  expect(generateReportFile).not.toHaveBeenCalled();
});
