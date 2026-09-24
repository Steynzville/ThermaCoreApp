import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import NotificationBell from "../components/NotificationBell";
import AlertsView from "../components/AlertsView";
import AlarmsView from "../components/AlarmsView";
const { data } = vi.hoisted(() => ({
  data: {
    scopeLabel: "Tenant A",
    alerts: [
      {
        id: "alert1",
        unitId: "A",
        unitName: "Alpha",
        category: "alert",
        severity: "critical",
        title: "Pressure",
        message: "Pressure below configured threshold",
      },
      {
        id: "alarm1",
        unitId: "B",
        unitName: "Beta",
        category: "alarm",
        severity: "critical",
        title: "NH3 LEAK DETECTED",
        message: "Ammonia detector exceeds threshold",
      },
    ],
  },
}));
vi.mock("../context/UnitContext", () => ({ useUnits: () => data }));
it.each([
  [
    "Pressure below configured threshold",
    "Alerts & Notifications",
    "bg-orange-500",
    "alert1",
  ],
  ["Ammonia detector exceeds threshold", "Alarms!", "bg-red-500", "alarm1"],
])(
  "routes %s to its own destination with event context",
  (message, title, colour, id) => {
    render(
      <MemoryRouter>
        <NotificationBell />
        <Routes>
          <Route path="/alerts" element={<AlertsView />} />
          <Route path="/alarms" element={<AlarmsView />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Notifications (2)" }));
    const notification = screen.getByRole("button", { name: message });
    expect(notification.querySelector(`.${colour}`)).toBeTruthy();
    fireEvent.click(notification);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(document.getElementById(`event-${id}`)).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(
      screen.queryByText(id === "alarm1" ? "Pressure" : "NH3 LEAK DETECTED"),
    ).not.toBeInTheDocument();
  },
);
