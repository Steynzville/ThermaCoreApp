/**
 * Tooltip component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *
 * The Tooltip wrapper here sets delayDuration=0 by default, so hover/focus
 * activation doesn't require waiting on Radix's open-delay timers.
 *
 * Query strategy: Radix's accessible tooltip text lives in a visually-hidden
 * node used for screen readers, separate from the visible popper content
 * that carries our `data-slot="tooltip-content"` / className / styling.
 * `getByRole("tooltip")` resolves to that hidden accessible node (not ours),
 * which is why structural/style assertions here query
 * `[data-slot="tooltip-content"]` directly instead of by role or text.
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

function getVisibleContent(container) {
  return container.querySelector('[data-slot="tooltip-content"]');
}

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
    const { container } = render(<BasicTooltip />);
    expect(getVisibleContent(container)).not.toBeInTheDocument();
  });

  it("shows the tooltip content on hover", async () => {
    const user = userEvent.setup();
    const { container } = render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));

    await screen.findByText(TOOLTIP_TEXT, { exact: false });
    expect(getVisibleContent(container)).toHaveTextContent(TOOLTIP_TEXT);
  });

  it("hides the tooltip content when the pointer moves away", async () => {
    const user = userEvent.setup();
    // disableHoverableContent removes Radix's "grace area" logic that lets a
    // real pointer travel from trigger to content without closing — that
    // logic is computed from live bounding-box geometry, which jsdom always
    // reports as zero-sized, making it non-deterministic here. Disabling it
    // isolates the specific behavior this test cares about: does the
    // tooltip close when the pointer leaves the trigger.
    const { container } = render(
      <BasicTooltip tooltipProps={{ disableHoverableContent: true }} />,
    );

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByText(TOOLTIP_TEXT, { exact: false });

    await user.unhover(screen.getByTestId("trigger"));

    expect(getVisibleContent(container)).not.toBeInTheDocument();
  });

  it("shows the tooltip content on keyboard focus (accessibility)", async () => {
    const user = userEvent.setup();
    const { container } = render(<BasicTooltip />);

    await user.tab();
    expect(screen.getByTestId("trigger")).toHaveFocus();

    await screen.findByText(TOOLTIP_TEXT, { exact: false });
    expect(getVisibleContent(container)).toHaveTextContent(TOOLTIP_TEXT);
  });

  it("hides the tooltip content on blur", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <BasicTooltip />
        <button type="button">Elsewhere</button>
      </div>,
    );

    await user.tab();
    await screen.findByText(TOOLTIP_TEXT, { exact: false });

    await user.tab();
    expect(getVisibleContent(container)).not.toBeInTheDocument();
  });

  it("renders the visible content with the expected data-slot attribute", async () => {
    const user = userEvent.setup();
    const { container } = render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByText(TOOLTIP_TEXT, { exact: false });

    expect(getVisibleContent(container)).toHaveAttribute(
      "data-slot",
      "tooltip-content",
    );
  });

  it("renders an arrow element inside the visible tooltip content", async () => {
    const user = userEvent.setup();
    const { container } = render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByText(TOOLTIP_TEXT, { exact: false });

    const content = getVisibleContent(container);
    expect(content.querySelector("svg, [class*='arrow']")).not.toBeNull();
  });

  it("merges a custom className onto the visible tooltip content", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Tooltip>
        <TooltipTrigger data-testid="trigger">FT-204</TooltipTrigger>
        <TooltipContent className="scada-tag-tooltip">
          Flow Transmitter 204
        </TooltipContent>
      </Tooltip>,
    );

    await user.hover(screen.getByTestId("trigger"));
    await screen.findByText("Flow Transmitter 204", { exact: false });

    const content = getVisibleContent(container);
    expect(content).toHaveTextContent("Flow Transmitter 204");
    expect(content).toHaveClass("scada-tag-tooltip");
  });

  it("supports multiple independent tooltips sharing one TooltipProvider", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TooltipProvider delayDuration={0}>
        <Tooltip disableHoverableContent>
          <TooltipTrigger data-testid="trigger-1">PT-101</TooltipTrigger>
          <TooltipContent>Pressure Transmitter 101</TooltipContent>
        </Tooltip>
        <Tooltip disableHoverableContent>
          <TooltipTrigger data-testid="trigger-2">FT-204</TooltipTrigger>
          <TooltipContent>Flow Transmitter 204</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    await user.hover(screen.getByTestId("trigger-1"));
    await screen.findByText("Pressure Transmitter 101", { exact: false });
    expect(getVisibleContent(container)).toHaveTextContent(
      "Pressure Transmitter 101",
    );

    await user.unhover(screen.getByTestId("trigger-1"));
    await user.hover(screen.getByTestId("trigger-2"));
    await screen.findByText("Flow Transmitter 204", { exact: false });
    expect(getVisibleContent(container)).toHaveTextContent(
      "Flow Transmitter 204",
    );
  });
});
