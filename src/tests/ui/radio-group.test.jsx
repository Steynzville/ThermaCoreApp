import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";

// Mock window methods for RadioGroup
beforeEach(() => {
  // Mock the DOM element prototype methods that Radix UI might use
  if (!Element.prototype.hasOwnProperty('scrollIntoView')) {
    Element.prototype.scrollIntoView = vi.fn();
  }
  
  // Mock getBoundingClientRect for the radio items
  Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
  });
});

describe("RadioGroup Components", () => {
  it("renders RadioGroup container", () => {
    const { container } = render(<RadioGroup />);
    expect(
      container.querySelector('[data-slot="radio-group"]'),
    ).toBeInTheDocument();
  });

  it("renders RadioGroupItem", () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value="option1" />
      </RadioGroup>,
    );
    expect(
      container.querySelector('[data-slot="radio-group-item"]'),
    ).toBeInTheDocument();
  });

  it("renders multiple radio items", () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value="option1" />
        <RadioGroupItem value="option2" />
      </RadioGroup>,
    );
    const items = container.querySelectorAll('[data-slot="radio-group-item"]');
    expect(items).toHaveLength(2);
  });
});
