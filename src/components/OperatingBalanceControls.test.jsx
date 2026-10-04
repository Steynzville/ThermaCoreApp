import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import OperatingBalanceControls from "./OperatingBalanceControls";

const makeUnit = (outputs) => ({
  id: "A",
  supports_heat: outputs.includes("Heat"),
  supports_chill: outputs.includes("Chill"),
  supports_water: outputs.includes("AWG Water"),
  powerHeatBalance: 50,
  powerWaterBalance: 50,
  powerChillBalance: 50,
});
it.each([
  [],
  ["AWG Water"],
  ["Chill"],
  ["Heat"],
  ["Heat", "AWG Water"],
  ["Heat", "Chill"],
])("renders only configured balances %j", (...args) => {
  const outputs = args;
  render(
    <OperatingBalanceControls
      unit={makeUnit(outputs)}
      isDemoMode
      onApply={vi.fn()}
    />,
  );
  expect(screen.queryAllByRole("slider")).toHaveLength(outputs.length);
  for (const label of ["Heat", "Chill", "AWG Water"]) {
    const slider = screen.queryByRole("slider", {
      name: `Power / ${label} Balance`,
    });
    if (outputs.includes(label)) expect(slider).toBeDisabled();
    else expect(slider).toBeNull();
  }
});
it("requires edit, apply and confirmation; keeps cancellation draft; applies once and relocks", async () => {
  const user = userEvent.setup(),
    write = vi.fn();
  function Harness() {
    const [unit, setUnit] = useState(makeUnit(["Heat", "AWG Water"]));
    return (
      <OperatingBalanceControls
        unit={unit}
        isDemoMode
        onApply={async (changes) => {
          write(changes);
          setUnit((old) => ({ ...old, ...changes }));
        }}
      />
    );
  }
  render(<Harness />);
  const card = screen
    .getByRole("heading", { name: "Power / AWG Water Balance" })
    .closest('[data-slot="card"]');
  const control = within(card),
    slider = control.getByRole("slider");
  expect(slider).toBeDisabled();
  await user.click(control.getByText("Edit Set-point"));
  expect(slider).toBeEnabled();
  for (const [label, value] of [
    ["Max Power", "0"],
    ["Balanced", "50"],
    ["Max AWG Water", "100"],
  ]) {
    await user.click(control.getByRole("button", { name: label }));
    expect(slider.value).toBe(value);
  }
  fireEvent.change(slider, { target: { value: "67" } });
  expect(control.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  expect(control.getByText("Pending: Custom balance")).toBeInTheDocument();
  expect(write).not.toHaveBeenCalled();
  await user.click(control.getByText("Apply Set-point"));
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  expect(write).not.toHaveBeenCalled();
  await user.click(screen.getByText("Cancel"));
  expect(slider).toBeEnabled();
  expect(slider.value).toBe("67");
  await user.click(control.getByText("Apply Set-point"));
  await user.click(screen.getByText("Continue"));
  expect(write).toHaveBeenCalledExactlyOnceWith({ powerWaterBalance: 67 });
  expect(slider).toBeDisabled();
  expect(slider.value).toBe("67");
  expect(
    screen.getByRole("slider", { name: "Power / Heat Balance" }).value,
  ).toBe("50");
  expect(card.textContent).not.toMatch(/kW|L\/h|L\/day|litres|%|67/);
});
it("keeps failed applications pending and applied state unchanged", async () => {
  const user = userEvent.setup();
  render(
    <OperatingBalanceControls
      unit={makeUnit(["Heat"])}
      isDemoMode
      onApply={vi
        .fn()
        .mockRejectedValue(new Error("Gateway acknowledgement unavailable"))}
    />,
  );
  await user.click(screen.getByText("Edit Set-point"));
  await user.click(screen.getByRole("button", { name: "Max Heat" }));
  await user.click(screen.getByText("Apply Set-point"));
  await user.click(screen.getByText("Continue"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Gateway acknowledgement unavailable",
  );
  expect(screen.getByRole("slider")).toBeEnabled();
  expect(screen.getByText(/Applied: Balanced/)).toBeInTheDocument();
});
it("does not invent a live applied balance or enable unsupported gateway controls", () => {
  render(
    <OperatingBalanceControls
      unit={{ id: "live", supports_heat: true }}
      onApply={vi.fn()}
    />,
  );
  expect(screen.getByText(/Applied: Not reported/)).toBeInTheDocument();
  expect(screen.getByText("Edit Set-point")).toBeDisabled();
});
