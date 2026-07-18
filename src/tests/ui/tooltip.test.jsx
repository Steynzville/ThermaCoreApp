/**
 * Tooltip component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom + @testing-library/user-event
 *
 * The Tooltip wrapper here sets delayDuration=0 by default, so hover/focus
 * activation doesn't require waiting on Radix's open-delay timers.
 *
 * Query strategy: Radix keeps the tooltip's accessible text in a
 * visually-hidden node for screen readers, SEPARATE from the visible popper
 * content that carries our `data-slot="tooltip-content"` / className /
 * styling. That means ANY text-based query (getByText/findByText/
 * queryByText) against the tooltip's text is ambiguous — it matches both
 * nodes — regardless of whether it's used as the main assertion or just as
 * a "wait for it to appear" step. So this file avoids text queries
 * entirely: waiting for and asserting against `[data-slot="tooltip-content"]`
 * directly via `waitFor`.
 */
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

async function waitForVisibleContent(container) {
  await waitFor(() => {
    expect(getVisibleContent(container)).not.toBeNull();
  });
  return getVisibleContent(container);
}

async function waitForNoVisibleContent(container) {
  await waitFor(() => {
    expect(getVisibleContent(container)).toBeNull();
  });
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

    const content = await waitForVisibleContent(container);
    expect(content).toHaveTextContent(TOOLTIP_TEXT);
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
    await waitForVisibleContent(container);

    await user.unhover(screen.getByTestId("trigger"));

    await waitForNoVisibleContent(container);
  });

  it("shows the tooltip content on keyboard focus (accessibility)", async () => {
    const user = userEvent.setup();
    const { container } = render(<BasicTooltip />);

    await user.tab();
    expect(screen.getByTestId("trigger")).toHaveFocus();

    const content = await waitForVisibleContent(container);
    expect(content).toHaveTextContent(TOOLTIP_TEXT);
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
    await waitForVisibleContent(container);

    await user.tab();
    await waitForNoVisibleContent(container);
  });

  it("renders the visible content with the expected data-slot attribute", async () => {
    const user = userEvent.setup();
    const { container } = render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));
    const content = await waitForVisibleContent(container);

    expect(content).toHaveAttribute("data-slot", "tooltip-content");
  });

  it("renders an arrow element inside the visible tooltip content", async () => {
    const user = userEvent.setup();
    const { container } = render(<BasicTooltip />);

    await user.hover(screen.getByTestId("trigger"));
    const content = await waitForVisibleContent(container);

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
    const content = await waitForVisibleContent(container);

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
    let content = await waitForVisibleContent(container);
    expect(content).toHaveTextContent("Pressure Transmitter 101");

    await user.unhover(screen.getByTestId("trigger-1"));
    await waitForNoVisibleContent(container);

    await user.hover(screen.getByTestId("trigger-2"));
    content = await waitForVisibleContent(container);
    expect(content).toHaveTextContent("Flow Transmitter 204");
  });
});
