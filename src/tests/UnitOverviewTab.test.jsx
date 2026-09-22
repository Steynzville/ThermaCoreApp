import { render, screen } from "@testing-library/react";
import { vi, it, expect } from "vitest";
import UnitOverviewTab from "../components/unit-details/UnitOverviewTab";
vi.mock("../context/UnitContext", () => ({
  useUnits: () => ({
    alerts: [
      {
        id: "one",
        unitId: "A",
        title: "Recorded warning",
        message: "Check sensor",
        severity: "warning",
      },
      { id: "two", unitId: "B", title: "Foreign warning" },
    ],
  }),
}));
vi.mock("../components/unit-details/UnitVitals", () => ({
  default: () => <div>Unit vitals</div>,
}));
it("shows only this unit's recorded alerts without inferring leaks or shutdowns", () => {
  render(<UnitOverviewTab unit={{ id: "A", differentialPressure: 2 }} />);
  expect(screen.getByText("Recorded warning")).toBeInTheDocument();
  expect(screen.queryByText("Foreign warning")).not.toBeInTheDocument();
  expect(screen.queryByText(/LEAK DETECTED/)).not.toBeInTheDocument();
  expect(screen.queryByText(/AUTO SHUTDOWN/)).not.toBeInTheDocument();
});
