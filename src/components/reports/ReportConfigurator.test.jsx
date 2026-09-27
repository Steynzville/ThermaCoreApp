import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { it, expect, vi, beforeEach } from "vitest";
import ReportConfigurator from "./ReportConfigurator";
import { reportTypes } from "../../constants/reportSections";
const { generate, sound } = vi.hoisted(() => ({
  generate: vi.fn(),
  sound: vi.fn(),
}));
vi.mock("../../context/SettingsContext", () => ({
  useSettings: () => ({ settings: { soundEnabled: true, volume: 0.5 } }),
}));
vi.mock("../../utils/audioPlayer", () => ({
  default: (...args) => sound(...args),
}));
const props = {
  availableUnits: [
    { id: "A", name: "Alpha", client: "Tenant A" },
    { id: "B", name: "Beta", client: "Tenant B" },
  ],
  availableReportTypes: reportTypes,
  allowedSections: ["vitalStatistics", "alertsAlarms"],
  onGenerate: generate,
  showScheduling: false,
  showPauseScheduled: false,
};
beforeEach(() => {
  vi.clearAllMocks();
  generate.mockResolvedValue();
});
function configure(format) {
  fireEvent.click(screen.getByText("All Sections Report"));
  fireEvent.click(screen.getByText("Single Unit"));
  fireEvent.click(screen.getByLabelText("Select Alpha"));
  if (format) fireEvent.click(screen.getByRole("button", { name: format }));
}
it.each([
  ["Excel", "xlsx"],
  ["Word", "docx"],
  ["PDF", "pdf"],
])("requires and passes %s format and exact subset", async (label, format) => {
  render(<ReportConfigurator {...props} />);
  configure();
  expect(
    screen.getByText("Generate & Download Report").closest("button"),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: label }));
  fireEvent.click(screen.getByText("Generate & Download Report"));
  await waitFor(() =>
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedUnits: ["A"],
        scope: "single",
        outputFormat: format,
      }),
    ),
  );
  await waitFor(() => expect(sound).toHaveBeenCalledWith("sky.mp3", true, 0.5));
});
it("shows exporter failure, does not play success sound, and allows retry", async () => {
  generate.mockRejectedValueOnce(new Error("Exporter failed"));
  render(<ReportConfigurator {...props} />);
  configure("PDF");
  fireEvent.click(screen.getByText("Generate & Download Report"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Exporter failed");
  expect(sound).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Generate & Download Report"));
  await waitFor(() => expect(sound).toHaveBeenCalledOnce());
});
it("does not play a success sound after leaving the report screen", async () => {
  let finish;
  generate.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { unmount } = render(<ReportConfigurator {...props} />);
  configure("PDF");
  fireEvent.click(screen.getByText("Generate & Download Report"));
  unmount();
  finish();
  await Promise.resolve();
  expect(sound).not.toHaveBeenCalled();
});
it("requires a unit selection", () => {
  render(<ReportConfigurator {...props} />);
  fireEvent.click(screen.getByText("All Sections Report"));
  fireEvent.click(screen.getByText("Single Unit"));
  fireEvent.click(screen.getByRole("button", { name: "PDF" }));
  expect(
    screen.getByText("Generate & Download Report").closest("button"),
  ).toBeDisabled();
});
