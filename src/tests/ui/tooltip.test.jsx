/**
 * Tooltip component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *
 * The Tooltip wrapper here sets delayDuration=0 by default, so hover/focus
 * activation doesn't require waiting on Radix's open-delay timers.
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

function BasicTooltip({ tooltipProps } = {}) {
  return (
    <Tooltip {...tooltipProps}>
      <TooltipTrigger data-testid="trigger">PT-101</TooltipTrigger>
      <TooltipContent>Pressure Transmitter 101 — 42.3 PSI</TooltipContent>
    </Tooltip>
  );
}

describe("Tooltip", () => {
  it("does not show the tooltip content before interaction", () => {
    render(<BasicTooltip />);
    expect(
      screen.queryByText("Pressure Transmitter 101 — 42.3 PSI"),
    ).not.toBeInTheDocument();
  });

  it("shows the tooltip content on hover", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));

    expect(
      await screen.findByText("Pressure Transmitter 101 — 42.3 PSI"),
    ).toBeInTheDocument();
  });

  it("hides the tooltip content when the pointer moves away", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByText("Pressure Transmitter 101 — 42.3 PSI");

    await user.unhover(screen.getByTestId("trigger"));

    expect(
      screen.queryByText("Pressure Transmitter 101 — 42.3 PSI"),
    ).not.toBeInTheDocument();
  });

  it("shows the tooltip content on keyboard focus (accessibility)", async () => {
    const user = userEvent.setup();
    render(<BasicTooltip />);

    await user.tab();
    expect(screen.getByTestId("trigger")).toHaveFocus();

    expect(
      await screen.findByText("Pressure Transmitter 101 — 42.3 PSI"),
    ).toBeInTheDocument();
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
    await screen.findByText("Pressure Transmitter 101 — 42.3 PSI");

    await user.tab();
    expect(
      screen.queryByText("Pressure Transmitter 101 — 42.3 PSI"),
    ).not.toBeInTheDocument();
  });

  it("renders an arrow element inside the tooltip content", async () => {
    const user = userEvent.setup();
    const { container } = render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByText("Pressure Transmitter 101 — 42.3 PSI");

    expect(container.querySelector('[data-slot="tooltip-content"]')).toBeInTheDocument();
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
    const content = await screen.findByText("Flow Transmitter 204");
    expect(content.closest('[data-slot="tooltip-content"]')).toHaveClass(
      "scada-tag-tooltip",
    );
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
    expect(await screen.findByText("Pressure Transmitter 101")).toBeInTheDocument();

    await user.unhover(screen.getByTestId("trigger-1"));
    await user.hover(screen.getByTestId("trigger-2"));
    expect(await screen.findByText("Flow Transmitter 204")).toBeInTheDocument();
  });
});
