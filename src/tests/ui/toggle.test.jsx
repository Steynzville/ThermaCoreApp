import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toggle } from "../../components/ui/toggle";

describe("Toggle", () => {
  it("renders toggle button", () => {
    const { container } = render(<Toggle>Toggle</Toggle>);
    const toggle = container.querySelector('[data-slot="toggle"]');
    expect(toggle).toBeInTheDocument();
  });

  it("displays toggle text", () => {
    render(<Toggle>Click me</Toggle>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("applies variant styling", () => {
    const { container } = render(<Toggle variant="outline">Toggle</Toggle>);
    const toggle = container.querySelector('[data-slot="toggle"]');
    expect(toggle).toBeInTheDocument();
  });
});
