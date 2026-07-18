/**
 * Tooltip component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *
 * The Tooltip wrapper here sets delayDuration=0 by default, so hover/focus
 * activation doesn't require waiting on Radix's open-delay timers.
 *
 * We query by `role="tooltip"` (which Radix's Content sets) rather than by
 * text: Radix appears to place the tooltip's text in more than one DOM node
 * while open, which makes `getByText`/`findByText` ambiguous ("Found
 * multiple elements..."). Querying by role sidesteps that and is arguably
 * the more meaningful assertion for a tooltip anyway.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TOOLTIP_TEXT = "Pressure Transmitter 101 — 42.3 PSI";

function BasicTooltip({ tooltipProps } = {}) {
  return (
    <Tooltip {...tooltipProps}>
      <TooltipTrigger data-testid="trigger">PT-101</TooltipTrigger>
      <TooltipContent>{TOOLTIP_TEXT}</TooltipContent>
    </Tooltip>
  );
}

describe("Tooltip", () => {
  it("does not show the tooltip content before interaction", () => {
    render(<BasicTooltip />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the tooltip content on hover", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent(TOOLTIP_TEXT);
  });

  it("hides the tooltip content when the pointer moves away", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByRole("tooltip");

    await user.unhover(screen.getByTestId("trigger"));

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the tooltip content on keyboard focus (accessibility)", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);

    await user.tab();
    expect(screen.getByTestId("trigger")).toHaveFocus();

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent(TOOLTIP_TEXT);
  });

  it("hides the tooltip content on blur", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <BasicTooltip />
        <button type="button">Elsewhere</button>
      </div>,
    );

    await user.tab();
    await screen.findByRole("tooltip");

    await user.tab();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("renders an arrow element inside the tooltip content", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));
    const tooltip = await screen.findByRole("tooltip");

    expect(tooltip).toHaveAttribute("data-slot", "tooltip-content");
  });

  it("merges a custom className onto the tooltip content", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip>
        <TooltipTrigger data-testid="trigger">FT-204</TooltipTrigger>
        <TooltipContent className="scada-tag-tooltip">
          Flow Transmitter 204
        </TooltipContent>
      </Tooltip>,
    );

    await user.hover(screen.getByTestId("trigger"));
    const tooltip = await screen.findByRole("tooltip");

    expect(tooltip).toHaveTextContent("Flow Transmitter 204");
    expect(tooltip).toHaveClass("scada-tag-tooltip");
  });

  it("supports multiple independent tooltips sharing one TooltipProvider", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger data-testid="trigger-1">PT-101</TooltipTrigger>
          <TooltipContent>Pressure Transmitter 101</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger data-testid="trigger-2">FT-204</TooltipTrigger>
          <TooltipContent>Flow Transmitter 204</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    await user.hover(screen.getByTestId("trigger-1"));
    let tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Pressure Transmitter 101");

    await user.unhover(screen.getByTestId("trigger-1"));
    await user.hover(screen.getByTestId("trigger-2"));
    tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Flow Transmitter 204");
  });
});
