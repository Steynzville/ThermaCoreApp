import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  portfolio: {
    units: [
      { id: "A", name: "First" },
      { id: "B", name: "Second" },
    ],
    scopeKey: "tenant1",
    loading: false,
  },
  history: vi.fn(),
}));
vi.mock("./UnitContext", () => ({ useUnits: () => mocks.portfolio }));
vi.mock("../services/scadaHistoryService", () => ({
  getScadaHistory: mocks.history,
}));
import { ScadaProvider, useScada } from "./ScadaContext";
function Consumer() {
  const { unit, data } = useScada();
  return (
    <div data-testid="result">
      {unit?.id}:{data.map((row) => row.unitId).join(",")}
    </div>
  );
}
describe("SCADA selected-unit scope", () => {
  it("discards delayed previous-unit responses and clears data on tenant changes", async () => {
    let resolveFirst;
    mocks.history.mockImplementation((unit) =>
      unit.id === "A"
        ? new Promise((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve([{ unitId: unit.id }]),
    );
    const view = render(
      <ScadaProvider>
        <Consumer />
      </ScadaProvider>,
    );
    fireEvent.change(screen.getByLabelText("SCADA unit"), {
      target: { value: "B" },
    });
    await waitFor(() =>
      expect(screen.getByTestId("result")).toHaveTextContent("B:B"),
    );
    await act(async () => resolveFirst([{ unitId: "A" }]));
    expect(screen.getByTestId("result")).toHaveTextContent("B:B");
    mocks.portfolio = { units: [], scopeKey: "tenant2", loading: false };
    view.rerender(
      <ScadaProvider>
        <Consumer />
      </ScadaProvider>,
    );
    expect(screen.getByTestId("result").textContent).toBe(":");
    expect(screen.queryByText("First — A")).not.toBeInTheDocument();
  });
});
