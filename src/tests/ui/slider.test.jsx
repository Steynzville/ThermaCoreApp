import { render } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Slider } from "../../components/ui/slider";

describe("Slider", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(() => {
    // Mock Element.prototype methods that Radix UI slider might use
    if (!Element.prototype.hasOwnProperty('scrollIntoView')) {
      Element.prototype.scrollIntoView = vi.fn();
    }
    
    // Mock getBoundingClientRect for the slider thumb
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
  });

  it("renders slider component", () => {
    const { container } = render(<Slider defaultValue={[50]} />);
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });

  it("renders with custom min and max", () => {
    const { container } = render(
      <Slider min={0} max={100} defaultValue={[25]} />,
    );
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });

  it("renders with array value", () => {
    const { container } = render(<Slider value={[20, 80]} />);
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });
});
