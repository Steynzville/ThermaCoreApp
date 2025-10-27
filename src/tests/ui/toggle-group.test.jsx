import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";

describe("ToggleGroup Components", () => {
  it("renders ToggleGroup container", () => {
    const { container } = render(<ToggleGroup type="single" />);
    expect(
      container.querySelector('[data-slot="toggle-group"]'),
    ).toBeInTheDocument();
  });

  it("renders ToggleGroupItem", () => {
    const { container } = render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="option1">Option 1</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(
      container.querySelector('[data-slot="toggle-group-item"]'),
    ).toBeInTheDocument();
  });

  it("renders multiple toggle items", () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByText("Bold")).toBeInTheDocument();
    expect(screen.getByText("Italic")).toBeInTheDocument();
  });
});
