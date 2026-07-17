/**
 * Badge component tests
 *
 * Stack assumed: Vitest + @testing-library/react + @testing-library/jest-dom
 * Adjust the import path below if your alias/config differs.
 *
 * If your vitest.config.ts sets `test.globals: true`, the `describe/it/expect/vi`
 * import below is optional but harmless to leave in.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { Badge, badgeVariants } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders children content", () => {
    render(<Badge>Online</Badge>);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("renders as a <span> by default", () => {
    render(<Badge data-testid="badge">Status</Badge>);
    const el = screen.getByTestId("badge");
    expect(el.tagName).toBe("SPAN");
  });

  it("exposes data-slot='badge' for styling/selector hooks", () => {
    render(<Badge data-testid="badge">Status</Badge>);
    expect(screen.getByTestId("badge")).toHaveAttribute("data-slot", "badge");
  });

  describe("variants", () => {
    const variants = [
      "default",
      "secondary",
      "destructive",
      "success",
      "warning",
      "outline",
    ];

    it.each(variants)("applies expected classes for the '%s' variant", (variant) => {
      render(
        <Badge data-testid="badge" variant={variant}>
          {variant}
        </Badge>,
      );
      const el = screen.getByTestId("badge");
      const expectedClassString = badgeVariants({ variant });
      // Every class produced by the cva() call for this variant must be present.
      expectedClassString
        .split(" ")
        .filter(Boolean)
        .forEach((cls) => {
          expect(el).toHaveClass(cls);
        });
    });

    it("falls back to the 'default' variant when none is specified", () => {
      render(<Badge data-testid="badge">Default</Badge>);
      const el = screen.getByTestId("badge");
      expect(el).toHaveClass("bg-primary");
      expect(el).toHaveClass("text-primary-foreground");
    });

    it("does not mix classes from other variants", () => {
      render(
        <Badge data-testid="badge" variant="success">
          Healthy
        </Badge>,
      );
      const el = screen.getByTestId("badge");
      expect(el).not.toHaveClass("bg-destructive");
      expect(el).not.toHaveClass("bg-primary");
    });
  });

  it("merges custom className with variant classes without overwriting them", () => {
    render(
      <Badge data-testid="badge" variant="warning" className="my-custom-class">
        Alarm
      </Badge>,
    );
    const el = screen.getByTestId("badge");
    expect(el).toHaveClass("my-custom-class");
    expect(el).toHaveClass("bg-amber-500/15");
  });

  it("spreads arbitrary props (e.g. aria-label, onClick) onto the rendered element", async () => {
    const handleClick = vi.fn();
    render(
      <Badge data-testid="badge" aria-label="tag-status" onClick={handleClick}>
        Tag
      </Badge>,
    );
    const el = screen.getByTestId("badge");
    expect(el).toHaveAttribute("aria-label", "tag-status");

    el.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  describe("asChild", () => {
    it("renders the child element instead of a <span> when asChild is true", () => {
      render(
        <Badge asChild variant="secondary">
          <a href="/alarms" data-testid="badge-link">
            View alarms
          </a>
        </Badge>,
      );
      const el = screen.getByTestId("badge-link");
      expect(el.tagName).toBe("A");
      expect(el).toHaveAttribute("href", "/alarms");
      // Variant classes should still be applied to the child element via Slot.
      expect(el).toHaveClass("bg-secondary");
    });

    it("still merges data-slot and className onto the child via Slot", () => {
      render(
        <Badge asChild className="extra">
          <button type="button" data-testid="badge-button">
            Ack
          </button>
        </Badge>,
      );
      const el = screen.getByTestId("badge-button");
      expect(el).toHaveAttribute("data-slot", "badge");
      expect(el).toHaveClass("extra");
    });
  });

  describe("SCADA-relevant usage patterns", () => {
    it("supports rendering an alarm severity badge with an icon", () => {
      const AlertIcon = (props) => <svg data-testid="alert-icon" {...props} />;
      render(
        <Badge variant="destructive" data-testid="badge">
          <AlertIcon />
          Critical
        </Badge>,
      );
      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
      expect(screen.getByText("Critical")).toBeInTheDocument();
      expect(screen.getByTestId("badge")).toHaveClass("bg-destructive");
    });

    it("truncates long tag/status text via whitespace-nowrap and overflow-hidden classes", () => {
      render(
        <Badge data-testid="badge">
          PUMP-STATION-04 / SENSOR-OVERPRESSURE-WARNING
        </Badge>,
      );
      const el = screen.getByTestId("badge");
      expect(el).toHaveClass("whitespace-nowrap");
      expect(el).toHaveClass("overflow-hidden");
    });
  });
});
