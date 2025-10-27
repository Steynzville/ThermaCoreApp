import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "../../components/ui/separator";

describe("Separator", () => {
  it("renders horizontal separator by default", () => {
    const { container } = render(<Separator />);
    const separator = container.querySelector('[data-slot="separator-root"]');
    expect(separator).toBeInTheDocument();
  });

  it("renders vertical separator", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const separator = container.querySelector('[data-slot="separator-root"]');
    expect(separator).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Separator className="custom-class" />);
    const separator = container.querySelector('[data-slot="separator-root"]');
    expect(separator).toHaveClass("custom-class");
  });
});
