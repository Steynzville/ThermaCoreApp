import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import UnitHistoryTab from "../components/unit-details/UnitHistoryTab";
import MaintenanceScheduler from "../components/unit-details/MaintenanceScheduler";
import RemoteControl from "../components/RemoteControl";
const { getHistory, apiGet, apiPost, unit, data } = vi.hoisted(() => {
  const unit = {
    id: "A",
    tenantId: 1,
    name: "Unit Alpha",
    status: "online",
    watergeneration: true,
  };
  return {
    unit,
    getHistory: vi.fn(),
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    data: {
      units: [unit],
      getUnit: (id) => (id === "A" ? unit : undefined),
      events: [],
      isDemoMode: false,
    },
  };
});
vi.mock("../context/UnitContext", () => ({ useUnits: () => data }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1 }, permissions: { canControlUnits: true } }),
}));
vi.mock("../utils/apiFetch", () => ({
  apiGetJson: (...args) => apiGet(...args),
  apiPostJson: (...args) => apiPost(...args),
}));
vi.mock("../services/unitHistoryService", async (importOriginal) => ({
  ...(await importOriginal()),
  getUnitHistory: (...args) => getHistory(...args),
}));
vi.mock("../components/VitalSignGraph", () => ({
  default: ({ title }) => <h3>{title}</h3>,
}));
beforeEach(() => {
  getHistory.mockResolvedValue([]);
  apiGet.mockResolvedValue({ data: [] });
  apiPost.mockResolvedValue({
    id: 1,
    scheduledAt: "2030-01-01T10:00:00Z",
    description: "Inspect pump",
    status: "scheduled",
  });
});
it("loads five years and preserves all fourteen historical metric graphs", async () => {
  render(<UnitHistoryTab unit={unit} />);
  fireEvent.change(screen.getByLabelText("Historical period"), {
    target: { value: "1826" },
  });
  await waitFor(() => expect(getHistory).toHaveBeenCalledTimes(2));
  const range = getHistory.mock.calls.at(-1)[1];
  expect((new Date(range.to) - new Date(range.from)) / 86400000).toBe(1825);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(14);
});
it("opens remote management already scoped to the exact permitted unit", () => {
  render(
    <MemoryRouter initialEntries={["/remote-control?unit=A"]}>
      <RemoteControl />
    </MemoryRouter>,
  );
  expect(screen.getByText("Unit Alpha")).toBeInTheDocument();
  expect(screen.queryByLabelText("Select unit")).not.toBeInTheDocument();
});
it("rejects a foreign remote deep link", () => {
  render(
    <MemoryRouter initialEntries={["/remote-control?unit=foreign"]}>
      <RemoteControl />
    </MemoryRouter>,
  );
  expect(screen.queryByText("Unit Alpha")).not.toBeInTheDocument();
  expect(screen.queryByText("Turn power off")).not.toBeInTheDocument();
});
it("persists maintenance through the backend and presents a returned record", async () => {
  render(<MaintenanceScheduler unit={unit} onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText("Maintenance date"), {
    target: { value: "2030-01-01T10:00" },
  });
  fireEvent.change(screen.getByLabelText("Maintenance description"), {
    target: { value: "Inspect pump" },
  });
  fireEvent.click(screen.getByText("Save maintenance schedule"));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Maintenance scheduled.",
  );
  expect(apiPost).toHaveBeenCalledWith(
    "/api/v1/units/A/maintenance",
    expect.objectContaining({ description: "Inspect pump" }),
  );
  expect(screen.getByText(/Inspect pump \(scheduled\)/)).toBeInTheDocument();
});
it("never shows maintenance success when persistence fails", async () => {
  apiPost.mockRejectedValueOnce(new Error("Database unavailable"));
  render(<MaintenanceScheduler unit={unit} onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText("Maintenance date"), {
    target: { value: "2030-01-01T10:00" },
  });
  fireEvent.change(screen.getByLabelText("Maintenance description"), {
    target: { value: "Inspect pump" },
  });
  fireEvent.click(screen.getByText("Save maintenance schedule"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Database unavailable",
  );
  expect(screen.queryByText("Maintenance scheduled.")).not.toBeInTheDocument();
});
