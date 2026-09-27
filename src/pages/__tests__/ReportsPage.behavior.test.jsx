import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { generatePortfolioReport } from "../../services/portfolioReportService";
import { downloadReportFile } from "../../services/reportExportService";
import {
  listSchedules,
  updateSchedule,
} from "../../services/reportScheduleService";
import ReportsPage from "../ReportsPage";

const state = vi.hoisted(() => ({ portfolio: {}, role: "viewer" }));
vi.mock("../../context/UnitContext", () => ({
  useUnits: () => state.portfolio,
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 7 }, backendRole: state.role }),
}));
vi.mock("../../context/AnalyticsContext", () => ({
  useAnalytics: () => ({ assumptions: {} }),
}));
vi.mock("../../context/SettingsContext", () => ({
  useSettings: () => ({ settings: { soundEnabled: false } }),
}));
vi.mock("../../services/portfolioReportService", async (original) => ({
  ...(await original()),
  generatePortfolioReport: vi.fn(),
}));
vi.mock("../../services/reportExportService", () => ({
  downloadReportFile: vi.fn(),
}));
vi.mock("../../services/reportScheduleService", () => ({
  listSchedules: vi.fn(),
  updateSchedule: vi.fn(),
  addSchedule: vi.fn(),
}));
const config = { selectedUnits: ["A"], outputFormat: "pdf" };
beforeEach(() => {
  state.role = "viewer";
  state.portfolio = {
    units: [{ id: "A", name: "Alpha", clientId: 1, tenantName: "Tenant" }],
    scopeKey: "7:1",
    loading: false,
  };
  listSchedules.mockResolvedValue([]);
  updateSchedule.mockResolvedValue({});
  generatePortfolioReport.mockResolvedValue({ filename: "actual.pdf" });
});
it("renders the real configurator, enforces viewer sections and downloads the selected format", async () => {
  render(<ReportsPage />);
  expect(screen.queryByText("Sales & Revenue Report")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("All Sections Report"));
  fireEvent.click(screen.getByText("Single Unit"));
  fireEvent.click(screen.getByLabelText("Select Alpha"));
  fireEvent.click(screen.getByRole("button", { name: "PDF" }));
  fireEvent.click(screen.getByText("Generate & Download Report"));
  await waitFor(() =>
    expect(downloadReportFile).toHaveBeenCalledWith({ filename: "actual.pdf" }),
  );
  expect(generatePortfolioReport).toHaveBeenCalledWith(
    state.portfolio,
    {},
    expect.objectContaining({
      scope: "single",
      selectedUnits: ["A"],
      outputFormat: "pdf",
    }),
    7,
  );
  expect(
    screen.getByText(/Scheduled reports run while this page is open/),
  ).toBeInTheDocument();
});
it("claims only due permitted schedules and records completion after generation", async () => {
  listSchedules.mockResolvedValue([
    { id: 1, status: "scheduled", scheduledAt: "2020-01-01", config },
    {
      id: 2,
      status: "scheduled",
      scheduledAt: "2020-01-01",
      config: { ...config, selectedUnits: ["foreign"] },
    },
    { id: 3, status: "scheduled", scheduledAt: "2099-01-01", config },
  ]);
  render(<ReportsPage />);
  await waitFor(() =>
    expect(updateSchedule).toHaveBeenCalledWith(7, 1, "completed"),
  );
  expect(updateSchedule.mock.calls).toEqual([
    [7, 1, "processing"],
    [7, 1, "completed"],
  ]);
  expect(generatePortfolioReport).toHaveBeenCalledTimes(1);
  expect(downloadReportFile).toHaveBeenCalledTimes(1);
});
it("marks failed scheduled generation without downloading and exposes retry state", async () => {
  listSchedules.mockResolvedValue([
    { id: 1, status: "scheduled", scheduledAt: "2020-01-01", config },
  ]);
  generatePortfolioReport.mockRejectedValue(new Error("Export failed"));
  render(<ReportsPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Export failed");
  expect(updateSchedule).toHaveBeenLastCalledWith(7, 1, "failed");
  expect(downloadReportFile).not.toHaveBeenCalled();
});
it("resumes paused reports, shows service errors, and suppresses downloads after leaving", async () => {
  listSchedules.mockResolvedValue([
    { id: 1, status: "paused", scheduledAt: "2099-01-01", config },
  ]);
  const { unmount } = render(<ReportsPage />);
  fireEvent.click(await screen.findByText("Resume"));
  await waitFor(() =>
    expect(updateSchedule).toHaveBeenCalledWith(7, 1, "scheduled"),
  );
  updateSchedule.mockRejectedValueOnce(new Error("Permission changed"));
  fireEvent.click(screen.getByText("Resume"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Permission changed",
  );
  let finish;
  generatePortfolioReport.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(screen.getByText("All Sections Report"));
  fireEvent.click(screen.getByText("Single Unit"));
  fireEvent.click(screen.getByLabelText("Select Alpha"));
  fireEvent.click(screen.getByRole("button", { name: "Excel" }));
  fireEvent.click(screen.getByText("Generate & Download Report"));
  unmount();
  await act(async () => finish({ filename: "late.xlsx" }));
  expect(downloadReportFile).not.toHaveBeenCalled();
});
it("shows portfolio loading and schedule service failure without a fake schedule", async () => {
  state.portfolio.loading = true;
  const { rerender } = render(<ReportsPage />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading portfolio");
  expect(listSchedules).not.toHaveBeenCalled();
  state.portfolio.loading = false;
  listSchedules.mockRejectedValue(new Error("Schedules offline"));
  rerender(<ReportsPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Schedules offline",
  );
});
