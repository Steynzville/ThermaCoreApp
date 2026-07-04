import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";

// Mock the cn utility from @/lib/utils
vi.mock("@/lib/utils", () => ({
  cn: (...inputs) => inputs.filter(Boolean).join(' '),
}));

// Mock lucide-react CircleIcon
vi.mock("lucide-react", () => ({
  CircleIcon: () => <span data-testid="circle-icon">●</span>,
}));

// Mock the entire Radix UI radio-group module
vi.mock("@radix-ui/react-radio-group", () => ({
  Root: ({ children, className, ...props }) => (
    <div data-slot="radio-group" className={className} {...props}>
      {children}
    </div>
  ),
  Item: ({ children, className, value, ...props }) => (
    <div data-slot="radio-group-item" className={className} data-value={value} {...props}>
      {children}
    </div>
  ),
  Indicator: ({ children, className, ...props }) => (
    <div data-slot="radio-group-indicator" className={className} {...props}>
      {children}
    </div>
  ),
}));

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

  // Mock PointerEvent if not available
  if (!window.PointerEvent) {
    window.PointerEvent = class PointerEvent extends Event {
      constructor(type, params = {}) {
        super(type, params);
        this.pointerId = params.pointerId || 1;
        this.clientX = params.clientX || 0;
        this.clientY = params.clientY || 0;
      }
    };
  }

  // Mock DOMRect
  if (!window.DOMRect) {
    window.DOMRect = class DOMRect {
      constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.top = y;
        this.left = x;
        this.bottom = y + height;
        this.right = x + width;
      }
      toJSON() {
        return {
          x: this.x,
          y: this.y,
          width: this.width,
          height: this.height,
          top: this.top,
          left: this.left,
          bottom: this.bottom,
          right: this.right,
        };
      }
    };
  }
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

  it("renders radio group with custom className", () => {
    const { container } = render(
      <RadioGroup className="custom-radio-group" />
    );
    const radioGroup = container.querySelector('[data-slot="radio-group"]');
    expect(radioGroup).toBeInTheDocument();
    expect(radioGroup).toHaveClass('custom-radio-group');
  });

  it("renders radio item with custom className", () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value="option1" className="custom-radio-item" />
      </RadioGroup>,
    );
    const radioItem = container.querySelector('[data-slot="radio-group-item"]');
    expect(radioItem).toBeInTheDocument();
    expect(radioItem).toHaveClass('custom-radio-item');
  });

  it("renders radio item with value attribute", () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value="option1" />
      </RadioGroup>,
    );
    const radioItem = container.querySelector('[data-slot="radio-group-item"]');
    expect(radioItem).toHaveAttribute('data-value', 'option1');
  });

  it("renders radio group with defaultValue", () => {
    const { container } = render(
      <RadioGroup defaultValue="option1">
        <RadioGroupItem value="option1" />
        <RadioGroupItem value="option2" />
      </RadioGroup>,
    );
    const radioGroup = container.querySelector('[data-slot="radio-group"]');
    expect(radioGroup).toBeInTheDocument();
    expect(radioGroup).toHaveAttribute('data-default-value', 'option1');
  });

  it("renders radio group with disabled items", () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value="option1" disabled />
        <RadioGroupItem value="option2" />
      </RadioGroup>,
    );
    const radioItems = container.querySelectorAll('[data-slot="radio-group-item"]');
    expect(radioItems[0]).toHaveAttribute('disabled');
    expect(radioItems[1]).not.toHaveAttribute('disabled');
  });

  it("renders radio group indicator", () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value="option1" />
      </RadioGroup>,
    );
    const indicator = container.querySelector('[data-slot="radio-group-indicator"]');
    expect(indicator).toBeInTheDocument();
    // Check for CircleIcon inside indicator
    const circleIcon = indicator?.querySelector('[data-testid="circle-icon"]');
    expect(circleIcon).toBeInTheDocument();
  });
});
