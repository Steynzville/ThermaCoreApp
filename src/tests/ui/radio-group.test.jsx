import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";

describe("RadioGroup Components", () => {
  it("renders RadioGroup container", () => {
    const { container } = render(<RadioGroup />);
    expect(container.querySelector('[data-slot="radio-group"]')).toBeInTheDocument();
  });

  it("renders RadioGroupItem", () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value="option1" />
      </RadioGroup>
    );
    expect(container.querySelector('[data-slot="radio-group-item"]')).toBeInTheDocument();
  });

  it("renders multiple radio items", () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value="option1" />
        <RadioGroupItem value="option2" />
      </RadioGroup>
    );
    const items = container.querySelectorAll('[data-slot="radio-group-item"]');
    expect(items).toHaveLength(2);
  });
});
