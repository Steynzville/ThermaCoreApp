/**
 * Switch component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
  it("renders with role='switch'", () => {
    render(<Switch />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("is unchecked by default", () => {
    render(<Switch />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("respects a defaultChecked value (uncontrolled)", () => {
    render(<Switch defaultChecked />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("toggles state on click when uncontrolled", async () => {
    const user = userEvent.setup();
    render(<Switch />);
    const toggle = screen.getByRole("switch");

    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("calls onCheckedChange with the new value on click", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("supports fully controlled usage via checked + onCheckedChange", async () => {
    function ControlledSwitch() {
      const [on, setOn] = useState(false);
      return (
        <Switch
          checked={on}
          onCheckedChange={setOn}
          data-testid="alarm-mute"
        />
      );
    }
    const user = userEvent.setup();
    render(<ControlledSwitch />);

    const toggle = screen.getByTestId("alarm-mute");
    expect(toggle).toHaveAttribute("data-state", "unchecked");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("data-state", "checked");
  });

  it("toggles via keyboard (Space) when focused", async () => {
    const user = userEvent.setup();
    render(<Switch />);
    const toggle = screen.getByRole("switch");

    toggle.focus();
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("does not toggle and is not focusable via click when disabled", async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch disabled onCheckedChange={onCheckedChange} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeDisabled();

    await user.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("moves the thumb via data-state so checked/unchecked styling can apply", async () => {
    const user = userEvent.setup();
    const { container } = render(<Switch />);
    let thumb = container.querySelector('[data-slot="switch-thumb"]');
    expect(thumb).toHaveAttribute("data-state", "unchecked");

    await user.click(screen.getByRole("switch"));
    thumb = container.querySelector('[data-slot="switch-thumb"]');
    expect(thumb).toHaveAttribute("data-state", "checked");
  });

  it("merges a custom className with the base track classes", () => {
    render(<Switch className="scada-emergency-stop" />);
    expect(screen.getByRole("switch")).toHaveClass("scada-emergency-stop");
  });
});
