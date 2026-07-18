/**
 * Progress component tests
 *
 * Stack: Vitest (jsdom environment) + @testing-library/react
 *   + @testing-library/jest-dom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { Progress } from "@/components/ui/progress";

describe("Progress", () => {
  it("renders with role='progressbar'", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("exposes data-slot hooks on root and indicator", () => {
    const { container } = render(<Progress value={40} />);
    expect(container.querySelector('[data-slot="progress"]')).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="progress-indicator"]'),
    ).toBeInTheDocument();
  });

  it("translates the indicator based on the value (e.g. 40% -> translateX(-60%))", () => {
    const { container } = render(<Progress value={40} />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveStyle({ transform: "translateX(-60%)" });
  });

  it("shows a fully-filled bar at value=100", () => {
    const { container } = render(<Progress value={100} />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveStyle({ transform: "translateX(-0%)" });
  });

  it("shows an empty bar at value=0", () => {
    const { container } = render(<Progress value={0} />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveStyle({ transform: "translateX(-100%)" });
  });

  it("defaults to an empty bar when no value is provided", () => {
    const { container } = render(<Progress />);
    const indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveStyle({ transform: "translateX(-100%)" });
  });

  it("reflects the current value via aria-valuenow for screen readers", () => {
    render(<Progress value={73} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "73",
    );
  });

  it("merges a custom className with the base track classes", () => {
    const { container } = render(
      <Progress value={20} className="scada-tank-level" />,
    );
    const root = container.querySelector('[data-slot="progress"]');
    expect(root).toHaveClass("scada-tank-level");
    expect(root).toHaveClass("rounded-full");
  });

  it("updates the transform when the value prop changes (re-render)", () => {
    const { container, rerender } = render(<Progress value={10} />);
    let indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveStyle({ transform: "translateX(-90%)" });

    rerender(<Progress value={90} />);
    indicator = container.querySelector('[data-slot="progress-indicator"]');
    expect(indicator).toHaveStyle({ transform: "translateX(-10%)" });
  });
});
